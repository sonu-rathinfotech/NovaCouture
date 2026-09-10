/**
 * Shared import validation.
 *
 * Used by BOTH tools/validate-import.mjs (the checker handed to the client)
 * and tools/import.mjs (the importer that writes to the database).
 *
 * The audit is explicit that the client-run validator is a convenience only,
 * because a local script can be skipped. The rules therefore live here once and
 * the importer re-runs them at write time — same code, no chance of the server
 * being more permissive than the check the client was given.
 *
 * Pure functions, no filesystem or network, so they can be tested directly.
 */

export const REQUIRED_COLUMNS = ['sku', 'name', 'category', 'visibility']
export const OPTIONAL_COLUMNS = [
  'sub_category', 'sort_order', 'weight_grams', 'available', 'hsn_code',
]

/**
 * `available` accepts what a person actually types in a spreadsheet.
 *
 * Anything outside this map is an error rather than a guess. Reading an
 * unrecognised word as `true` would quietly mark a sold piece available across
 * a whole import, and the admin would have no way to notice.
 */
export const AVAILABLE = new Map([
  ['yes', true],
  ['y', true],
  ['true', true],
  ['1', true],
  ['available', true],
  ['no', false],
  ['n', false],
  ['false', false],
  ['0', false],
  ['unavailable', false],
])

/** Client-facing labels mapped to the database enum. */
export const VISIBILITY = new Map([
  ['public', 'public'],
  ['registered', 'login_required'],
  ['login_required', 'login_required'],
  ['premium', 'premium_only'],
  ['premium_only', 'premium_only'],
])

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/

/** Below this, a product photograph is unusable on a 4:5 card. */
export const MIN_IMAGE_EDGE = 600
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

// -----------------------------------------------------------------------------
// CSV
// -----------------------------------------------------------------------------

/**
 * Parses CSV, handling quoted fields, embedded commas and newlines, and
 * doubled quotes. Excel's UTF-8 BOM is stripped: left in place it corrupts the
 * first header name, so `sku` silently becomes `﻿sku` and every row fails.
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  const input = text.replace(/^﻿/, '')

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') {
      field += ch
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** True when the text ends inside an unterminated quoted field. */
export function hasUnbalancedQuotes(text) {
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '"') continue
    if (quoted && text[i + 1] === '"') {
      i++
      continue
    }
    quoted = !quoted
  }
  return quoted
}

// -----------------------------------------------------------------------------
// Sheet
// -----------------------------------------------------------------------------

/**
 * @returns {{products: Array, errors: string[], warnings: string[]}}
 */
export function validateSheet(text) {
  const errors = []
  const warnings = []
  const products = []

  if (hasUnbalancedQuotes(text)) {
    errors.push(
      'The sheet has an unclosed quotation mark, so the rows cannot be read reliably. ' +
        'Check for a stray " character.',
    )
    return { products, errors, warnings }
  }

  const rows = parseCsv(text)
  if (rows.length === 0) {
    errors.push('The sheet is empty.')
    return { products, errors, warnings }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())

  // Duplicate headers silently shadow one another: two `visibility` columns
  // means one is ignored, and which one depends on parser order.
  const seenHeader = new Set()
  for (const column of header) {
    if (!column) continue
    if (seenHeader.has(column)) errors.push(`Column "${column}" appears more than once.`)
    seenHeader.add(column)
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!header.includes(column)) errors.push(`Missing required column: "${column}".`)
  }
  for (const column of header) {
    if (column && ![...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].includes(column)) {
      warnings.push(`Column "${column}" is not recognised and will be ignored.`)
    }
  }
  if (errors.length > 0) return { products, errors, warnings }

  const index = Object.fromEntries(header.map((h, i) => [h, i]))
  const seenSku = new Map()
  const categories = new Map()
  const subParents = new Map()

  for (let r = 1; r < rows.length; r++) {
    const line = r + 1 // 1-based, matching what the spreadsheet shows
    const cell = (name) => (rows[r][index[name]] ?? '').trim()

    const sku = cell('sku')
    const name = cell('name')
    const category = cell('category')
    const subCategory = cell('sub_category')
    const rawVisibility = cell('visibility')
    const sortOrder = cell('sort_order')
    const rawWeight = cell('weight_grams')
    const rawAvailable = cell('available')
    const rawHsn = cell('hsn_code')

    if (!sku) {
      errors.push(`Row ${line}: sku is empty.`)
      continue
    }
    if (!SKU_PATTERN.test(sku)) {
      errors.push(`Row ${line}: sku "${sku}" — use letters, numbers and hyphens only.`)
    }
    if (seenSku.has(sku)) {
      errors.push(`Row ${line}: sku "${sku}" is already used on row ${seenSku.get(sku)}.`)
    } else {
      seenSku.set(sku, line)
    }

    if (!name) errors.push(`Row ${line}: name is empty.`)
    if (!category) errors.push(`Row ${line}: category is empty.`)

    const visibility = VISIBILITY.get(rawVisibility.toLowerCase())
    if (!visibility) {
      errors.push(
        `Row ${line}: visibility "${rawVisibility}" is not valid. ` +
          'Use Public, Registered or Premium.',
      )
    }

    if (sortOrder && !/^\d+$/.test(sortOrder)) {
      errors.push(`Row ${line}: sort_order "${sortOrder}" is not a whole number.`)
    }

    // Blank means "not weighed", which is expected and stores null. A value
    // that is present but unreadable is an error, not a null: silently
    // dropping it loses a weight the person believed they had supplied.
    let weightGrams = null
    if (rawWeight) {
      // Spreadsheets happily hand back "84.32 g" or "1,204.5".
      const cleaned = rawWeight.replace(/,/g, '').replace(/\s*(g|gm|gms|gram|grams)$/i, '').trim()
      const grams = Number(cleaned)
      if (!cleaned || !Number.isFinite(grams)) {
        errors.push(`Row ${line}: weight_grams "${rawWeight}" is not a number.`)
      } else if (grams <= 0) {
        errors.push(`Row ${line}: weight_grams "${rawWeight}" must be greater than zero.`)
      } else if (grams > 99999.999) {
        // Mirrors products_weight_grams_sane in migration 0010.
        errors.push(
          `Row ${line}: weight_grams "${rawWeight}" looks like a mistake — check the decimal point.`,
        )
      } else {
        weightGrams = grams
      }
    }

    let isAvailable = true
    if (rawAvailable) {
      const parsed = AVAILABLE.get(rawAvailable.toLowerCase())
      if (parsed === undefined) {
        errors.push(
          `Row ${line}: available "${rawAvailable}" is not valid. Use Yes or No.`,
        )
      } else {
        isAvailable = parsed
      }
    }

    // Near-duplicate spellings would otherwise create two categories that look
    // identical to a visitor.
    for (const value of [category, subCategory]) {
      if (!value) continue
      const key = value.toLowerCase()
      if (categories.has(key) && categories.get(key) !== value) {
        warnings.push(
          `Row ${line}: "${value}" also appears as "${categories.get(key)}". ` +
            'These become two separate categories.',
        )
      } else {
        categories.set(key, value)
      }
    }

    // One level only (scope §C). A sub-category used under two different
    // parents cannot be represented.
    if (subCategory) {
      const key = subCategory.toLowerCase()
      const parent = category.toLowerCase()
      if (subParents.has(key) && subParents.get(key) !== parent) {
        errors.push(
          `Row ${line}: sub-category "${subCategory}" is used under both ` +
            `"${categories.get(subParents.get(key))}" and "${category}". ` +
            'A sub-category belongs to one category only.',
        )
      } else {
        subParents.set(key, parent)
      }
      if (subCategory.toLowerCase() === category.toLowerCase()) {
        errors.push(`Row ${line}: sub_category cannot be the same as category.`)
      }
    }

    // Blank is the normal case: a piece uses the company default HSN unless it
    // genuinely belongs under a different heading.
    let hsnCode = null
    if (rawHsn) {
      const cleaned = rawHsn.replace(/\s/g, '')
      if (!/^\d{4,8}$/.test(cleaned)) {
        errors.push(
          `Row ${line}: hsn_code "${rawHsn}" is not valid. Use 4 to 8 digits, e.g. 7113.`,
        )
      } else {
        hsnCode = cleaned
      }
    }

    products.push({
      line,
      sku,
      name,
      category,
      subCategory: subCategory || null,
      visibility,
      sortOrder: sortOrder ? Number(sortOrder) : null,
      weightGrams,
      isAvailable,
      hsnCode,
    })
  }

  return { products, errors, warnings }
}

// -----------------------------------------------------------------------------
// Images
// -----------------------------------------------------------------------------

/** Splits `VK-NK-0001_2.jpg` into its SKU and gallery position. */
export function parseImageName(filename) {
  const dot = filename.lastIndexOf('.')
  const ext = dot === -1 ? '' : filename.slice(dot).toLowerCase()
  const stem = dot === -1 ? filename : filename.slice(0, dot)
  const match = /^(.+)_(\d+)$/.exec(stem)
  if (!match || !IMAGE_EXTENSIONS.has(ext)) return null
  return { sku: match[1], position: Number(match[2]), ext }
}

/**
 * @param products from validateSheet
 * @param filenames image filenames (no directories)
 */
export function validateImages(products, filenames) {
  const errors = []
  const warnings = []

  const bySku = new Map()
  const unmatched = []

  for (const file of filenames) {
    const parsed = parseImageName(file)
    if (!parsed) {
      unmatched.push(file)
      continue
    }
    if (!bySku.has(parsed.sku)) bySku.set(parsed.sku, [])
    bySku.get(parsed.sku).push({ file, position: parsed.position })
  }

  const known = new Set(products.map((p) => p.sku))
  // Check each SKU once: a duplicated SKU is already reported by the sheet
  // check, and repeating its image errors per row buries the real list.
  const unique = [...new Map(products.map((p) => [p.sku, p])).values()]

  for (const product of unique) {
    const images = (bySku.get(product.sku) ?? []).sort((a, b) => a.position - b.position)

    if (images.length === 0) {
      errors.push(`Row ${product.line}: no images found for "${product.sku}" (expected ${product.sku}_1).`)
      continue
    }

    const positions = images.map((i) => i.position)
    if (positions[0] !== 1) errors.push(`"${product.sku}": missing the main image ${product.sku}_1.`)

    for (let i = 1; i < positions.length; i++) {
      if (positions[i] === positions[i - 1]) {
        errors.push(
          `"${product.sku}": two images numbered _${positions[i]} ` +
            `(${images[i - 1].file} and ${images[i].file}). Each position must be used once.`,
        )
      } else if (positions[i] !== positions[i - 1] + 1) {
        errors.push(
          `"${product.sku}": gap in numbering — _${positions[i - 1]} is followed by ` +
            `_${positions[i]}. Numbering must run 1, 2, 3 with no gaps.`,
        )
      }
    }
  }

  for (const [sku, images] of bySku) {
    if (!known.has(sku)) {
      warnings.push(`${images.length} image(s) named "${sku}_…" do not match any row in the sheet.`)
    }
  }
  for (const file of unmatched) {
    warnings.push(`"${file}" is not named SKU_number and will be skipped.`)
  }

  return { errors, warnings, bySku }
}

// -----------------------------------------------------------------------------
// Image file inspection (audit §5)
// -----------------------------------------------------------------------------

/**
 * Reads dimensions straight from the file header. Deliberately no image
 * library: this needs to tell a real photograph from a renamed .txt, and
 * checking the magic bytes does that without adding a dependency the client
 * would have to install.
 *
 * @param bytes Buffer or Uint8Array
 * @returns {{format: string, width: number, height: number} | null}
 */
export function probeImage(bytes) {
  const b = bytes
  if (!b || b.length < 24) return null

  // PNG: \x89PNG\r\n\x1a\n then IHDR width/height as big-endian uint32.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]
    const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]
    return { format: 'png', width, height }
  }

  // WebP: RIFF....WEBP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15])
    if (chunk === 'VP8 ') {
      return { format: 'webp', width: ((b[27] << 8) | b[26]) & 0x3fff, height: ((b[29] << 8) | b[28]) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return {
        format: 'webp',
        width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      }
    }
    return { format: 'webp', width: 0, height: 0 }
  }

  // JPEG: walk the segment markers to the SOF frame that carries the size.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++
        continue
      }
      const marker = b[i + 1]
      // SOF0..SOF15, excluding DHT(c4), JPG(c8) and DAC(cc).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'jpeg', height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] }
      }
      const length = (b[i + 2] << 8) | b[i + 3]
      if (length < 2) return null
      i += 2 + length
    }
    return null
  }

  return null
}

/** Checks one image file's bytes. Returns a list of problems. */
export function validateImageFile(filename, bytes) {
  const problems = []

  if (bytes.length > MAX_IMAGE_BYTES) {
    problems.push(
      `"${filename}" is ${(bytes.length / 1024 / 1024).toFixed(1)} MB — larger than the ` +
        `${MAX_IMAGE_BYTES / 1024 / 1024} MB limit.`,
    )
  }

  const probe = probeImage(bytes)
  if (!probe) {
    problems.push(`"${filename}" is not a readable JPEG, PNG or WebP. Was it renamed from something else?`)
    return problems
  }

  if (probe.width < MIN_IMAGE_EDGE || probe.height < MIN_IMAGE_EDGE) {
    problems.push(
      `"${filename}" is ${probe.width}x${probe.height} — too small to show. ` +
        `At least ${MIN_IMAGE_EDGE}px on each side is needed.`,
    )
  }

  return problems
}
