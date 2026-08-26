import { describe, expect, it } from 'vitest'
import { fixtureCatalogue, selectCatalogue, supabaseCatalogue, visibleLevels } from './catalogue'
import { categories, products } from './fixtures'
import type { Tier, Visibility } from '@/types/db'

/**
 * The access matrix: 3 viewer tiers x 3 visibility levels.
 *
 * This is the most important test in the project (PLAN.md §4, Phase 3).
 * Everything built after gating is only trustworthy if these nine cases hold.
 *
 * Note on scope: while running on fixtures this exercises the JavaScript
 * stand-in. Once Supabase is connected the real enforcement is RLS, and these
 * assertions must be re-run against the live database — a passing test here
 * does NOT prove the policies are correct.
 */

const TIERS: Tier[] = ['guest', 'registered', 'premium']
const LEVELS: Visibility[] = ['public', 'login_required', 'premium_only']

/** The table from the signed scope, §3. */
const EXPECTED: Record<Tier, Record<Visibility, boolean>> = {
  guest: { public: true, login_required: false, premium_only: false },
  registered: { public: true, login_required: true, premium_only: false },
  premium: { public: true, login_required: true, premium_only: true },
}

describe('access matrix', () => {
  it('selects the fixture repository only when Supabase is unconfigured', () => {
    expect(selectCatalogue(false)).toBe(fixtureCatalogue)
    expect(selectCatalogue(true)).toBe(supabaseCatalogue)
  })

  for (const tier of TIERS) {
    for (const level of LEVELS) {
      const allowed = EXPECTED[tier][level]

      it(`${tier} ${allowed ? 'sees' : 'cannot see'} ${level} products`, async () => {
        const listed = await fixtureCatalogue.listProducts({ tier })
        const ofLevel = listed.filter((p) => p.visibility === level)

        if (allowed) {
          // Every active product at this level must be present — a partial
          // result would silently hide inventory from an entitled viewer.
          const expectedCount = products.filter(
            (p) => p.is_active && p.visibility === level,
          ).length
          expect(ofLevel).toHaveLength(expectedCount)
        } else {
          expect(ofLevel).toHaveLength(0)
        }
      })
    }
  }
})

describe('direct product access', () => {
  const premiumOnly = products.find((p) => p.visibility === 'premium_only')!
  const loginRequired = products.find((p) => p.visibility === 'login_required')!

  it('hides a premium product from a guest even by direct slug', async () => {
    expect(await fixtureCatalogue.getProduct(premiumOnly.slug, 'guest')).toBeNull()
  })

  it('hides a premium product from a registered user even by direct slug', async () => {
    expect(await fixtureCatalogue.getProduct(premiumOnly.slug, 'registered')).toBeNull()
  })

  it('hides a login-required product from a guest even by direct slug', async () => {
    expect(await fixtureCatalogue.getProduct(loginRequired.slug, 'guest')).toBeNull()
  })

  it('returns the same null for a missing product as for a forbidden one', async () => {
    // Both must be indistinguishable, so a 404 cannot confirm that a premium
    // piece exists at a guessed slug.
    const forbidden = await fixtureCatalogue.getProduct(premiumOnly.slug, 'guest')
    const missing = await fixtureCatalogue.getProduct('no-such-piece-at-all', 'guest')
    expect(forbidden).toBe(missing)
  })

  it('serves the complete gallery once a product is visible', async () => {
    // Galleries are never gated separately (scope §1).
    const product = await fixtureCatalogue.getProduct(premiumOnly.slug, 'premium')
    expect(product).not.toBeNull()
    expect(product!.images.length).toBeGreaterThan(0)
  })
})

/**
 * Blurred teaser tiles (DESIGN.md §6).
 *
 * These assert the two halves of the trade: a locked tile appears for every
 * piece being withheld, and it carries nothing that could identify the piece.
 */
describe('locked teasers', () => {
  it('offers one tile per withheld piece, and none to a premium client', async () => {
    for (const tier of TIERS) {
      const locked = await fixtureCatalogue.listLocked({ tier })
      const allowed = visibleLevels(tier)
      const withheld = products.filter((p) => p.is_active && !allowed.includes(p.visibility))
      expect(locked).toHaveLength(withheld.length)
    }
    expect(await fixtureCatalogue.listLocked({ tier: 'premium' })).toEqual([])
  })

  it('names the level required, so the tile can address the right next step', async () => {
    const asGuest = await fixtureCatalogue.listLocked({ tier: 'guest' })
    expect(asGuest.some((t) => t.requires === 'login_required')).toBe(true)
    expect(asGuest.some((t) => t.requires === 'premium_only')).toBe(true)

    // A registered client is only ever short of premium pieces.
    const asRegistered = await fixtureCatalogue.listLocked({ tier: 'registered' })
    expect(asRegistered.every((t) => t.requires === 'premium_only')).toBe(true)
  })

  /**
   * The whole safety argument for the feature. A tile says "a piece exists
   * here"; anything more would make it a way to identify the piece.
   */
  it('carries no name, slug, id or storage path for the withheld piece', async () => {
    const locked = await fixtureCatalogue.listLocked({ tier: 'guest' })
    expect(locked.length).toBeGreaterThan(0)

    const names = products.map((p) => p.name)
    const slugs = products.map((p) => p.slug)
    const ids = products.map((p) => p.id)

    for (const tile of locked) {
      const serialised = JSON.stringify(tile)
      for (const leak of [...names, ...slugs, ...ids]) {
        expect(serialised).not.toContain(leak)
      }
      // Only these keys, so a future field cannot be added unnoticed.
      expect(Object.keys(tile).sort()).toEqual(['blurPreview', 'category', 'key', 'requires'])
    }
  })

  /**
   * blur_preview is the one piece of the real photograph a locked tile carries,
   * and its size is the entire reason that is safe (migration 0009). A preview
   * large enough to be a usable image would defeat the gating quietly, so the
   * bound is asserted here as well as in the database constraint.
   */
  it('keeps any blur preview too small to be a usable photograph', async () => {
    const locked = await fixtureCatalogue.listLocked({ tier: 'guest' })
    for (const tile of locked) {
      if (tile.blurPreview === null) continue
      expect(tile.blurPreview.startsWith('data:image/jpeg;base64,')).toBe(true)
      expect(tile.blurPreview.length).toBeLessThanOrEqual(4096)
    }
  })

  it('scopes to a category, sub-categories included', async () => {
    const inNecklaces = await fixtureCatalogue.listLocked({ categorySlug: 'necklaces', tier: 'guest' })
    const allNecklaceIds = [
      ...categories.filter((c) => c.slug === 'necklaces').map((c) => c.id),
      ...categories
        .filter((c) => c.parent_id === categories.find((x) => x.slug === 'necklaces')!.id)
        .map((c) => c.id),
    ]
    const withheldThere = products.filter(
      (p) =>
        p.is_active &&
        p.visibility !== 'public' &&
        p.category_id !== null &&
        allNecklaceIds.includes(p.category_id),
    )
    expect(inNecklaces).toHaveLength(withheldThere.length)
  })

  it('returns nothing for an unknown category', async () => {
    expect(await fixtureCatalogue.listLocked({ categorySlug: 'nope', tier: 'guest' })).toEqual([])
  })

  it('honours a limit, so the homepage can show a handful', async () => {
    const some = await fixtureCatalogue.listLocked({ tier: 'guest', limit: 2 })
    expect(some).toHaveLength(2)
  })

  /**
   * Teasers must not reach the search box. A tile appearing for a typed name
   * would confirm the guess was right — the exact oracle the search test
   * below exists to prevent. listLocked takes no `search` option at all, and
   * listProducts still returns nothing forbidden.
   */
  it('does not leak into search results', async () => {
    const asGuest = await fixtureCatalogue.listProducts({ search: 'Padma Bridal Set', tier: 'guest' })
    expect(asGuest).toEqual([])
  })
})

/**
 * is_available is presentational; is_active and visibility are the access
 * controls. The two are one boolean apart in the same table and read almost
 * the same in a diff, so the separation is asserted rather than trusted: the
 * day availability starts filtering listings, the platform has quietly gained
 * a second, weaker gate that no RLS policy knows about. See migration 0010.
 */
describe('availability is not access control', () => {
  it('still lists a piece marked Currently Unavailable', async () => {
    const unavailable = products.filter((p) => p.is_active && !p.is_available)
    expect(unavailable.length).toBeGreaterThan(0)

    for (const piece of unavailable) {
      const listed = await fixtureCatalogue.listProducts({ tier: 'premium' })
      expect(listed.map((p) => p.slug)).toContain(piece.slug)
    }
  })

  it('still opens a piece marked Currently Unavailable', async () => {
    const piece = products.find((p) => p.is_active && !p.is_available)!
    const opened = await fixtureCatalogue.getProduct(piece.slug, 'premium')
    expect(opened).not.toBeNull()
    expect(opened!.is_available).toBe(false)
  })

  it('does not turn an unavailable piece into a locked teaser', async () => {
    // A blurred tile means "you may not see this". An unavailable piece is
    // shown in full to anyone entitled to it.
    const locked = await fixtureCatalogue.listLocked({ tier: 'premium' })
    expect(locked).toEqual([])
  })
})

describe('visibleLevels', () => {
  it('matches public.visible_levels() in the migration', () => {
    expect(visibleLevels('guest')).toEqual(['public'])
    expect(visibleLevels('registered')).toEqual(['public', 'login_required'])
    expect(visibleLevels('premium')).toEqual(['public', 'login_required', 'premium_only'])
  })
})

describe('category scoping', () => {
  it('includes sub-category products when listing a top-level category', async () => {
    // 'necklaces' has sub-categories temple and bridal; a premium viewer must
    // see pieces filed under both.
    const listed = await fixtureCatalogue.listProducts({ categorySlug: 'necklaces', tier: 'premium' })
    const slugs = listed.map((p) => p.slug)
    expect(slugs).toContain('meera-temple-haram') // temple
    expect(slugs).toContain('padma-bridal-set') // bridal
    expect(slugs).toContain('anjali-layered-chain') // directly on necklaces
  })

  it('still applies the access matrix inside a category', async () => {
    const listed = await fixtureCatalogue.listProducts({ categorySlug: 'necklaces', tier: 'guest' })
    expect(listed.every((p) => p.visibility === 'public')).toBe(true)
  })

  it('returns nothing for an unknown category', async () => {
    expect(await fixtureCatalogue.listProducts({ categorySlug: 'nope', tier: 'premium' })).toEqual([])
  })
})

describe('search', () => {
  it('finds a piece by part of its name', async () => {
    const found = await fixtureCatalogue.listProducts({ search: 'temple', tier: 'premium' })
    expect(found.map((p) => p.slug)).toContain('meera-temple-haram')
  })

  it('ignores case and surrounding spaces', async () => {
    const found = await fixtureCatalogue.listProducts({ search: '  TEMPLE  ', tier: 'premium' })
    expect(found.map((p) => p.slug)).toContain('meera-temple-haram')
  })

  /**
   * The point of the whole feature. Searching must not become a way to learn
   * that a premium piece exists: a guest who types its exact name gets the
   * same empty result as someone searching for something that is not there.
   */
  it('does not reveal a premium piece to a guest who knows its exact name', async () => {
    const asPremium = await fixtureCatalogue.listProducts({ search: 'Padma Bridal Set', tier: 'premium' })
    expect(asPremium.map((p) => p.slug)).toEqual(['padma-bridal-set'])

    const asGuest = await fixtureCatalogue.listProducts({ search: 'Padma Bridal Set', tier: 'guest' })
    expect(asGuest).toEqual([])

    const asRegistered = await fixtureCatalogue.listProducts({ search: 'Padma Bridal Set', tier: 'registered' })
    expect(asRegistered).toEqual([])
  })

  it('narrows within a category rather than escaping it', async () => {
    const found = await fixtureCatalogue.listProducts({
      categorySlug: 'necklaces',
      search: 'temple',
      tier: 'premium',
    })
    expect(found.every((p) => p.name.toLowerCase().includes('temple'))).toBe(true)
    expect(found.map((p) => p.slug)).toContain('meera-temple-haram')
  })

  it('an empty search is not a filter', async () => {
    const all = await fixtureCatalogue.listProducts({ tier: 'premium' })
    const blank = await fixtureCatalogue.listProducts({ search: '   ', tier: 'premium' })
    expect(blank.length).toBe(all.length)
  })

  it('returns nothing rather than everything when nothing matches', async () => {
    expect(await fixtureCatalogue.listProducts({ search: 'zzzzz', tier: 'premium' })).toEqual([])
  })
})
