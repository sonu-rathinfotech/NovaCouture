import type { LockedTile, ProductWithImages, Tier } from '@/types/db'
import { ProductCard } from './ProductCard'
import { LockedCard } from './LockedCard'
import { ProductCardSkeleton } from '@/components/ui'

/** Responsive grid: 2 col mobile, 3 col tablet, 4 col desktop, 5 col wide */
// Four columns at most. A fifth column on a wide monitor shrinks every
// photograph, and on a catalogue whose entire content is photographs that is a
// straight loss — the pieces are the product, not the density.
const GRID_CLASSES = 'grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4'

export function ProductGrid({
  products,
  onOpen,
  locked = [],
  tier = 'guest',
}: {
  products: ProductWithImages[]
  onOpen?: (product: ProductWithImages) => void
  /**
   * Blurred stand-ins for pieces this viewer may not open. They come last, so
   * a grid still opens with what the visitor can actually look at.
   */
  locked?: LockedTile[]
  /** Decides where a locked tile sends the visitor. See LockedCard. */
  tier?: Tier
}) {
  if (!products.length && !locked.length) return null

  return (
    <div className={GRID_CLASSES} role="list">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < 6} index={i} onOpen={onOpen} />
      ))}
      {locked.map((tile, i) => (
        <LockedCard key={tile.key} tile={tile} tier={tier} index={products.length + i} />
      ))}
    </div>
  )
}

/** Skeletons hold the exact 4:5 ratio so nothing jumps as images arrive. */
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASSES} role="list" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}