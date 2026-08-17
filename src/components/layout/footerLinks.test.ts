import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Every internal link in the footer must resolve to a real route.
 *
 * The footer had five links to pages that were never built — Certification
 * Guide, Care & Repair, Custom Orders, FAQs, Cookie Policy — plus two anchors
 * to sections that do not exist. It appears on every page, so that was a wall
 * of 404s on the whole site, which reads as an abandoned shop.
 *
 * They arrived with a design port, as plausible-looking labels. Nobody clicks
 * every footer link, so the check has to be mechanical.
 */
const src = (file: string) => readFileSync(resolve(__dirname, file), 'utf8')

function declaredRoutes(): Set<string> {
  const app = src('../../App.tsx')
  const paths = [...app.matchAll(/path="([^"*:]+)"/g)].map((m) => m[1])
  return new Set(paths.map((p) => (p.startsWith('/') ? p : `/${p}`)))
}

function footerTargets(): string[] {
  return [...src('./Footer.tsx').matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1])
}

describe('footer links', () => {
  const routes = declaredRoutes()

  it('reads both files', () => {
    expect(routes.size).toBeGreaterThan(5)
    expect(footerTargets().length).toBeGreaterThan(3)
  })

  it('points only at routes that exist', () => {
    const broken = footerTargets()
      .filter((to) => to.startsWith('/'))
      // The bare path, ignoring any #anchor, has to be a declared route.
      .filter((to) => !routes.has(to.split('#')[0] || '/'))

    expect(broken).toEqual([])
  })

  /**
   * An #anchor is a promise that the page has that section. Landing at the top
   * of the page instead is a broken link that does not look broken.
   */
  it('does not link to an anchor that is not on the target page', () => {
    const pages = src('../../content/staticPages.ts')
    const dangling = footerTargets()
      .filter((to) => to.includes('#'))
      .filter((to) => !pages.includes(`id="${to.split('#')[1]}"`))

    expect(dangling).toEqual([])
  })
})
