import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Gallery } from '@/components/catalogue/Gallery'
import { artKindFor, artOffsetFor } from '@/components/catalogue/art'
import { EnquiryForm } from '@/components/catalogue/EnquiryForm'
import { ProductGrid } from '@/components/catalogue/ProductGrid'
import { NotFound } from './NotFound'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'
import { features } from '@/lib/env'
import { enquiryVisibleTo } from '@/lib/enquiry'

export function ProductPage() {
  const { productSlug = '' } = useParams()
  const { tier } = useSession()

  const { data: product, loading } = useAsync(
    () => catalogue.getProduct(productSlug, tier),
    [productSlug, tier],
  )

  // Needed to name the parent of a sub-category: the product carries only its
  // own category, so the trail read "Home / Temple" and lost "Necklaces".
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])

  const { data: related } = useAsync(
    () =>
      product?.category
        ? catalogue.listProducts({ categorySlug: product.category.slug, tier, limit: 5 })
        : Promise.resolve([]),
    [product?.category?.slug, tier],
  )

  if (loading) {
    return (
      <div className="container-lux py-20">
        <div className="aspect-4/5 max-w-2xl animate-shimmer rounded-sm bg-ivory-300" />
      </div>
    )
  }

  // A product the viewer is not entitled to see is indistinguishable from one
  // that does not exist, so a 404 cannot be used to probe for premium pieces.
  if (!product) return <NotFound />

  const kind = artKindFor(product.category?.slug)
  const offset = artOffsetFor(product.slug)

  const parent = product.category
    ? (categories ?? []).find((c) => c.children.some((child) => child.id === product.category!.id))
    : undefined

  const alsoIn = (related ?? []).filter((p) => p.id !== product.id).slice(0, 4)

  return (
    <>
      <section className="border-b border-ivory-300 bg-ivory-50">
        <div className="container-lux grid grid-cols-1 gap-10 py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-20 lg:py-24">
          <Gallery images={product.images} kind={kind} offset={offset} productName={product.name} />

          {/* Centred against the photograph rather than pinned to the top: with
              no price or description, a top-aligned panel left the name
              floating above a large void. */}
          <div className="self-start lg:sticky lg:top-40 lg:self-center">
            <nav aria-label="Breadcrumb" className="mb-6 text-[0.7rem] tracking-[0.15em] text-charcoal-400 uppercase">
              <Link to="/" className="transition-colors duration-300 hover:text-charcoal-800">
                Home
              </Link>
              {parent && (
                <>
                  <span className="mx-2 text-charcoal-200">/</span>
                  <Link
                    to={`/c/${parent.slug}`}
                    className="transition-colors duration-300 hover:text-charcoal-800"
                  >
                    {parent.name}
                  </Link>
                </>
              )}
              {product.category && (
                <>
                  <span className="mx-2 text-charcoal-200">/</span>
                  <Link
                    to={`/c/${product.category.slug}`}
                    className="transition-colors duration-300 hover:text-charcoal-800"
                  >
                    {product.category.name}
                  </Link>
                </>
              )}
            </nav>

            {product.category && <span className="eyebrow">{product.category.name}</span>}

            {/* Sparse by design: there is no price, description or stock to
                show. Padding it with filler would look worse than the
                whitespace does — DESIGN.md §5. */}
            <h1 className="mt-4 mb-6 text-balance font-serif text-display-sm text-charcoal-800">
              {product.name}
            </h1>

            <hr className="mb-7 h-px w-16 border-0 bg-champagne-400" />

            <p className="mb-6 max-w-[42ch] text-base leading-relaxed font-light text-charcoal-500">
              {product.images.length === 1
                ? 'One photograph of this piece.'
                : `${product.images.length} photographs of this piece.`}{' '}
              For weight, stones or making details, please ask.
            </p>

            {/* Bolt shows a "Ref: VK-NK-001" line here. Ours does not: the
                catalogue has no SKU column, and a generated one displayed as
                though it were VK's own reference is exactly the invented
                detail the audit had me remove once already. It returns when
                the importer carries real SKUs. */}
            <p className="mb-9 text-[0.65rem] tracking-[0.2em] text-charcoal-400 uppercase">
              {product.category?.name}
              {parent ? ` · ${parent.name} collection` : ''}
            </p>

            {enquiryVisibleTo(tier, features.enquiryForRegistered) ? (
              <EnquiryForm product={product} />
            ) : (
              tier === 'guest' && (
                <p className="border border-ivory-300 bg-ivory-100 px-5 py-4 text-sm leading-relaxed font-light text-charcoal-500">
                  This piece is available by private enquiry.{' '}
                  <Link
                    to="/sign-in"
                    className="text-charcoal-800 underline underline-offset-4 transition-colors hover:text-champagne-800"
                  >
                    Sign in
                  </Link>{' '}
                  to enquire.
                </p>
              )
            )}
          </div>
        </div>
      </section>

      {/* Somewhere to go next: a visitor arriving from a link previously had
          only the back button. */}
      {alsoIn.length > 0 && (
        <section className="border-t border-ivory-300 bg-ivory-100 py-24 lg:py-32">
          <div className="container-lux">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">You may also consider</p>
                <h2 className="font-serif text-3xl text-charcoal-800">
                  From the {product.category?.name} collection
                </h2>
              </div>
              {product.category && (
                <Link
                  to={`/c/${product.category.slug}`}
                  className="group inline-flex items-center gap-2 text-[0.65rem] tracking-[0.2em] text-charcoal-600 uppercase transition-colors hover:text-charcoal-900"
                >
                  View all
                  <ArrowRight
                    size={14}
                    strokeWidth={1.5}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              )}
            </div>
            <ProductGrid products={alsoIn} />
          </div>
        </section>
      )}
    </>
  )
}
