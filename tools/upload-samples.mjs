#!/usr/bin/env node
/**
 * Uploads the sample photographs into the PRIVATE product-images bucket and
 * repoints product_images rows at them.
 *
 *   node tools/upload-samples.mjs          upload
 *   node tools/upload-samples.mjs --revert  back to seed/ placeholder paths
 *
 * Why bother, when the samples already render from web/public: because that
 * path proves nothing. Serving from a public folder exercises no policy at all.
 * Putting real objects in the private bucket is what lets us verify that a
 * guest cannot obtain a signed URL for a premium photograph — which is the
 * actual security question (audit §1).
 *
 * Uses the service-role key, so it runs from a terminal and never the browser.
 * This is a stand-in for the Phase 8 importer, which will do the same thing
 * with VK's real photography plus watermarking.
 *
 * Path convention, matching the storage policy in migration 0002:
 *     products/<product_id>/<sort_order>.jpg
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SAMPLES = join(ROOT, 'web', 'public', 'samples')

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
if (!URL_BASE || !SERVICE_KEY) throw new Error('Missing VITE_SUPABASE_URL / service_role')

const admin = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

/** Same mapping the frontend uses, so a product keeps its look. */
const BY_KIND = {
  necklace: ['necklace-1', 'necklace-2'],
  bangle: ['bangle-1', 'bangle-2', 'bangle-3'],
  ring: ['ring-1', 'ring-2', 'ring-3', 'ring-4'],
  bracelet: ['bracelet-1', 'bracelet-2'],
  // A pendant hangs on a chain, so the necklace photographs read correctly.
  pendant: ['necklace-1', 'necklace-2'],
  earring: ['earring-1', 'earring-2', 'earring-3'],
}
const KIND_BY_CATEGORY = {
  necklaces: 'necklace', temple: 'necklace', bridal: 'necklace',
  haram: 'necklace', choker: 'necklace',
  bangles: 'bangle', kada: 'bangle', 'bangle-sets': 'bangle',
  rings: 'ring', solitaire: 'ring', cocktail: 'ring',
  bracelets: 'bracelet', tennis: 'bracelet',
  earrings: 'earring', jhumka: 'earring', chandbali: 'earring', studs: 'earring',
  'pendants-chains': 'pendant', pendants: 'pendant', chains: 'pendant',
}

function offsetFor(slug) {
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return hash
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...admin, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function upload(objectPath, bytes) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/product-images/${objectPath}`, {
    method: 'POST',
    headers: {
      ...admin,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
      // Matches the browser import. Verified not to come back on a signed-URL
      // response from this project — see the note in web/src/data/bulkImport.ts.
      // Harmless to send, and correct if that changes.
      'cache-control': 'max-age=86400',
    },
    body: bytes,
  })
  if (!res.ok) throw new Error(`upload ${objectPath}: ${res.status} ${await res.text()}`)
}

async function revert() {
  const images = await rest('product_images?select=id,product_id,sort_order')
  const products = await rest('products?select=id,slug')
  const slugById = new Map(products.map((p) => [p.id, p.slug]))

  for (const img of images) {
    const slug = slugById.get(img.product_id)
    if (!slug) continue
    await rest(`product_images?id=eq.${img.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ storage_path: `seed/${slug}-${img.sort_order}.jpg` }),
    })
  }
  console.log(`\n  Reverted ${images.length} rows to seed/ placeholder paths.\n`)
}

async function run() {
  if (process.argv.includes('--revert')) return revert()

  const products = await rest(
    'products?select=id,slug,category_id,visibility,categories(slug)&order=sort_order',
  )
  const images = await rest('product_images?select=id,product_id,sort_order&order=sort_order')

  const byProduct = new Map()
  for (const img of images) {
    if (!byProduct.has(img.product_id)) byProduct.set(img.product_id, [])
    byProduct.get(img.product_id).push(img)
  }

  const files = new Map()
  let uploaded = 0

  for (const product of products) {
    const categorySlug = product.categories?.slug
    const kind = KIND_BY_CATEGORY[categorySlug] ?? 'ring'
    const set = BY_KIND[kind]
    const offset = offsetFor(product.slug)
    const rows = byProduct.get(product.id) ?? []

    for (const row of rows) {
      const name = set[(offset + row.sort_order - 1) % set.length]
      if (!files.has(name)) files.set(name, readFileSync(join(SAMPLES, `${name}.jpg`)))

      const objectPath = `products/${product.id}/${row.sort_order}.jpg`
      await upload(objectPath, files.get(name))
      await rest(`product_images?id=eq.${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ storage_path: objectPath }),
      })
      uploaded++
    }

    console.log(`  ${product.slug.padEnd(24)} ${rows.length} image(s)  [${product.visibility}]`)
  }

  console.log('')
  console.log(`  Uploaded ${uploaded} objects into the private bucket.`)
  console.log('  Run: npm run db:verify   to check who can sign a URL for them.')
  console.log('')
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
