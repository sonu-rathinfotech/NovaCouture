import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { AccessBand } from '@/components/catalogue/AccessBand'
import { EmptyState } from '@/components/ui/EmptyState'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { artKindFor } from '@/components/catalogue/art'
import { NotFound } from './NotFound'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'

/**
 * A category, or a sub-category.
 *
 * Both use this page. A top-level category opens with a banner and offers its
 * sub-categories before the full listing; a sub-category skips the banner and
 * shows a way back to its parent, because the useful next move from inside one
 * is almost always sideways into another.
 */
export function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const { tier } = useSession()

  const { data: category, loading: loadingCategory } = useAsync(
    () => catalogue.getCategory(categorySlug),
    [categorySlug],
  )
  const { data: allCategories } = useAsync(() => catalogue.listCategories(), [])
  const { data: products, loading } = useAsync(
    () => catalogue.listProducts({ categorySlug, tier }),
    [categorySlug, tier],
  )

  if (!loadingCategory && !category) return <NotFound />

  const children = category?.children ?? []
  const parent = category
    ? (allCategories ?? []).find((c) => c.children.some((child) => child.id === category.id))
    : undefined

  const count = products?.length ?? 0

  return (
    <>
      {/* Top-level categories open with a banner. A sub-category does not:
          two full-bleed images in a row, one inside the other, reads as
          repetition rather than depth. */}
      {!parent && (
        <section className="relative h-[38vh] min-h-[280px] overflow-hidden bg-charcoal-800">
          <img
            src={samplePhoto(artKindFor(categorySlug), 0)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-charcoal-900/85 via-charcoal-900/45 to-charcoal-900/10"
          />
          <div className="relative flex h-full items-end">
            <div className="container-lux pb-12">
              <p className="eyebrow mb-3 text-ivory-200/80">
                {children.length > 0
                  ? children.map((c) => c.name).join(' · ')
                  : 'From the catalogue'}
              </p>
              <h1 className="font-serif text-display-sm text-ivory-100">{category?.name}</h1>
            </div>
          </div>
        </section>
      )}

      <section className="container-lux py-16 lg:py-20">
        {parent ? (
          <div className="mb-14">
            <p className="eyebrow mb-3">{parent.name}</p>
            <h1 className="font-serif text-display-sm text-charcoal-800">{category?.name}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed font-light text-charcoal-400">
              A selection of {category?.name.toLowerCase()} from the {parent.name.toLowerCase()}{' '}
              collection.
            </p>
          </div>
        ) : (
          <p className="mb-14 max-w-xl text-base leading-relaxed font-light text-charcoal-400">
            Every piece in {category?.name.toLowerCase()} currently shown to you. Photographs are
            of the piece itself; ask us for weight, stones or making details.
          </p>
        )}

        {children.length > 0 && (
          <div className="mb-20">
            <p className="eyebrow mb-6">Explore by style</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {children.map((sub, i) => (
                <CategoryCard
                  key={sub.id}
                  category={{ ...sub, children: [] }}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex items-baseline justify-between gap-4">
          <p className="eyebrow">
            {parent ? `${count} ${count === 1 ? 'piece' : 'pieces'}` : `All ${category?.name}`}
          </p>
          {parent ? (
            <Link
              to={`/c/${parent.slug}`}
              className="inline-flex items-center gap-2 text-[0.65rem] tracking-[0.2em] text-charcoal-500 uppercase transition-colors hover:text-charcoal-900"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              Back to {parent.name}
            </Link>
          ) : (
            <span className="text-[0.65rem] tracking-[0.2em] text-charcoal-400 uppercase">
              {count} {count === 1 ? 'piece' : 'pieces'}
            </span>
          )}
        </div>

        {loading ? (
          <ProductGridSkeleton />
        ) : count > 0 ? (
          <ProductGrid products={products ?? []} />
        ) : (
          <EmptyState
            title="Nothing listed here yet"
            message="Pieces are added to this category as they are photographed."
          />
        )}

        <AccessBand tier={tier} />
      </section>
    </>
  )
}
