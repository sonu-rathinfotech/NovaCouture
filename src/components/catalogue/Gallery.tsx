import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProductImage } from '@/types/db'
import type { ArtKind } from './art'
import { GalleryImage } from './GalleryImage'

/**
 * Product gallery: thumbnail rail plus a full-screen lightbox.
 *
 * Galleries are never gated (scope §1) — if a product is visible at all, every
 * image of it is. Access has already been decided upstream by the time this
 * component renders.
 */
export function Gallery({
  images,
  kind,
  offset = 0,
  productName,
}: {
  images: ProductImage[]
  kind: ArtKind
  /** Placeholder-art variant offset; ignored once real images exist. */
  offset?: number
  productName: string
}) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const count = images.length
  const next = useCallback(() => setActive((i) => (i + 1) % count), [count])
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count])

  if (count === 0) return null

  return (
    <div>
      <div className="flex flex-col-reverse gap-3.5 lg:flex-row">
        <div
          className="flex flex-row gap-3 overflow-x-auto lg:w-[82px] lg:shrink-0 lg:flex-col"
          role="tablist"
          aria-label={`${productName} gallery`}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View image ${i + 1} of ${count}`}
              onClick={() => setActive(i)}
              className={[
                'relative aspect-4/5 w-18 shrink-0 cursor-pointer overflow-hidden rounded-[2px] border bg-sand transition-colors duration-200',
                i === active ? 'border-gold-light' : 'border-transparent hover:border-gold-light',
              ].join(' ')}
            >
              <GalleryImage image={img} kind={kind} index={offset + i} sizeClass="w-[70%]" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="Open full-screen view"
          className="relative aspect-4/5 flex-1 cursor-zoom-in overflow-hidden rounded-[2px] bg-sand"
        >
          <GalleryImage
            image={images[active]}
            kind={kind}
            index={offset + active}
            sizeClass="w-[58%]"
            eager
          />
        </button>
      </div>

      <p className="mt-3 text-[0.65rem] tracking-[0.2em] text-charcoal-400 tabular-nums lg:ml-[96px]">
        {active + 1} / {count}
      </p>

      {lightbox && (
        <Lightbox
          images={images}
          kind={kind}
          offset={offset}
          active={active}
          count={count}
          productName={productName}
          onClose={() => setLightbox(false)}
          onNext={next}
          onPrev={prev}
        />
      )}
    </div>
  )
}

function Lightbox({
  images,
  kind,
  offset,
  active,
  count,
  productName,
  onClose,
  onNext,
  onPrev,
}: {
  images: ProductImage[]
  kind: ArtKind
  offset: number
  active: number
  count: number
  productName: string
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreTo = useRef<Element | null>(null)

  useEffect(() => {
    restoreTo.current = document.activeElement
    closeRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      ;(restoreTo.current as HTMLElement | null)?.focus?.()
    }
  }, [onClose, onNext, onPrev])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName}, image ${active + 1} of ${count}`}
      className="fixed inset-0 z-50 flex flex-col bg-noir/97"
    >
      <div className="flex items-center justify-between px-6 py-5 text-charcoal-500">
        <span className="text-xs tracking-[0.16em] tabular-nums">
          {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close full-screen view"
          className="cursor-pointer transition-colors duration-200 hover:text-charcoal-900"
        >
          <X size={22} strokeWidth={1.25} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-between gap-4 px-4 pb-10">
        <NavButton onClick={onPrev} label="Previous image">
          <ChevronLeft size={28} strokeWidth={1} />
        </NavButton>

        <div className="relative aspect-4/5 h-full max-h-[76vh] flex-1 self-center overflow-hidden">
          <GalleryImage
            image={images[active]}
            kind={kind}
            index={offset + active}
            sizeClass="w-[46%]"
            eager
          />
        </div>

        <NavButton onClick={onNext} label="Next image">
          <ChevronRight size={28} strokeWidth={1} />
        </NavButton>
      </div>
    </div>
  )
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 cursor-pointer place-items-center text-charcoal-500 transition-colors duration-200 hover:text-charcoal-900"
    >
      {children}
    </button>
  )
}
