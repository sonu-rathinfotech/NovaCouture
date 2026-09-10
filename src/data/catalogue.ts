/**
 * Catalogue repository.
 *
 * The app talks only to this module. Today it is backed by fixtures because
 * the Supabase project has not been provisioned yet; `supabaseRepo` below is
 * the drop-in replacement and is selected automatically once .env.local has
 * real credentials.
 *
 * ── The one thing to understand ──────────────────────────────────────────────
 * The fixture implementation filters by tier IN JAVASCRIPT. That is a stand-in,
 * not the security model. Once Supabase is connected, the filtering is done by
 * the RLS policies in supabase/migrations/0001_init.sql §4 and the client sends
 * no tier at all — it simply cannot see rows it is not entitled to. The `tier`
 * argument is therefore ignored by supabaseRepo on purpose.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import { escapeLike } from '@/lib/escapeLike'
import { applyPreview, currentPreviewTier, hiddenByPreview } from '@/lib/previewTier'
import type { Category, LockedTile, ProductWithImages, Tier, Visibility } from '@/types/db'
import { categories as fxCategories, productImages as fxImages, products as fxProducts } from './fixtures'

/** Mirrors public.visible_levels() in the migration. Keep the two in step. */
export function visibleLevels(tier: Tier): Visibility[] {
  switch (tier) {
    case 'premium':
      return ['public', 'login_required', 'premium_only']
    case 'registered':
      return ['public', 'login_required']
    case 'guest':
      return ['public']
  }
}

export interface CategoryNode extends Category {
  children: Category[]
}

export interface CatalogueRepo {
  listCategories(): Promise<CategoryNode[]>
  getCategory(slug: string): Promise<CategoryNode | null>
  listProducts(opts: {
    categorySlug?: string
    /** Free text typed into the header search. Matches the piece name. */
    search?: string
    limit?: number
    tier: Tier
  }): Promise<ProductWithImages[]>
  getProduct(slug: string, tier: Tier): Promise<ProductWithImages | null>
  /**
   * The pieces this tier may NOT open, as anonymous blurred tiles.
   *
   * ── Why this is a separate call, and not a flag on listProducts ──────────
   * listProducts is the entitlement boundary and the access-matrix test holds
   * it to exactly that: a forbidden row must never appear in its result. A
   * tile from here carries no id, name or image, so nothing that comes back
   * can be opened — keeping the two apart is what makes both statements
   * checkable at a glance.
   *
   * ── Why there is no `search` option ─────────────────────────────────────
   * Because there must not be one. Blurred tiles appear when browsing a
   * category, where the set is already "everything filed here". Returning them
   * for a typed query would turn the search box into an oracle: type a guessed
   * name, and a tile appearing tells you the guess was right. Pages that
   * search must not call this.
   * ────────────────────────────────────────────────────────────────────────
   */
  listLocked(opts: { categorySlug?: string; limit?: number; tier: Tier }): Promise<LockedTile[]>
}

/** Shared by both repositories, so the tiles look the same either way. */
function lockedTile(
  index: number,
  visibility: Visibility,
  category: Pick<Category, 'id' | 'name' | 'slug'> | null,
  blurPreview: string | null = null,
): LockedTile {
  return {
    key: `locked-${index}`,
    requires: visibility === 'premium_only' ? 'premium_only' : 'login_required',
    category,
    blurPreview,
  }
}

// -----------------------------------------------------------------------------
// Fixture-backed implementation (temporary)
// -----------------------------------------------------------------------------

function tree(): CategoryNode[] {
  return fxCategories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((parent) => ({
      ...parent,
      children: fxCategories
        .filter((c) => c.parent_id === parent.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
}

function hydrate(productId: string) {
  return fxImages
    .filter((i) => i.product_id === productId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

/** Ids of a category and, if it is top-level, all of its sub-categories. */
function categoryScope(slug: string): string[] | null {
  const match = fxCategories.find((c) => c.slug === slug)
  if (!match) return null
  const children = fxCategories.filter((c) => c.parent_id === match.id).map((c) => c.id)
  return [match.id, ...children]
}

const fixtureRepo: CatalogueRepo = {
  async listCategories() {
    return tree()
  },

  async getCategory(slug) {
    const found = tree().find((c) => c.slug === slug)
    if (found) return found
    // A sub-category has no children of its own.
    const sub = fxCategories.find((c) => c.slug === slug)
    return sub ? { ...sub, children: [] } : null
  },

  async listProducts({ categorySlug, search, limit, tier }) {
    const levels = visibleLevels(tier)
    const scope = categorySlug ? categoryScope(categorySlug) : null
    if (categorySlug && !scope) return []
    const needle = search?.trim().toLowerCase() ?? ''

    const rows = fxProducts
      .filter((p) => p.is_active)
      .filter((p) => levels.includes(p.visibility))
      .filter((p) => (scope ? p.category_id !== null && scope.includes(p.category_id) : true))
      .filter((p) => (needle ? p.name.toLowerCase().includes(needle) : true))
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, limit ?? undefined)

    return rows.map((p) => ({
      ...p,
      images: hydrate(p.id),
      category: fxCategories.find((c) => c.id === p.category_id) ?? null,
    }))
  },

  async getProduct(slug, tier) {
    const levels = visibleLevels(tier)
    const p = fxProducts.find((x) => x.slug === slug && x.is_active)
    // Not-entitled and does-not-exist return the same thing, so a 404 cannot
    // be used to confirm that a premium piece exists.
    if (!p || !levels.includes(p.visibility)) return null
    return {
      ...p,
      images: hydrate(p.id),
      category: fxCategories.find((c) => c.id === p.category_id) ?? null,
    }
  },

  async listLocked({ categorySlug, limit, tier }) {
    const levels = visibleLevels(tier)
    const scope = categorySlug ? categoryScope(categorySlug) : null
    if (categorySlug && !scope) return []

    return fxProducts
      .filter((p) => p.is_active)
      .filter((p) => !levels.includes(p.visibility))
      .filter((p) => (scope ? p.category_id !== null && scope.includes(p.category_id) : true))
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, limit ?? undefined)
      .map((p, i) =>
        lockedTile(i, p.visibility, fxCategories.find((c) => c.id === p.category_id) ?? null),
      )
  },
}

// -----------------------------------------------------------------------------
// Supabase implementation
// -----------------------------------------------------------------------------

/*
 * Every column of Product, listed explicitly.
 *
 * It must stay complete. A column added to the table and forgotten here does
 * not fail loudly -- it arrives as undefined, and undefined is falsy, so
 * `is_available` going missing silently marked the ENTIRE catalogue
 * "Currently Unavailable" and `weight_grams` going missing hid every weight.
 * Both shipped that way and neither test suite noticed, because the fixtures
 * build whole objects and never go through this string.
 *
 * catalogue.test.ts now asserts this list against the Product type. Add a
 * column to the table, add it here.
 */
export const PRODUCT_SELECT = `
  id, name, slug, category_id, visibility, is_active, is_available,
  weight_grams, hsn_code, sort_order, created_at, updated_at,
  images:product_images (id, product_id, storage_path, sort_order, alt),
  category:categories (id, name, slug)
`

const supabaseRepo: CatalogueRepo = {
  async listCategories() {
    const { data, error } = await getSupabase()
      .from('categories')
      .select('*')
      .order('sort_order')
    if (error) throw error

    const rows = (data ?? []) as Category[]
    return rows
      .filter((c) => c.parent_id === null)
      .map((parent) => ({ ...parent, children: rows.filter((c) => c.parent_id === parent.id) }))
  },

  async getCategory(slug) {
    const all = await supabaseRepo.listCategories()
    const top = all.find((c) => c.slug === slug)
    if (top) return top
    const { data } = await getSupabase().from('categories').select('*').eq('slug', slug).maybeSingle()
    return data ? { ...(data as Category), children: [] } : null
  },

  async listProducts({ categorySlug, search, limit }) {
    // No tier filter here — RLS decides. See the note at the top of this file.
    // Searching is no exception: a premium piece whose name matches is still
    // withheld from a guest, because the row never leaves the database.
    let query = getSupabase().from('products').select(PRODUCT_SELECT).eq('is_active', true)

    const needle = search?.trim() ?? ''
    if (needle) {
      // Escape the characters PostgREST treats as wildcards, or a search for
      // "%" would match the whole catalogue.
      query = query.ilike('name', `%${escapeLike(needle)}%`)
    }

    if (categorySlug) {
      const category = await supabaseRepo.getCategory(categorySlug)
      if (!category) return []
      const ids = [category.id, ...category.children.map((c) => c.id)]
      query = query.in('category_id', ids)
    }

    const { data, error } = await query.order('sort_order').limit(limit ?? 100)
    if (error) throw error
    // "View as client": removes rows the previewed tier would not be shown.
    // Filtering only ever narrows, so this cannot widen anyone's access.
    return applyPreview((data ?? []) as unknown as ProductWithImages[])
  },

  async getProduct(slug) {
    const { data, error } = await getSupabase()
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    const product = (data as unknown as ProductWithImages) ?? null
    if (product && hiddenByPreview(product.visibility)) return null
    return product
  },

  async listLocked({ categorySlug, limit }) {
    /*
     * "View as client" comes first. The function below answers for whoever is
     * actually signed in — for an admin previewing as a guest that is premium,
     * so it would report nothing withheld and the preview would show no locked
     * tiles at all. Previewing is exactly when someone needs to see them, so
     * the tiles are derived from the rows RLS already returned instead.
     */
    const preview = currentPreviewTier()
    if (preview) {
      let query = getSupabase()
        .from('products')
        .select('visibility, sort_order, blur_preview, category:categories (id, name, slug)')
        .eq('is_active', true)

      if (categorySlug) {
        const category = await supabaseRepo.getCategory(categorySlug)
        if (!category) return []
        query = query.in('category_id', [category.id, ...category.children.map((c) => c.id)])
      }

      const { data, error } = await query.order('sort_order')
      if (error) throw error

      const allowed = visibleLevels(preview)
      type PreviewRow = {
        visibility: Visibility
        blur_preview: string | null
        category: Pick<Category, 'id' | 'name' | 'slug'> | null
      }
      return ((data ?? []) as unknown as PreviewRow[])
        .filter((row) => !allowed.includes(row.visibility))
        .slice(0, limit ?? undefined)
        .map((row, i) => lockedTile(i, row.visibility, row.category, row.blur_preview))
    }

    /*
     * RLS means the withheld rows never leave the database, so this cannot be
     * a select on `products` — the client would get an empty list. It goes
     * through public.locked_teasers() (migration 0008), a security-definer
     * function whose entire result is a visibility level and a category name.
     *
     * As with listProducts, no tier is sent: the function derives it from
     * public.visible_levels(), the same source the policies use. Asking for
     * someone else's tier is therefore not expressible.
     */
    const { data, error } = await getSupabase().rpc('locked_teasers', {
      p_category_slug: categorySlug ?? null,
    })
    if (error) throw error

    type Row = {
      visibility: Visibility
      category_id: string | null
      category_name: string | null
      category_slug: string | null
      blur_preview: string | null
    }
    return ((data ?? []) as Row[])
      .slice(0, limit ?? undefined)
      .map((row, i) =>
        lockedTile(
          i,
          row.visibility,
          row.category_id && row.category_name && row.category_slug
            ? { id: row.category_id, name: row.category_name, slug: row.category_slug }
            : null,
          row.blur_preview,
        ),
      )
  },
}

/**
 * Both implementations are exported by name so tests can target one
 * deterministically. Importing the environment-selected `catalogue` in a unit
 * test makes the result depend on whether the developer happens to have
 * credentials in .env.local — which is how a suite starts passing or failing
 * based on the machine it runs on rather than the code.
 */
export const fixtureCatalogue: CatalogueRepo = fixtureRepo
export const supabaseCatalogue: CatalogueRepo = supabaseRepo

export function selectCatalogue(configured: boolean): CatalogueRepo {
  return configured ? supabaseRepo : fixtureRepo
}

export const catalogue: CatalogueRepo = selectCatalogue(isConfigured)

/** True while running on fixtures. Used only to show the review banner. */
export const usingFixtures = !isConfigured
