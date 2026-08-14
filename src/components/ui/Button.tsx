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

// Dark luxury variant (branch ui/dark-luxury): on a dark ground the CTA
// language is gold — the primary is a solid champagne fill with near-black
// ink, and the quiet options are gold hairlines that fill on hover.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-champagne-500 text-noir border border-champagne-500 hover:bg-champagne-400',
  secondary: 'bg-ivory-200 text-charcoal-800 border border-champagne-300 hover:bg-ivory-300',
  outline: 'bg-transparent text-champagne-400 border border-champagne-600 hover:bg-champagne-500 hover:border-champagne-500 hover:text-noir',
  ghost: 'bg-transparent text-charcoal-400 border border-transparent hover:bg-ivory-200 hover:text-charcoal-600',
  // For use over photography or a dark section: a gold hairline that fills.
  light: 'bg-transparent text-champagne-300 border border-champagne-300/60 hover:bg-champagne-500 hover:border-champagne-500 hover:text-noir',
  // Solid gold on a dark background. A variant rather than a className
  // override: overriding bg/text through className collides with the variant
  // at equal specificity, so CSS order decides the winner.
  invert: 'bg-champagne-500 text-noir border border-champagne-500 hover:bg-champagne-400',
  danger: 'bg-transparent text-danger border border-danger/50 hover:border-danger',
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
