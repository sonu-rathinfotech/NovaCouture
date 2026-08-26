import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Nothing may claim something about Nova Couture that Nova Couture has not said.
 *
 * This is not hypothetical tidiness. Adapting an existing jewellery UI brought
 * in, and published to real customers: BIS hallmark certification (a legal
 * certification in India), a lifetime warranty, insured shipping, a 30-day
 * exchange policy, a personal concierge, a founding year, and social links
 * pointing at Instagram's own front page. All of it read as fact.
 *
 * The lesson is in how it arrived, not what it said — it came with a design
 * port, in files nobody was reviewing for factual accuracy. The next port can
 * do the same. So the check is mechanical.
 *
 * If Nova Couture does offer any of this, say so — in their words, once someone there has
 * confirmed that specific claim, and then add it to ALLOWED with a note naming
 * who confirmed it and when.
 */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /BIS[\s-]?Hallmark/i, why: 'a legal certification claim' },
  { pattern: /lifetime warranty/i, why: 'a contractual promise' },
  { pattern: /insured shipping/i, why: 'a shipping promise; the scope has no shipping' },
  { pattern: /\b30[\s-]day (returns?|exchange)/i, why: 'a returns policy' },
  { pattern: /easy returns/i, why: 'a returns policy' },
  { pattern: /personal concierge/i, why: 'a service promise' },
  { pattern: /since 19\d\d/i, why: 'a founding date' },
  { pattern: /hallmark certified/i, why: 'a certification claim' },
  { pattern: /https:\/\/(www\.)?(instagram|facebook|youtube|x)\.com['"]/i, why: 'a social link that is not Nova Couture own' },
]

/** Claims Nova Couture has confirmed. Add here, with who confirmed it and when. */
const ALLOWED: RegExp[] = []

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (/\.(tsx?|css)$/.test(entry) && !entry.endsWith('.test.ts')) found.push(path)
  }
  return found
}

/**
 * Blanks out comments while keeping the line count, so an offender can still be
 * reported by line number. Needed because the comments explaining why each
 * claim was REMOVED necessarily quote the claim — without this the check
 * reports itself.
 */
function stripComments(source: string): string[] {
  const blank = (block: string) => (block.match(/\r?\n/g) ?? []).map(() => '').join('\n')
  const withoutBlocks = source.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, blank)
  return withoutBlocks.split('\n').map((line) => line.replace(/\/\/.*$/, ''))
}

describe('the site makes no claim Nova Couture has not made', () => {
  const files = sourceFiles(resolve(__dirname))

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  it('the comment stripper does not hide real code', () => {
    const lines = stripComments('const a = 1\n/* BIS Hallmarked */\nconst b = "BIS Hallmarked"')
    expect(lines[0]).toContain('const a')
    expect(lines[1]).not.toContain('BIS')
    expect(lines[2]).toContain('BIS')
  })

  for (const { pattern, why } of FORBIDDEN) {
    it(`does not claim ${pattern.source} — ${why}`, () => {
      const offenders: string[] = []

      for (const file of files) {
        for (const [i, line] of stripComments(readFileSync(file, 'utf8')).entries()) {
          if (!pattern.test(line)) continue
          if (ALLOWED.some((ok) => ok.test(line))) continue
          offenders.push(`${file.slice(__dirname.length + 1)}:${i + 1}`)
        }
      }

      expect(offenders).toEqual([])
    })
  }
})
