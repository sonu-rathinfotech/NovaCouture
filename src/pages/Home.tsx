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
      {/* Editorial hero: a split composition — oversized Bodoni type on the
          left, the photograph full-height on the right, like a magazine cover
          opened flat. The header is a solid ivory bar, so the hero begins
          beneath it cleanly. */}
      <section className="border-b border-ivory-300">
        <div className="container-lux grid min-h-[92vh] grid-cols-1 items-center gap-12 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-24">
          <div className="max-w-xl animate-fade-in">
            <p className="mb-8 flex items-center gap-4 text-[0.65rem] font-medium tracking-[0.32em] text-charcoal-400 uppercase">
              <span aria-hidden="true" className="block h-px w-10 bg-champagne-500" />
              № 01 — Private Catalogue
            </p>
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
                <ButtonLink to="/sign-in" variant="outline" size="lg">
                  Client sign in
                </ButtonLink>
              )}
            </div>
          </div>

          <div className="relative aspect-4/5 w-full overflow-hidden bg-ivory-200 lg:aspect-auto lg:h-[68vh]">
            <img
              src={HERO_PHOTO}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-charcoal-900/20 to-transparent"
            />
            <p className="absolute right-5 bottom-4 text-[0.6rem] tracking-[0.25em] text-charcoal-500 uppercase">
              VK Jewellers — Plate № 01
            </p>
          </div>
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
              <p className="eyebrow mb-3">№ 02 — Collections</p>
              <span aria-hidden="true" className="mb-5 block h-px w-12 bg-champagne-400" />
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
              <p className="eyebrow mb-3">№ 03 — The House of VK</p>
              <span aria-hidden="true" className="mb-5 block h-px w-12 bg-champagne-400" />
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
            <p className="eyebrow mb-3">№ 04 — Selected</p>
            <span aria-hidden="true" className="mx-auto mb-6 block h-px w-12 bg-champagne-400" />
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

      {/* Premium invitation */}
      {tier !== 'premium' && (
        <section className="relative overflow-hidden border-y border-champagne-500/25 bg-charcoal-900 py-24 lg:py-32">
          <img
            src={samplePhoto('ring', 2)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="relative container-lux text-center">
            <p className="eyebrow mb-6 text-champagne-300">№ 05 — By invitation</p>
            <Crown size={28} strokeWidth={1} className="mx-auto mb-6 text-champagne-400" />
            <h2 className="text-balance font-serif text-display-sm text-ivory-100">
              {tier === 'guest'
                ? 'The full archive is reserved for clients'
                : 'Selected pieces are shown to premium clients'}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed font-light text-ivory-200/70">
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
