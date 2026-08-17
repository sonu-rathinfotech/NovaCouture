import { describe, it, expect } from 'vitest'
import { escapeLike } from './escapeLike'

describe('escapeLike', () => {
  it('leaves an ordinary search alone', () => {
    expect(escapeLike('temple haram')).toBe('temple haram')
  })

  it('escapes the wildcard that would otherwise match the whole catalogue', () => {
    expect(escapeLike('%')).toBe('\\%')
  })

  it('escapes the single-character wildcard', () => {
    expect(escapeLike('a_b')).toBe('a\\_b')
  })

  // The escape character has to be dealt with in the same pass, or escaping
  // the wildcards puts new ones back in.
  it('escapes its own escape character', () => {
    expect(escapeLike('\\')).toBe('\\\\')
    expect(escapeLike('\\%')).toBe('\\\\\\%')
  })
})
