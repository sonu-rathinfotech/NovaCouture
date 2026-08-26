import { Link } from 'react-router-dom'
import type { ProductWithImages } from '@/types/db'
import { artKindFor, artOffsetFor } from './art'
import { GalleryImage } from './GalleryImage'

/**
 * Product card: photograph, category, name, and a Currently Unavailable mark
 * when the piece carries one. No price and no description — there is none
 * (scope §1). Weight is recorded but shown on the product page only: a grid is
 * read as a set of photographs, and a figure under every third card turns it
 * into a spreadsheet.
 *
 * ── Three things removed from an earlier version, and why ───────────────────
 *
 * A VISIBILITY BADGE ("Public" / "Members" / "Premium"). Two problems. Its
 * mapping tested for 'login' and 'premium', but the database stores
 * 'login_required' and 'premium_only' — so every card fell through to the
 * default and was labelled "Public", including members-only pieces. And even
 * corrected, access tiers are internal vocabulary; a client should be told
 * once, in the band below the grid, not on every tile.
 *
 * "QUICK VIEW" and a WISHLIST HEART. Neither did anything — both handlers only
 * cancelled the click. There is no wishlist and no cart anywhere in this
 * platform, by design: the scope is display-only with no online sale. A button
 * that looks live and does nothing is worse than no button.
 *
 * A CSS WATERMARK OVERLAY. Removed with one devtools click, so it protects
 * nothing while implying it does. The real watermark is burned into the image
 * server-side at import (scope §E, DESIGN.md §8).
 * ────────────────────────────────────────────────────────────────────────────
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
    <article className="animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <Link
        to={`/p/${product.slug}`}
        onClick={() => onOpen?.(product)}
        className="group block cursor-pointer"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-[var(--color-bg-muted)]">
          {first && (
            <div className="absolute inset-0 transition-all duration-700 ease-out group-hover:scale-[1.03]">
              <GalleryImage image={first} kind={kind} index={offset} eager={eager} />
            </div>
          )}

          {/* Cross-fade to the second photograph on hover. */}
          {second && (
            <div className="absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100">
              <GalleryImage image={second} kind={kind} index={offset + 1} />
            </div>
          )}

          {/* A mark, not a veil: the piece is still shown in full, because an
              unavailable piece is still the work a client came to look at and
              may well ask to have made again. Dimming the photograph would
              treat it as a dead listing. */}
          {!product.is_available && (
            <div className="absolute inset-x-0 bottom-0 bg-[var(--color-fg)]/75 px-3 py-2 backdrop-blur-[2px]">
              <p className="text-center text-[0.6rem] font-light tracking-[0.18em] text-white uppercase">
                Currently Unavailable
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {product.category && (
            <p className="text-[0.7rem] font-light tracking-[0.15em] text-[var(--color-fg-muted)] uppercase">
              {product.category.name}
            </p>
          )}

          <h3 className="line-clamp-1 font-display text-lg font-medium text-[var(--color-fg)] transition-colors duration-300 group-hover:text-[var(--color-accent)]">
            {product.name}
          </h3>
        </div>
      </Link>
    </article>
  )
}
