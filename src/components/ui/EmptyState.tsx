import type { ReactNode } from 'react'

/**
 * Shown where content would be. Says what happened and offers the next step —
 * an empty area with no explanation reads as a fault in the site.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      {icon && <div className="mb-6 text-charcoal-300">{icon}</div>}
      <h3 className="font-serif text-2xl text-charcoal-700">{title}</h3>
      {message && (
        <p className="mt-2 max-w-md text-sm font-light text-charcoal-400">{message}</p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  )
}
