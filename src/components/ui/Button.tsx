import {
  Children,
  cloneElement,
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { ArrowRight } from 'lucide-react'

/** Button variants using the new design system */
export type ButtonVariant =
  | 'primary'      // Filled, high emphasis
  | 'secondary'    // Outlined, medium emphasis
  | 'ghost'        // Text only, low emphasis
  | 'destructive'  // Danger actions
  | 'premium'      // Gold accent for premium features

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
  loading?: boolean
  asChild?: boolean
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'active:scale-[0.98]'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white ' +
    'hover:bg-[var(--color-accent-hover)] ' +
    'focus-visible:ring-[var(--color-accent)] ' +
    'shadow-sm hover:shadow-md',
  secondary:
    'bg-transparent border border-[var(--color-border-strong)] text-[var(--color-fg)] ' +
    'hover:bg-[var(--color-bg-muted)] hover:border-[var(--color-accent)] ' +
    'focus-visible:ring-[var(--color-accent)]',
  ghost:
    'bg-transparent text-[var(--color-fg)] ' +
    'hover:bg-[var(--color-bg-muted)] ' +
    'focus-visible:ring-[var(--color-fg-muted)]',
  destructive:
    'bg-[var(--color-danger)] text-white ' +
    'hover:bg-[var(--color-danger)]/90 ' +
    'focus-visible:ring-[var(--color-danger)] ' +
    'shadow-sm hover:shadow-md',
  premium:
    'bg-gradient-to-r from-[var(--trust-gold)] to-[var(--accent-600)] text-white ' +
    'hover:from-[var(--accent-600)] hover:to-[var(--accent-700)] ' +
    'focus-visible:ring-[var(--trust-gold)] ' +
    'shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-glow)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
  xl: 'px-8 py-4 text-xl gap-3',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      leadingIcon,
      trailingIcon,
      fullWidth = false,
      loading = false,
      asChild = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    const content = (
      <>
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leadingIcon
        )}
        {children}
        {!loading && trailingIcon}
      </>
    )

    const classNames = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    if (asChild) {
      // Render a single child (e.g. a router <Link>) with the button's
      // classes and behaviour applied to it.
      const child = Children.only(children) as ReactElement<{
        className?: string
        ref?: Ref<HTMLButtonElement>
      }>
      return cloneElement(child, {
        ref,
        className: [child.props.className, classNames].filter(Boolean).join(' '),
        ...(isDisabled ? { disabled: true } : {}),
        ...props,
      })
    }

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'

/** Link-styled button for navigation */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a
      href={to}
      className={[
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
      {variant === 'primary' && <ArrowRight size={16} strokeWidth={2} />}
    </a>
  )
}

/** Icon-only button */
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  ...props
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  'aria-label': string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  )
}