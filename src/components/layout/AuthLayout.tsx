import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { HERO_PHOTO } from '@/components/catalogue/samplePhotos'

/**
 * Split-screen shell for the sign-in and registration pages.
 *
 * Photograph on one side, form on the other. These pages sit outside the site
 * layout — no header, no footer — because the split runs the full height of
 * the window and a site header stacked above it would break the effect and
 * halve the image.
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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={HERO_PHOTO}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-charcoal-900/40" />
        <div className="absolute inset-x-0 bottom-0 p-16">
          {/* Deliberately not a quotation attributed to VK Jewellers: putting
              invented words in a real business's mouth is not ours to do. */}
          <p className="font-serif text-3xl leading-tight text-ivory-100">
            A private catalogue,
            <br />
            shown by invitation.
          </p>
          <p className="mt-4 text-sm font-light tracking-wide text-ivory-200/60">
            VK Jewellers
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-20 lg:p-20">
        <div className="w-full max-w-md animate-fade-in">
          <Link to="/" className="mb-12 flex items-baseline gap-2">
            <span className="font-serif text-2xl text-charcoal-900">VK</span>
            <span className="font-sans text-[0.6rem] tracking-[0.3em] text-charcoal-400 uppercase">
              Jewellers
            </span>
          </Link>

          <p className="eyebrow mb-4">{eyebrow}</p>
          <h1 className="font-serif text-4xl text-charcoal-800">{title}</h1>
          {intro && (
            <p className="mt-4 leading-relaxed font-light text-charcoal-500">{intro}</p>
          )}

          <div className="mt-10">{children}</div>

          {footer && <div className="mt-10 border-t border-ivory-300 pt-8">{footer}</div>}

          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.15em] text-charcoal-400 uppercase transition-colors hover:text-charcoal-700"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back to catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}
