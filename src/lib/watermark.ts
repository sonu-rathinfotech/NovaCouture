import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import {
  normaliseWatermarkSettings,
  watermarkPlacements,
  WATERMARK_DEFAULTS,
} from '@shared/watermark-placement.mjs'

/**
 * Burns the house mark into a photograph before it is uploaded.
 *
 * -- Why into the file, and not over it --------------------------------------
 * Scope E and DESIGN.md 7 both require this. A watermark drawn in CSS over the
 * image comes off with one devtools click, so it protects nothing while
 * looking like it does. Here the bytes that reach storage already carry the
 * mark: there is no unmarked original on the server to find, and saving the
 * image saves the watermark with it.
 *
 * What it still cannot stop is a screenshot. Nothing can. The honest claim,
 * which the client docs already make, is that the mark makes a copied
 * photograph traceable rather than impossible.
 *
 * -- Why in the browser rather than on a server ------------------------------
 * The upload path has no server: the admin's browser writes to Supabase
 * Storage directly under an RLS policy. Marking here is what makes the stored
 * file marked. An administrator could bypass their own browser and upload
 * unmarked -- but they own the photographs, so they are not the threat this
 * defends against. The visitor is, and the visitor only ever sees stored
 * bytes.
 *
 * -- Failure is never silent -------------------------------------------------
 * If the mark cannot be drawn, this throws rather than returning the original.
 * Quietly uploading an unmarked photograph would leave the client believing
 * their catalogue was protected when it was not, and they would have no way to
 * tell which images were which.
 */

export interface WatermarkSettings {
  enabled: boolean
  position: string
  sizePercent: number
  opacity: number
}

/**
 * The mark itself.
 *
 * A separate, near-neutral rendering of the logo rather than the gold one the
 * header uses. A large centred watermark sits over whatever the photograph
 * happens to be -- pale skin, white cloth, a dark plinth -- and gold at the low
 * opacity a centred mark needs disappears into a light background. Generated
 * by tools/make-logo.mjs alongside the others.
 */
const LOGO_SRC = '/logo-watermark.png'

let logoPromise: Promise<HTMLImageElement> | null = null

function loadLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('The watermark logo could not be loaded.'))
      img.src = LOGO_SRC
    })
  }
  return logoPromise
}

/** Read once per batch by the caller, not once per photograph. */
export async function loadWatermarkSettings(): Promise<WatermarkSettings> {
  if (!isConfigured) return { ...WATERMARK_DEFAULTS }
  const { data, error } = await getSupabase().rpc('watermark_settings')
  if (error || !data) return { ...WATERMARK_DEFAULTS }
  return normaliseWatermarkSettings(data) as WatermarkSettings
}

async function decode(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('That file could not be read as an image.'))
      img.src = url
    })
  } finally {
    // Revoked here rather than after drawing: the bitmap is decoded by the
    // time onload has fired, and a leaked object URL holds the whole file in
    // memory for the life of the page. A bulk import is hundreds of them.
    URL.revokeObjectURL(url)
  }
}

/**
 * Returns a marked JPEG. Quality is high because this is the ONLY copy that
 * will ever exist: there is no unmarked original kept anywhere, so a lossy
 * setting here is a permanent loss of the client's photography.
 */
const JPEG_QUALITY = 0.94

export async function watermarkImage(
  file: Blob,
  settings: WatermarkSettings,
): Promise<Blob> {
  if (!settings.enabled) return file

  const [logo, image] = await Promise.all([loadLogo(), decode(file)])

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not prepare the watermark.')

  ctx.drawImage(image, 0, 0)

  ctx.globalAlpha = settings.opacity
  for (const at of watermarkPlacements(
    canvas.width,
    canvas.height,
    logo.naturalWidth,
    logo.naturalHeight,
    settings,
  )) {
    ctx.drawImage(logo, at.x, at.y, at.width, at.height)
  }
  ctx.globalAlpha = 1

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The watermarked image could not be produced.')),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

/**
 * A small preview for the settings screen, so the client can see what a choice
 * does to a real photograph before applying it to their whole catalogue.
 */
export async function watermarkPreview(
  sampleSrc: string,
  settings: WatermarkSettings,
): Promise<string> {
  const [logo, image] = await Promise.all([
    loadLogo(),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('preview image failed'))
      img.src = sampleSrc
    }),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('preview unavailable')

  ctx.drawImage(image, 0, 0)
  if (settings.enabled) {
    ctx.globalAlpha = settings.opacity
    for (const at of watermarkPlacements(
      canvas.width,
      canvas.height,
      logo.naturalWidth,
      logo.naturalHeight,
      settings,
    )) {
      ctx.drawImage(logo, at.x, at.y, at.width, at.height)
    }
    ctx.globalAlpha = 1
  }
  return canvas.toDataURL('image/jpeg', 0.8)
}
