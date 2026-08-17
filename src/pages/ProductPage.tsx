import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Share2, MessageCircle, ChevronRight } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)
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

  const shareUrl = typeof window === 'undefined' ? '' : window.location.href

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused; saying nothing is better than a
      // "copied" message when nothing was copied.
    }
  }

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

            {/* Share. These now do something: WhatsApp opens a prefilled
                message, and Copy puts the link on the clipboard. The wishlist
                heart that sat here was removed — there is no wishlist in this
                platform, and a heart that does nothing is a broken promise.

                Sharing a gated piece is safe: the recipient still has to be
                entitled to see it, or they get the same "not available" page
                as anyone else. */}
            <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
              <span className="text-sm text-[var(--color-fg-muted)]">Share:</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${product.name} — ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 transition-colors hover:bg-[var(--color-bg-muted)]"
                aria-label="Share on WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={onCopyLink}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 transition-colors hover:bg-[var(--color-bg-muted)]"
                aria-label="Copy link to this piece"
              >
                <Share2 className="h-5 w-5" />
              </button>
              {copied && (
                <span role="status" className="text-sm text-[var(--color-fg-muted)]">
                  Link copied
                </span>
              )}
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