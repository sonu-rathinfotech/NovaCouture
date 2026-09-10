#!/usr/bin/env node
/**
 * Turns the supplied logo into a transparent PNG the site can actually use.
 *
 *   node tools/make-logo.mjs
 *
 * The client supplied public/logo.jpeg: gold artwork on a solid black
 * rectangle. Dropped straight into the header it renders as a black box, which
 * is why it sat unused. There is no alpha channel to recover, so one is
 * derived.
 *
 * -- How the background is removed ------------------------------------------
 * The artwork is light on black, so the image's own brightness already IS its
 * coverage: black background is dark, gold strokes are bright, and the
 * antialiased edges in between are exactly the partial coverage an alpha
 * channel describes. So luminance becomes alpha, with a small floor to clear
 * JPEG noise in the black and a gamma curve to stop the thin strokes going
 * thready.
 *
 * The colour is then un-premultiplied -- divided back out by that alpha --
 * because every gold pixel has been darkened by the black behind it.
 *
 * -- Why there are two colour variants --------------------------------------
 * Un-premultiplying alone is not enough. Artwork drawn to glow on black is
 * pale gold, and pale gold on an off-white header is close to invisible; the
 * first attempt at this produced a logo you could barely see. So the strokes
 * are re-mapped onto a gold ramp chosen for the surface they will sit on:
 * a darker ramp for the light header, the original bright one for the dark
 * footer. Same shapes, same alpha, different ink.
 *
 * This is a one-off. If the client ever supplies a real vector or a PNG with
 * transparency, use that instead and delete this file: a derived alpha will
 * never beat one the designer drew.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'public', 'logo.jpeg')

/** Below this brightness a pixel is background, not artwork. */
const FLOOR = 26
/** < 1 thickens the strokes as they fade out; the script is fine-lined. */
const GAMMA = 0.75

/**
 * Gold ramps, dark end to light end. A stroke's own brightness picks a point
 * along the ramp, so the metallic variation in the original survives -- it is
 * just moved into a range that reads on the target surface.
 */
const RAMPS = {
  // For the off-white header. Deep enough to hold its own against #fafafa.
  onLight: { dark: [0x6d, 0x51, 0x1f], light: [0xc0, 0x99, 0x4a] },
  // For the near-black footer. The client's own gold, essentially untouched.
  onDark: { dark: [0x8a, 0x6c, 0x33], light: [0xf0, 0xdc, 0xa8] },
  /*
   * For the watermark burned across a photograph.
   *
   * Near-neutral rather than gold. A large centred mark sits over whatever the
   * photograph happens to be -- pale skin, white cloth, a dark plinth -- and
   * gold at the low opacity a centred mark needs simply disappears into a
   * light background. A light neutral reads as a deliberate overlay on both.
   */
  watermark: { dark: [0xa8, 0xa2, 0x98], light: [0xff, 0xff, 0xff] },
}

const mix = (a, b, t) => Math.round(a + (b - a) * t)

async function build(outName, { height, ramp, markOnly = false }) {
  // Crop away the black margin first, so the artwork fills the frame and the
  // header can size it by height alone.
  const trimmed = sharp(SOURCE).trim({ threshold: 20 })
  const { data, info } = await trimmed
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height: h, channels } = info
  const out = Buffer.alloc(width * h * 4)

  for (let i = 0, p = 0; i < data.length; i += channels, p += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Rec. 709 luminance. Brightness is coverage here, not colour.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    let a = lum <= FLOOR ? 0 : (lum - FLOOR) / (255 - FLOOR)
    a = Math.min(1, Math.pow(a, GAMMA))

    if (a === 0) {
      out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0
      continue
    }

    // Un-premultiply to recover the true stroke brightness, then use that to
    // pick a point on the ramp for the surface this variant is going onto.
    const trueLum = Math.min(255, lum / a) / 255
    out[p] = mix(ramp.dark[0], ramp.light[0], trueLum)
    out[p + 1] = mix(ramp.dark[1], ramp.light[1], trueLum)
    out[p + 2] = mix(ramp.dark[2], ramp.light[2], trueLum)
    out[p + 3] = Math.round(a * 255)
  }

  let pipeline = sharp(out, { raw: { width, height: h, channels: 4 } })

  if (markOnly) {
    // Just the script mark, without the COUTURE wordmark under it. The bottom
    // fifth of the artwork is the lettering.
    pipeline = pipeline.extract({
      left: 0,
      top: 0,
      width,
      height: Math.round(h * 0.78),
    }).trim({ threshold: 1 })
  }

  const file = join(ROOT, 'public', outName)
  await pipeline.resize({ height, fit: 'inside', withoutEnlargement: false }).png().toFile(file)
  const meta = await sharp(file).metadata()
  console.log(`  ${outName.padEnd(18)} ${meta.width}x${meta.height}  ${meta.hasAlpha ? 'transparent' : 'NO ALPHA'}`)
}

console.log('\n  from public/logo.jpeg:\n')
// 2x the rendered sizes, so it stays sharp on a retina screen.
await build('logo-on-light.png', { height: 160, ramp: RAMPS.onLight })
await build('logo-on-dark.png', { height: 160, ramp: RAMPS.onDark })
await build('logo-mark-on-light.png', { height: 128, ramp: RAMPS.onLight, markOnly: true })
// Larger, because a centred watermark is drawn at most of the image width.
await build('logo-watermark.png', { height: 320, ramp: RAMPS.watermark })
console.log('')
