import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Filter, ChevronDown } from 'lucide-react'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { AccessBand } from '@/components/catalogue/AccessBand'
import { EmptyState } from '@/components/ui'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { artKindFor } from '@/components/catalogue/art'
import { NotFound } from './NotFound'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { useState } from 'react'

/**
 * Category Page - New Design System
 * 
 * Features from reference sites:
 * - CaratLane/Blue Nile: Sticky filter sidebar, faceted search
 * - Tanishq: Banner for top-level categories
 * - GIVA: Clean product grid
 * - Kalyan: Sub-category exploration
 * - Mejuri: Mobile filter bottom sheet
 */

export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const { tier } = useSession()

  const { data: category, loading: loadingCategory } = useAsync(
    () => catalogue.getCategory(categorySlug),
    [categorySlug],
  )
  const { data: allCategories } = useAsync(() => catalogue.listCategories(), [])
  usePageTitle(category?.name ? `${category.name} — Collection` : undefined)
  const { data: products, loading } = useAsync(
    () => catalogue.listProducts({ categorySlug, tier }),
    [categorySlug, tier],
  )

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'featured'>('newest')

  if (!loadingCategory && !category) return <NotFound />

  const children = category?.children ?? []
  const parent = category
    ? (allCategories ?? []).find((c) => c.children.some((child) => child.id === category.id))
    : undefined

  const count = products?.length ?? 0

  // Filter options (would connect to real filter API)
  const metalFilters = ['All', 'Gold', 'Platinum', 'Diamond', 'Silver']
  const occasionFilters = ['All', 'Bridal', 'Daily Wear', 'Festive', 'Gifting']
  const karatFilters = ['All', '22KT', '18KT', '14KT', 'Platinum 950']

  return (
    <>
      {/* Top-level category banner - Tanishq/Kalyan style */}
      {!parent && (
        <section className="relative h-[40vh] min-h-[300px] max-h-[500px] overflow-hidden" data-theme="warm">
          <img
            src={samplePhoto(artKindFor(categorySlug), 0)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[var(--warm-950)]/90 via-[var(--warm-900)]/50 to-transparent" />
          <div className="relative flex h-full items-end">
            <div className="container pb-12 lg:pb-20">
              <p className="eyebrow mb-3 text-[var(--warm-200)]">
                {children.length > 0
                  ? children.map((c) => c.name).join(' · ')
                  : 'From the catalogue'}
              </p>
              <h1 className="font-display text-[var(--text-display)] font-medium text-white tracking-tight">
                {category?.name}
              </h1>
              <p className="mt-4 max-w-xl text-[var(--warm-200)] text-base leading-relaxed">
                {count} {count === 1 ? 'piece' : 'pieces'} in this collection
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="container py-12 lg:py-16">
        {/* Sub-category header for child categories */}
        {parent ? (
          <div className="mb-10">
            <Link
              to={`/c/${parent.slug}`}
              className="inline-flex items-center gap-2 text-sm tracking-[0.1em] text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors mb-4"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Back to {parent.name}
            </Link>
            <p className="eyebrow mb-2 text-[var(--color-accent)]">{parent.name}</p>
            <h1 className="font-display text-[var(--text-h1)] text-[var(--color-fg)] tracking-tight">{category?.name}</h1>
            <p className="mt-4 max-w-xl text-[var(--color-fg-muted)] leading-relaxed">
              A selection of {category?.name.toLowerCase()} from the {parent.name.toLowerCase()} collection.
            </p>
          </div>
        ) : (
          <p className="mb-10 max-w-xl text-[var(--color-fg-muted)] leading-relaxed">
            Every piece in {category?.name.toLowerCase()} currently shown to you. Photographs are
            of the piece itself; ask us for weight, stones or making details.
          </p>
        )}

        {/* Sub-categories exploration - Kalyan style */}
        {children.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <p className="eyebrow text-[var(--color-accent)]">Explore by Style</p>
              <span className="text-sm text-[var(--color-fg-muted)]">{children.length} sub-categories</span>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {children.map((sub, i) => (
                <CategoryCard key={sub.id} category={{ ...sub, children: [] }} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Toolbar with sort and mobile filter trigger */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow text-[var(--color-accent)]">
            {parent ? `${count} ${count === 1 ? 'piece' : 'pieces'}` : `All ${category?.name}`}
          </p>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Button - Mejuri/GIVA style */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            {/* Sort Dropdown - CaratLane/Blue Nile style */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none px-4 py-2 pr-10 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
                <option value="featured">Featured</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-[var(--color-fg-muted)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Filters Sidebar - CaratLane/Blue Nile style */}
        <div className="hidden lg:block lg:fixed lg:left-[calc(50%_-_720px)] lg:top-24 lg:w-56 lg:max-h-[calc(100vh_-_8rem)] lg:overflow-y-auto lg:pr-4">
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-5 sticky top-24">
            <h3 className="font-medium text-sm tracking-[0.1em] uppercase text-[var(--color-fg)] mb-4">Filters</h3>
            
            <div className="space-y-5">
              <FilterSection title="Metal" options={metalFilters} />
              <FilterSection title="Occasion" options={occasionFilters} />
              <FilterSection title="Karat" options={karatFilters} />
            </div>

            <button className="mt-6 w-full text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors">
              Clear all filters
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:pl-72 lg:pl-[calc(56px_+_14rem)]">
          {loading ? (
            <ProductGridSkeleton />
          ) : count > 0 ? (
            <ProductGrid products={products ?? []} />
          ) : (
            <EmptyState
              title="Nothing listed here yet"
              message="Pieces are added to this category as they are photographed."
              action={{ label: 'Browse All Collections', href: '/collections', variant: 'primary' }}
            />
          )}

          {/* Access Band */}
          <AccessBand tier={tier} />
        </div>
      </section>

      {/* Mobile Filters Bottom Sheet - Mejuri/GIVA style */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-[var(--color-fg)]/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-elevated)] rounded-t-2xl shadow-[var(--shadow-2xl)] animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-elevated)] z-10">
              <h3 className="font-display text-lg font-medium text-[var(--color-fg)]">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-lg text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-muted)] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-6">
              <FilterSection title="Metal" options={metalFilters} />
              <FilterSection title="Occasion" options={occasionFilters} />
              <FilterSection title="Karat" options={karatFilters} />
              <div className="pt-4 border-t border-[var(--color-border)]">
                <button className="w-full text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors mb-3">
                  Clear all filters
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full px-4 py-3 bg-[var(--color-accent)] text-white font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Filter section component */
function FilterSection({ title, options }: { title: string; options: string[] }) {
  return (
    <div>
      <h4 className="font-medium text-sm tracking-[0.1em] uppercase text-[var(--color-fg)] mb-3">{title}</h4>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={title.toLowerCase()}
              defaultChecked={opt === 'All'}
              className="h-4 w-4 text-[var(--color-accent)] border-[var(--color-border)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-fg)]">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}