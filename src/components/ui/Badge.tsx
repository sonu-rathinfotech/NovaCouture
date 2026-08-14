import { type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'premium'
  | 'visibility-public'
  | 'visibility-login'
  | 'visibility-premium'

type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const baseStyles =
  'inline-flex items-center gap-1.5 font-medium rounded-full ' +
  'transition-colors duration-200'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-muted)] text-[var(--color-fg-muted)] border border-[var(--color-border)]',
  primary: 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/20',
  secondary: 'bg-[var(--color-bg-muted)] text-[var(--color-fg)] border border-[var(--color-border)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20',
  premium: 'bg-gradient-to-r from-[var(--trust-gold)] to-[var(--accent-600)] text-white border-none shadow-[var(--shadow-gold)]',
  'visibility-public': 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20',
  'visibility-login': 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20',
  'visibility-premium': 'bg-gradient-to-r from-[var(--trust-gold)] to-[var(--accent-600)] text-white border-none shadow-[var(--shadow-gold)]',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
  lg: 'px-3 py-1.5 text-base gap-2',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, children, className = '', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={[
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      >
        {dot && (
          <span
            className={[
              'h-1.5 w-1.5 rounded-full flex-shrink-0',
              variant === 'premium' || variant === 'visibility-premium'
                ? 'bg-white/50'
                : variant === 'visibility-public'
                ? 'bg-[var(--color-success)]'
                : variant === 'visibility-login'
                ? 'bg-[var(--color-info)]'
                : 'bg-current',
            ].join(' ')}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

/** Trust badge for certifications */
interface TrustBadgeProps {
  label: string
  icon?: React.ReactNode
  variant?: 'gold' | 'silver' | 'platinum' | 'default'
}

export function TrustBadge({ label, icon, variant = 'default' }: TrustBadgeProps) {
  const variants = {
    gold: 'bg-gradient-to-r from-[var(--trust-gold)] to-[var(--accent-600)] text-white',
    silver: 'bg-gradient-to-r from-[var(--trust-silver)] to-[var(--base-400)] text-[var(--base-900)]',
    platinum: 'bg-gradient-to-r from-[var(--trust-platinum)] to-[var(--cool-300)] text-[var(--cool-900)]',
    default: 'bg-[var(--color-bg-muted)] text-[var(--color-fg)] border border-[var(--color-border)]',
  }

  return (
    <span className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium', variants[variant]].join(' ')}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </span>
  )
}