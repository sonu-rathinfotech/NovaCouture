import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'

/**
 * Every collection, in one place (the "Jewellery" tab).
 *
 * The header menu only ever shows the first few categories; this is the page
 * that has to hold all of them however many VK ends up with.
 */
export function CategoriesPage() {
  const { data: categories, loading } = useAsync(() => catalogue.listCategories(), [])
  const cats = categories ?? []

  return (
    <section className="container-lux py-20 lg:py-28">
      <PageHeader
        eyebrow="The Catalogue"
        title="Jewellery Collections"
        note="Each category is a curated composition — explore by form, occasion, or collection."
        align="left"
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-4/5 w-full" />
          ))}
        </div>
      ) : cats.length === 0 ? (
        <EmptyState
          title="No collections yet"
          message="Categories appear here as the catalogue is built."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
