import { Link } from 'react-router-dom'
import type { ProductWithImages } from '@/types/db'
import { artKindFor, artOffsetFor } from './art'
import { GalleryImage } from './GalleryImage'

/**
 * Product card: photograph, category, name. No price, description or stock —
 * there is none (scope §1).
 *
 * ── One thing deliberately NOT adopted from the Bolt design ────────────────
 * That version renders every product and covers the forbidden ones with a
 * blurred "Private Collection" overlay. It looks good and it leaks: the name,
 * the photograph and the existence of every premium piece are then in the page
 * for anyone to read. Here a piece the viewer may not see is never returned by
 * the database at all, so there is nothing to overlay. The invitation to sign
 * in is made once, in the band below the grid, without naming what is behind
 * it (DESIGN.md §6).
 * ───────────────────────────────────────────────────────────────────────────
 */
export function ProductCard({
  product,
  eager = false,
  index = 0,
  onOpen,
}: {
  product: ProductWithImages
  /** Above-the-fold cards should not wait for the lazy-load observer. */
  eager?: boolean
  index?: number
  /** Fired as the visitor opens the piece. Used for curated-link metrics. */
  onOpen?: (product: ProductWithImages) => void
}) {
  const kind = artKindFor(product.category?.slug)
  const offset = artOffsetFor(product.slug)
  const [first, second] = product.images

  return (
    <article className="animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
      <Link
        to={`/p/${product.slug}`}
        onClick={() => onOpen?.(product)}
        className="group block cursor-pointer"
      >
        <div className="relative aspect-4/5 overflow-hidden bg-ivory-200">
          {first && (
            <div className="absolute inset-0 transition-[opacity,transform] duration-[1.4s] ease-lux group-hover:scale-[1.04] group-hover:opacity-0">
              <GalleryImage image={first} kind={kind} index={offset} eager={eager} />
            </div>
          )}
          {second && (
            <div className="absolute inset-0 opacity-0 transition-[opacity,transform] duration-[1.4s] ease-lux group-hover:scale-[1.04] group-hover:opacity-100">
              <GalleryImage image={second} kind={kind} index={offset + 1} />
            </div>
          )}
        </div>

        <div className="mt-4">
          {product.category && (
            <p className="text-[0.6rem] font-light tracking-[0.2em] text-charcoal-400 uppercase">
              {product.category.name}
            </p>
          )}
          <h3 className="mt-1 font-serif text-lg text-charcoal-800 transition-colors duration-500 group-hover:text-charcoal-500">
            {product.name}
          </h3>
        </div>
      </Link>
    </article>
  )
}
