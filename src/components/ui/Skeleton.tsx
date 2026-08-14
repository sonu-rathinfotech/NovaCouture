/** Skeleton loader for product cards */
export function ProductCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <article className={['animate-pulse-soft', className].join(' ')}>
      <div className="relative aspect-4/5 overflow-hidden bg-[var(--color-bg-muted)] rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-muted)] via-[var(--color-border)] to-[var(--color-bg-muted)] bg-[length:200%_100%] animate-shimmer" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-24 bg-[var(--color-bg-muted)] rounded animate-shimmer" />
        <div className="h-5 w-3/4 bg-[var(--color-bg-muted)] rounded animate-shimmer" />
      </div>
    </article>
  )
}

/** Skeleton for gallery */
export function GallerySkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={['relative aspect-4/5 overflow-hidden bg-[var(--color-bg-muted)] rounded-lg', className].join(' ')}>
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-muted)] via-[var(--color-border)] to-[var(--color-bg-muted)] bg-[length:200%_100%] animate-shimmer" />
    </div>
  )
}

/** Skeleton for category card */
export function CategoryCardSkeleton({ large = false, className = '' }: { large?: boolean; className?: string }) {
  return (
    <article className={['animate-pulse-soft', className].join(' ')}>
      <div className={`relative overflow-hidden bg-[var(--color-bg-muted)] rounded-lg ${large ? 'aspect-[4/5]' : 'aspect-square'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-muted)] via-[var(--color-border)] to-[var(--color-bg-muted)] bg-[length:200%_100%] animate-shimmer" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-32 bg-[var(--color-bg-muted)] rounded animate-shimmer" />
        <div className="h-5 w-1/2 bg-[var(--color-bg-muted)] rounded animate-shimmer" />
      </div>
    </article>
  )
}

/** Generic skeleton */
export function Skeleton({ className = '', variant = 'text', width, height }: {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}) {
  const base = 'animate-pulse-soft bg-[var(--color-bg-muted)] rounded'

  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  return (
    <div
      className={[base, variants[variant], className].join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

/** Skeleton for page sections */
export function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}