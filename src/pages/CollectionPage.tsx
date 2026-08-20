import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ButtonLink } from '@/components/ui/Button'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { collections } from '@/data/collections'
import { features } from '@/lib/env'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { CategorySuggestions } from '@/components/catalogue/CategorySuggestions'

/**
 * Curated collection link (scope §G).
 *
 * Links never expire, so anyone the recipient forwards it to will eventually
 * open it. That is fine: the token grants nothing on its own. Only a signed-in
 * premium client sees anything.
 */
export function CollectionPage() {
  const { token = '' } = useParams()
  const { tier } = useSession()

  const { data, loading } = useAsync(() => collections.open(token, tier), [token, tier])

  const opened = data?.status === 'ok'
  usePageTitle(data?.status === 'ok' ? data.collection.title : undefined)

  useEffect(() => {
    // One "open" per successful view (scope §G metrics).
    if (opened) void collections.recordView(token)
  }, [opened, token])

  if (loading) {
    return (
      <section className="mx-auto max-w-[1360px] px-6 py-20 lg:px-14">
        <ProductGridSkeleton count={3} />
      </section>
    )
  }

  if (!data || data.status === 'denied') return <CollectionDenied />

  const { collection } = data

  return (
    <section className="mx-auto max-w-[1360px] px-6 py-20 lg:px-14">
      <div className="mb-14 text-center">
        <span className="eyebrow text-[var(--color-accent)]">A private selection</span>
        <h1 className="mt-3.5 font-display text-4xl font-light md:text-[2.6rem] text-[var(--color-fg)]">
          {collection.title}
        </h1>
        {collection.welcomeMessage && (
          <p className="mx-auto mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--color-fg-muted)]">
            {collection.welcomeMessage}
          </p>
        )}
      </div>

      <ProductGrid
        products={collection.products}
        onOpen={
          features.collectionProductViews
            ? (product) => void collections.recordView(token, product.id)
            : undefined
        }
      />
    </section>
  )
}

/**
 * One fixed message for every failure: not signed in, signed in but not
 * premium, link disabled, or token that never existed.
 *
 * Distinguishing them would turn this page into an oracle — someone could
 * guess tokens and use the wording difference to learn which ones are real.
 */
function CollectionDenied() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Subtle background */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img src={samplePhoto('ring', 1)} alt="" className="h-full w-full object-cover opacity-12" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg)] via-transparent to-[var(--color-bg)]" />
      </div>

      <main className="relative container min-h-screen flex flex-col items-center justify-center py-20 lg:py-32 px-6">
        {/* Gold line */}
        <div className="mb-10 w-24 h-px bg-gradient-to-r from-transparent via-[var(--trust-gold)] to-transparent mx-auto" aria-hidden="true" />

        {/* Icon */}
        <div className="mb-6">
          <svg className="mx-auto h-14 w-14 text-[var(--trust-gold)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Eyebrow */}
        <p className="eyebrow mb-4 text-[var(--trust-gold)] tracking-widest">Private link</p>

        {/* Headline */}
        <h1 className="mb-4 text-center font-display text-[length:var(--text-h1)] lg:text-[length:var(--text-display)] font-light text-[var(--color-fg)] tracking-tight">
          This collection is not available
        </h1>

        {/* Subtext */}
        <p className="mb-10 mx-auto max-w-lg text-[length:var(--text-body-lg)] leading-relaxed font-light text-[var(--color-fg-muted)] text-center">
          Curated collections are reserved for premium clients of VK Jewellers.
          <br />
          <span className="font-medium text-[var(--color-fg)]">If this link was sent to you, sign in with the number it was sent to.</span>
        </p>

        {/* Divider */}
        <div className="mb-8 flex items-center justify-center gap-4 max-w-md mx-auto">
          <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
          <span className="text-[var(--trust-gold)]">✦</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 items-center sm:flex-row sm:justify-center w-full max-w-md">
          <ButtonLink to="/sign-in" variant="primary" size="lg" className="w-full sm:w-auto">
            Sign in
          </ButtonLink>
          <ButtonLink to="/" variant="secondary" size="lg" className="w-full sm:w-auto">
            Browse the catalogue
          </ButtonLink>
        </div>

        <div className="mt-16 w-full max-w-4xl">
          <CategorySuggestions heading="Or explore the catalogue" />
        </div>
      </main>
    </div>
  )
}
