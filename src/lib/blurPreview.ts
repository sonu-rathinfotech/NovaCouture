/**
 * Generates the tiny preview shown, blurred, on a locked teaser tile.
 *
 * Mirrors tools/generate-blur-previews.mjs, which backfills existing rows.
 * The two are deliberately separate — that one runs in Node with sharp and the
 * service-role key, this one runs in the admin's browser on a file that has
 * not been uploaded yet — but the numbers below must match it.
 *
 * ── The dimensions are a policy, not a quality setting ──────────────────────
 * The output is around 500 pixels, and that is what makes it safe to send to
 * someone who may not open the piece: the detail is destroyed here, before
 * anything is stored. It is not a CSS blur over a full photograph, which hides
 * detail that is still in the file and comes off with one devtools click.
 * Raising these numbers raises how much of a withheld piece a guest can make
 * out. See migration 0009.
 */

/** Keep in step with tools/generate-blur-previews.mjs. */
const PREVIEW_W = 20
const PREVIEW_H = 25
const PREVIEW_QUALITY = 0.4
/** Mirrors the products_blur_preview_is_tiny constraint in migration 0009. */
const MAX_CHARS = 4096

/**
 * Returns a `data:image/jpeg;base64,…` URI, or null if the file could not be
 * read as an image. Never throws: a missing preview costs a decorative
 * fallback on one tile, which is not worth failing an upload over.
 */
export async function makeBlurPreview(file: Blob): Promise<string | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = PREVIEW_W
    canvas.height = PREVIEW_H

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Cover, not stretch — the tile renders at 4:5 and a squashed preview
    // would misrepresent the piece's proportions.
    const scale = Math.max(PREVIEW_W / bitmap.width, PREVIEW_H / bitmap.height)
    const w = bitmap.width * scale
    const h = bitmap.height * scale
    ctx.drawImage(bitmap, (PREVIEW_W - w) / 2, (PREVIEW_H - h) / 2, w, h)

    const uri = canvas.toDataURL('image/jpeg', PREVIEW_QUALITY)

    // The database constraint would reject an oversized value and fail the
    // upload; dropping the preview instead keeps the photograph safe.
    if (!uri.startsWith('data:image/jpeg;base64,') || uri.length > MAX_CHARS) return null

    return uri
  } finally {
    bitmap.close()
  }
}
