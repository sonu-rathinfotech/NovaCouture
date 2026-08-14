/**
 * Curated collection links (scope §G).
 *
 * Access rule, and the reason this file is separate from catalogue.ts: the
 * token alone grants nothing. The recipient must be signed in AND premium. A
 * forwarded link therefore leaks nothing, which is the whole point of sending
 * one to a client.
 *
 * Denial is deliberately uniform. A guest, a non-premium user, an inactive
 * link and a token that never existed all produce exactly the same result —
 * otherwise the difference between "denied" and "not found" would confirm that
 * a given link exists.
 */
import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import type { ProductWithImages, Tier } from '@/types/db'
import { categories as fxCategories, productImages as fxImages, products as fxProducts } from './fixtures'

export interface CollectionView {
  title: string
  welcomeMessage: string | null
  products: ProductWithImages[]
}

export type CollectionResult =
  | { status: 'ok'; collection: CollectionView }
  | { status: 'denied' }

export interface CollectionsRepo {
  open(token: string, tier: Tier): Promise<CollectionResult>
  recordView(token: string, productId?: string): Promise<void>
}

const DENIED: CollectionResult = { status: 'denied' }

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

/** Mirrors the collection seeded in supabase/seed.sql. */
const FIXTURE_COLLECTION = {
  token: 'seed-token-diwali-preview-2026',
  title: 'Diwali Preview 2026',
  welcomeMessage: 'Welcome. A private selection, chosen for you.',
  productSlugs: ['padma-bridal-set', 'heritage-polki-suite', 'meera-temple-haram'],
}

function hydrate(slug: string): ProductWithImages | null {
  const product = fxProducts.find((p) => p.slug === slug && p.is_active)
  if (!product) return null
  return {
    ...product,
    images: fxImages
      .filter((i) => i.product_id === product.id)
      .sort((a, b) => a.sort_order - b.sort_order),
    category: fxCategories.find((c) => c.id === product.category_id) ?? null,
  }
}

const fixtureRepo: CollectionsRepo = {
  async open(token, tier) {
    // Premium check first, before the token is even looked at — so timing and
    // response are identical whether or not the link is real.
    if (tier !== 'premium') return DENIED
    if (token !== FIXTURE_COLLECTION.token) return DENIED

    const products = FIXTURE_COLLECTION.productSlugs
      .map(hydrate)
      .filter((p): p is ProductWithImages => p !== null)

    return {
      status: 'ok',
      collection: {
        title: FIXTURE_COLLECTION.title,
        welcomeMessage: FIXTURE_COLLECTION.welcomeMessage,
        products,
      },
    }
  },

  async recordView() {
    // No database to write metrics to yet. Deliberately silent rather than
    // logging, so nothing looks like it is being recorded when it is not.
  },
}

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

interface CollectionRow {
  collection_id: string
  title: string
  welcome_message: string | null
  product_id: string
  product_name: string
  product_slug: string
}

const supabaseRepo: CollectionsRepo = {
  async open(token) {
    // No tier check here — public.get_collection() raises access_denied for
    // anyone who is not signed in and premium. The rule lives in one place.
    const { data, error } = await getSupabase().rpc('get_collection', { p_token: token })

    if (error || !data || (data as CollectionRow[]).length === 0) return DENIED

    const rows = data as CollectionRow[]
    const productIds = rows.map((r) => r.product_id)

    const { data: products } = await getSupabase()
      .from('products')
      .select(
        `id, name, slug, category_id, visibility, is_active, sort_order, created_at, updated_at,
         images:product_images (id, product_id, storage_path, sort_order, alt),
         category:categories (id, name, slug)`,
      )
      .in('id', productIds)

    const byId = new Map(
      ((products ?? []) as unknown as ProductWithImages[]).map((p) => [p.id, p]),
    )

    return {
      status: 'ok',
      collection: {
        title: rows[0].title,
        welcomeMessage: rows[0].welcome_message,
        // Preserve the admin's chosen order, which the RPC already applied.
        products: rows.map((r) => byId.get(r.product_id)).filter((p): p is ProductWithImages => !!p),
      },
    }
  },

  async recordView(token, productId) {
    // Metrics must never break the viewing experience.
    try {
      await getSupabase().rpc('record_collection_view', {
        p_token: token,
        p_product_id: productId ?? null,
      })
    } catch {
      /* ignore */
    }
  },
}

export const fixtureCollections: CollectionsRepo = fixtureRepo
export const supabaseCollections: CollectionsRepo = supabaseRepo

export function selectCollections(configured: boolean): CollectionsRepo {
  return configured ? supabaseRepo : fixtureRepo
}

export const collections: CollectionsRepo = selectCollections(isConfigured)

/** The token used by the seeded collection, for review in fixture mode. */
export const FIXTURE_COLLECTION_TOKEN = FIXTURE_COLLECTION.token
