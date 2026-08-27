/**
 * Database row types. Mirrors supabase/migrations/0001_init.sql.
 *
 * These are hand-written for Phase 0 so the app compiles before a live
 * Supabase project exists. Once the project is provisioned, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/supabase.ts
 * and re-point these aliases at the generated types.
 */

/** Product visibility tier. The order here IS the access hierarchy. */
export const VISIBILITY = ['public', 'login_required', 'premium_only'] as const
export type Visibility = (typeof VISIBILITY)[number]

/** Viewer access tier, derived from the session — never from user input. */
export type Tier = 'guest' | 'registered' | 'premium'

export interface Profile {
  id: string
  mobile: string
  name: string
  company: string | null
  email: string | null
  is_premium: boolean
  /** Printed on a proforma invoice. Not collected at registration — asked for
   *  the first time a client places an order. See migration 0012. */
  billing_address: string | null
  gst_number: string | null
  consent_at: string | null
  /** Forward-compatibility hatch: new registration fields land here
   *  without a migration. See scope §B. */
  extra: Record<string, unknown>
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  /** One level only — a sub-category's parent must itself be top-level. */
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  category_id: string | null
  visibility: Visibility
  /** In the catalogue at all. False hides it from everyone — see is_available. */
  is_active: boolean
  /**
   * Currently obtainable. Presentational only: a false here still lists,
   * opens and accepts enquiries, it just carries a "Currently Unavailable"
   * mark. Access is `is_active` + `visibility`, never this. See migration 0010.
   */
  is_available: boolean
  /** Gross weight in grams. Null means not recorded, and shows as nothing. */
  weight_grams: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  storage_path: string
  sort_order: number
  /** NOT NULL in the schema — a bulk import must not be able to produce a
   *  gallery of empty alt attributes. */
  alt: string
}

/**
 * Who a curated link opens for. Mirrors collections.min_tier.
 *
 * 'guest' publishes the pieces in that one link to anyone it reaches — chosen
 * per link, deliberately, and it touches nothing outside the link.
 */
export type CollectionAudience = 'guest' | 'registered' | 'premium'

export interface Collection {
  id: string
  title: string
  /** Unguessable link token. Never expires — is_active is the kill switch. */
  token: string
  welcome_message: string | null
  min_tier: CollectionAudience
  is_active: boolean
  created_at: string
}

export interface CollectionItem {
  collection_id: string
  product_id: string
  sort_order: number
}

export interface CollectionView {
  id: string
  collection_id: string
  profile_id: string | null
  mobile: string | null
  product_id: string | null
  viewed_at: string
}

/** A product joined with its gallery, as the catalogue pages consume it. */
export interface ProductWithImages extends Product {
  images: ProductImage[]
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null
}

/**
 * A placeholder for a piece the viewer is not entitled to open — the blurred
 * tile at the end of a grid.
 *
 * ── What it deliberately does NOT carry ─────────────────────────────────────
 * No id, no name, no slug, no `storage_path`. A locked tile is a statement that
 * "one more piece exists here", nothing more — it cannot be turned into a link
 * to the piece, and the full photograph is never sent to someone who may not
 * see it.
 *
 * What it does reveal, by design, is the COUNT and CATEGORY of withheld pieces.
 * That is the trade the blurred-teaser treatment makes; see DESIGN.md §6.
 * ────────────────────────────────────────────────────────────────────────────
 */
export interface LockedTile {
  /** List key. Positional — it is not a database identifier. */
  key: string
  /** The level the piece sits at, so the tile can name the right next step. */
  requires: Exclude<Visibility, 'public'>
  /** Category names are public (see the RLS policy), so this is safe to show. */
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null
  /**
   * ~20x25px data URI of the piece's first photograph, or null.
   *
   * This IS the real piece, which is the point — the tile shows its silhouette
   * and colour rather than generic artwork. It is safe to send because the
   * detail was destroyed when the derivative was generated, not merely hidden
   * by a filter that a devtools click would remove: ~500 pixels cannot be
   * upscaled back into a photograph. See migration 0009.
   *
   * Null on rows generated before the backfill, and on the fixture repository.
   * The card falls back to decorative artwork.
   */
  blurPreview: string | null
}

// -----------------------------------------------------------------------------
// Orders and proforma invoices (migration 0012)
// -----------------------------------------------------------------------------

/** submitted → issued, or submitted → cancelled. Nothing goes backwards. */
export type OrderStatus = 'submitted' | 'issued' | 'cancelled'

/** Seller details printed on an invoice. Every field starts null — none had
 *  been supplied when this was built, and a blank is the only honest
 *  alternative to an invented GST number or bank account. */
export interface CompanySettings {
  legal_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  gst_number: string | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_ifsc: string | null
  bank_branch: string | null
  updated_at: string
}

/** The buyer's details as they stood when the invoice was issued. */
export interface BuyerSnapshot {
  name: string | null
  company: string | null
  mobile: string | null
  email: string | null
  billing_address: string | null
  gst_number: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  /** Null once a piece has been deleted. `product_name` is what renders. */
  product_id: string | null
  /** Copied from the piece at issue, so a later rename cannot rewrite an
   *  invoice a client is already holding. Null until issued. */
  product_name: string | null
  quantity: number
  sort_order: number
}

export interface Order {
  id: string
  profile_id: string
  /** Assigned by the database, e.g. NC-2026-0001. Never by the browser. */
  order_number: string
  status: OrderStatus
  notes: string | null
  /**
   * Filled at issue, and the ONLY source the invoice reads. Null on a
   * submitted order, which has nothing to preserve yet.
   */
  buyer_snapshot: BuyerSnapshot | null
  seller_snapshot: CompanySettings | null
  issued_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

/** An order with its lines, as the order and invoice screens consume it. */
export interface OrderWithItems extends Order {
  items: OrderItem[]
  /** Joined live for the admin list. Not what an issued invoice renders. */
  profile?: Pick<Profile, 'name' | 'company' | 'mobile'> | null
}

/** One line of a basket being assembled in the browser, before submission. */
export interface DraftLine {
  productId: string
  quantity: number
}
