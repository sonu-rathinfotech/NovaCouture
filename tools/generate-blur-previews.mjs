#!/usr/bin/env node
/**
 * Fills products.blur_preview for the locked teaser tiles (migration 0009).
 *
 *   node tools/generate-blur-previews.mjs           # only rows missing one
 *   node tools/generate-blur-previews.mjs --all     # regenerate every row
 *   node tools/generate-blur-previews.mjs --check   # report, change nothing
 *
 * Downloads each product's first photograph with the service-role key, reduces
 * it to PREVIEW_W x PREVIEW_H, and stores the result inline as a data URI.
 *
 * ── The reduction is the security boundary ──────────────────────────────────
 * The output is around 500 pixels. That is what makes it safe to show someone
 * who may not open the piece: the detail is destroyed here, on this machine,
 * before anything is stored — as opposed to a CSS blur, which only hides
 * detail that is still in the file and comes off with one devtools click.
 * Raising the dimensions below raises exactly one thing: how much of a
 * withheld photograph a guest can make out. Treat it as a policy decision,
 * not a quality setting.
 *
 * Runs from a terminal, never the browser, because the service-role key
 * bypasses RLS in order to read photographs of gated pieces.
 *
 * Re-running is safe. New uploads get a preview from the admin panel, so this
 * is for existing rows and for changing the dimensions.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Keep in step with makeBlurPreview() in web/src/lib/blurPreview.ts. */
const PREVIEW_W = 20
const PREVIEW_H = 25
const PREVIEW_QUALITY = 40
/** Mirrors the products_blur_preview_is_tiny constraint in migration 0009. */
const MAX_CHARS = 4096

function env() {
  const values = {}
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#') || t.startsWith('//')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      if (values[k] === undefined) values[k] = t.slice(i + 1).trim()
    }
  }
  return values
}

const e = env()
const URL_BASE = e.VITE_SUPABASE_URL
const SERVICE_KEY = e.service_role || e.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE) throw new Error('VITE_SUPABASE_URL is not set')
if (!SERVICE_KEY) throw new Error('service_role key is not set in .env')

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const all = process.argv.includes('--all')
const checkOnly = process.argv.includes('--check')

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

/** The tile shows one image, so only the first of each gallery is needed. */
async function firstImages() {
  const products = await rest(
    'products?select=id,name,visibility,blur_preview,product_images(storage_path,sort_order)&is_active=eq.true&order=sort_order',
  )
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    visibility: p.visibility,
    hasPreview: Boolean(p.blur_preview),
    path: [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]
      ?.storage_path,
  }))
}

async function download(path) {
  const res = await fetch(
    `${URL_BASE}/storage/v1/object/authenticated/product-images/${path}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  )
  if (!res.ok) throw new Error(`downloading ${path}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function shrink(buffer) {
  const out = await sharp(buffer)
    .resize(PREVIEW_W, PREVIEW_H, { fit: 'cover' })
    .jpeg({ quality: PREVIEW_QUALITY })
    .toBuffer()
  return `data:image/jpeg;base64,${out.toString('base64')}`
}

async function run() {
  const rows = await firstImages()
  const missingImage = rows.filter((r) => !r.path)
  const todo = rows.filter((r) => r.path && (all || !r.hasPreview))

  console.log(`\n  ${rows.length} active products`)
  console.log(`  ${rows.filter((r) => r.hasPreview).length} already have a preview`)
  if (missingImage.length) {
    console.log(`  ${missingImage.length} have no photograph and will be skipped`)
  }
  console.log(`  ${todo.length} to generate at ${PREVIEW_W}x${PREVIEW_H}\n`)

  if (checkOnly || !todo.length) {
    if (checkOnly) console.log('  --check: nothing written\n')
    return
  }

  let done = 0
  let biggest = 0
  for (const row of todo) {
    const uri = await shrink(await download(row.path))
    biggest = Math.max(biggest, uri.length)

    if (uri.length > MAX_CHARS) {
      // The database constraint would reject it anyway; failing here says why.
      throw new Error(
        `${row.name}: preview is ${uri.length} chars, over the ${MAX_CHARS} limit. ` +
          'Lower PREVIEW_W/PREVIEW_H or PREVIEW_QUALITY.',
      )
    }

    await rest(`products?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ blur_preview: uri }),
    })
    done++
    process.stdout.write(`\r  ${done}/${todo.length} …`)
  }

  console.log(`\r  ${done} previews written, largest ${biggest} bytes\n`)
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
