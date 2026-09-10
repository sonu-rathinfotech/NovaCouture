import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { HERO_PHOTO } from '@/components/catalogue/samplePhotos'

/**
 * Split-screen shell for the sign-in and registration pages.
 * 
 * Design inspired by:
 * - Tiffany: Editorial split composition
 * - Mejuri: Clean form side, brand story on image side
 * - Aurate: Color-rich premium feel
 * - GIVA: Minimalist, high contrast
 */

export function AuthLayout({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--color-bg)]">
      {/* Image Side - Editorial/Tiffany style */}
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={HERO_PHOTO}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient overlay for text readability */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[var(--color-fg)]/70 via-[var(--color-fg)]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 lg:p-20">
          <p className="font-display text-3xl lg:text-4xl leading-tight text-white max-w-lg">
            A private catalogue,
            <br />
            shown by invitation.
          </p>
          {/* "Since 1987" was invented by the design this was adapted from.
              Put the real founding year back once Nova Couture confirms it. */}
          <p className="mt-4 text-sm font-light tracking-widest text-[var(--base-300)] uppercase">
            Nova Couture
          </p>
        </div>
        
        {/* A row of trust badges stood here — BIS Hallmarked, Lifetime
          Warranty, Insured Shipping, 30-day returns, Personal Concierge.
          It came with the design this was adapted from. Nova Couture has never
          said any of it, and BIS hallmarking is a legal certification.
          Restore it only in Nova Couture's own words, claim by claim. */}
      </div>

      {/* Form Side - Clean/GIVA style */}
      <div className="flex items-center justify-center px-6 py-16 lg:p-20">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <Link to="/" className="mb-10 inline-block" aria-label="Nova Couture, home">
            <img
              src="/logo-on-light.png"
              alt="Nova Couture"
              width={253}
              height={90}
              className="h-11 w-auto"
            />
          </Link>

          {/* Form Header */}
          <p className="eyebrow mb-3 text-[var(--color-accent)]">{eyebrow}</p>
          <h1 className="font-display text-[length:var(--text-h1)] text-[var(--color-fg)] tracking-tight">{title}</h1>
          {intro && (
            <p className="mt-4 text-[length:var(--text-body-lg)] leading-relaxed text-[var(--color-fg-muted)]">{intro}</p>
          )}

          {/* Form Content */}
          <div className="mt-10">{children}</div>

          {/* Footer */}
          {footer && <div className="mt-8 pt-8 border-t border-[var(--color-border)]">{footer}</div>}

          {/* Back Link */}
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 text-sm tracking-[0.1em] text-[var(--color-fg-muted)] uppercase transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}