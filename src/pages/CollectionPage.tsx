import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ButtonLink } from '@/components/ui/Button'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { collections } from '@/data/collections'
import { features } from '@/lib/env'

/**
 * Curated collection link (scope §G).
 *
 * Links never expire, so anyone the recipient forwards it to will eventually
 * open it. That is fine: the token grants nothing on its own. Only a signed-in
 * premium client sees anything.
 */
export function CollectionPage() {
  const { token = '' } = useParams()
  const { tier } = useSession()

  const { data, loading } = useAsync(() => collections.open(token, tier), [token, tier])

  const opened = data?.status === 'ok'
  usePageTitle(data?.status === 'ok' ? data.collection.title : undefined)

  useEffect(() => {
    // One "open" per successful view (scope §G metrics).
    if (opened) void collections.recordView(token)
  }, [opened, token])

  if (loading) {
    return (
      <section className="mx-auto max-w-[1360px] px-6 py-20 lg:px-14">
        <ProductGridSkeleton count={3} />
      </section>
    )
  }

  if (!data || data.status === 'denied') return <CollectionDenied />

  const { collection } = data

  return (
    <section className="mx-auto max-w-[1360px] px-6 py-20 lg:px-14">
      <div className="mb-14 text-center">
        <span className="eyebrow">A private selection</span>
        <h1 className="mt-3.5 font-serif text-4xl font-light md:text-[2.6rem]">
          {collection.title}
        </h1>
        {collection.welcomeMessage && (
          <p className="mx-auto mt-5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            {collection.welcomeMessage}
          </p>
        )}
      </div>

      <ProductGrid
        products={collection.products}
        onOpen={
          features.collectionProductViews
            ? (product) => void collections.recordView(token, product.id)
            : undefined
        }
      />
    </section>
  )
}

/**
 * One fixed message for every failure: not signed in, signed in but not
 * premium, link disabled, or token that never existed.
 *
 * Distinguishing them would turn this page into an oracle — someone could
 * guess tokens and use the wording difference to learn which ones are real.
 */
function CollectionDenied() {
  return (
    <section className="mx-auto max-w-[560px] px-6 py-32 text-center">
      <span className="eyebrow">Private link</span>
      <h1 className="mt-3.5 font-serif text-3xl font-light">This collection is not available</h1>
      <p className="mx-auto mt-5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink-soft">
        Curated collections are shown to premium clients of VK Jewellers. If this link was sent
        to you, sign in with the number it was sent to.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/sign-in">Sign in</ButtonLink>
        <ButtonLink to="/">Browse the catalogue</ButtonLink>
      </div>
    </section>
  )
}
