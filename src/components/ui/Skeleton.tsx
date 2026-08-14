/**
 * Loading placeholders.
 *
 * A shimmer rather than a pulse: it suggests something arriving, where a pulse
 * suggests something waiting. Every skeleton holds the final element's exact
 * dimensions so nothing shifts when the content lands.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-sm bg-ivory-300 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] bg-[length:1000px_100%] animate-shimmer ${className}`}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-4/5 w-full" />
      <Skeleton className="mt-4 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  )
}
