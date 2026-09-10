/**
 * Burning the house mark into a photograph, Node side.
 *
 * The browser does this on a canvas (src/lib/watermark.ts). This is the same
 * job with sharp, for the two paths that never touch a browser: the
 * command-line importer, which is how a real catalogue arrives, and the
 * backfill over photographs already in storage.
 *
 * Both callers share tools/lib/watermark-placement.mjs, so the arithmetic
 * deciding where the mark lands is identical to the browser's. Only the
 * compositing differs, because a canvas and sharp cannot be made to be the
 * same thing.
 *
 * -- One difference worth knowing about -------------------------------------
 * A canvas silently clips an overlay drawn past the edge of the image. sharp
 * refuses one that starts off-canvas at all. So a mark hanging over an edge --
 * which the default 105% centred setting always does -- is pre-cropped to its
 * visible part and its position moved to the edge. The result on screen is the
 * same; the code has to say it explicitly.
 */
import sharp from 'sharp'
import { normaliseWatermarkSettings, watermarkPlacements } from './watermark-placement.mjs'

/**
 * Reads the client's watermark settings.
 *
 * Falls back to the defaults rather than throwing, and the defaults mark the
 * photograph: erring towards marked is the safe direction, because an unmarked
 * photograph cannot be marked once it is in a client's hands, while an
 * over-marked one can be re-uploaded.
 */
export async function fetchWatermarkSettings(urlBase, serviceKey) {
  try {
    const res = await fetch(
      `${urlBase}/rest/v1/company_settings?select=watermark_enabled,watermark_position,watermark_size_percent,watermark_opacity`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    )
    if (!res.ok) return normaliseWatermarkSettings(undefined)
    const [row] = await res.json()
    return normaliseWatermarkSettings(
      row && {
        enabled: row.watermark_enabled,
        position: row.watermark_position,
        sizePercent: row.watermark_size_percent,
        opacity: row.watermark_opacity,
      },
    )
  } catch {
    return normaliseWatermarkSettings(undefined)
  }
}

/**
 * Returns the marked photograph as a JPEG buffer.
 *
 * Quality is high because this is the only copy that will exist: no unmarked
 * original is kept anywhere, so a lossy setting here is a permanent loss of
 * the client's photography.
 */
export async function watermarkBuffer(imageBuffer, logoPath, rawSettings) {
  const settings = normaliseWatermarkSettings(rawSettings)
  if (!settings.enabled) return imageBuffer

  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const logoMeta = await sharp(logoPath).metadata()

  const overlays = []
  for (const at of watermarkPlacements(
    meta.width,
    meta.height,
    logoMeta.width,
    logoMeta.height,
    settings,
  )) {
    const w = Math.max(1, Math.round(at.width))
    const h = Math.max(1, Math.round(at.height))
    const left = Math.round(at.x)
    const top = Math.round(at.y)

    // See the note at the top: sharp will not place an overlay that starts
    // off-canvas, so the hanging part is trimmed away first.
    const cropLeft = Math.max(0, -left)
    const cropTop = Math.max(0, -top)
    const visibleW = Math.min(w - cropLeft, meta.width - Math.max(0, left))
    const visibleH = Math.min(h - cropTop, meta.height - Math.max(0, top))
    if (visibleW <= 0 || visibleH <= 0) continue

    let overlay = sharp(logoPath).resize(w, h, { fit: 'fill' })
    if (cropLeft || cropTop || visibleW !== w || visibleH !== h) {
      overlay = sharp(await overlay.png().toBuffer()).extract({
        left: cropLeft,
        top: cropTop,
        width: visibleW,
        height: visibleH,
      })
    }

    // Scales the logo's own alpha by the chosen strength: a one-pixel tile of
    // the target opacity, composited with dest-in.
    const buf = await overlay
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(settings.opacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer()

    overlays.push({ input: buf, left: Math.max(0, left), top: Math.max(0, top) })
  }

  return image.composite(overlays).jpeg({ quality: 94 }).toBuffer()
}
