/**
 * Curated collection links (scope §G).
 *
 * Access rule, and the reason this file is separate from catalogue.ts: the
 * token alone grants nothing by default. Each link carries its own audience —
 * premium (the default), any signed-in client, or anyone holding it — and the
 * database decides, never this file. A premium link that is forwarded on
 * therefore leaks nothing, which is the whole point of sending one.
 *
 * Denial is deliberately uniform. A guest, a non-premium user, an inactive
 * link and a token that never existed all produce exactly the same result —
 * otherwise the difference between "denied" and "not found" would confirm that
 * a given link exists.
 */
import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import type { CollectionAudience, ProductWithImages, Tier } from '@/types/db'
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

/**
 * Mirrors public.collection_allows() for fixture mode only.
 *
 * Against a real database this is never consulted — the RPC decides and this
 * file does not second-guess it. Two copies of an access rule is a liability,
 * so this one exists purely so the offline fixtures behave believably.
 */
export function audienceAdmits(audience: CollectionAudience, tier: Tier): boolean {
  if (audience === 'guest') return true
  if (audience === 'registered') return tier === 'registered' || tier === 'premium'
  return tier === 'premium'
}

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

/** Mirrors the collection seeded in supabase/seed.sql. */
const FIXTURE_COLLECTION = {
  token: 'seed-token-diwali-preview-2026',
  minTier: 'premium' as CollectionAudience,
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
    // Audience check first, before the token is even looked at — so timing and
    // response are identical whether or not the link is real.
    if (!audienceAdmits(FIXTURE_COLLECTION.minTier, tier)) return DENIED
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
  visibility: string
  category_name: string | null
  category_slug: string | null
  sort_order: number
  image_id: string | null
  image_path: string | null
  image_alt: string | null
  image_position: number | null
  is_available: boolean
  weight_grams: number | null
}

const supabaseRepo: CollectionsRepo = {
  async open(token) {
    // No tier check here — public.get_collection() raises access_denied for
    // anyone the link's audience does not admit. The rule lives in one place.
    const { data, error } = await getSupabase().rpc('get_collection', { p_token: token })

    if (error || !data || (data as CollectionRow[]).length === 0) return DENIED

    const rows = data as CollectionRow[]

    // One row per product per photograph, in the admin's chosen order. The
    // products are NOT re-read through ordinary RLS afterwards: a link shared
    // with a registered client may hold a premium piece, and RLS would drop it
    // from a collection chosen for them without saying so.
    const byId = new Map<string, ProductWithImages>()

    for (const row of rows) {
      let product = byId.get(row.product_id)

      if (!product) {
        product = {
          id: row.product_id,
          name: row.product_name,
          slug: row.product_slug,
          category_id: null,
          visibility: row.visibility as ProductWithImages['visibility'],
          is_active: true,
          is_available: row.is_available,
          weight_grams: row.weight_grams,
          // Not returned by the RPC; a curated link shows no invoice.
          hsn_code: null,
          sort_order: row.sort_order,
          // Not returned by the RPC and not shown anywhere in a collection.
          created_at: '',
          updated_at: '',
          images: [],
          category: row.category_slug
            ? { id: '', name: row.category_name ?? '', slug: row.category_slug }
            : null,
        } as ProductWithImages
        byId.set(row.product_id, product)
      }

      // Left-joined: a piece whose photographs are not uploaded yet still
      // appears, rather than shortening the selection the admin made.
      if (row.image_id && row.image_path) {
        product.images.push({
          id: row.image_id,
          product_id: row.product_id,
          storage_path: row.image_path,
          sort_order: row.image_position ?? 0,
          alt: row.image_alt ?? row.product_name,
        })
      }
    }

    return {
      status: 'ok',
      collection: {
        title: rows[0].title,
        welcomeMessage: rows[0].welcome_message,
        products: [...byId.values()],
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
