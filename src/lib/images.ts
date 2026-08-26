import { getSupabase } from './supabase'

/**
 * Resolves a storage path to a viewable URL (audit §1).
 *
 * The bucket is private, so a raw path is not a URL — it has to be signed, and
 * Storage will only sign a path the caller is entitled to read. That rule lives
 * in the storage policy from migration 0003, which reuses the same
 * visible_levels() the catalogue uses. Nothing here decides access; if a signed
 * URL comes back, the database allowed it.
 *
 * ── Why this file cares about bandwidth ──────────────────────────────────────
 * A signed URL carries a token in its query string, and the browser's HTTP
 * cache is keyed on the WHOLE url. Sign the same object again and the browser
 * sees a different resource and downloads the bytes again.
 *
 * The cache used to live only in memory, so every reload and every new tab
 * re-signed everything and re-downloaded every photograph. A category page is
 * roughly 14 images at ~250 KB, so a handful of reloads ran into tens of
 * megabytes of egress for pictures the visitor already had.
 *
 * Persisting the URLs — not the images — makes the browser's own cache work:
 * the same URL comes back, so the request carries an If-None-Match and Storage
 * answers 304 with no image attached. Measured: signed-URL responses here have
 * an ETag but no cache-control, so revalidation is what saves the bandwidth
 * rather than outright cache hits. Either way the bytes are not sent twice.
 *
 * ── Why the persisted cache is tied to an account ────────────────────────────
 * A signed URL is a bearer token for one image until it expires. localStorage
 * outlives a tab, so a premium client's URLs must not be readable by whoever
 * uses the browser next. Every entry records who obtained it, and entries are
 * only used when the current session matches. Signing out clears the store
 * outright; this is the belt for when a tab is simply closed instead.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * An hour. Long enough that reloading, opening a piece and coming back costs
 * no bandwidth; short enough that a URL pasted into a chat is dead by the time
 * it is opened.
 *
 * Raising this saves more bandwidth and lengthens the life of a leaked URL, in
 * direct proportion. It is the one dial in this file worth arguing about.
 */
const TTL_SECONDS = 3600

/** Re-sign this far ahead of expiry rather than at it. */
const REFRESH_MARGIN_MS = 60_000

const STORE_KEY = 'nova.imageUrls.v1'

interface CacheEntry {
  url: string
  expiresAt: number
  /** auth.uid(), or 'guest'. Entitlement belongs to a person, not a browser. */
  owner: string
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string | null>>()

/** Who the current session is. Set by SessionProvider on every auth change. */
let owner = 'guest'

function readStore(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return
    const entries = JSON.parse(raw) as Record<string, CacheEntry>
    const now = Date.now()
    for (const [path, entry] of Object.entries(entries)) {
      // Expired entries are not worth carrying, and an entry belonging to
      // someone else must never be loaded in the first place.
      if (entry.expiresAt > now && entry.owner === owner) cache.set(path, entry)
    }
  } catch {
    // Corrupt or unreadable store. Losing the cache costs bandwidth, not
    // correctness, so there is nothing to report.
    localStorage.removeItem(STORE_KEY)
  }
}

function writeStore(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {
    /* Quota. The in-memory cache still works. */
  }
}

/**
 * Tells the cache who is signed in.
 *
 * Called on every auth change, before anything is signed. Changing owner drops
 * everything: a URL obtained as a premium client must not survive into a guest
 * session, and one obtained as a guest is no use to a premium client anyway.
 */
export function setImageCacheOwner(userId: string | null): void {
  const next = userId ?? 'guest'
  if (next === owner) return

  owner = next
  cache.clear()
  inflight.clear()

  /*
   * Read, then write back.
   *
   * readStore keeps only entries belonging to the new owner, so writing
   * immediately afterwards drops the previous owner's URLs from disk while
   * preserving this owner's — which is the entire point of persisting.
   *
   * Clearing the store here instead, as this first did, deleted the very
   * entries it was about to load. Every reload then re-signed everything and
   * the browser re-downloaded every photograph: the bug this cache exists to
   * prevent, reintroduced by the code meant to prevent it.
   */
  readStore()
  writeStore()
}

/** Placeholder rows still point at the bundled sample photography. */
export function isPlaceholderPath(storagePath: string): boolean {
  return storagePath.startsWith('seed/')
}

export async function resolveImageUrl(storagePath: string): Promise<string | null> {
  if (isPlaceholderPath(storagePath)) return null

  const cached = cache.get(storagePath)
  if (
    cached &&
    cached.owner === owner &&
    cached.expiresAt - REFRESH_MARGIN_MS > Date.now()
  ) {
    return cached.url
  }

  // Collapse concurrent requests for the same path — a gallery mounts several
  // components at once and would otherwise sign the same object repeatedly.
  const pending = inflight.get(storagePath)
  if (pending) return pending

  const signingFor = owner

  const request = (async () => {
    const { data, error } = await getSupabase()
      .storage.from('product-images')
      .createSignedUrl(storagePath, TTL_SECONDS)

    if (error || !data?.signedUrl) {
      // Not entitled, or the object is missing. Both are "no image" — the
      // caller must not be able to tell which.
      return null
    }

    // The session can change while a request is in flight. Storing the result
    // under the new owner would hand one account's URL to another.
    if (signingFor !== owner) return data.signedUrl

    cache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
      owner: signingFor,
    })
    writeStore()
    return data.signedUrl
  })().finally(() => inflight.delete(storagePath))

  inflight.set(storagePath, request)
  return request
}

/** Signing many paths at once, for a gallery. */
export async function resolveImageUrls(paths: string[]): Promise<Map<string, string>> {
  const resolved = await Promise.all(
    paths.map(async (p) => [p, await resolveImageUrl(p)] as const),
  )
  const out = new Map<string, string>()
  for (const [path, url] of resolved) if (url) out.set(path, url)
  return out
}

/** Drop cached URLs when the session changes — entitlement may have changed. */
export function clearImageUrlCache(): void {
  cache.clear()
  inflight.clear()
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORE_KEY)
}

/** Test seam. Not for application code. */
export const __imageCacheInternals = {
  size: () => cache.size,
  owner: () => owner,
  load: readStore,
  reset: () => {
    cache.clear()
    inflight.clear()
    owner = 'guest'
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORE_KEY)
  },
}
