import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Buttons.
 *
 * Uppercase, widely tracked, generously padded — the letter-spacing is what
 * makes a button read as considered rather than utilitarian. Transitions use
 * the one decelerating curve from index.css; at 500ms a linear ease would feel
 * sluggish, this feels deliberate.
 */
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'invert' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-charcoal-900 text-ivory-100 border border-charcoal-900 hover:bg-charcoal-700',
  secondary: 'bg-ivory-100 text-charcoal-800 border border-charcoal-200 hover:bg-ivory-200',
  outline: 'bg-transparent text-charcoal-800 border border-charcoal-300 hover:border-charcoal-800',
  ghost: 'bg-transparent text-charcoal-700 border border-transparent hover:bg-ivory-200',
  // For use over photography or a dark section.
  light: 'bg-transparent text-ivory-100 border border-ivory-100/50 hover:bg-ivory-100 hover:text-charcoal-900',
  // Solid ivory on a dark background. A variant rather than a className
  // override: overriding bg/text through className collides with the variant
  // at equal specificity, so CSS order decides the winner — which is how the
  // hero button ended up white text on a white block.
  invert: 'bg-ivory-100 text-charcoal-900 border border-ivory-100 hover:bg-ivory-200',
  danger: 'bg-transparent text-danger border border-danger/40 hover:border-danger',
}

const SIZES: Record<Size, string> = {
  sm: 'px-5 py-2.5 text-[0.65rem] tracking-[0.18em]',
  md: 'px-7 py-3 text-[0.65rem] tracking-[0.2em]',
  lg: 'px-9 py-3.5 text-[0.7rem] tracking-[0.2em]',
}

const BASE =
  'inline-flex cursor-pointer items-center justify-center font-sans font-medium uppercase transition-colors duration-500 ease-lux disabled:cursor-not-allowed disabled:opacity-40'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props} />
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  )
}
