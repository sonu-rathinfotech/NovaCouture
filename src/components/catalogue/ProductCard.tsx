import { Link } from 'react-router-dom'
import type { ProductWithImages } from '@/types/db'
import { artKindFor, artOffsetFor } from './art'
import { GalleryImage } from './GalleryImage'
import { Badge } from '@/components/ui'

/**
 * Product Card - New Design System
 * 
 * Features from reference sites:
 * - GIVA/Mejuri: Clean, minimal, product-first
 * - Tanishq: Visibility badges, trust signals
 * - CaratLane: Hover reveals second image
 * - Blue Nile: Quick view, wishlist
 * - Tiffany: Editorial typography
 */

interface ProductCardProps {
  product: ProductWithImages
  eager?: boolean
  index?: number
  onOpen?: (product: ProductWithImages) => void
}

export function ProductCard({
  product,
  eager = false,
  index = 0,
  onOpen,
}: ProductCardProps) {
  const kind = artKindFor(product.category?.slug)
  const offset = artOffsetFor(product.slug)
  const [first, second] = product.images

  // Visibility badge mapping
  const getVisibilityBadge = (visibility?: string) => {
    switch (visibility) {
      case 'public':
        return { variant: 'visibility-public' as const, label: 'Public' }
      case 'login':
        return { variant: 'visibility-login' as const, label: 'Members' }
      case 'premium':
        return { variant: 'visibility-premium' as const, label: 'Premium' }
      default:
        return { variant: 'default' as const, label: 'Public' }
    }
  }

  const visibility = getVisibilityBadge(product.visibility)

  return (
    <article className="animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <Link
        to={`/p/${product.slug}`}
        onClick={() => onOpen?.(product)}
        className="group block cursor-pointer"
      >
        {/* Image Container - Blue Nile style with hover swap */}
        <div className="relative aspect-4/5 overflow-hidden bg-[var(--color-bg-muted)] rounded-xl">
          {/* Primary Image */}
          {first && (
            <div className="absolute inset-0 transition-all duration-700 ease-out group-hover:scale-[1.03]">
              <GalleryImage image={first} kind={kind} index={offset} eager={eager} />
            </div>
          )}

          {/* Secondary Image on Hover - CaratLane style */}
          {second && (
            <div className="absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-[1.03]">
              <GalleryImage image={second} kind={kind} index={offset + 1} />
            </div>
          )}

          {/* Visibility Badge - Tanishq style */}
          <div className="absolute top-3 left-3 z-10">
            <Badge variant={visibility.variant} size="sm" dot>
              {visibility.label}
            </Badge>
          </div>

          {/* Quick Actions on Hover - Mejuri/Blue Nile style */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <button
              type="button"
              className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-[var(--color-fg)] text-sm font-medium rounded-lg hover:bg-white shadow-lg transition-all"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              Quick View
            </button>
            <button
              type="button"
              className="p-2 bg-white/90 backdrop-blur-sm text-[var(--color-fg)] rounded-lg hover:bg-white shadow-lg transition-all"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              aria-label="Add to wishlist"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Image Protection Watermark */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 200 60%27%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Playfair Display, serif%27 font-size=%2718%27 font-weight=%27500%27 fill=%27white%27 fill-opacity=%270.05%27%3EVK JEWELLERS%3C/text%3E%3C/svg%27')] bg-repeat bg-[200px_60px]" />
          </div>
        </div>

        {/* Product Info */}
        <div className="mt-4 space-y-2">
          {/* Category */}
          {product.category && (
            <p className="text-[0.7rem] font-light tracking-[0.15em] uppercase text-[var(--color-fg-muted)]">
              {product.category.name}
            </p>
          )}

          {/* Name - Tiffany editorial style */}
          <h3 className="font-display text-lg font-medium text-[var(--color-fg)] group-hover:text-[var(--color-accent)] transition-colors duration-300 line-clamp-1">
            {product.name}
          </h3>

          {/* Subtle divider */}
          <hr className="h-px bg-[var(--color-border)]" />
        </div>
      </Link>
    </article>
  )
}