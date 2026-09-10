import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { categories, products, productImages } from './fixtures'

/**
 * fixtures.ts and supabase/seed.sql must describe the same catalogue.
 *
 * The whole point of the fixture layer is that behaviour does not change when
 * Supabase is connected. If the two drift, the app is reviewed against one
 * dataset and shipped against another — and the difference will surface as a
 * "bug" that nobody can reproduce locally.
 *
 * This parses seed.sql rather than trusting a comment, so the claim stays true
 * by construction.
 */

const SEED = readFileSync(
  fileURLToPath(new URL('../../supabase/seed.sql', import.meta.url)),
  'utf8',
)

function block(table: string): string {
  const start = SEED.indexOf(`insert into public.${table} (`)
  expect(start, `no insert block for ${table}`).toBeGreaterThan(-1)
  const end = SEED.indexOf('on conflict', start)
  return SEED.slice(start, end)
}

/** All category insert blocks (top-level and sub-categories) concatenated. */
function categoryBlocks(): string {
  const parts: string[] = []
  let from = 0
  for (;;) {
    const start = SEED.indexOf('insert into public.categories (', from)
    if (start === -1) break
    const end = SEED.indexOf('on conflict', start)
    parts.push(SEED.slice(start, end))
    from = end
  }
  return parts.join('\n')
}

const UUID = '[0-9a-f-]{36}'

describe('seed.sql / fixtures.ts parity', () => {
  it('has the same categories', () => {
    const text = categoryBlocks()
    const re = new RegExp(
      `\\('(${UUID})',\\s*'([^']+)',\\s*'([a-z0-9-]+)',\\s*(null|'${UUID}'),\\s*(\\d+)\\)`,
      'g',
    )

    const seeded = [...text.matchAll(re)].map((m) => ({
      id: m[1],
      name: m[2],
      slug: m[3],
      parent_id: m[4] === 'null' ? null : m[4].slice(1, -1),
      sort_order: Number(m[5]),
    }))

    expect(seeded.length).toBe(categories.length)

    const byId = new Map(categories.map((c) => [c.id, c]))
    for (const row of seeded) {
      const fixture = byId.get(row.id)
      expect(fixture, `category ${row.slug} is in seed.sql but not fixtures.ts`).toBeDefined()
      expect({ ...row }).toEqual({
        id: fixture!.id,
        name: fixture!.name,
        slug: fixture!.slug,
        parent_id: fixture!.parent_id,
        sort_order: fixture!.sort_order,
      })
    }
  })

  it('has the same products, with the same visibility levels', () => {
    const re = new RegExp(
      `\\('(${UUID})',\\s*'([^']+)',\\s*'([a-z0-9-]+)',\\s*'(${UUID})',\\s*` +
        `'(public|login_required|premium_only)',\\s*(\\d+)\\)`,
      'g',
    )

    const seeded = [...block('products').matchAll(re)].map((m) => ({
      id: m[1],
      name: m[2],
      slug: m[3],
      category_id: m[4],
      visibility: m[5],
      sort_order: Number(m[6]),
    }))

    expect(seeded.length).toBe(products.length)

    const byId = new Map(products.map((p) => [p.id, p]))
    for (const row of seeded) {
      const fixture = byId.get(row.id)
      expect(fixture, `product ${row.slug} is in seed.sql but not fixtures.ts`).toBeDefined()
      expect(row).toEqual({
        id: fixture!.id,
        name: fixture!.name,
        slug: fixture!.slug,
        category_id: fixture!.category_id,
        visibility: fixture!.visibility,
        sort_order: fixture!.sort_order,
      })
    }
  })

  it('generates the same number of gallery images per product', () => {
    // seed.sql sizes galleries with:
    //   case when p.visibility = 'premium_only' then N else M end
    const match = /then\s+(\d+)\s+else\s+(\d+)\s+end/.exec(SEED)
    expect(match, 'could not find the gallery-size expression in seed.sql').not.toBeNull()

    const [, premiumCount, standardCount] = match!.map(Number) as unknown as [
      unknown,
      number,
      number,
    ]

    for (const product of products) {
      const actual = productImages.filter((i) => i.product_id === product.id).length
      const expected = product.visibility === 'premium_only' ? premiumCount : standardCount
      expect(actual, `${product.slug} gallery size`).toBe(expected)
    }
  })

  it('uses the same storage_path convention', () => {
    // seed.sql: 'seed/' || p.slug || '-' || g.n || '.jpg'
    expect(SEED).toContain("'seed/' || p.slug || '-' || g.n || '.jpg'")

    for (const image of productImages) {
      const product = products.find((p) => p.id === image.product_id)!
      expect(image.storage_path).toBe(`seed/${product.slug}-${image.sort_order}.jpg`)
    }
  })

  it('never leaves an image without alt text', () => {
    for (const image of productImages) {
      expect(image.alt.trim().length).toBeGreaterThan(0)
    }
  })
})
