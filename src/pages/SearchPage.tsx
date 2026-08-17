import { useSearchParams } from 'react-router-dom'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ButtonLink } from '@/components/ui/Button'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'

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
        <div className="max-w-[52ch]">
          <p className="leading-relaxed text-[var(--color-fg-muted)]">
            Nothing in the catalogue matches that name. Try a shorter word, or browse the
            collections — some pieces are shown only to clients who are signed in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/collections">Browse collections</ButtonLink>
            <ButtonLink to="/contact">Ask us</ButtonLink>
          </div>
        </div>
      ) : (
        <ProductGrid products={results} />
      )}
    </section>
  )
}
