/**
 * Where the watermark goes, and how big.
 *
 * Shared deliberately. The mark is applied in two places -- the browser, when
 * an administrator uploads, and Node with sharp, when a batch is processed
 * from the command line -- and those cannot compose an image the same way. The
 * arithmetic that decides placement can and must be the same, or the same
 * photograph would be marked differently depending on which door it came in
 * through.
 *
 * Plain JavaScript with no imports, because the browser bundles it and Node
 * runs it directly.
 */

export const WATERMARK_POSITIONS = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
  'center',
  'tiled',
]

/*
 * Centred and spanning the frame, which is the treatment the client asked for
 * after seeing a corner mark. Chosen by rendering 18/30/45% strength over both
 * a pale lifestyle shot and a light plinth shot and looking at the result: 18
 * was too faint to deter anyone on a busy photograph, 45 buried the piece.
 *
 * Over 100% on purpose. The mark runs past the edges, so a crop cannot simply
 * remove it the way it can with a mark that stops short of the frame.
 */
export const WATERMARK_DEFAULTS = {
  enabled: true,
  position: 'center',
  sizePercent: 105,
  opacity: 0.3,
}

/** Breathing room from the edge, as a fraction of the image's short side. */
const MARGIN_RATIO = 0.035

/**
 * Normalises whatever came back from the database or an API.
 *
 * Anything unrecognised falls back to the default rather than throwing: a bad
 * setting should mark the photograph conservatively, not fail the upload and
 * lose the client's work.
 */
export function normaliseWatermarkSettings(raw) {
  const s = raw ?? {}
  return {
    enabled: s.enabled !== false,
    position: WATERMARK_POSITIONS.includes(s.position)
      ? s.position
      : WATERMARK_DEFAULTS.position,
    sizePercent: clamp(s.sizePercent, 5, 150, WATERMARK_DEFAULTS.sizePercent),
    opacity: clamp(s.opacity, 0.05, 1, WATERMARK_DEFAULTS.opacity),
  }
}

/**
 * Clamps a supplied number, falling back when there is not one.
 *
 * Number(null) is 0 and Number('') is 0, not NaN -- so a plain isFinite check
 * treats a missing opacity as "as faint as possible" and burns a watermark
 * nobody can see into the client's photographs, permanently. Absence is
 * therefore tested before conversion, not after.
 */
function clamp(value, min, max, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Returns the rectangles the mark should be drawn into, in image pixels.
 *
 * An array because 'tiled' produces several; every other position produces
 * exactly one. Callers draw each rectangle and do not need to know which mode
 * they are in.
 */
export function watermarkPlacements(imageWidth, imageHeight, logoWidth, logoHeight, settings) {
  const s = normaliseWatermarkSettings(settings)

  // Sized against the width so the mark keeps its visual weight whether the
  // photograph is a 4:5 portrait or a wide crop.
  const width = (imageWidth * s.sizePercent) / 100
  const height = (logoHeight / logoWidth) * width
  const margin = Math.min(imageWidth, imageHeight) * MARGIN_RATIO

  if (s.position === 'tiled') {
    /*
     * A lattice rather than a grid: every other row is offset by half a step,
     * so a crop cannot be positioned to fall cleanly between marks the way it
     * can with aligned columns.
     */
    const stepX = width * 1.9
    const stepY = height * 2.6
    const out = []
    let row = 0
    for (let y = -height; y < imageHeight + height; y += stepY, row++) {
      const offset = row % 2 === 0 ? 0 : stepX / 2
      for (let x = -width + offset; x < imageWidth + width; x += stepX) {
        out.push({ x, y, width, height })
      }
    }
    return out
  }

  if (s.position === 'center') {
    return [
      {
        x: (imageWidth - width) / 2,
        y: (imageHeight - height) / 2,
        width,
        height,
      },
    ]
  }

  const right = s.position.endsWith('right')
  const bottom = s.position.startsWith('bottom')

  return [
    {
      x: right ? imageWidth - width - margin : margin,
      y: bottom ? imageHeight - height - margin : margin,
      width,
      height,
    },
  ]
}
