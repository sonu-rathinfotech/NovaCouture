import { describe, expect, it } from 'vitest'
import {
  WATERMARK_DEFAULTS,
  WATERMARK_POSITIONS,
  normaliseWatermarkSettings,
  watermarkPlacements,
} from './watermark-placement.mjs'

/**
 * This module decides where the mark lands. It is shared by the browser
 * uploader and the Node tooling precisely so the same photograph is marked the
 * same way whichever door it came in through, which makes it worth pinning.
 *
 * A photograph is marked once, permanently, with no unmarked original kept.
 * There is no second chance to get the geometry right, so the cases below are
 * about what would silently ruin a client's catalogue: a mark off the edge of
 * the frame, one that ignores the size they chose, or one that squashes the
 * logo out of shape.
 */

const LANDSCAPE = { w: 2000, h: 1200 }
const PORTRAIT = { w: 1200, h: 1500 }
const LOGO = { w: 450, h: 160 }

const place = (img, settings) =>
  watermarkPlacements(img.w, img.h, LOGO.w, LOGO.h, settings)

describe('watermark placement', () => {
  it('sizes the mark against the width, as a percentage', () => {
    const [at] = place(LANDSCAPE, { position: 'bottom-right', sizePercent: 20 })
    expect(at.width).toBeCloseTo(400)
  })

  it('keeps the logo aspect ratio', () => {
    // A stretched logo is worse than no logo: it is the client's identity,
    // burned permanently into every photograph.
    for (const img of [LANDSCAPE, PORTRAIT]) {
      const [at] = place(img, { position: 'center', sizePercent: 30 })
      expect(at.width / at.height).toBeCloseTo(LOGO.w / LOGO.h, 5)
    }
  })

  it('keeps every corner placement inside the frame', () => {
    for (const position of ['bottom-right', 'bottom-left', 'top-right', 'top-left']) {
      const [at] = place(LANDSCAPE, { position, sizePercent: 22 })
      expect(at.x).toBeGreaterThanOrEqual(0)
      expect(at.y).toBeGreaterThanOrEqual(0)
      expect(at.x + at.width).toBeLessThanOrEqual(LANDSCAPE.w)
      expect(at.y + at.height).toBeLessThanOrEqual(LANDSCAPE.h)
    }
  })

  it('puts each corner where its name says', () => {
    const mid = { x: LANDSCAPE.w / 2, y: LANDSCAPE.h / 2 }
    const at = (p) => place(LANDSCAPE, { position: p, sizePercent: 20 })[0]

    expect(at('top-left').x).toBeLessThan(mid.x)
    expect(at('top-left').y).toBeLessThan(mid.y)
    expect(at('bottom-right').x).toBeGreaterThan(mid.x)
    expect(at('bottom-right').y).toBeGreaterThan(mid.y)
    expect(at('top-right').x).toBeGreaterThan(mid.x)
    expect(at('top-right').y).toBeLessThan(mid.y)
    expect(at('bottom-left').x).toBeLessThan(mid.x)
    expect(at('bottom-left').y).toBeGreaterThan(mid.y)
  })

  it('centres the centre placement', () => {
    const [at] = place(LANDSCAPE, { position: 'center', sizePercent: 40 })
    expect(at.x + at.width / 2).toBeCloseTo(LANDSCAPE.w / 2)
    expect(at.y + at.height / 2).toBeCloseTo(LANDSCAPE.h / 2)
  })

  it('covers the whole frame when tiled', () => {
    const tiles = place(LANDSCAPE, { position: 'tiled', sizePercent: 20 })
    expect(tiles.length).toBeGreaterThan(4)
    // Deliberately overhangs: a tile stopping at the edge leaves a clean
    // unmarked border to crop to.
    expect(Math.min(...tiles.map((t) => t.x))).toBeLessThan(0)
    expect(Math.min(...tiles.map((t) => t.y))).toBeLessThan(0)
    expect(Math.max(...tiles.map((t) => t.x + t.width))).toBeGreaterThan(LANDSCAPE.w)
    expect(Math.max(...tiles.map((t) => t.y + t.height))).toBeGreaterThan(LANDSCAPE.h)
  })

  it('offsets alternate tile rows', () => {
    // Aligned columns give a cropper a clean vertical channel between marks.
    const tiles = place(LANDSCAPE, { position: 'tiled', sizePercent: 20 })
    const rows = [...new Set(tiles.map((t) => Math.round(t.y)))].sort((a, b) => a - b)
    const xsOf = (y) => tiles.filter((t) => Math.round(t.y) === y).map((t) => Math.round(t.x))
    expect(xsOf(rows[0])).not.toEqual(xsOf(rows[1]))
  })
})

describe('normaliseWatermarkSettings', () => {
  it('falls back rather than throwing on rubbish', () => {
    // A bad setting should mark the photograph conservatively, not fail the
    // upload and lose the client's work.
    const s = normaliseWatermarkSettings({ position: 'diagonal', sizePercent: 'big', opacity: null })
    expect(WATERMARK_POSITIONS).toContain(s.position)
    expect(s.sizePercent).toBe(WATERMARK_DEFAULTS.sizePercent)
    expect(s.opacity).toBe(WATERMARK_DEFAULTS.opacity)
  })

  it('clamps rather than accepting extremes', () => {
    expect(normaliseWatermarkSettings({ sizePercent: 9999 }).sizePercent).toBe(150)
    expect(normaliseWatermarkSettings({ sizePercent: 0 }).sizePercent).toBe(5)
    expect(normaliseWatermarkSettings({ opacity: 5 }).opacity).toBe(1)
    expect(normaliseWatermarkSettings({ opacity: 0 }).opacity).toBe(0.05)
  })

  it('treats a missing record as enabled with the defaults', () => {
    // Erring towards marking: an unmarked photograph cannot be marked later,
    // but an over-marked one can be re-uploaded.
    expect(normaliseWatermarkSettings(undefined)).toEqual(WATERMARK_DEFAULTS)
  })

  it('only accepts an explicit false to disable', () => {
    expect(normaliseWatermarkSettings({ enabled: false }).enabled).toBe(false)
    expect(normaliseWatermarkSettings({}).enabled).toBe(true)
  })
})
