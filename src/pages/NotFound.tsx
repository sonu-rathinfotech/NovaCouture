import { ButtonLink } from '@/components/ui/Button'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ArrowLeft, Search, Sparkles } from 'lucide-react'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { CategorySuggestions } from '@/components/catalogue/CategorySuggestions'

/**
 * 404.
 *
 * This page shipped broken: it used <Link> without importing it, so hitting any
 * bad URL threw a ReferenceError and the visitor got a blank white screen
 * instead of the page written to catch exactly that. `tsc -b` had a stale
 * incremental cache and Vite's build does not typecheck, so nothing said so.
 * Hence `npm run typecheck` (tsc -b --force) and the error boundary in
 * ErrorBoundary.tsx — the page that handles breakage must not be able to break
 * silently.
 */


export function NotFound() {
  usePageTitle('Page not found')

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Background - subtle jewellery photography */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={samplePhoto('ring', 2)}
          alt=""
          className="h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg)] via-transparent to-[var(--color-bg)]" />
      </div>

      <main className="relative container min-h-screen flex flex-col items-center justify-center py-20 lg:py-32 px-6">
        {/* Decorative gold line */}
        <div className="mb-10 w-32 h-px bg-gradient-to-r from-transparent via-[var(--trust-gold)] to-transparent" aria-hidden="true" />

        {/* 404 Number - Editorial style */}
        <div className="mb-6 text-center">
          <span className="eyebrow text-[var(--trust-gold)] tracking-widest">Error</span>
          <div className="mt-2 flex items-baseline justify-center gap-2">
            <span className="font-display text-7xl lg:text-9xl font-medium text-[var(--color-fg)] tracking-tight leading-none">
              4
            </span>
            <span className="relative w-2 h-2 rounded-full bg-[var(--trust-gold)] animate-pulse-soft" aria-hidden="true" />
            <span className="font-display text-7xl lg:text-9xl font-medium text-[var(--color-fg)] tracking-tight leading-none">
              4
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-center font-display text-[length:var(--text-h1)] lg:text-[length:var(--text-display)] font-medium text-[var(--color-fg)] tracking-tight text-balance max-w-2xl">
          This piece cannot be found
        </h1>

        {/* Subtext - Editorial tone */}
        <p className="mb-12 mx-auto max-w-lg text-[length:var(--text-body-lg)] leading-relaxed font-light text-[var(--color-fg-muted)] text-center">
          The page you&apos;re looking for may have been moved, renamed, or the piece may no longer be in the catalogue.
          <br />
          <span className="font-medium text-[var(--color-fg)]">Nothing is lost — only waiting to be rediscovered.</span>
        </p>

        {/* Decorative divider */}
        <div className="mb-10 flex items-center justify-center gap-4 max-w-md mx-auto">
          <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
          <Sparkles className="h-5 w-5 text-[var(--trust-gold)] opacity-60" aria-hidden="true" />
          <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
        </div>

        {/* Action Buttons */}
        <div className="mb-16 flex flex-col gap-4 items-center sm:flex-row sm:justify-center w-full max-w-md">
          <ButtonLink to="/" variant="primary" size="lg" className="w-full sm:w-auto">
            <ArrowLeft className="h-5 w-5 -ml-1" strokeWidth={2} aria-hidden="true" />
            <span>Return to catalogue</span>
          </ButtonLink>
          <ButtonLink to="/collections" variant="secondary" size="lg" className="w-full sm:w-auto">
            <Search className="h-5 w-5 -ml-1" strokeWidth={2} aria-hidden="true" />
            <span>Browse all collections</span>
          </ButtonLink>
        </div>

        <div className="w-full max-w-4xl">
          <CategorySuggestions heading="You might be looking for" />
        </div>

        {/* Bottom note */}
        <p className="mt-12 text-center text-sm font-light text-[var(--color-fg-subtle)]">
          Still can&apos;t find it?{' '}
          <ButtonLink to="/contact" variant="ghost" size="sm" className="inline">
            Contact us
          </ButtonLink>
        </p>
      </main>
    </div>
  )
}