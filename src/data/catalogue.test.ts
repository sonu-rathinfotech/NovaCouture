import { describe, expect, it } from 'vitest'
import { fixtureCatalogue, selectCatalogue, supabaseCatalogue, visibleLevels } from './catalogue'
import { products } from './fixtures'
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
