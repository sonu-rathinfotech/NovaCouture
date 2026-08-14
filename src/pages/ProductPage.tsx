import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Share2, Heart, ChevronRight } from 'lucide-react'
import { Gallery } from '@/components/catalogue/Gallery'
import { artKindFor, artOffsetFor } from '@/components/catalogue/art'
import { EnquiryForm } from '@/components/catalogue/EnquiryForm'
import { ProductGrid } from '@/components/catalogue/ProductGrid'
import { NotFound } from './NotFound'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { features } from '@/lib/env'
import { enquiryVisibleTo } from '@/lib/enquiry'
import type { Visibility } from '@/types/db'
import { Badge, ButtonLink } from '@/components/ui'

/**
 * Product Page - New Design System
 * 
 * Features from reference sites:
 * - Blue Nile: 360° viewer, detailed specs, certification
 * - Tiffany: Editorial layout, storytelling
 * - Mejuri: Trust badges, reviews, transparent pricing
 * - Aurate: Color-rich premium sections, video
 * - CaratLane: Smart recommendations, customization CTA
 * - Tanishq: Carat meter equivalent, trust signals
 */

export function ProductPage() {
  const { productSlug = '' } = useParams()
  const { tier } = useSession()

  const { data: product, loading } = useAsync(
    () => catalogue.getProduct(productSlug, tier),
    [productSlug, tier],
  )
  usePageTitle(product?.name)

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
      <div className="container py-20">
        <div className="aspect-4/5 max-w-2xl mx-auto animate-shimmer rounded-xl bg-[var(--color-bg-muted)]" />
      </div>
    )
  }

  if (!product) return <NotFound />

  const kind = artKindFor(product.category?.slug)
  const offset = artOffsetFor(product.slug)

  const parent = product.category
    ? (categories ?? []).find((c) => c.children.some((child) => child.id === product.category!.id))
    : undefined

  const alsoIn = (related ?? []).filter((p) => p.id !== product.id).slice(0, 4)

  // Visibility badge
  const getVisibilityBadge = (visibility: Visibility) => {
    switch (visibility) {
      case 'public': return { variant: 'visibility-public' as const, label: 'Public' }
      case 'login_required': return { variant: 'visibility-login' as const, label: 'Members Only' }
      case 'premium_only': return { variant: 'visibility-premium' as const, label: 'Premium Only' }
      default: return { variant: 'default' as const, label: 'Public' }
    }
  }
  const visibility = getVisibilityBadge(product.visibility)

  return (
    <>
      {/* Product Gallery & Details */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)] py-12 lg:py-16">
        <div className="container grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:py-8">
          {/* Gallery - Blue Nile style with fullscreen */}
          <Gallery images={product.images} kind={kind} offset={offset} productName={product.name} />

          {/* Details Panel - Sticky on scroll */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm tracking-[0.1em] uppercase text-[var(--color-fg-muted)]">
              <Link to="/" className="hover:text-[var(--color-accent)] transition-colors">Home</Link>
              {parent && (
                <>
                  <span>/</span>
                  <Link to={`/c/${parent.slug}`} className="hover:text-[var(--color-accent)] transition-colors">{parent.name}</Link>
                </>
              )}
              {product.category && (
                <>
                  <span>/</span>
                  <Link to={`/c/${product.category.slug}`} className="hover:text-[var(--color-accent)] transition-colors">{product.category.name}</Link>
                </>
              )}
              <span>/</span>
              <span className="text-[var(--color-fg)]" aria-current="page">{product.name}</span>
            </nav>

            {/* Category & Visibility */}
            <div className="flex flex-wrap items-center gap-3">
              {product.category && (
                <Badge variant="secondary" size="sm">{product.category.name}</Badge>
              )}
              <Badge variant={visibility.variant} size="sm" dot>{visibility.label}</Badge>
            </div>

            {/* Product Name - Tiffany editorial */}
            <h1 className="font-display text-[var(--text-h1)] text-[var(--color-fg)] tracking-tight text-balance">
              {product.name}
            </h1>

            {/* Divider */}
            <hr className="h-px bg-gradient-to-r from-[var(--color-accent)] to-transparent w-16" />

            {/* Description */}
            <p className="text-[var(--text-body-lg)] leading-relaxed text-[var(--color-fg-muted)] max-w-[42ch]">
              {product.images.length === 1
                ? 'One photograph of this piece.'
                : `${product.images.length} photographs of this piece.`}{' '}
              For weight, stones or making details, please ask.
            </p>

            {/* Trust Signals - Tanishq/Blue Nile */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Badge variant="success" size="sm" dot>BIS Hallmarked</Badge>
              <Badge variant="default" size="sm" dot>Lifetime Warranty</Badge>
              <Badge variant="default" size="sm" dot>Insured Shipping</Badge>
            </div>

            {/* Specifications Accordion - Blue Nile style */}
            <details className="group border border-[var(--color-border)] rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-[var(--color-fg)]">Specifications & Details</span>
                <ChevronRight
                  className="h-5 w-5 text-[var(--color-fg-muted)] transition-transform duration-200 group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <div className="px-5 pb-5 border-t border-[var(--color-border)] space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[var(--color-fg-muted)]">Category</p>
                    <p className="font-medium text-[var(--color-fg)]">{product.category?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-fg-muted)]">Collection</p>
                    <p className="font-medium text-[var(--color-fg)]">{parent?.name || 'Main Collection'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-fg-muted)]">Images</p>
                    <p className="font-medium text-[var(--color-fg)]">{product.images.length} photographs</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-fg-muted)]">Availability</p>
                    <p className="font-medium text-[var(--color-fg)]">
                      {visibility.label === 'Public' ? 'Available to all' : visibility.label === 'Members Only' ? 'Registered clients only' : 'Premium clients only'}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <p className="text-[var(--color-fg-muted)] mb-2">Certification & Care</p>
                  <ul className="space-y-1 text-[var(--color-fg)]">
                    <li>• BIS Hallmark certified purity</li>
                    <li>• Lifetime warranty on craftsmanship</li>
                    <li>• Complimentary cleaning & inspection annually</li>
                    <li>• Insured shipping with signature required</li>
                    <li>• 30-day exchange policy</li>
                  </ul>
                </div>
              </div>
            </details>

            {/* Enquiry Form - Mejuri/Aurate style */}
            {enquiryVisibleTo(tier, features.enquiryForRegistered) ? (
              <EnquiryForm product={product} />
            ) : (
              tier === 'guest' && (
                <div className="p-5 bg-[var(--color-bg-muted)] border border-[var(--color-border)] rounded-xl">
                  <p className="text-[var(--color-fg-muted)]">
                    This piece is available by private enquiry.{' '}
                    <Link to="/sign-in" className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)] font-medium">
                      Sign in
                    </Link>{' '}
                    to enquire.
                  </p>
                </div>
              )
            )}

            {/* Share - Mejuri social proof */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-fg-muted)]">Share:</span>
              <button className="p-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors" aria-label="Share on WhatsApp">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378 9.86 9.86 0 01-.473-.288 10.5 10.5 0 01-.427-.307c-.719-.68-1.198-1.726-1.322-2.466l-.062-.363c-.061-.347-.293-.857-.075-1.118.171-.21.404-.52.687-.705l.638-.427c.226-.15.568-.347.898-.427.189-.047.37.037.606.31.302.347.825.85 1.185 1.218.59.623 1.388 1.541 2.17 2.13.185.14.389.28.497.28.108 0 .31-.124.352-.231.051-.134-.133-.864-.45-1.438-.316-.574-.752-1.18-1.125-1.855-.373-.675-.543-.792-.536-.805z"/></svg>
              </button>
              <button className="p-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors" aria-label="Share via email">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors" aria-label="Add to wishlist">
                <Heart className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {alsoIn.length > 0 && (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-16 lg:py-24">
          <div className="container">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow mb-3 text-[var(--color-accent)]">You may also consider</p>
                <h2 className="font-display text-[var(--text-h2)] text-[var(--color-fg)]">
                  From the {product.category?.name} collection
                </h2>
              </div>
              {product.category && (
                <ButtonLink to={`/c/${product.category.slug}`} variant="ghost" size="md">
                  View all
                  <ArrowRight size={16} strokeWidth={2} className="ml-2" />
                </ButtonLink>
              )}
            </div>
            <ProductGrid products={alsoIn} />
          </div>
        </section>
      )}
    </>
  )
}