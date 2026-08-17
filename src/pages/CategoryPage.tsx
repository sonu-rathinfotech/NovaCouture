import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { AccessBand } from '@/components/catalogue/AccessBand'
import { EmptyState } from '@/components/ui'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { artKindFor } from '@/components/catalogue/art'
import { NotFound } from './NotFound'
import { LoadError } from '@/components/LoadError'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import type { ProductWithImages } from '@/types/db'

/**
 * A category, or a sub-category.
 *
 * ── On filters ──────────────────────────────────────────────────────────────
 * An earlier version carried a Metal / Occasion / Karat filter panel. It was
 * removed rather than repaired: none of those fields exist on a product. The
 * signed scope defines a product as a name and a gallery — no price, no
 * description, no attributes — so there is nothing to filter on, and the
 * controls could never have done anything. A control that does nothing is
 * worse than no control: a client picks "22KT", the grid does not change, and
 * they conclude the site is broken.
 *
 * What is offered instead is real: browse by sub-category, and sort by fields
 * the catalogue actually has. If VK wants filtering by metal or karat, those
 * become columns on `products` and a change request — the importer and the
 * admin form would both need them too.
 * ────────────────────────────────────────────────────────────────────────────
 */

type Sort = 'featured' | 'newest' | 'name'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
]

function sortProducts(products: ProductWithImages[], by: Sort): ProductWithImages[] {
  const copy = [...products]
  switch (by) {
    case 'newest':
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'featured':
      // The order the administrator arranged them in.
      return copy.sort((a, b) => a.sort_order - b.sort_order)
  }
}

export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const { tier } = useSession()

  const { data: category, loading: loadingCategory, error: categoryError } = useAsync(
    () => catalogue.getCategory(categorySlug),
    [categorySlug],
  )
  const { data: allCategories } = useAsync(() => catalogue.listCategories(), [])
  usePageTitle(category?.name ? `${category.name} — Collection` : undefined)
  const { data: products, loading, error: productsError } = useAsync(
    () => catalogue.listProducts({ categorySlug, tier }),
    [categorySlug, tier],
  )

  const [sortBy, setSortBy] = useState<Sort>('featured')

  const shown = useMemo(() => sortProducts(products ?? [], sortBy), [products, sortBy])

  // A failed request is not a missing category — see the note in ProductPage.
  if (categoryError) return <LoadError what="this collection" />
  if (!loadingCategory && !category) return <NotFound />

  const children = category?.children ?? []
  const parent = category
    ? (allCategories ?? []).find((c) => c.children.some((child) => child.id === category.id))
    : undefined

  const count = shown.length

  return (
    <>
      {/* Top-level categories open with a banner. A sub-category does not:
          two full-bleed images, one inside the other, reads as repetition. */}
      {!parent && (
        <section className="relative h-[40vh] max-h-[500px] min-h-[300px] overflow-hidden">
          <img
            src={samplePhoto(artKindFor(categorySlug), 0)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[var(--color-fg)]/85 via-[var(--color-fg)]/45 to-transparent"
          />
          <div className="relative flex h-full items-end">
            <div className="container pb-12 lg:pb-16">
              <p className="eyebrow mb-3 text-white/75">
                {children.length > 0
                  ? children.map((c) => c.name).join(' · ')
                  : 'From the catalogue'}
              </p>
              <h1 className="font-display text-[var(--text-display)] font-medium tracking-tight text-white">
                {category?.name}
              </h1>
            </div>
          </div>
        </section>
      )}

      <section className="container py-12 lg:py-16">
        {parent ? (
          <div className="mb-10">
            <Link
              to={`/c/${parent.slug}`}
              className="mb-4 inline-flex items-center gap-2 text-sm tracking-[0.1em] text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Back to {parent.name}
            </Link>
            <p className="eyebrow mb-2 text-[var(--color-accent)]">{parent.name}</p>
            <h1 className="font-display text-[var(--text-h1)] tracking-tight text-[var(--color-fg)]">
              {category?.name}
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-[var(--color-fg-muted)]">
              A selection of {category?.name.toLowerCase()} from the {parent.name.toLowerCase()}{' '}
              collection.
            </p>
          </div>
        ) : (
          <p className="mb-10 max-w-xl leading-relaxed text-[var(--color-fg-muted)]">
            Every piece in {category?.name.toLowerCase()} currently shown to you. Photographs are
            of the piece itself; ask us for weight, stones or making details.
          </p>
        )}

        {children.length > 0 && (
          <div className="mb-14">
            <div className="mb-6 flex items-center justify-between">
              <p className="eyebrow text-[var(--color-accent)]">Explore by style</p>
              <span className="text-sm text-[var(--color-fg-muted)]">
                {children.length} {children.length === 1 ? 'style' : 'styles'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {children.map((sub, i) => (
                <CategoryCard key={sub.id} category={{ ...sub, children: [] }} index={i} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-4 border-t border-[var(--color-border)] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow text-[var(--color-accent)]">
            {count} {count === 1 ? 'piece' : 'pieces'}
          </p>

          <div className="relative">
            <label htmlFor="sort" className="sr-only">
              Sort pieces
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as Sort)}
              className="cursor-pointer appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 pr-10 text-sm font-medium text-[var(--color-fg)] focus:border-transparent focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-muted)]"
            />
          </div>
        </div>

        {productsError ? (
          <LoadError what="these pieces" />
        ) : loading ? (
          <ProductGridSkeleton />
        ) : count > 0 ? (
          <ProductGrid products={shown} />
        ) : (
          <EmptyState
            title="Nothing listed here yet"
            message="Pieces are added to this category as they are photographed."
            action={{ label: 'Browse all collections', href: '/collections', variant: 'primary' }}
          />
        )}

        <AccessBand tier={tier} />
      </section>
    </>
  )
}
