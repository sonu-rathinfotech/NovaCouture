import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { LoadError } from '@/components/LoadError'
import { HeroMedia } from '@/components/HeroMedia'
import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { samplePhoto, USING_SAMPLE_PHOTOS } from '@/components/catalogue/samplePhotos'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'

export function Home() {
  usePageTitle()
  const { tier } = useSession()
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])
  const { data: products, loading, error } = useAsync(
    () => catalogue.listProducts({ tier, limit: 8 }),
    [tier],
  )

  const cats = categories ?? []
  const featured = cats.slice(0, 3)
  const secondary = cats.slice(3)

  return (
    <div className="bg-[var(--color-bg)]">
      {/* Hero Section - Tiffany/Aurate editorial style. The negative margin
          pulls the photograph up under the sticky header so the hero reads
          full-bleed edge to edge. */}
      <section className="relative -mt-18 overflow-hidden">
        <HeroMedia />
        
        <div className="relative z-10 container min-h-[90vh] flex items-center lg:min-h-[100vh]">
          <div className="max-w-3xl animate-fade-in-up">
            <p className="eyebrow mb-6 text-[var(--trust-gold)] tracking-widest">
              № 01 — Private Catalogue
            </p>
            <h1 className="font-display text-[var(--text-display-lg)] font-medium text-white leading-tight tracking-tight text-balance">
              Pieces made to be inherited.
            </h1>
            <p className="mt-8 text-[var(--text-body-lg)] leading-relaxed text-[var(--base-200)] max-w-xl">
              A private catalogue of fine gold and stone work, shown by registered access.
              Each piece carries a legacy of craftsmanship.
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <ButtonLink
                to={cats[0] ? `/c/${cats[0].slug}` : '/'}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Explore the Collection
              </ButtonLink>
              {tier === 'guest' && (
                <ButtonLink to="/sign-in" variant="secondary" size="lg" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Client Sign In
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <svg className="h-6 w-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Sample photos notice */}
      {USING_SAMPLE_PHOTOS && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]/50 px-6 py-3">
          <p className="container text-center text-sm tracking-[0.1em] uppercase text-[var(--color-fg-muted)]">
            Photography shown is for design purposes only — not VK Jewellers pieces
          </p>
        </div>
      )}

      {/* A row of trust badges stood here — BIS Hallmarked, Lifetime
          Warranty, Insured Shipping, 30-day returns, Personal Concierge.
          It came with the design this was adapted from. VK has never
          said any of it, and BIS hallmarking is a legal certification.
          Restore it only in VK's own words, claim by claim. */}

      {/* Collections - Tanishq/Kalyan style with editorial numbering */}
      <section className="py-20 lg:py-32 bg-[var(--color-bg)]">
        <div className="container">
          <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-3 text-[var(--color-accent)]">№ 02 — Collections</p>
              <h2 className="font-display text-[var(--text-h1)] text-[var(--color-fg)] tracking-tight">Curated by category</h2>
            </div>
            {cats[0] && (
              <ButtonLink
                to={`/c/${cats[0].slug}`}
                variant="ghost"
                size="md"
                className="text-[var(--color-fg)] hover:text-[var(--color-accent)]"
              >
                Browse the catalogue
                <ArrowRight size={16} strokeWidth={2} className="ml-2" />
              </ButtonLink>
            )}
          </div>

          {/* Featured Categories (3) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-12">
            {featured.map((c, i) => (
              <CategoryCard key={c.id} category={c} large={i === 0} index={i} />
            ))}
          </div>

          {/* Secondary Categories */}
          {secondary.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {secondary.map((c, i) => (
                <CategoryCard key={c.id} category={c} index={i + 3} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial Story - Tiffany/Kalyan heritage storytelling */}
      <section className="py-20 lg:py-32 bg-[var(--color-bg-muted)]" data-theme="warm">
        <div className="container">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl">
              <img
                src={samplePhoto('necklace', 1)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="eyebrow mb-3 text-[var(--warm-700)]">№ 03 — The House of VK</p>
              <h2 className="font-display text-[var(--text-h1)] text-[var(--warm-900)] tracking-tight">
                Shown by invitation, not by sale.
              </h2>
              <div className="mt-8 space-y-5 text-[var(--text-body-lg)] leading-relaxed text-[var(--warm-600)]">
                <p>
                  This is a catalogue, not a shop. Pieces are shown here so clients can see the
                  current work; nothing is sold through the site and no prices are listed.
                </p>
                <p>
                  A wider selection is shown to registered clients, and certain pieces are reserved
                  for premium clients. Access is arranged by VK Jewellers directly.
                </p>
              </div>
              <div className="mt-10">
                <ButtonLink to="/about" variant="secondary" size="lg">
                  Our Story
                  <ArrowRight size={16} strokeWidth={2} className="ml-2" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Pieces */}
      <section className="py-20 lg:py-32 bg-[var(--color-bg)]">
        <div className="container">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="eyebrow mb-3 text-[var(--color-accent)]">№ 04 — Selected</p>
            <h2 className="font-display text-[var(--text-h1)] text-[var(--color-fg)] tracking-tight">
              From the collection
            </h2>
            <p className="mt-4 text-[var(--text-body-lg)] text-[var(--color-fg-muted)]">
              {products && !loading
                ? `${products.length} ${products.length === 1 ? 'piece' : 'pieces'} shown. Browse a category for the full listing.`
                : 'Browse a category for the full listing.'}
            </p>
          </div>

          {/* An empty grid would read as "VK has nothing", which is a worse lie
              than admitting the catalogue could not be reached. */}
          {error ? (
            <LoadError what="the catalogue" />
          ) : loading ? (
            <ProductGridSkeleton />
          ) : (
            <ProductGrid products={products ?? []} />
          )}
        </div>
      </section>

      {/* Premium Invitation - Aurate/Ana Luisa color-rich style */}
      {tier !== 'premium' && (
        <section className="relative overflow-hidden py-20 lg:py-32" data-theme="dark-premium">
          <img
            src={samplePhoto('ring', 2)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="relative container text-center">
            <p className="eyebrow mb-6 text-[var(--accent-300)]">№ 05 — By Invitation</p>
            <div className="mx-auto mb-6 p-4 bg-white/10 rounded-full inline-block">
              <svg className="h-12 w-12 text-[var(--accent-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="font-display text-[var(--text-h1)] text-white tracking-tight max-w-2xl mx-auto">
              {tier === 'guest'
                ? 'The full archive is reserved for clients'
                : 'Selected pieces are shown to premium clients'}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[var(--text-body-lg)] leading-relaxed text-[var(--base-300)]">
              {tier === 'guest'
                ? 'Sign in with your registered number to view the wider catalogue.'
                : 'Premium access is arranged by VK Jewellers. Speak to us to have it added to your account.'}
            </p>
            <div className="mt-10">
              <ButtonLink
                to={tier === 'guest' ? '/sign-in' : '/contact'}
                variant="premium"
                size="lg"
              >
                {tier === 'guest' ? 'Sign In' : 'Contact Us'}
              </ButtonLink>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}