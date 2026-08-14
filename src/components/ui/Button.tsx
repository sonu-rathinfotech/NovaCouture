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

// Dark luxury variant (branch ui/dark-luxury): primary is a solid gold CTA,
// and the light/dark button roles are inverted to match the noir ground.
// The charcoal ramp is inverted in this variant (50 darkest → 900 brightest),
// so `charcoal-50` here is a near-black and `charcoal-900` a bright ivory.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-champagne-500 text-charcoal-50 border border-champagne-500 hover:bg-champagne-600',
  secondary: 'bg-ivory-200 text-charcoal-800 border border-ivory-400 hover:bg-ivory-300',
  outline: 'bg-transparent text-charcoal-800 border border-charcoal-600 hover:border-charcoal-900',
  ghost: 'bg-transparent text-charcoal-700 border border-transparent hover:bg-ivory-200',
  // For use over photography: bright text and hairline on the image.
  light: 'bg-transparent text-charcoal-900 border border-charcoal-900/50 hover:bg-charcoal-900 hover:text-charcoal-50',
  // Solid bright button on a dark ground.
  invert: 'bg-charcoal-900 text-charcoal-50 border border-charcoal-900 hover:bg-charcoal-800',
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
