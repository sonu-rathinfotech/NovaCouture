import { useSearchParams } from 'react-router-dom'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ButtonLink } from '@/components/ui/Button'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { CategorySuggestions } from '@/components/catalogue/CategorySuggestions'

/**
 * Search results.
 *
 * Matches the piece name only. Nothing else in the schema is searchable —
 * there is no description, no metal, no weight — and offering a box that
 * implies otherwise would be the same mistake as the filters that could not
 * filter.
 *
 * A guest searching for a premium piece by its exact name gets nothing back,
 * because the row never leaves the database. The wording below is the same
 * whether a piece exists and is withheld or does not exist at all, so an empty
 * result cannot be used to confirm that a premium piece is there.
 */
export function SearchPage() {
  const [params] = useSearchParams()
  const query = (params.get('q') ?? '').trim()
  const { tier } = useSession()

  usePageTitle(query ? `Search: ${query}` : 'Search')

  const { data: products, loading } = useAsync(
    () => (query ? catalogue.listProducts({ search: query, tier }) : Promise.resolve([])),
    [query, tier],
  )

  const results = products ?? []

  return (
    <section className="container py-16 lg:py-20">
      <header className="mb-12">
        <span className="eyebrow text-[var(--color-accent)]">Search</span>
        <h1 className="mt-3 font-display text-[var(--text-h1)] text-[var(--color-fg)]">
          {query ? `“${query}”` : 'Search the catalogue'}
        </h1>
        {query && !loading && (
          <p className="mt-4 text-[var(--color-fg-muted)]">
            {results.length === 0
              ? 'Nothing matched.'
              : `${results.length} ${results.length === 1 ? 'piece' : 'pieces'}`}
          </p>
        )}
      </header>

      {!query ? (
        <p className="max-w-[52ch] leading-relaxed text-[var(--color-fg-muted)]">
          Type the name of a piece in the search box above. You can also browse by category.
        </p>
      ) : loading ? (
        <ProductGridSkeleton count={3} />
      ) : results.length === 0 ? (
        <div className="max-w-[560px] mx-auto py-16 lg:py-24 text-center">
          {/* Decorative gold line */}
          <div className="mb-8 w-24 h-px bg-gradient-to-r from-transparent via-[var(--trust-gold)] to-transparent mx-auto" aria-hidden="true" />

          {/* Icon */}
          <div className="mb-6">
            <svg className="mx-auto h-14 w-14 text-[var(--trust-gold)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Headline */}
          <h2 className="mb-4 font-display text-[var(--text-h2)] font-medium text-[var(--color-fg)] tracking-tight">
            Nothing matches &ldquo;{query}&rdquo;
          </h2>

          {/* Subtext - editorial tone */}
          <p className="mb-10 mx-auto max-w-lg text-[var(--text-body-lg)] leading-relaxed font-light text-[var(--color-fg-muted)]">
            The piece you&apos;re looking for may be reserved for clients, or the name might differ.
            <br />
            <span className="font-medium text-[var(--color-fg)]">Try a shorter word, or explore the collections.</span>
          </p>

          {/* Divider */}
          <div className="mb-8 flex items-center justify-center gap-4 max-w-md mx-auto">
            <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
            <span className="text-[var(--trust-gold)]">✦</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" aria-hidden="true" />
          </div>

          <div className="mb-8">
            <CategorySuggestions />
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 items-center sm:flex-row sm:justify-center">
            <ButtonLink to="/collections" variant="primary" size="lg" className="w-full sm:w-auto">
              Browse all collections
            </ButtonLink>
            <ButtonLink to="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
              Ask us
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ProductGrid products={results} />
      )}
    </section>
  )
}