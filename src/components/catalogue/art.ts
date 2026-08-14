/**
 * Helpers for the placeholder artwork. Kept out of ProductArt.tsx so that file
 * exports components only and stays fast-refresh friendly.
 *
 * Everything here is temporary — it disappears with the placeholders once real
 * photography arrives.
 */

export type ArtKind = 'necklace' | 'bangle' | 'ring' | 'bracelet' | 'default'

const KIND_BY_CATEGORY: Record<string, ArtKind> = {
  necklaces: 'necklace',
  temple: 'necklace',
  bridal: 'necklace',
  bangles: 'bangle',
  kada: 'bangle',
  rings: 'ring',
  solitaire: 'ring',
  bracelets: 'bracelet',
}

export function artKindFor(categorySlug: string | null | undefined): ArtKind {
  return (categorySlug && KIND_BY_CATEGORY[categorySlug]) || 'default'
}

/**
 * Stable per-product starting variant, so two pieces in the same category do
 * not render identical artwork in the grid. Derived from the slug, so a
 * product looks the same on every visit.
 */
export function artOffsetFor(slug: string): number {
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return hash
}
