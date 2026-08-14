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
  is_active: boolean
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

export interface Collection {
  id: string
  title: string
  /** Unguessable link token. Never expires — is_active is the kill switch. */
  token: string
  welcome_message: string | null
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
