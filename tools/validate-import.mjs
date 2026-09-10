#!/usr/bin/env node
/**
 * Checks a prepared product sheet and image folder before sending it to us.
 *
 *   node tools/validate-import.mjs vk-products.csv ./images
 *
 * Given to the client so they can find their own mistakes rather than waiting
 * on a round trip. Runs on plain Node — no install, no database, no network.
 * See docs/BULK-UPLOAD.md.
 *
 * Every rule here comes from tools/lib/import-validate.mjs, which the importer
 * also runs at write time. This is a convenience, not a gate: skipping it
 * changes nothing about what the importer will accept.
 *
 * Exit code 0 = clean (warnings allowed), 1 = errors found, 2 = bad usage.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import {
  validateSheet,
  validateImages,
  validateImageFile,
  IMAGE_EXTENSIONS,
} from './lib/import-validate.mjs'

const [csvPath, imageDir] = process.argv.slice(2)

if (!csvPath || !imageDir) {
  console.error('Usage: node tools/validate-import.mjs <products.csv> <images-folder>')
  process.exit(2)
}
if (!existsSync(csvPath)) {
  console.error(`Cannot find the sheet: ${csvPath}`)
  process.exit(2)
}
if (!existsSync(imageDir) || !statSync(imageDir).isDirectory()) {
  console.error(`Cannot find the image folder: ${imageDir}`)
  process.exit(2)
}

const sheet = validateSheet(readFileSync(csvPath, 'utf8'))

const files = readdirSync(imageDir).filter(
  (f) => statSync(join(imageDir, f)).isFile() && IMAGE_EXTENSIONS.has(extname(f).toLowerCase()),
)

const images = validateImages(sheet.products, files)

const errors = [...sheet.errors, ...images.errors]
const warnings = [...sheet.warnings, ...images.warnings]

// Names and numbering can be perfect while the files themselves are unusable —
// a screenshot saved as .jpg, or a thumbnail too small to show.
for (const product of sheet.products) {
  for (const image of images.bySku.get(product.sku) ?? []) {
    errors.push(...validateImageFile(image.file, readFileSync(join(imageDir, image.file))))
  }
}

console.log('')
console.log(`  Products in sheet : ${sheet.products.length}`)
console.log(`  Images in folder  : ${files.length}`)

if (sheet.products.length > 0) {
  const counts = { public: 0, login_required: 0, premium_only: 0 }
  for (const p of sheet.products) if (p.visibility) counts[p.visibility]++
  console.log('')
  console.log(`  Public            : ${counts.public}`)
  console.log(`  Registered only   : ${counts.login_required}`)
  console.log(`  Premium only      : ${counts.premium_only}`)
}

if (warnings.length > 0) {
  console.log('')
  console.log(`  ${warnings.length} warning(s) — these will not stop the import:`)
  for (const w of warnings) console.log(`    · ${w}`)
}

if (errors.length > 0) {
  console.log('')
  console.log(`  ${errors.length} error(s) — these must be fixed before importing:`)
  for (const e of errors) console.log(`    · ${e}`)
  console.log('')
  process.exit(1)
}

console.log('')
console.log('  No errors. This is ready to send to Rath Infotech.')
console.log('')
