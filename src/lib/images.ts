import { getSupabase } from './supabase'

/**
 * Resolves a storage path to a viewable URL (audit §1).
 *
 * The bucket is private, so a raw path is not a URL — it has to be signed, and
 * Storage will only sign a path the caller is entitled to read. That rule lives
 * in the storage policy added by migration 0002, which reuses the same
 * visible_levels() the catalogue uses. Nothing here decides access; if a signed
 * URL comes back, the database allowed it.
 *
 * Signed URLs expire, so they are cached with a margin and re-signed before the
 * browser can request a dead one — an expired URL renders as a broken image,
 * which is a bad way to find out about a timing bug.
 */

/** Long enough to browse a gallery, short enough to be useless if shared. */
const TTL_SECONDS = 600

/** Re-sign this far ahead of expiry rather than at it. */
const REFRESH_MARGIN_MS = 60_000

interface CacheEntry {
  url: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string | null>>()

/** Placeholder rows still point at the bundled sample photography. */
export function isPlaceholderPath(storagePath: string): boolean {
  return storagePath.startsWith('seed/')
}

export async function resolveImageUrl(storagePath: string): Promise<string | null> {
  if (isPlaceholderPath(storagePath)) return null

  const cached = cache.get(storagePath)
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.url

  // Collapse concurrent requests for the same path — a gallery mounts several
  // components at once and would otherwise sign the same object repeatedly.
  const pending = inflight.get(storagePath)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await getSupabase()
      .storage.from('product-images')
      .createSignedUrl(storagePath, TTL_SECONDS)

    if (error || !data?.signedUrl) {
      // Not entitled, or the object is missing. Both are "no image" — the
      // caller must not be able to tell which.
      return null
    }

    cache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    })
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
}
