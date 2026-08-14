import { Link } from 'react-router-dom'
import { ArrowRight, Crown } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { CategoryCard } from '@/components/catalogue/CategoryCard'
import { HERO_PHOTO, samplePhoto, USING_SAMPLE_PHOTOS } from '@/components/catalogue/samplePhotos'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'

export function Home() {
  const { tier } = useSession()
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])
  const { data: products, loading } = useAsync(
    () => catalogue.listProducts({ tier, limit: 8 }),
    [tier],
  )

  const cats = categories ?? []
  const featured = cats.slice(0, 3)
  const secondary = cats.slice(3)

  return (
    <div>
      {/* Full-height hero. Dark luxury: the photograph recedes behind a noir
          scrim and a radial gold glow — the gold in the air rather than in a
          gradient fill. Text is anchored to the bottom, under the dark bar. */}
      <section className="relative flex h-screen min-h-[640px] items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_PHOTO}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-30"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-noir via-noir/70 to-noir/50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(217,180,92,0.10),transparent_70%)]"
          />
        </div>

        <div className="relative container-lux pb-24 lg:pb-28">
          <div className="max-w-2xl animate-fade-in">
            <p className="eyebrow mb-6 text-champagne-400">VK Jewellers — Private Catalogue</p>
            <h1 className="text-balance font-serif text-display text-charcoal-900">
              Pieces made to be inherited.
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed font-light text-charcoal-400">
              A private catalogue of fine gold and stone work, shown by registered access.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <ButtonLink to={cats[0] ? `/c/${cats[0].slug}` : '/'} variant="primary" size="lg">
                Explore the collection
              </ButtonLink>
              {tier === 'guest' && (
                <ButtonLink to="/sign-in" variant="light" size="lg">
                  Client sign in
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-charcoal-400/70 lg:flex"
        >
          <span className="text-[0.6rem] tracking-[0.3em] uppercase">Scroll</span>
          <span className="block h-12 w-px bg-charcoal-400/40" />
        </div>
      </section>

      {USING_SAMPLE_PHOTOS && (
        <p className="border-b border-ivory-300 bg-ivory-200/60 px-6 py-2.5 text-center text-[0.65rem] tracking-[0.2em] text-charcoal-400 uppercase">
          Photography shown is for design purposes only — not VK Jewellers pieces
        </p>
      )}

      {/* Collections */}
      <section className="py-24 lg:py-32">
        <div className="container-lux">
          <div className="mb-16 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-3">Collections</p>
              <span aria-hidden="true" className="mb-5 flex items-center gap-2">
                <span className="h-px w-8 bg-champagne-400" />
                <span className="size-1.5 rotate-45 bg-champagne-500" />
                <span className="h-px w-8 bg-champagne-400" />
              </span>
              <h2 className="font-serif text-display-sm text-charcoal-800">Curated by category</h2>
            </div>
            {cats[0] && (
              <Link
                to={`/c/${cats[0].slug}`}
                className="group inline-flex items-center gap-2 text-xs tracking-[0.2em] text-charcoal-600 uppercase transition-colors hover:text-charcoal-900"
              >
                Browse the catalogue
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {featured.map((c, i) => (
              <CategoryCard
                key={c.id}
                category={c}
                large={i === 0}
                index={i}
              />
            ))}
          </div>

          {secondary.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {secondary.map((c, i) => (
                <CategoryCard key={c.id} category={c} index={i + 3} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial. The copy here is deliberately factual: VK has not supplied
          a house history, and inventing one for a real business is not ours to
          do. The words below are true of the platform as built. */}
      <section className="bg-ivory-200 py-24 lg:py-32">
        <div className="container-lux">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <div className="aspect-4/5 overflow-hidden bg-ivory-300">
              <img
                src={samplePhoto('necklace', 1)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="eyebrow mb-3">The House of VK</p>
              <span aria-hidden="true" className="mb-5 flex items-center gap-2">
                <span className="h-px w-8 bg-champagne-400" />
                <span className="size-1.5 rotate-45 bg-champagne-500" />
                <span className="h-px w-8 bg-champagne-400" />
              </span>
              <h2 className="text-balance font-serif text-display-sm text-charcoal-800">
                Shown by invitation, not by sale.
              </h2>
              <div className="mt-8 space-y-5 text-base leading-relaxed font-light text-charcoal-500">
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
                <ButtonLink to="/about" variant="outline">
                  Our story
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected pieces */}
      <section className="py-24 lg:py-32">
        <div className="container-lux">
          <div className="mb-16 text-center">
            <p className="eyebrow mb-3">Selected</p>
            <span aria-hidden="true" className="mb-6 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-champagne-400" />
              <span className="size-1.5 rotate-45 bg-champagne-500" />
              <span className="h-px w-8 bg-champagne-400" />
            </span>
            <h2 className="font-serif text-display-sm text-charcoal-800">From the collection</h2>
            <p className="mx-auto mt-4 max-w-md text-base font-light text-charcoal-400">
              {products && !loading
                ? `${products.length} ${products.length === 1 ? 'piece' : 'pieces'} shown. Browse a category for the full listing.`
                : 'Browse a category for the full listing.'}
            </p>
          </div>

          {loading ? <ProductGridSkeleton /> : <ProductGrid products={products ?? []} />}
        </div>
      </section>

      {/* Premium invitation. A panel of the deepest ground with a gold glow
          rising from the top — the reserved section of the house. */}
      {tier !== 'premium' && (
        <section className="relative overflow-hidden border-y border-champagne-500/20 bg-noir py-24 lg:py-32">
          <img
            src={samplePhoto('ring', 2)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_0%,rgba(217,180,92,0.12),transparent_65%)]"
          />
          <div className="relative container-lux text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-6 flex items-center justify-center gap-2"
            >
              <span className="h-px w-10 bg-champagne-600/50" />
              <Crown size={22} strokeWidth={1} className="text-champagne-400" />
              <span className="h-px w-10 bg-champagne-600/50" />
            </span>
            <h2 className="text-balance font-serif text-display-sm text-charcoal-900">
              {tier === 'guest'
                ? 'The full archive is reserved for clients'
                : 'Selected pieces are shown to premium clients'}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed font-light text-charcoal-400">
              {tier === 'guest'
                ? 'Sign in with your registered number to view the wider catalogue.'
                : 'Premium access is arranged by VK Jewellers. Speak to us to have it added to your account.'}
            </p>
            <div className="mt-10">
              <ButtonLink to={tier === 'guest' ? '/sign-in' : '/contact'} variant="light" size="lg">
                {tier === 'guest' ? 'Sign in' : 'Contact us'}
              </ButtonLink>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
