/**
 * Browser-side checks on a photograph before it is uploaded.
 *
 * These mirror the rules in tools/lib/import-validate.mjs, deliberately
 * duplicated rather than imported: that module is Node-only tooling, and the
 * two run in different places for different reasons. This one is a courtesy —
 * it tells the admin what is wrong before a slow upload rather than after.
 *
 * Neither is the security boundary. The bucket is private and writes are
 * allowed only to a session that satisfies is_admin() (migration 0004), so a
 * visitor who skipped this page entirely still cannot put anything in it.
 *
 * If the thresholds below change, change them in both places.
 */

export const MIN_IMAGE_EDGE = 600
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ImageCheck {
  ok: boolean
  error?: string
  width?: number
  height?: number
}

/**
 * Decodes the file to confirm it really is an image and to read its size.
 * A file renamed to .jpg fails here, because decoding it fails — checking the
 * extension alone would let a text file through.
 */
export async function checkImageFile(file: File): Promise<ImageCheck> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: `${file.name}: only JPEG, PNG and WebP images can be uploaded.` }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `${file.name}: ${(file.size / 1024 / 1024).toFixed(1)} MB is larger than the ${
        MAX_IMAGE_BYTES / 1024 / 1024
      } MB limit.`,
    }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, error: `${file.name}: this file could not be read as an image.` }
  }

  const { width, height } = bitmap
  bitmap.close()

  if (width < MIN_IMAGE_EDGE || height < MIN_IMAGE_EDGE) {
    return {
      ok: false,
      error: `${file.name}: ${width}×${height} is too small. At least ${MIN_IMAGE_EDGE}px on each side is needed.`,
      width,
      height,
    }
  }

  return { ok: true, width, height }
}

export function extensionFor(file: File): string {
  if (file.type === 'image/png') return '.png'
  if (file.type === 'image/webp') return '.webp'
  return '.jpg'
}
