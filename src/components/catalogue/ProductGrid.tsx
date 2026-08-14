import type { ProductWithImages } from '@/types/db'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'

const GRID = 'grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 xl:grid-cols-4'

export function ProductGrid({
  products,
  onOpen,
}: {
  products: ProductWithImages[]
  onOpen?: (product: ProductWithImages) => void
}) {
  return (
    <div className={GRID}>
      {products.map((p, i) => (
        // Cards fade in staggered rather than all at once: the eye is led
        // across the grid instead of being handed everything at the same
        // instant. The first row loads eagerly — it is the largest paint.
        <ProductCard key={p.id} product={p} eager={i < 4} index={i} onOpen={onOpen} />
      ))}
    </div>
  )
}

/** Skeletons hold the exact 4:5 ratio so nothing jumps as images arrive. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
