import { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import type { ProductImage } from '@/types/db'
import type { ArtKind } from './art'
import { GalleryImage } from './GalleryImage'
import { Modal } from '@/components/ui'

/**
 * Product gallery: large frame, thumbnail strip, full-screen lightbox.
 *
 * Galleries are never gated (scope §1) — if a product is visible at all, every
 * image of it is. Access has already been decided upstream by the time this
 * component renders.
 *
 * Mobile-first: the thumbnail strip sits below the frame, swipe navigates,
 * and the lightbox fills the screen.
 */
export function Gallery({
  images,
  kind,
  offset,
  productName,
}: {
  images: ProductImage[]
  kind: ArtKind
  /** Placeholder-art variant offset; ignored once real images exist. */
  offset: number
  productName: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mainImageRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex((index + images.length) % images.length)
    },
    [images.length],
  )

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [prev, next, isFullscreen])

  // Touch swipe support
  const touchStart = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return
    const diff = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev()
      else next()
    }
    touchStart.current = null
  }

  const currentImage = images[currentIndex]

  return (
    <div className="relative">
      {/* Main Image */}
      <div
        ref={mainImageRef}
        className="relative aspect-4/5 overflow-hidden bg-[var(--color-bg-muted)] rounded-xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 transition-opacity duration-500 ease-out">
          <GalleryImage
            image={currentImage}
            kind={kind}
            index={offset + currentIndex}
            eager
            className="object-cover"
          />
        </div>

        {/* Watermark overlay */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 200 60%27%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Playfair Display, serif%27 font-size=%2718%27 font-weight=%27500%27 fill=%27white%27 fill-opacity=%270.06%27%3ENOVA COUTURE%3C/text%3E%3C/svg%27')] bg-repeat bg-[200px_60px]" />
        </div>

        {/* Prev/Next arrows on hover - Blue Nile style */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm text-[var(--color-fg)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-lg"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm text-[var(--color-fg)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-lg"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={2} />
            </button>
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/80 backdrop-blur-sm text-[var(--color-fg)] text-sm font-medium rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Fullscreen button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="View fullscreen"
            className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm text-[var(--color-fg)] rounded-full hover:bg-white shadow-lg transition-all"
          >
            <Expand className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Thumbnail Strip - CaratLane/Blue Nile style */}
      {images.length > 1 && (
        <div
          className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          role="group"
          aria-label="Product images"
        >
          {images.map((img, i) => (
            <button
              key={img.storage_path}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === currentIndex ? 'true' : 'false'}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                i === currentIndex
                  ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]'
                  : 'border-transparent hover:border-[var(--color-border)]'
              }`}
            >
              <GalleryImage
                image={img}
                kind={kind}
                index={offset + i}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      <Modal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={productName}
        size="full"
        showCloseButton
        closeOnOverlayClick
        closeOnEscape
      >
        <div className="relative aspect-4/5 max-h-[80vh]">
          <div className="absolute inset-0 flex items-center justify-center">
            <GalleryImage
              image={currentImage}
              kind={kind}
              index={offset + currentIndex}
              eager
              className="max-h-[80vh] max-w-full object-contain"
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 text-[var(--color-fg)] rounded-full shadow-lg hover:bg-white transition-colors lg:left-8"
              >
                <ChevronLeft className="h-8 w-8" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 text-[var(--color-fg)] rounded-full shadow-lg hover:bg-white transition-colors lg:right-8"
              >
                <ChevronRight className="h-8 w-8" strokeWidth={2} />
              </button>
            </>
          )}

          {/* Thumbnails in modal */}
          <div className="mt-6 flex gap-3 justify-center overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={img.storage_path}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === currentIndex ? 'true' : 'false'}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentIndex
                    ? 'border-[var(--color-accent)]'
                    : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <GalleryImage
                  image={img}
                  kind={kind}
                  index={offset + i}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
