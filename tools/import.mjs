#!/usr/bin/env node
/**
 * Imports a prepared catalogue into Supabase (scope §H, audit §5).
 *
 *   node tools/import.mjs <products.csv> <images-folder>            dry run
 *   node tools/import.mjs <products.csv> <images-folder> --commit   write it
 *
 * Dry run is the default and prints exactly what would change. Nothing is
 * written without --commit, because an import that half-succeeded on someone
 * else's catalogue is a bad way to learn the sheet had a typo.
 *
 * Re-running is safe: products are matched by SKU and updated in place, and
 * images are replaced. Import the same sheet twice and you get one catalogue,
 * not two.
 *
 * Runs with the service-role key, from a terminal. It re-runs every rule from
 * tools/lib/import-validate.mjs rather than trusting that the client ran the
 * checker — the audit is right that a local script can simply be skipped.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validateSheet,
  validateImages,
  validateImageFile,
  parseImageName,
  IMAGE_EXTENSIONS,
} from './lib/import-validate.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

const admin = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...admin, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// -----------------------------------------------------------------------------

async function run() {
  const [csvPath, imageDir] = process.argv.slice(2)
  const commit = process.argv.includes('--commit')

  if (!csvPath || !imageDir) {
    console.error('Usage: node tools/import.mjs <products.csv> <images-folder> [--commit]')
    process.exit(2)
  }
  if (!URL_BASE || !SERVICE_KEY) throw new Error('Missing VITE_SUPABASE_URL / service_role')
  if (!existsSync(csvPath)) throw new Error(`Cannot find the sheet: ${csvPath}`)
  if (!existsSync(imageDir) || !statSync(imageDir).isDirectory()) {
    throw new Error(`Cannot find the image folder: ${imageDir}`)
  }

  // --- validate, exactly as the client's checker does ------------------------
  const sheet = validateSheet(readFileSync(csvPath, 'utf8'))
  const files = readdirSync(imageDir).filter(
    (f) => statSync(join(imageDir, f)).isFile() && IMAGE_EXTENSIONS.has(extname(f).toLowerCase()),
  )
  const images = validateImages(sheet.products, files)

  const errors = [...sheet.errors, ...images.errors]
  const warnings = [...sheet.warnings, ...images.warnings]

  // --- inspect the image files themselves (audit §5) ------------------------
  // Names and numbering can be perfect while the files are unusable.
  for (const product of sheet.products) {
    for (const image of images.bySku.get(product.sku) ?? []) {
      errors.push(...validateImageFile(image.file, readFileSync(join(imageDir, image.file))))
    }
  }

  console.log('')
  console.log(`  Products in sheet : ${sheet.products.length}`)
  console.log(`  Images in folder  : ${files.length}`)

  if (warnings.length > 0) {
    console.log('')
    console.log(`  ${warnings.length} warning(s):`)
    for (const w of warnings) console.log(`    · ${w}`)
  }

  if (errors.length > 0) {
    console.log('')
    console.log(`  ${errors.length} error(s) — nothing was imported:`)
    for (const err of errors) console.log(`    · ${err}`)
    console.log('')
    process.exit(1)
  }

  // --- plan ------------------------------------------------------------------
  const existingProducts = await rest('products?select=id,slug,name')
  const existingCategories = await rest('categories?select=id,name,slug,parent_id')

  const bySlug = new Map(existingProducts.map((p) => [p.slug, p]))
  const catBySlug = new Map(existingCategories.map((c) => [c.slug, c]))

  const wantedCategories = new Map()
  for (const p of sheet.products) {
    wantedCategories.set(slugify(p.category), { name: p.category, parent: null })
    if (p.subCategory) {
      wantedCategories.set(slugify(p.subCategory), { name: p.subCategory, parent: slugify(p.category) })
    }
  }

  const newCategories = [...wantedCategories.entries()].filter(([slug]) => !catBySlug.has(slug))
  const created = sheet.products.filter((p) => !bySlug.has(slugify(p.sku)))
  const updated = sheet.products.length - created.length
  const imageCount = sheet.products.reduce(
    (n, p) => n + (images.bySku.get(p.sku)?.length ?? 0),
    0,
  )

  console.log('')
  console.log('  Plan:')
  console.log(`    categories to create : ${newCategories.length}`)
  console.log(`    products to create   : ${created.length}`)
  console.log(`    products to update   : ${updated}`)
  console.log(`    images to upload     : ${imageCount}`)

  if (!commit) {
    console.log('')
    console.log('  Dry run — nothing written. Re-run with --commit to apply.')
    console.log('')
    return
  }

  // --- write -----------------------------------------------------------------
  console.log('')
  for (const [slug, meta] of wantedCategories) {
    if (catBySlug.has(slug)) continue
    const parentId = meta.parent ? catBySlug.get(meta.parent)?.id ?? null : null
    const [row] = await rest('categories', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name: meta.name, slug, parent_id: parentId, sort_order: 50 }),
    })
    catBySlug.set(slug, row)
    console.log(`  category  ${meta.name}`)
  }

  let imagesUploaded = 0

  for (const product of sheet.products) {
    const slug = slugify(product.sku)
    const categorySlug = slugify(product.subCategory ?? product.category)

    const [row] = await rest('products?on_conflict=slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        name: product.name,
        slug,
        category_id: catBySlug.get(categorySlug)?.id ?? null,
        visibility: product.visibility,
        sort_order: product.sortOrder ?? 100,
        is_active: true,
        is_available: product.isAvailable,
        weight_grams: product.weightGrams,
        hsn_code: product.hsnCode,
      }),
    })

    // Replace the gallery wholesale: a re-import with fewer images must not
    // leave the removed ones behind.
    await rest(`product_images?product_id=eq.${row.id}`, { method: 'DELETE' })

    const gallery = (images.bySku.get(product.sku) ?? []).sort((a, b) => a.position - b.position)

    for (const image of gallery) {
      const objectPath = `products/${row.id}/${image.position}${extname(image.file).toLowerCase()}`
      const bytes = readFileSync(join(imageDir, image.file))

      const upload = await fetch(`${URL_BASE}/storage/v1/object/product-images/${objectPath}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': mimeFor(image.file),
          'x-upsert': 'true',
        },
        body: bytes,
      })
      if (!upload.ok) throw new Error(`upload ${objectPath}: ${await upload.text()}`)

      await rest('product_images', {
        method: 'POST',
        body: JSON.stringify({
          product_id: row.id,
          storage_path: objectPath,
          sort_order: image.position,
          // Never null: alt text is what a screen reader announces, and a bulk
          // import must not be able to produce a gallery of empty ones.
          alt: `${product.name} — view ${image.position}`,
        }),
      })
      imagesUploaded++
    }

    console.log(`  ${product.sku.padEnd(16)} ${product.name.padEnd(28)} ${gallery.length} image(s)`)
  }

  console.log('')
  console.log(`  Imported ${sheet.products.length} product(s) and ${imagesUploaded} image(s).`)
  console.log('  Run: npm run db:verify')
  console.log('')
}

function mimeFor(filename) {
  const ext = extname(filename).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

// parseImageName is re-exported through validateImages; referenced here so the
// dependency is explicit to a reader.
void parseImageName

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
