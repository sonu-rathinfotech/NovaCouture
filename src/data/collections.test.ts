import { describe, expect, it } from 'vitest'
import { fixtureCollections, FIXTURE_COLLECTION_TOKEN } from './collections'

/**
 * Curated links carry no authority of their own (scope §G).
 *
 * A link sent to a client will get forwarded — that is what clients do with
 * things they like. These tests pin down that forwarding it leaks nothing, and
 * that a wrong token is indistinguishable from a refused one.
 */
describe('curated collection access', () => {
  it('opens for a premium client', async () => {
    const result = await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'premium')
    expect(result.status).toBe('ok')
  })

  it('includes the welcome message and the curated products, in order', async () => {
    const result = await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'premium')
    if (result.status !== 'ok') throw new Error('expected the collection to open')

    expect(result.collection.welcomeMessage).toBeTruthy()
    expect(result.collection.products.map((p) => p.slug)).toEqual([
      'padma-bridal-set',
      'heritage-polki-suite',
      'meera-temple-haram',
    ])
  })

  it('refuses a guest holding a valid token', async () => {
    expect((await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'guest')).status).toBe('denied')
  })

  it('refuses a registered non-premium user holding a valid token', async () => {
    expect((await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'registered')).status).toBe('denied')
  })

  it('gives the same answer for a wrong token as for a refused one', async () => {
    // If these differed, guessing tokens would reveal which ones are real.
    const refused = await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'guest')
    const unknown = await fixtureCollections.open('not-a-real-token', 'guest')
    const unknownButPremium = await fixtureCollections.open('not-a-real-token', 'premium')

    expect(refused).toEqual(unknown)
    expect(refused).toEqual(unknownButPremium)
  })

  it('never returns product data on a denial', async () => {
    for (const tier of ['guest', 'registered'] as const) {
      const result = await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, tier)
      expect(JSON.stringify(result)).not.toContain('padma-bridal-set')
    }
  })

  it('serves the full gallery of each curated piece', async () => {
    // Galleries are never gated separately (scope §1).
    const result = await fixtureCollections.open(FIXTURE_COLLECTION_TOKEN, 'premium')
    if (result.status !== 'ok') throw new Error('expected the collection to open')

    for (const product of result.collection.products) {
      expect(product.images.length).toBeGreaterThan(0)
    }
  })

  it('does not throw when recording a view', async () => {
    await expect(fixtureCollections.recordView(FIXTURE_COLLECTION_TOKEN)).resolves.toBeUndefined()
  })
})
