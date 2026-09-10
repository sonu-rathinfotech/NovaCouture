#!/usr/bin/env node
/**
 * Burns the house mark into photographs that are already in storage.
 *
 *   node tools/watermark-existing.mjs            # report, change nothing
 *   node tools/watermark-existing.mjs --apply    # do it
 *   node tools/watermark-existing.mjs --apply --limit 10
 *
 * Watermarking arrived after 208 photographs had been uploaded, so those carry
 * no mark. New uploads are marked as they arrive; this is for the backlog.
 *
 * -- Read the warning before running with --apply ---------------------------
 * There is no undo. The marked file REPLACES the original in storage, which is
 * the whole point of burning a mark in rather than drawing it over -- but it
 * means the unmarked photograph is gone. If the client may ever want these
 * pictures unmarked, take a copy of the bucket first.
 *
 * -- Safe to re-run ---------------------------------------------------------
 * Only rows with watermarked_at null are touched, and the column is set as
 * each one succeeds. Marking a photograph twice burns the logo in twice, so
 * this is not a nicety: a second run without the guard would visibly damage
 * the whole catalogue.
 *
 * -- Grouped by FILE, not by row --------------------------------------------
 * Several product_images rows can point at one object in storage. The first
 * version of this iterated rows, so a file referenced twice was downloaded,
 * marked and re-uploaded twice -- and the second pass marked the already
 * marked copy. That double-stamped 64 photographs before it was caught.
 * Rows are now grouped by storage_path: each file is marked once, and every
 * row that references it is stamped.
 *
 * -- Uses the same marking code as the importer -----------------------------
 * tools/lib/watermark-node.mjs, which in turn shares its placement arithmetic
 * with the browser. A photograph marked here ends up looking like one marked
 * at upload.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliseWatermarkSettings } from './lib/watermark-placement.mjs'
import { watermarkBuffer } from './lib/watermark-node.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = join(ROOT, 'public', 'logo-watermark.png')
const BUCKET = 'product-images'

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

const apply = process.argv.includes('--apply')
const limitFlag = process.argv.indexOf('--limit')
const limit = limitFlag > -1 ? Number(process.argv[limitFlag + 1]) : Infinity

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function download(path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`downloading ${path}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function upload(path, buffer) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'PUT',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) throw new Error(`uploading ${path}: ${res.status} ${await res.text()}`)
}

async function run() {
  const settings = normaliseWatermarkSettings(
    (await rest('company_settings?select=watermark_enabled,watermark_position,watermark_size_percent,watermark_opacity'))
      .map((r) => ({
        enabled: r.watermark_enabled,
        position: r.watermark_position,
        sizePercent: r.watermark_size_percent,
        opacity: r.watermark_opacity,
      }))[0],
  )

  const rows = await rest(
    'product_images?select=id,storage_path&watermarked_at=is.null&order=storage_path',
  )
  const total = await rest('product_images?select=id')

  // One entry per FILE, carrying every row that points at it.
  const byFile = new Map()
  for (const row of rows) {
    const ids = byFile.get(row.storage_path) ?? []
    ids.push(row.id)
    byFile.set(row.storage_path, ids)
  }
  const pending = [...byFile.entries()].map(([storage_path, ids]) => ({ storage_path, ids }))

  console.log('')
  console.log(`  settings   : ${settings.position}, ${settings.sizePercent}% width, ${Math.round(settings.opacity * 100)}% strength`)
  console.log(`  photographs: ${total.length} rows over ${new Set(rows.map((r) => r.storage_path)).size + (total.length - rows.length)} files`)
  console.log(`  unmarked   : ${pending.length} files (${rows.length} rows)`)

  if (!settings.enabled) {
    console.log('\n  Watermarking is switched off in the admin. Nothing to do.\n')
    return
  }
  if (pending.length === 0) {
    console.log('\n  Nothing to mark.\n')
    return
  }
  if (!apply) {
    console.log('\n  This was a dry run. Add --apply to mark them.')
    console.log('  There is no undo: the marked file replaces the original in storage.\n')
    return
  }

  const todo = pending.slice(0, limit)
  console.log(`\n  Marking ${todo.length} files. This replaces the stored file.\n`)

  let done = 0
  for (const file of todo) {
    const marked = await watermarkBuffer(await download(file.storage_path), LOGO, settings)
    await upload(file.storage_path, marked)
    /*
     * Stamped only after the upload succeeds, so a crash mid-run leaves the
     * rows unmarked and the next run picks the file up rather than skipping
     * it.
     *
     * EVERY row pointing at this file is stamped, not just one. Several rows
     * can reference one object, and stamping a single row would leave the
     * others null -- so the next run would download the already marked file
     * and mark it a second time. That is exactly what happened before this
     * was grouped by file.
     */
    await rest(`product_images?id=in.(${file.ids.join(',')})`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ watermarked_at: new Date().toISOString() }),
    })
    done++
    process.stdout.write(`
  ${done}/${todo.length} …`)
  }
  console.log(`
  ${done} files marked.        
`)
}
run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
