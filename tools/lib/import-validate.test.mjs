import { describe, expect, it } from 'vitest'
import {
  parseCsv,
  hasUnbalancedQuotes,
  validateSheet,
  validateImages,
  parseImageName,
  probeImage,
  validateImageFile,
} from './import-validate.mjs'

/** Written this way because an escaped newline keeps getting mangled by the
 *  tooling that edits this file. */
const NEWLINE = String.fromCharCode(10)

/**
 * The client prepares the sheet and photographs by hand, in Excel, over days.
 * Every case here is a mistake that is easy to make and hard to spot once the
 * catalogue is live — a piece silently public, a gallery missing its main
 * image, a product with no photographs at all.
 */

const HEADER = 'sku,name,category,sub_category,visibility,sort_order'
const sheet = (...rows) => [HEADER, ...rows].join('\n')

describe('parseCsv', () => {
  it('keeps commas inside quoted fields', () => {
    const rows = parseCsv('a,b\n"one, two",three')
    expect(rows[1]).toEqual(['one, two', 'three'])
  })

  it('handles doubled quotes as a literal quote', () => {
    const rows = parseCsv('a\n"He said ""yes"""')
    expect(rows[1][0]).toBe('He said "yes"')
  })

  it('handles a newline inside a quoted field', () => {
    const rows = parseCsv('a,b\n"line one\nline two",x')
    expect(rows[1][0]).toBe('line one\nline two')
  })

  it('strips the UTF-8 BOM Excel writes', () => {
    // Left in place, the first header becomes "﻿sku" and every row fails.
    const rows = parseCsv('﻿sku,name\nVK-1,Ring')
    expect(rows[0][0]).toBe('sku')
  })

  it('ignores blank lines', () => {
    expect(parseCsv('a,b\n\n\nc,d')).toHaveLength(2)
  })
})

describe('hasUnbalancedQuotes', () => {
  it('detects an unclosed quote', () => {
    expect(hasUnbalancedQuotes('a,"unclosed\nb,c')).toBe(true)
  })

  it('accepts balanced and doubled quotes', () => {
    expect(hasUnbalancedQuotes('a,"closed"\nb,"say ""hi"""')).toBe(false)
  })
})

describe('validateSheet — structure', () => {
  it('accepts a well-formed sheet', () => {
    const { products, errors } = validateSheet(
      sheet('VK-NK-1,Meera Haram,Necklaces,Temple,Public,1'),
    )
    expect(errors).toEqual([])
    expect(products[0]).toMatchObject({
      sku: 'VK-NK-1',
      visibility: 'public',
      category: 'Necklaces',
      subCategory: 'Temple',
    })
  })

  it('rejects a duplicated column header', () => {
    // Two visibility columns means one silently wins, and which one depends on
    // parser order — so a piece could be published by accident.
    const text = ['sku,name,category,visibility,visibility', 'VK-1,Ring,Rings,Public,Premium'].join('\n')
    const { errors } = validateSheet(text)
    expect(errors.some((e) => e.includes('appears more than once'))).toBe(true)
  })

  it('reports a missing required column', () => {
    const { errors } = validateSheet('sku,name\nVK-1,Ring')
    expect(errors.some((e) => e.includes('visibility'))).toBe(true)
    expect(errors.some((e) => e.includes('category'))).toBe(true)
  })

  it('refuses to guess at a malformed quote', () => {
    const { errors } = validateSheet(sheet('VK-1,"Unclosed,Rings,,Public,1'))
    expect(errors.some((e) => e.includes('unclosed quotation mark'))).toBe(true)
  })

  it('warns about an unrecognised column instead of failing', () => {
    const text = [`${HEADER},notes`, 'VK-1,Ring,Rings,,Public,1,hello'].join('\n')
    const { errors, warnings } = validateSheet(text)
    expect(errors).toEqual([])
    expect(warnings.some((w) => w.includes('notes'))).toBe(true)
  })
})

describe('validateSheet — rows', () => {
  it('rejects a duplicate sku', () => {
    const { errors } = validateSheet(
      sheet('VK-1,Ring A,Rings,,Public,1', 'VK-1,Ring B,Rings,,Public,2'),
    )
    expect(errors.some((e) => e.includes('already used on row 2'))).toBe(true)
  })

  it('rejects a sku with spaces or symbols', () => {
    const { errors } = validateSheet(sheet('VK 1,Ring,Rings,,Public,1'))
    expect(errors.some((e) => e.includes('letters, numbers and hyphens'))).toBe(true)
  })

  it('rejects an unknown visibility rather than guessing', () => {
    // Defaulting an unrecognised value to public would publish a piece the
    // client meant to keep private.
    const { errors } = validateSheet(sheet('VK-1,Ring,Rings,,Secret,1'))
    expect(errors.some((e) => e.includes('Secret'))).toBe(true)
  })

  it('accepts every documented visibility spelling', () => {
    const { products, errors } = validateSheet(
      sheet(
        'VK-1,A,Rings,,Public,1',
        'VK-2,B,Rings,,Registered,2',
        'VK-3,C,Rings,,Premium,3',
        'VK-4,D,Rings,,premium_only,4',
      ),
    )
    expect(errors).toEqual([])
    expect(products.map((p) => p.visibility)).toEqual([
      'public',
      'login_required',
      'premium_only',
      'premium_only',
    ])
  })

  it('rejects a non-numeric sort_order', () => {
    const { errors } = validateSheet(sheet('VK-1,Ring,Rings,,Public,first'))
    expect(errors.some((e) => e.includes('sort_order'))).toBe(true)
  })

  it('warns about near-duplicate category spellings', () => {
    const { warnings } = validateSheet(
      sheet('VK-1,A,Necklaces,,Public,1', 'VK-2,B,necklaces,,Public,2'),
    )
    expect(warnings.some((w) => w.includes('separate categories'))).toBe(true)
  })
})

/**
 * weight_grams and available (migration 0010).
 *
 * Both are optional columns typed by hand in Excel over days, so the failure
 * that matters is the silent one: a value that is present but unreadable must
 * never be dropped to a default. A weight quietly lost is a weight the client
 * believes is published, and a stray word read as "available" would mark a
 * sold piece obtainable across a whole import.
 */
describe('validateSheet — weight and availability', () => {
  const WIDE = 'sku,name,category,sub_category,visibility,sort_order,weight_grams,available'
  const wide = (...rows) => [WIDE, ...rows].join('\n')

  it('reads a weight and an availability', () => {
    const { products, errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,84.32,No'))
    expect(errors).toEqual([])
    expect(products[0].weightGrams).toBe(84.32)
    expect(products[0].isAvailable).toBe(false)
  })

  it('treats a blank weight as not recorded, not as zero', () => {
    const { products, errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,,Yes'))
    expect(errors).toEqual([])
    expect(products[0].weightGrams).toBeNull()
  })

  it('defaults to available when the column is blank or absent', () => {
    const { products: blank } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,12,'))
    expect(blank[0].isAvailable).toBe(true)

    const { products: absent } = validateSheet(sheet('VK-1,Ring,Rings,,Public,1'))
    expect(absent[0].isAvailable).toBe(true)
    expect(absent[0].weightGrams).toBeNull()
  })

  it('tolerates how a spreadsheet actually writes a weight', () => {
    const { products, errors } = validateSheet(
      wide('VK-1,A,Rings,,Public,1,"1,204.5",Yes', 'VK-2,B,Rings,,Public,2,84.32 g,Yes'),
    )
    expect(errors).toEqual([])
    expect(products[0].weightGrams).toBe(1204.5)
    expect(products[1].weightGrams).toBe(84.32)
  })

  it('rejects an unreadable weight rather than dropping it', () => {
    const { errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,heavy,Yes'))
    expect(errors.some((e) => e.includes('heavy'))).toBe(true)
  })

  it('rejects a zero or negative weight', () => {
    const { errors } = validateSheet(
      wide('VK-1,A,Rings,,Public,1,0,Yes', 'VK-2,B,Rings,,Public,2,-5,Yes'),
    )
    expect(errors.filter((e) => e.includes('greater than zero'))).toHaveLength(2)
  })

  it('catches a transposed decimal point', () => {
    // 84320 g is 84 kg. Far likelier to be 84.320 than a real piece.
    const { errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,843200,Yes'))
    expect(errors.some((e) => e.includes('decimal point'))).toBe(true)
  })

  it('rejects an unrecognised availability rather than assuming available', () => {
    const { errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,12,maybe'))
    expect(errors.some((e) => e.includes('maybe'))).toBe(true)
  })

  it('accepts the spellings a person actually types', () => {
    const { products, errors } = validateSheet(
      wide(
        'VK-1,A,Rings,,Public,1,,YES',
        'VK-2,B,Rings,,Public,2,,no',
        'VK-3,C,Rings,,Public,3,,TRUE',
        'VK-4,D,Rings,,Public,4,,Unavailable',
      ),
    )
    expect(errors).toEqual([])
    expect(products.map((p) => p.isAvailable)).toEqual([true, false, true, false])
  })
})

describe('validateSheet — HSN', () => {
  const WIDE = 'sku,name,category,sub_category,visibility,sort_order,weight_grams,available,hsn_code'
  const wide = (...rows) => [WIDE, ...rows].join(NEWLINE)

  it('reads an HSN code', () => {
    const { products, errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,,Yes,711319'))
    expect(errors).toEqual([])
    expect(products[0].hsnCode).toBe('711319')
  })

  it('treats a blank as "use the company default"', () => {
    // Null rather than a literal 7113, so changing the company default later
    // reaches every piece that never needed its own heading.
    const { products } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,,Yes,'))
    expect(products[0].hsnCode).toBeNull()
  })

  it('accepts a 4-digit heading and strips spacing', () => {
    const { products, errors } = validateSheet(wide('VK-1,Ring,Rings,,Public,1,,Yes,71 13'))
    expect(errors).toEqual([])
    expect(products[0].hsnCode).toBe('7113')
  })

  it('rejects anything that is not a 4-8 digit code', () => {
    // An HSN prints on a document a buyer files against their own returns, so
    // a wrong one is worse than a missing one.
    for (const bad of ['71', 'gold', '7113-A', '123456789']) {
      const { errors } = validateSheet(wide(`VK-1,Ring,Rings,,Public,1,,Yes,${bad}`))
      expect(errors.some((e) => e.includes('hsn_code'))).toBe(true)
    }
  })
})

describe('validateSheet — one level of sub-categories (scope §C)', () => {
  it('rejects a sub-category used under two different categories', () => {
    const { errors } = validateSheet(
      sheet('VK-1,A,Necklaces,Bridal,Public,1', 'VK-2,B,Bangles,Bridal,Public,2'),
    )
    expect(errors.some((e) => e.includes('belongs to one category only'))).toBe(true)
  })

  it('rejects a sub-category equal to its own category', () => {
    const { errors } = validateSheet(sheet('VK-1,A,Rings,Rings,Public,1'))
    expect(errors.some((e) => e.includes('same as category'))).toBe(true)
  })

  it('allows the same sub-category name repeated under one category', () => {
    const { errors } = validateSheet(
      sheet('VK-1,A,Necklaces,Temple,Public,1', 'VK-2,B,Necklaces,Temple,Public,2'),
    )
    expect(errors).toEqual([])
  })
})

describe('parseImageName', () => {
  it('splits SKU and position', () => {
    expect(parseImageName('VK-NK-0001_2.jpg')).toEqual({
      sku: 'VK-NK-0001',
      position: 2,
      ext: '.jpg',
    })
  })

  it('keeps underscores inside the SKU', () => {
    expect(parseImageName('VK_NK_1_3.png')?.sku).toBe('VK_NK_1')
  })

  it('rejects a file with no position', () => {
    expect(parseImageName('VK-NK-0001.jpg')).toBeNull()
  })

  it('rejects an unsupported extension', () => {
    expect(parseImageName('VK-NK-0001_1.tiff')).toBeNull()
    expect(parseImageName('VK-NK-0001_1.pdf')).toBeNull()
  })
})

describe('validateImages', () => {
  const products = validateSheet(
    sheet('VK-1,A,Rings,,Public,1', 'VK-2,B,Rings,,Public,2'),
  ).products

  it('accepts contiguous numbering from 1', () => {
    const { errors } = validateImages(products, ['VK-1_1.jpg', 'VK-1_2.jpg', 'VK-2_1.jpg'])
    expect(errors).toEqual([])
  })

  it('reports a product with no images at all', () => {
    const { errors } = validateImages(products, ['VK-1_1.jpg'])
    expect(errors.some((e) => e.includes('no images found for "VK-2"'))).toBe(true)
  })

  it('reports a missing main image', () => {
    const { errors } = validateImages(products, ['VK-1_2.jpg', 'VK-1_3.jpg', 'VK-2_1.jpg'])
    expect(errors.some((e) => e.includes('missing the main image VK-1_1'))).toBe(true)
  })

  it('reports a gap in numbering', () => {
    const { errors } = validateImages(products, ['VK-1_1.jpg', 'VK-1_3.jpg', 'VK-2_1.jpg'])
    expect(errors.some((e) => e.includes('gap in numbering'))).toBe(true)
  })

  it('reports two images claiming the same position', () => {
    // VK-1_1.jpg and VK-1_1.png both want to be the main image; whichever
    // uploads last would silently win.
    const { errors } = validateImages(products, ['VK-1_1.jpg', 'VK-1_1.png', 'VK-2_1.jpg'])
    expect(errors.some((e) => e.includes('two images numbered _1'))).toBe(true)
  })

  it('warns about images matching no row', () => {
    const { warnings } = validateImages(products, ['VK-1_1.jpg', 'VK-2_1.jpg', 'VK-99_1.jpg'])
    expect(warnings.some((w) => w.includes('VK-99'))).toBe(true)
  })

  it('warns about a wrongly named file', () => {
    const { warnings } = validateImages(products, ['VK-1_1.jpg', 'VK-2_1.jpg', 'holiday.jpg'])
    expect(warnings.some((w) => w.includes('holiday.jpg'))).toBe(true)
  })

  it('reports a duplicated sku only once', () => {
    const dupe = validateSheet(sheet('VK-1,A,Rings,,Public,1', 'VK-1,B,Rings,,Public,2')).products
    const { errors } = validateImages(dupe, [])
    expect(errors.filter((e) => e.includes('no images found')).length).toBe(1)
  })
})

describe('probeImage', () => {
  const png = () => {
    const b = Buffer.alloc(24)
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    b.writeUInt32BE(1200, 16)
    b.writeUInt32BE(1500, 20)
    return b
  }

  const jpeg = (w, h) => {
    const b = Buffer.alloc(32)
    b.set([0xff, 0xd8], 0)
    b.set([0xff, 0xc0], 2) // SOF0
    b.writeUInt16BE(11, 4) // segment length
    b[6] = 8 // precision
    b.writeUInt16BE(h, 7)
    b.writeUInt16BE(w, 9)
    return b
  }

  it('reads PNG dimensions', () => {
    expect(probeImage(png())).toEqual({ format: 'png', width: 1200, height: 1500 })
  })

  it('reads JPEG dimensions', () => {
    expect(probeImage(jpeg(1000, 1250))).toEqual({ format: 'jpeg', width: 1000, height: 1250 })
  })

  it('returns null for a file that is not an image', () => {
    // A .txt renamed to .jpg is the realistic case.
    expect(probeImage(Buffer.from('this is definitely not a photograph at all'))).toBeNull()
  })

  it('returns null for a truncated file', () => {
    expect(probeImage(Buffer.alloc(4))).toBeNull()
  })

  describe('validateImageFile', () => {
    it('accepts a large enough photograph', () => {
      expect(validateImageFile('VK-1_1.jpg', jpeg(1000, 1250))).toEqual([])
    })

    it('rejects an image too small to display', () => {
      const problems = validateImageFile('VK-1_1.jpg', jpeg(200, 250))
      expect(problems.some((p) => p.includes('too small'))).toBe(true)
    })

    it('rejects a renamed non-image', () => {
      const problems = validateImageFile('VK-1_1.jpg', Buffer.from('PK a zip file'))
      expect(problems.some((p) => p.includes('not a readable'))).toBe(true)
    })
  })
})
