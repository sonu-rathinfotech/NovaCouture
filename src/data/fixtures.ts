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
  earrings: '11111111-1111-4111-8111-000000000005',
  pendants_chains: '11111111-1111-4111-8111-000000000006',
  haram: '22222222-2222-4222-8222-000000000005',
  choker: '22222222-2222-4222-8222-000000000006',
  bangle_sets: '22222222-2222-4222-8222-000000000007',
  cocktail: '22222222-2222-4222-8222-000000000008',
  tennis: '22222222-2222-4222-8222-000000000009',
  jhumka: '22222222-2222-4222-8222-000000000010',
  chandbali: '22222222-2222-4222-8222-000000000011',
  studs: '22222222-2222-4222-8222-000000000012',
  pendants: '22222222-2222-4222-8222-000000000013',
  chains: '22222222-2222-4222-8222-000000000014',
} as const

export const categories: Category[] = [
  { id: CAT.necklaces, name: 'Necklaces', slug: 'necklaces', parent_id: null, sort_order: 1, is_active: true },
  { id: CAT.bangles, name: 'Bangles', slug: 'bangles', parent_id: null, sort_order: 2, is_active: true },
  { id: CAT.rings, name: 'Rings', slug: 'rings', parent_id: null, sort_order: 3, is_active: true },
  { id: CAT.bracelets, name: 'Bracelets', slug: 'bracelets', parent_id: null, sort_order: 4, is_active: true },
  { id: CAT.earrings, name: 'Earrings', slug: 'earrings', parent_id: null, sort_order: 5, is_active: true },
  { id: CAT.pendants_chains, name: 'Pendants & Chains', slug: 'pendants-chains', parent_id: null, sort_order: 6, is_active: true },

  // One level of sub-categories only (scope §C).
  { id: CAT.temple, name: 'Temple', slug: 'temple', parent_id: CAT.necklaces, sort_order: 1, is_active: true },
  { id: CAT.bridal, name: 'Bridal', slug: 'bridal', parent_id: CAT.necklaces, sort_order: 2, is_active: true },
  { id: CAT.kada, name: 'Kada', slug: 'kada', parent_id: CAT.bangles, sort_order: 1, is_active: true },
  { id: CAT.solitaire, name: 'Solitaire', slug: 'solitaire', parent_id: CAT.rings, sort_order: 1, is_active: true },
  { id: CAT.haram, name: 'Haram', slug: 'haram', parent_id: CAT.necklaces, sort_order: 3, is_active: true },
  { id: CAT.choker, name: 'Choker', slug: 'choker', parent_id: CAT.necklaces, sort_order: 4, is_active: true },
  { id: CAT.bangle_sets, name: 'Bangle Sets', slug: 'bangle-sets', parent_id: CAT.bangles, sort_order: 2, is_active: true },
  { id: CAT.cocktail, name: 'Cocktail', slug: 'cocktail', parent_id: CAT.rings, sort_order: 2, is_active: true },
  { id: CAT.tennis, name: 'Tennis', slug: 'tennis', parent_id: CAT.bracelets, sort_order: 1, is_active: true },
  { id: CAT.jhumka, name: 'Jhumka', slug: 'jhumka', parent_id: CAT.earrings, sort_order: 1, is_active: true },
  { id: CAT.chandbali, name: 'Chandbali', slug: 'chandbali', parent_id: CAT.earrings, sort_order: 2, is_active: true },
  { id: CAT.studs, name: 'Studs', slug: 'studs', parent_id: CAT.earrings, sort_order: 3, is_active: true },
  { id: CAT.pendants, name: 'Pendants', slug: 'pendants', parent_id: CAT.pendants_chains, sort_order: 1, is_active: true },
  { id: CAT.chains, name: 'Chains', slug: 'chains', parent_id: CAT.pendants_chains, sort_order: 2, is_active: true },
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
  product(15, 'Ananta Jhumka', 'ananta-jhumka', CAT.jhumka, 'public'),
  product(16, 'Peacock Chandbali', 'peacock-chandbali', CAT.chandbali, 'public'),
  product(17, 'Kundan Stud Pair', 'kundan-stud-pair', CAT.studs, 'public'),
  product(18, 'Rope Chain 22K', 'rope-chain-22k', CAT.chains, 'public'),
  product(19, 'Lotus Pendant', 'lotus-pendant', CAT.pendants, 'public'),
  product(20, 'Beaded Mani Haram', 'beaded-mani-haram', CAT.haram, 'public'),
  product(21, 'Bangle Set of Six', 'bangle-set-of-six', CAT.bangle_sets, 'public'),
  product(22, 'Ruby Cocktail Ring', 'ruby-cocktail-ring', CAT.cocktail, 'public'),

  // --- login_required: hidden from guests ---
  product(4, 'Anjali Layered Chain', 'anjali-layered-chain', CAT.necklaces, 'login_required'),
  product(5, 'Solitaire Six-Prong', 'solitaire-six-prong', CAT.solitaire, 'login_required'),
  product(11, 'Filigree Link Bracelet', 'filigree-link-bracelet', CAT.bracelets, 'login_required'),
  product(12, 'Antique Nagas Choker', 'antique-nagas-choker', CAT.temple, 'login_required'),
  product(23, 'Nakshi Jhumka', 'nakshi-jhumka', CAT.jhumka, 'login_required'),
  product(24, 'Pearl Drop Chandbali', 'pearl-drop-chandbali', CAT.chandbali, 'login_required'),
  product(25, 'Diamond Line Tennis', 'diamond-line-tennis', CAT.tennis, 'login_required'),
  product(26, 'Guttapusalu Haram', 'guttapusalu-haram', CAT.haram, 'login_required'),
  product(27, 'Navratna Pendant', 'navratna-pendant', CAT.pendants, 'login_required'),
  product(28, 'Twisted Bangle Set', 'twisted-bangle-set', CAT.bangle_sets, 'login_required'),

  // --- premium_only: hidden from guests and registered users ---
  product(6, 'Padma Bridal Set', 'padma-bridal-set', CAT.bridal, 'premium_only'),
  product(7, 'Heritage Polki Suite', 'heritage-polki-suite', CAT.bridal, 'premium_only'),
  product(13, 'Emerald Drop Haram', 'emerald-drop-haram', CAT.bridal, 'premium_only'),
  product(14, 'Uncut Diamond Kada', 'uncut-diamond-kada', CAT.kada, 'premium_only'),
  product(29, 'Polki Chandbali Suite', 'polki-chandbali-suite', CAT.chandbali, 'premium_only'),
  product(30, 'Kasu Bridal Haram', 'kasu-bridal-haram', CAT.haram, 'premium_only'),
  product(31, 'Emerald Cocktail Ring', 'emerald-cocktail-ring', CAT.cocktail, 'premium_only'),
  product(32, 'Nizami Diamond Choker', 'nizami-diamond-choker', CAT.choker, 'premium_only'),
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
