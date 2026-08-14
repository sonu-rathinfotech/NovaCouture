import type { ProductWithImages } from '@/types/db'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from '@/components/ui'

/** Responsive grid: 2 col mobile, 3 col tablet, 4 col desktop, 5 col wide */
const GRID_CLASSES = 'grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'

export function ProductGrid({
  products,
  onOpen,
}: {
  products: ProductWithImages[]
  onOpen?: (product: ProductWithImages) => void
}) {
  if (!products.length) return null

  return (
    <div className={GRID_CLASSES} role="list">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < 6} index={i} onOpen={onOpen} />
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