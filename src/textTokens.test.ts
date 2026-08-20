import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * A size token must never be written as `text-[var(--text-…)]`.
 *
 * ── The bug this exists to prevent ───────────────────────────────────────────
 * `text-[…]` is ambiguous in Tailwind: it sets either font-size or colour, and
 * with a CSS variable Tailwind cannot tell which is meant. It guesses colour.
 *
 * So `text-[var(--text-body-lg)]` compiled to `color: var(--text-body-lg)` —
 * colour set to `1.125rem`. That is invalid, so the browser discards it and the
 * element inherits its colour instead. And because the generated rule landed
 * *after* the real colour rule with identical specificity, it also destroyed
 * whatever `text-[var(--base-200)]` on the same element was trying to do.
 *
 * On the home page that meant the hero paragraph rendered in inherited dark
 * text on a dark photograph: invisible. It shipped, and it took a person
 * looking at the screen to find it — typecheck, lint and every test passed,
 * because nothing here is a type error or a runtime error. It is valid CSS
 * that means the wrong thing.
 *
 * The fix is the explicit hint, `text-[length:var(--text-body-lg)]`, which is
 * what this test enforces. 37 occurrences across 13 files were wrong at once,
 * so the convention needs a guard rather than vigilance.
 */
const AMBIGUOUS = /text-\[var\(--text-[a-z0-9-]+\)\]/g

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) sourceFiles(path, found)
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts')) found.push(path)
  }
  return found
}

describe('typography tokens', () => {
  const root = resolve(__dirname)
  const files = sourceFiles(root)

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  it('never uses a size token where Tailwind will read it as a colour', () => {
    const offenders: string[] = []

    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const match of line.matchAll(AMBIGUOUS)) {
            offenders.push(`${file.slice(root.length + 1)}:${i + 1}  ${match[0]}`)
          }
        })
    }

    expect(offenders).toEqual([])
  })

  /** The pattern has to actually match the broken form, or it guards nothing. */
  it('the pattern recognises the mistake it is looking for', () => {
    expect('text-[var(--text-body-lg)]'.match(AMBIGUOUS)).not.toBeNull()
    expect('text-[var(--text-h1)]'.match(AMBIGUOUS)).not.toBeNull()
    // The corrected form, and genuine colour tokens, must not be flagged.
    expect('text-[length:var(--text-body-lg)]'.match(AMBIGUOUS)).toBeNull()
    expect('text-[var(--color-fg-muted)]'.match(AMBIGUOUS)).toBeNull()
    expect('text-[var(--base-200)]'.match(AMBIGUOUS)).toBeNull()
  })
})
