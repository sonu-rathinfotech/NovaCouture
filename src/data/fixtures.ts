/**
 * Development fixtures. Mirrors supabase/seed.sql exactly — same ids, slugs,
 * and visibility levels — so behaviour does not change when the real database
 * is connected.
 *
 * These are TEMPORARY. They exist only because the Supabase project is not yet
 * provisioned. Nothing outside src/data/ should import this file; go through
 * the repository in catalogue.ts instead.
 */
import type { Category, Product, ProductImage } from '@/types/db'

const CAT = {
  necklaces: '11111111-1111-4111-8111-000000000001',
  bangles: '11111111-1111-4111-8111-000000000002',
  rings: '11111111-1111-4111-8111-000000000003',
  bracelets: '11111111-1111-4111-8111-000000000004',
  temple: '22222222-2222-4222-8222-000000000001',
  bridal: '22222222-2222-4222-8222-000000000002',
  kada: '22222222-2222-4222-8222-000000000003',
  solitaire: '22222222-2222-4222-8222-000000000004',
} as const

export const categories: Category[] = [
  { id: CAT.necklaces, name: 'Necklaces', slug: 'necklaces', parent_id: null, sort_order: 1, is_active: true },
  { id: CAT.bangles, name: 'Bangles', slug: 'bangles', parent_id: null, sort_order: 2, is_active: true },
  { id: CAT.rings, name: 'Rings', slug: 'rings', parent_id: null, sort_order: 3, is_active: true },
  { id: CAT.bracelets, name: 'Bracelets', slug: 'bracelets', parent_id: null, sort_order: 4, is_active: true },

  // One level of sub-categories only (scope §C).
  { id: CAT.temple, name: 'Temple', slug: 'temple', parent_id: CAT.necklaces, sort_order: 1, is_active: true },
  { id: CAT.bridal, name: 'Bridal', slug: 'bridal', parent_id: CAT.necklaces, sort_order: 2, is_active: true },
  { id: CAT.kada, name: 'Kada', slug: 'kada', parent_id: CAT.bangles, sort_order: 1, is_active: true },
  { id: CAT.solitaire, name: 'Solitaire', slug: 'solitaire', parent_id: CAT.rings, sort_order: 1, is_active: true },
]

const now = '2026-01-01T00:00:00.000Z'

function product(
  n: number,
  name: string,
  slug: string,
  category_id: string,
  visibility: Product['visibility'],
): Product {
  return {
    id: `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`,
    name,
    slug,
    category_id,
    visibility,
    is_active: true,
    sort_order: n,
    created_at: now,
    updated_at: now,
  }
}

export const products: Product[] = [
  // --- public: visible to everyone ---
  product(1, 'Meera Temple Haram', 'meera-temple-haram', CAT.temple, 'public'),
  product(2, 'Kanchi Broad Kada', 'kanchi-broad-kada', CAT.kada, 'public'),
  product(3, 'Rivière Tennis Line', 'riviere-tennis-line', CAT.bracelets, 'public'),
  product(8, 'Lakshmi Kasu Malai', 'lakshmi-kasu-malai', CAT.temple, 'public'),
  product(9, 'Paisley Cuff Kada', 'paisley-cuff-kada', CAT.kada, 'public'),
  product(10, 'Half-Eternity Band', 'half-eternity-band', CAT.rings, 'public'),

  // --- login_required: hidden from guests ---
  product(4, 'Anjali Layered Chain', 'anjali-layered-chain', CAT.necklaces, 'login_required'),
  product(5, 'Solitaire Six-Prong', 'solitaire-six-prong', CAT.solitaire, 'login_required'),
  product(11, 'Filigree Link Bracelet', 'filigree-link-bracelet', CAT.bracelets, 'login_required'),
  product(12, 'Antique Nagas Choker', 'antique-nagas-choker', CAT.temple, 'login_required'),

  // --- premium_only: hidden from guests and registered users ---
  product(6, 'Padma Bridal Set', 'padma-bridal-set', CAT.bridal, 'premium_only'),
  product(7, 'Heritage Polki Suite', 'heritage-polki-suite', CAT.bridal, 'premium_only'),
  product(13, 'Emerald Drop Haram', 'emerald-drop-haram', CAT.bridal, 'premium_only'),
  product(14, 'Uncut Diamond Kada', 'uncut-diamond-kada', CAT.kada, 'premium_only'),
]

/**
 * Gallery placeholders. `storage_path` uses the `seed/` prefix, which the
 * gallery components read as "render line-art, not a photograph". Real
 * uploads produce real paths and the same components render <img>.
 */
export const productImages: ProductImage[] = products.flatMap((p) =>
  Array.from({ length: p.visibility === 'premium_only' ? 6 : 4 }, (_, i) => ({
    id: `${p.id}-img-${i + 1}`,
    product_id: p.id,
    storage_path: `seed/${p.slug}-${i + 1}.jpg`,
    sort_order: i + 1,
    alt: `${p.name} — view ${i + 1}`,
  })),
)
