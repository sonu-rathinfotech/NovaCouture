import { useEffect, useState } from 'react'
import type { ProductImage } from '@/types/db'
import type { ArtKind } from './art'
import { samplePhoto } from './samplePhotos'
import { isPlaceholderPath, resolveImageUrl } from '@/lib/images'

/**
 * One gallery image inside a fixed 4:5 frame.
 *
 * Two sources, decided by the data alone:
 *
 *   seed/…      placeholder row → bundled sample photography
 *   products/…  real upload     → short-lived signed URL from the private
 *                                 bucket (audit §1, migration 0002)
 *
 * Nothing changes here when VK's photographs arrive; only the rows do.
 *
 * Copy deterrents (scope §E) are applied here: right-click and drag are
 * blocked. They are deliberately limited to pointer interactions, so keyboard
 * navigation of the gallery is unaffected.
 */
export function GalleryImage({
  image,
  kind,
  index,
  eager = false,
  className = '',
}: {
  image: ProductImage
  kind: ArtKind
  index: number
  /** Kept for call-site compatibility with the old line-art placeholders. */
  sizeClass?: string
  eager?: boolean
  className?: string
}) {
  const placeholder = isPlaceholderPath(image.storage_path)
  const [signed, setSigned] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (placeholder) return

    let active = true
    setFailed(false)

    resolveImageUrl(image.storage_path)
      .then((url) => {
        if (!active) return
        if (url) setSigned(url)
        else setFailed(true)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
    }
  }, [image.storage_path, placeholder])

  const src = placeholder ? samplePhoto(kind, index) : signed

  // No signed URL yet, or refused: hold the frame rather than showing a broken
  // image icon. The frame keeps its 4:5 ratio either way, so nothing shifts.
  if (!src) {
    return (
      <div
        className={`h-full w-full bg-[var(--color-bg-muted)] ${failed ? '' : 'animate-pulse'}`}
        role="img"
        aria-label={failed ? '' : image.alt}
        aria-hidden={failed || undefined}
      />
    )
  }

  return (
    <>
      <img
        src={src}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className={`h-full w-full object-cover select-none ${className}`}
      />

      {/* Stands in for the burned-in watermark on placeholder rows. Real
          uploads arrive already watermarked from the server — never overlaid
          in CSS, which comes off with one devtools click (DESIGN.md §8). */}
      {placeholder && (
        <span className="pointer-events-none absolute right-3 bottom-2.5 font-display text-[0.6875rem] tracking-[0.2em] text-white/70 mix-blend-difference select-none">
          VK
        </span>
      )}
    </>
  )
}
