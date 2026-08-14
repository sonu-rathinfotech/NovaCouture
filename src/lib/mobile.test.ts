import { describe, expect, it } from 'vitest'
import { normaliseMobile, formatMobile } from './mobile'

/**
 * The unique index on profiles.mobile is only meaningful if every one of these
 * inputs collapses to the same stored value. If normalisation is wrong, the
 * same person can hold two accounts and "one account per number" (scope §B)
 * quietly stops being true.
 */
describe('normaliseMobile', () => {
  const SAME = [
    '9876543210',
    '98765 43210',
    '98765-43210',
    '+91 98765 43210',
    '+919876543210',
    '919876543210',
    '09876543210',
    '  9876543210  ',
    '(98765) 43210',
  ]

  for (const input of SAME) {
    it(`normalises ${JSON.stringify(input)} to +919876543210`, () => {
      const result = normaliseMobile(input)
      expect(result.ok).toBe(true)
      expect(result.value).toBe('+919876543210')
    })
  }

  it('produces exactly one distinct value across all spellings', () => {
    const values = new Set(SAME.map((s) => normaliseMobile(s).value))
    expect(values.size).toBe(1)
  })

  it('accepts an explicit non-Indian country code', () => {
    expect(normaliseMobile('+14155552671').value).toBe('+14155552671')
  })

  const REJECT = ['', '   ', 'abcdefghij', '12345', '987654321', '98765432101', '+0123456789']

  for (const input of REJECT) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      expect(normaliseMobile(input).ok).toBe(false)
    })
  }

  it('always returns a value matching the database CHECK constraint', () => {
    for (const input of SAME) {
      const { value } = normaliseMobile(input)
      expect(value).toMatch(/^\+[1-9]\d{7,14}$/)
    }
  })
})

describe('formatMobile', () => {
  it('formats for display without changing what is stored', () => {
    expect(formatMobile('+919876543210')).toBe('+91 98765 43210')
  })

  it('returns the input unchanged when it does not fit the pattern', () => {
    expect(formatMobile('+14155552671')).toBe('+1 41555 52671')
    expect(formatMobile('not-a-number')).toBe('not-a-number')
  })
})
