/**
 * Formatting for products.weight_grams (migration 0010).
 *
 * Grams throughout, never converted. A jeweller quotes gold in grams and the
 * client reads it in grams; switching units for large pieces would invite the
 * exact misreading — 1.2 kg against 1.2 g — that a catalogue of gold cannot
 * afford. Indian digit grouping, matching the audience.
 */

const FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 })

/**
 * "84.32 g", or null when there is no weight to show.
 *
 * Null is the common case, not an error: weight is often unknown when a piece
 * is photographed. Callers must render nothing rather than a placeholder — an
 * em dash in a specification row reads as "weighs nothing".
 */
export function formatWeight(grams: number | null | undefined): string | null {
  if (grams === null || grams === undefined) return null
  if (!Number.isFinite(grams) || grams <= 0) return null
  // Trailing zeros are dropped by the formatter, so 46.500 reads as 46.5 —
  // trailing precision the scale did not measure looks invented.
  return `${FORMAT.format(grams)} g`
}
