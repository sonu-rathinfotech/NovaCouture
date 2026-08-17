import { describe, it, expect, afterEach } from 'vitest'
import { applyPreview, hiddenByPreview, currentPreviewTier, exitPreviewUrl } from './previewTier'

// These tests run in node, not a browser. Rather than pull in jsdom for one
// file, stand up the two properties the module actually reads.
function at(search: string) {
  ;(globalThis as unknown as { window: unknown }).window = {
    location: { search, href: `https://vk.example/catalogue${search}` },
  }
}
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
})

const rows = [
  { slug: 'a', visibility: 'public' },
  { slug: 'b', visibility: 'login_required' },
  { slug: 'c', visibility: 'premium_only' },
]

describe('view as client', () => {
  it('is off unless the URL asks for it', () => {
    at('')
    expect(currentPreviewTier()).toBeNull()
    expect(applyPreview(rows)).toHaveLength(3)
  })

  it('ignores a tier it does not recognise rather than hiding everything', () => {
    at('?preview=vip')
    expect(currentPreviewTier()).toBeNull()
    expect(applyPreview(rows)).toHaveLength(3)
  })

  it('shows a guest only public pieces', () => {
    at('?preview=guest')
    expect(applyPreview(rows).map((r) => r.slug)).toEqual(['a'])
  })

  it('shows a registered client public and login-required pieces', () => {
    at('?preview=registered')
    expect(applyPreview(rows).map((r) => r.slug)).toEqual(['a', 'b'])
  })

  it('shows a premium client everything', () => {
    at('?preview=premium')
    expect(applyPreview(rows).map((r) => r.slug)).toEqual(['a', 'b', 'c'])
  })

  // The safety property the whole design rests on. If a preview could ever
  // return a row the database did not, it would be an access-control hole
  // rather than a viewing aid.
  it('can only ever remove rows, never add or reorder them', () => {
    for (const tier of ['guest', 'registered', 'premium']) {
      at(`?preview=${tier}`)
      const out = applyPreview(rows)
      expect(out.length).toBeLessThanOrEqual(rows.length)
      expect(rows.filter((r) => out.includes(r))).toEqual(out)
    }
  })

  it('hides a single product the previewed tier could not open', () => {
    at('?preview=registered')
    expect(hiddenByPreview('premium_only')).toBe(true)
    expect(hiddenByPreview('login_required')).toBe(false)
    at('')
    expect(hiddenByPreview('premium_only')).toBe(false)
  })

  it('leaves the rest of the query string alone when exiting', () => {
    at('?preview=premium&sort=newest')
    expect(exitPreviewUrl()).toBe('/catalogue?sort=newest')
  })
})
