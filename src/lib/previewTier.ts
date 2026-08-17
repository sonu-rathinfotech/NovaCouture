import type { Tier } from '@/types/db'
import { visibleLevels } from '@/data/catalogue'

/**
 * "View as client" — shows the catalogue as a chosen tier sees it.
 *
 * ── What this is, precisely ─────────────────────────────────────────────────
 * A PREVIEW, not a session. It does not sign anyone in as anyone, it cannot
 * read another client's data, and nothing is done on their behalf. It answers
 * the question an administrator actually has — "what does a registered client
 * see on this page?" — without one account being able to act as another.
 *
 * ── Why it is safe ──────────────────────────────────────────────────────────
 * It works by FILTERING what the database already returned, so it can only
 * ever remove rows, never add them. A client who typed ?preview=premium into
 * the address bar would still be shown only what RLS gives them, minus
 * whatever the filter takes away. There is no path by which this widens
 * access — which is why it does not need to check who is asking.
 *
 * The banner is not decoration: an admin who forgets they are previewing will
 * otherwise report missing products as a bug.
 * ────────────────────────────────────────────────────────────────────────────
 */

const PARAM = 'preview'

function isTier(value: string | null): value is Tier {
  return value === 'guest' || value === 'registered' || value === 'premium'
}

/** Read straight from the URL so it survives a reload and can be shared. */
export function currentPreviewTier(): Tier | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get(PARAM)
  return isTier(value) ? value : null
}

/** Drops anything the previewed tier would not be shown. */
export function applyPreview<T extends { visibility: string }>(rows: T[]): T[] {
  const tier = currentPreviewTier()
  if (!tier) return rows
  const allowed = visibleLevels(tier)
  return rows.filter((row) => allowed.includes(row.visibility as (typeof allowed)[number]))
}

/** True when a single row would be hidden from the previewed tier. */
export function hiddenByPreview(visibility: string): boolean {
  const tier = currentPreviewTier()
  if (!tier) return false
  return !visibleLevels(tier).includes(visibility as ReturnType<typeof visibleLevels>[number])
}

export function exitPreviewUrl(): string {
  if (typeof window === 'undefined') return '/'
  const url = new URL(window.location.href)
  url.searchParams.delete(PARAM)
  return `${url.pathname}${url.search}`
}
