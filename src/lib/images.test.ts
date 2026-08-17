import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * The cache exists to stop the site paying for the same photograph twice, and
 * to make sure it never hands one account's URL to another.
 *
 * A signed URL carries a token, and the browser caches on the whole URL, so
 * re-signing the same object means re-downloading the bytes. Keeping the URL
 * stable across a reload is the whole saving — and the reason it is persisted,
 * which is what makes the ownership rules below load-bearing rather than tidy.
 */

const signed = vi.fn()
vi.mock('./supabase', () => ({
  getSupabase: () => ({
    storage: { from: () => ({ createSignedUrl: signed }) },
  }),
}))

// node, not a browser: stand up the one API the module persists through.
function fakeLocalStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    get size() {
      return map.size
    },
  }
}

let store: ReturnType<typeof fakeLocalStorage>

beforeEach(async () => {
  store = fakeLocalStorage()
  vi.stubGlobal('localStorage', store)
  signed.mockReset()
  signed.mockImplementation((path: string) =>
    Promise.resolve({ data: { signedUrl: `https://cdn/${path}?token=${signed.mock.calls.length}` }, error: null }),
  )
  const mod = await import('./images')
  mod.__imageCacheInternals.reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('signing is not repeated', () => {
  it('signs an object once and reuses the URL', async () => {
    const { resolveImageUrl } = await import('./images')

    const first = await resolveImageUrl('products/abc/1.jpg')
    const second = await resolveImageUrl('products/abc/1.jpg')

    expect(first).toBe(second)
    expect(signed).toHaveBeenCalledTimes(1)
  })

  it('collapses a gallery mounting all at once into one request per object', async () => {
    const { resolveImageUrls } = await import('./images')

    await resolveImageUrls(['products/abc/1.jpg', 'products/abc/1.jpg', 'products/abc/2.jpg'])

    expect(signed).toHaveBeenCalledTimes(2)
  })

  it('never signs a placeholder row', async () => {
    const { resolveImageUrl } = await import('./images')
    expect(await resolveImageUrl('seed/meera-temple-haram-1.jpg')).toBeNull()
    expect(signed).not.toHaveBeenCalled()
  })
})

describe('surviving a reload', () => {
  /** The saving. A reload that re-signs is a reload that re-downloads. */
  it('returns the same URL after the module is reloaded', async () => {
    const first = await import('./images')
    first.setImageCacheOwner('user-1')
    const before = await first.resolveImageUrl('products/abc/1.jpg')

    // A reload: fresh module, same localStorage.
    vi.resetModules()
    const second = await import('./images')
    second.setImageCacheOwner('user-1')

    const after = await second.resolveImageUrl('products/abc/1.jpg')

    expect(after).toBe(before)
    expect(signed).toHaveBeenCalledTimes(1)
  })

  it('re-signs once the stored URL has expired', async () => {
    const first = await import('./images')
    first.setImageCacheOwner('user-1')
    await first.resolveImageUrl('products/abc/1.jpg')

    // Past the hour.
    vi.setSystemTime(Date.now() + 3_601_000)

    vi.resetModules()
    const second = await import('./images')
    second.setImageCacheOwner('user-1')
    await second.resolveImageUrl('products/abc/1.jpg')

    expect(signed).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('a URL belongs to an account, not a browser', () => {
  it('does not give a premium client URL to whoever signs in next', async () => {
    const mod = await import('./images')

    mod.setImageCacheOwner('premium-client')
    const premiumUrl = await mod.resolveImageUrl('products/premium-piece/1.jpg')

    mod.setImageCacheOwner('other-client')
    const otherUrl = await mod.resolveImageUrl('products/premium-piece/1.jpg')

    expect(otherUrl).not.toBe(premiumUrl)
    expect(signed).toHaveBeenCalledTimes(2)
  })

  /**
   * The case the persistence created: a tab closed without signing out leaves
   * the URLs on disk. A later guest must not be able to load them.
   */
  it('ignores stored URLs belonging to someone else after a reload', async () => {
    const first = await import('./images')
    first.setImageCacheOwner('premium-client')
    await first.resolveImageUrl('products/premium-piece/1.jpg')

    vi.resetModules()
    const second = await import('./images')
    // A guest arrives — owner stays at its default.
    second.__imageCacheInternals.load()

    expect(second.__imageCacheInternals.size()).toBe(0)
    expect(second.__imageCacheInternals.owner()).toBe('guest')
  })

  it('signing out empties the store', async () => {
    const mod = await import('./images')
    mod.setImageCacheOwner('premium-client')
    await mod.resolveImageUrl('products/premium-piece/1.jpg')
    expect(store.size).toBe(1)

    mod.clearImageUrlCache()

    expect(store.size).toBe(0)
    expect(mod.__imageCacheInternals.size()).toBe(0)
  })
})
