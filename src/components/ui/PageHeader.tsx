import { type ReactNode } from 'react'
import { ButtonLink } from './Button'

interface EmptyStateProps {
  title: string
  message?: string
  icon?: ReactNode
  action?: {
    label: string
    href: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }
  className?: string
}

export function EmptyState({ title, message, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={['flex flex-col items-center justify-center text-center py-16 px-4', className].join(' ')}>
      <div className="mb-6 p-4 bg-[var(--color-bg-muted)] rounded-full">
        {icon || (
          <svg className="h-10 w-10 text-[var(--color-fg-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-fg)] mb-2">{title}</h3>
      {message && (
        <p className="text-[var(--color-fg-muted)] max-w-md mb-6">{message}</p>
      )}
      {action && (
        <ButtonLink
          to={action.href}
          variant={action.variant || 'primary'}
          size="md"
        >
          {action.label}
        </ButtonLink>
      )}
    </div>
  )
}

/** Page header component */
interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Alias for subtitle — keeps editorial page copy consistent. */
  note?: string
  eyebrow?: string
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  note,
  eyebrow,
  action,
  align = 'left',
  className = '',
}: PageHeaderProps) {
  const centered = align === 'center'
  const description = note ?? subtitle

  return (
    <header className={['mb-8 lg:mb-12', centered ? 'text-center' : 'text-left', className].join(' ')}>
      {eyebrow && (
        <p className="eyebrow mb-3 text-[var(--color-accent)]">{eyebrow}</p>
      )}
      <h1 className="font-display text-[length:var(--text-h1)] text-[var(--color-fg)] tracking-tight mb-3">
        {title}
      </h1>
      {description && (
        <p
          className={[
            'text-[length:var(--text-body-lg)] text-[var(--color-fg-muted)] max-w-2xl mb-4',
            centered ? 'mx-auto' : '',
          ].join(' ')}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </header>
  )
}