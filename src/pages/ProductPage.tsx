import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Share2, MessageCircle } from 'lucide-react'
import { Gallery } from '@/components/catalogue/Gallery'
import { artKindFor, artOffsetFor } from '@/components/catalogue/art'
import { EnquiryForm } from '@/components/catalogue/EnquiryForm'
import { ProductGrid } from '@/components/catalogue/ProductGrid'
import { NotFound } from './NotFound'
import { LoadError } from '@/components/LoadError'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { features } from '@/lib/env'
import { enquiryVisibleTo } from '@/lib/enquiry'
import { formatWeight } from '@/lib/weight'
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

  const { data: product, loading, error } = useAsync(
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

  /*
   * The order of these two matters.
   *
   * A THROWN error means the site could not reach the database. A null product
   * means the piece is not there — or is there and this visitor is not entitled
   * to it, which by design is indistinguishable, so that a 404 cannot be used
   * to confirm a premium piece exists.
   *
   * Showing "this piece cannot be found" for a failed request tells a customer
   * a piece is gone when it is not. On a jeweller's catalogue that is the worst
   * thing the site can get wrong.
   */
  if (error) return <LoadError what="this piece" />
  if (!product) return <NotFound />

  const kind = artKindFor(product.category?.slug)
  const offset = artOffsetFor(product.slug)

  const parent = product.category
    ? (categories ?? []).find((c) => c.children.some((child) => child.id === product.category!.id))
    : undefined

  const shareUrl = typeof window === 'undefined' ? '' : window.location.href
  const weight = formatWeight(product.weight_grams)

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

            {/* The category only. A badge saying "Premium clients only" tells
                the customer how the gating works and nothing about the piece.
                Availability is different: it is a fact about the piece, and the
                client needs it before they enquire. */}
            {(product.category || !product.is_available) && (
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <Badge variant="secondary" size="sm">{product.category.name}</Badge>
                )}
                {!product.is_available && (
                  <Badge variant="default" size="sm">Currently Unavailable</Badge>
                )}
              </div>
            )}

            {/* Product Name - Tiffany editorial */}
            <h1 className="font-display text-[length:var(--text-h1)] text-[var(--color-fg)] tracking-tight text-balance">
              {product.name}
            </h1>

            {/* Divider */}
            <hr className="h-px bg-gradient-to-r from-[var(--color-accent)] to-transparent w-16" />

            {/* Description. The closing sentence has to track what is actually
                recorded: once a weight is shown, still asking the client to
                enquire about "weight, stones or making details" reads as though
                the figure above it were not an answer. */}
            <p className="text-[length:var(--text-body-lg)] leading-relaxed text-[var(--color-fg-muted)] max-w-[42ch]">
              {product.images.length === 1
                ? 'One photograph of this piece.'
                : `${product.images.length} photographs of this piece.`}{' '}
              {weight ? 'For stones or making details, please ask.' : 'For weight, stones or making details, please ask.'}
            </p>

            {/* The catalogue's first real attribute (migration 0010). Rendered
                only when recorded — a "Weight —" row would read as though the
                piece weighed nothing. */}
            {weight && (
              <dl className="flex items-baseline gap-3 border-t border-[var(--color-border)] pt-4">
                <dt className="text-[0.7rem] font-light tracking-[0.15em] text-[var(--color-fg-muted)] uppercase">
                  Weight
                </dt>
                <dd className="font-display text-lg text-[var(--color-fg)]">{weight}</dd>
              </dl>
            )}

            {/* Removed here: a row of "BIS Hallmarked / Lifetime Warranty /
                Insured Shipping" badges and a Specifications panel listing
                hallmark certification, a lifetime warranty, annual cleaning,
                insured shipping and a 30-day exchange policy.

                All of it came from the UI this design was adapted from. Nova Couture has
                never said any of it. BIS hallmarking is a legal certification
                and the rest are contractual promises, so the site was making
                commitments on the jeweller's behalf to real customers.

                If Nova Couture does offer these, they can be stated — in Nova Couture's own words,
                once someone there has confirmed each one. Invented copy is not
                a placeholder to be filled in later; it reads as fact from the
                moment it is published. */}

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
                <h2 className="font-display text-[length:var(--text-h2)] text-[var(--color-fg)]">
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