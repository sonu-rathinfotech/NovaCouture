import { describe, expect, it } from 'vitest'
import { formatWeight } from './weight'

/**
 * The failure that matters here is a piece appearing to weigh nothing.
 * `weight_grams` is null far more often than not — the weight is usually
 * unknown when a piece is photographed — so every caller depends on null
 * coming back for "nothing to show", never a "0 g" or an em dash.
 */
describe('formatWeight', () => {
  it('shows grams', () => {
    expect(formatWeight(84.32)).toBe('84.32 g')
  })

  it('returns null when there is no weight, so callers render nothing', () => {
    expect(formatWeight(null)).toBeNull()
    expect(formatWeight(undefined)).toBeNull()
  })

  it('treats zero and negatives as no weight rather than printing them', () => {
    // The database constraint forbids both, but a formatter that prints
    // "0 g" turns one bad row into a piece that claims to be weightless.
    expect(formatWeight(0)).toBeNull()
    expect(formatWeight(-5)).toBeNull()
  })

  it('drops precision the scale did not measure', () => {
    // 46.500 reads as though it were weighed to the milligram.
    expect(formatWeight(46.5)).toBe('46.5 g')
    expect(formatWeight(84)).toBe('84 g')
  })

  it('keeps milligrams when they are real', () => {
    expect(formatWeight(3.905)).toBe('3.905 g')
  })

  it('groups a heavy piece for legibility', () => {
    expect(formatWeight(1204.5)).toBe('1,204.5 g')
  })

  it('never converts to kilograms', () => {
    // 1.2 kg against 1.2 g is the one misreading a gold catalogue cannot
    // afford, so the unit never changes underneath the number.
    expect(formatWeight(1500)).toContain(' g')
    expect(formatWeight(1500)).not.toContain('kg')
  })

  it('survives a NaN rather than printing it', () => {
    expect(formatWeight(Number.NaN)).toBeNull()
    expect(formatWeight(Number.POSITIVE_INFINITY)).toBeNull()
  })
})
