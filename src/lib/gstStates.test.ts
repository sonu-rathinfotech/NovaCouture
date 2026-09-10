import { describe, expect, it } from 'vitest'
import { GST_STATES, looksLikeGstin, stateForCode, stateFromGstin } from './gstStates'

/**
 * The state code and the GSTIN have to agree, because place of supply on the
 * proforma is derived from them. A mismatch is not cosmetic: it is the buyer's
 * accounts department reconciling a document against the wrong state.
 */
describe('GST state list', () => {
  it('holds the real company state', () => {
    // From the registration certificate: 27AALCN6631N1ZU, Maharashtra.
    expect(stateForCode('27')?.name).toBe('Maharashtra')
  })

  it('uses two-digit codes throughout, including the leading zero', () => {
    // '1' instead of '01' would silently fail every lookup for the first nine
    // states, and a GSTIN's first two characters are always two digits.
    for (const state of GST_STATES) {
      expect(state.code).toMatch(/^\d{2}$/)
    }
  })

  it('has no duplicate codes or names', () => {
    expect(new Set(GST_STATES.map((s) => s.code)).size).toBe(GST_STATES.length)
    expect(new Set(GST_STATES.map((s) => s.name)).size).toBe(GST_STATES.length)
  })

  it('returns nothing for a code that is not a state', () => {
    expect(stateForCode('99')).toBeUndefined()
    expect(stateForCode('')).toBeUndefined()
    expect(stateForCode(null)).toBeUndefined()
  })

  it('omits 25 and 28, which were merged away', () => {
    // 25 (Daman & Diu) folded into 26; 28 (undivided Andhra Pradesh) became
    // 37 and 36. Offering them would let someone pick a dead code.
    expect(stateForCode('25')).toBeUndefined()
    expect(stateForCode('28')).toBeUndefined()
  })
})

describe('stateFromGstin', () => {
  it('reads the state from the first two digits', () => {
    expect(stateFromGstin('27AALCN6631N1ZU')?.name).toBe('Maharashtra')
    expect(stateFromGstin('29AAAAA0000A1Z5')?.name).toBe('Karnataka')
  })

  it('works on a part-typed number, so the state can fill in as it is entered', () => {
    expect(stateFromGstin('27')?.name).toBe('Maharashtra')
  })

  it('returns nothing rather than guessing', () => {
    expect(stateFromGstin('')).toBeUndefined()
    expect(stateFromGstin('2')).toBeUndefined()
    expect(stateFromGstin(null)).toBeUndefined()
    expect(stateFromGstin('99AAAAA0000A1Z5')).toBeUndefined()
  })
})

describe('looksLikeGstin', () => {
  it('accepts the real registration number', () => {
    expect(looksLikeGstin('27AALCN6631N1ZU')).toBe(true)
  })

  it('accepts a lower-case entry, since the form upper-cases it', () => {
    expect(looksLikeGstin('27aalcn6631n1zu')).toBe(true)
  })

  it('rejects anything of the wrong shape', () => {
    expect(looksLikeGstin('')).toBe(false)
    expect(looksLikeGstin('27AALCN6631N1Z')).toBe(false) // 14 characters
    expect(looksLikeGstin('27AALCN6631N1ZUX')).toBe(false) // 16
    expect(looksLikeGstin('AALCN6631N1ZU27')).toBe(false) // PAN first
    expect(looksLikeGstin('27AALCN6631N1YU')).toBe(false) // 14th is not Z
  })

  it('ignores surrounding spaces, which are pasted in constantly', () => {
    expect(looksLikeGstin('  27AALCN6631N1ZU  ')).toBe(true)
  })
})
