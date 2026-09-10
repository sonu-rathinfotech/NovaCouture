/**
 * Admin data access.
 *
 * Every call here goes through the ordinary browser client with the anon key.
 * There is no service-role key in this application, and no admin API server —
 * the writes below succeed only because the caller's session satisfies
 * public.is_admin() inside an RLS policy (migration 0004).
 *
 * The practical consequence: this file cannot grant itself anything. If a
 * policy is missing, the call fails. Hiding the /admin route protects nothing
 * and is not relied upon.
 */
import { getSupabase } from '@/lib/supabase'
import { makeBlurPreview } from '@/lib/blurPreview'
import { watermarkImage, type WatermarkSettings } from '@/lib/watermark'
import type { CollectionAudience, Category, Profile, Product, Visibility } from '@/types/db'

export interface AdminProduct extends Product {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
  image_count: number
}

export interface CollectionMetric {
  collection_id: string
  title: string
  token: string
  min_tier: CollectionAudience
  is_active: boolean
  created_at: string
  opens: number
  unique_viewers: number
  last_opened_at: string | null
}

/** True when the signed-in session is the administrator. */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_admin')
  if (error) return false
  return data === true
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------

export async function listAllProducts(): Promise<AdminProduct[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*, category:categories (id, name, slug), product_images (id)')
    .order('sort_order')
  if (error) throw error

  return ((data ?? []) as unknown as (Product & {
    category: AdminProduct['category']
    product_images: { id: string }[]
  })[]).map((p) => ({
    ...p,
    category: p.category,
    image_count: p.product_images?.length ?? 0,
  }))
}

export async function setProductVisibility(id: string, visibility: Visibility): Promise<void> {
  const { error } = await getSupabase().from('products').update({ visibility }).eq('id', id)
  if (error) throw error
}

export async function setProductActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await getSupabase().from('products').update({ is_active }).eq('id', id)
  if (error) throw error
}

/**
 * Marks a piece Currently Unavailable, or back.
 *
 * Not the same switch as setProductActive, and the difference matters at the
 * keyboard: this one leaves the piece listed, openable and enquirable, and only
 * marks it. Taking a piece off the site entirely is still is_active. See
 * migration 0010.
 */
export async function setProductAvailable(id: string, is_available: boolean): Promise<void> {
  const { error } = await getSupabase().from('products').update({ is_available }).eq('id', id)
  if (error) throw error
}

export async function renameProduct(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('products').update({ name }).eq('id', id)
  if (error) throw error
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase().from('categories').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Category[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createCategory(name: string, parentId: string | null): Promise<void> {
  const { error } = await getSupabase().from('categories').insert({
    name: name.trim(),
    slug: slugify(name),
    parent_id: parentId,
    sort_order: 99,
  })
  // The one-level rule is enforced by a trigger, so an attempt to nest deeper
  // surfaces here rather than being silently accepted.
  if (error) throw error
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('categories').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  // products.category_id is ON DELETE SET NULL, so products survive; the
  // sub-category FK is ON DELETE RESTRICT, so a parent with children refuses.
  const { error } = await getSupabase().from('categories').delete().eq('id', id)
  if (error) throw error
}

// -----------------------------------------------------------------------------
// Clients
// -----------------------------------------------------------------------------

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function setPremium(id: string, is_premium: boolean): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ is_premium }).eq('id', id)
  if (error) throw error
}

/**
 * Client export (scope §F: "Export user data to Excel").
 *
 * Returns rows; buildXlsx turns them into a real .xlsx. Kept separate so the
 * shape of the export can be tested without building a spreadsheet.
 */
export function profilesToRows(profiles: Profile[]): string[][] {
  const header = ['Name', 'Mobile', 'Company', 'Email', 'Premium', 'Consent given', 'Registered']

  const date = (value: string | null) =>
    value ? new Date(value).toISOString().slice(0, 10) : ''

  return [
    header,
    ...profiles.map((p) => [
      p.name,
      p.mobile,
      p.company ?? '',
      p.email ?? '',
      p.is_premium ? 'Yes' : 'No',
      date(p.consent_at),
      date(p.created_at),
    ]),
  ]
}

// -----------------------------------------------------------------------------
// Curated links
// -----------------------------------------------------------------------------

export async function listCollectionMetrics(): Promise<CollectionMetric[]> {
  const { data, error } = await getSupabase().rpc('collection_metrics')
  if (error) throw error
  return ((data ?? []) as CollectionMetric[]).map((m) => ({
    ...m,
    opens: Number(m.opens),
    unique_viewers: Number(m.unique_viewers),
  }))
}

export async function setCollectionActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await getSupabase().from('collections').update({ is_active }).eq('id', id)
  if (error) throw error
}

/**
 * Creates a curated link (scope §G).
 *
 * The token is generated by the database (24 random bytes), not here — a
 * client-side token would be only as unguessable as the browser's RNG and the
 * developer's care, and this one is the only thing standing between a
 * forwarded URL and a private selection.
 *
 * Returns the token so the admin can copy the link immediately.
 */
export async function createCollection(
  title: string,
  welcomeMessage: string,
  productIds: string[],
  audience: CollectionAudience = 'premium',
): Promise<string> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('collections')
    .insert({
      title: title.trim(),
      welcome_message: welcomeMessage.trim() || null,
      min_tier: audience,
    })
    .select('id, token')
    .single()
  if (error) throw error

  const created = data as { id: string; token: string }

  if (productIds.length > 0) {
    const { error: itemsError } = await supabase.from('collection_items').insert(
      productIds.map((product_id, i) => ({
        collection_id: created.id,
        product_id,
        sort_order: i + 1,
      })),
    )
    // A link with no pieces in it is worse than no link: the recipient opens
    // it, sees an empty page, and concludes the site is broken.
    if (itemsError) {
      await supabase.from('collections').delete().eq('id', created.id)
      throw itemsError
    }
  }

  return created.token
}

/** Products already in a link, in the admin's chosen order. */
export async function listCollectionItems(collectionId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('collection_items')
    .select('product_id')
    .eq('collection_id', collectionId)
    .order('sort_order')
  if (error) throw error
  return ((data ?? []) as { product_id: string }[]).map((r) => r.product_id)
}

// -----------------------------------------------------------------------------
// Product create / edit, with photography
// -----------------------------------------------------------------------------

export interface AdminProductImage {
  id: string
  product_id: string
  storage_path: string
  sort_order: number
  alt: string
}

export async function getProduct(id: string): Promise<AdminProduct | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*, category:categories (id, name, slug), product_images (id)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as unknown as Product & {
    category: AdminProduct['category']
    product_images: { id: string }[]
  }
  return { ...row, image_count: row.product_images?.length ?? 0 }
}

export async function listProductImages(productId: string): Promise<AdminProductImage[]> {
  const { data, error } = await getSupabase()
    .from('product_images')
    .select('id, product_id, storage_path, sort_order, alt')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as AdminProductImage[]
}

/** Slug is derived once, at creation, so a later rename never breaks a link
 *  a client has already been sent. */
export async function createProduct(input: {
  name: string
  categoryId: string | null
  visibility: Visibility
  weightGrams?: number | null
  hsnCode?: string | null
}): Promise<string> {
  const { data, error } = await getSupabase()
    .from('products')
    .insert({
      name: input.name.trim(),
      slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`,
      category_id: input.categoryId,
      visibility: input.visibility,
      is_active: true,
      weight_grams: input.weightGrams ?? null,
      hsn_code: input.hsnCode ?? null,
      sort_order: 100,
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updateProduct(
  id: string,
  input: {
    name: string
    categoryId: string | null
    visibility: Visibility
    weightGrams?: number | null
    hsnCode?: string | null
  },
): Promise<void> {
  const { error } = await getSupabase()
    .from('products')
    .update({
      name: input.name.trim(),
      category_id: input.categoryId,
      visibility: input.visibility,
      // Explicit null, not undefined: clearing the field has to be able to
      // erase a wrong weight, and undefined would silently leave it in place.
      weight_grams: input.weightGrams ?? null,
      hsn_code: input.hsnCode ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

/**
 * Uploads one photograph and records it.
 *
 * Path convention matches the storage policy in migration 0002:
 *     products/<product_id>/<position>.<ext>
 * The position is part of the path, so re-uploading position 2 replaces it
 * rather than accumulating orphans in the bucket.
 */
export async function uploadProductImage(
  productId: string,
  productName: string,
  file: File,
  position: number,
  extension: string,
  /**
   * Passed in rather than fetched here. Selecting twenty photographs calls
   * this twenty times, and reading one setting twenty times is twenty network
   * round trips for an answer that cannot change mid-batch. The caller reads
   * it once with loadWatermarkSettings().
   */
  watermark: WatermarkSettings,
): Promise<void> {
  const supabase = getSupabase()

  /*
   * Marked BEFORE it is uploaded, so the bytes in storage carry it. There is
   * no unmarked original kept anywhere -- that is the point. If the mark
   * cannot be drawn this throws rather than uploading a bare photograph,
   * because a silently unmarked image looks identical to a marked one in the
   * admin and the client would never find it.
   */
  const marked = await watermarkImage(file, watermark)

  // Marking re-encodes as JPEG, so the stored extension has to follow.
  const storedExtension = watermark.enabled ? '.jpg' : extension
  const path = `products/${productId}/${position}${storedExtension}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, marked, {
      upsert: true,
      contentType: watermark.enabled ? 'image/jpeg' : file.type,
    })
  if (uploadError) throw uploadError

  // alt is NOT NULL: a gallery of empty alt attributes is unusable with a
  // screen reader, and nothing else would force it to be filled in.
  const { error } = await supabase.from('product_images').insert({
    product_id: productId,
    storage_path: path,
    sort_order: position,
    alt: `${productName} — view ${position}`,
    // Recorded so the backfill tool knows to skip this one. Marking twice
    // burns the logo in twice, and there is no unmarked original to undo it.
    watermarked_at: watermark.enabled ? new Date().toISOString() : null,
  })
  if (error) throw error

  // The locked teaser tile shows the first image only, so that is the one that
  // needs a preview. Best-effort: a failure here leaves blur_preview null and
  // the tile falls back to decorative artwork, which is not worth failing an
  // otherwise good upload over. tools/generate-blur-previews.mjs fills gaps.
  if (position === 1) {
    const preview = await makeBlurPreview(marked)
    if (preview) {
      await supabase.from('products').update({ blur_preview: preview }).eq('id', productId)
    }
  }
}

export async function deleteProductImage(image: AdminProductImage): Promise<void> {
  const supabase = getSupabase()

  // Remove the row first: an orphaned object costs storage, but a row pointing
  // at a deleted object shows the client a broken frame.
  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error

  await supabase.storage.from('product-images').remove([image.storage_path])
}

/** Swaps two images' positions. The first image is what the grid shows. */
export async function swapProductImages(
  a: AdminProductImage,
  b: AdminProductImage,
): Promise<void> {
  const supabase = getSupabase()
  // sort_order has no unique constraint, so a straight swap needs no temporary
  // value.
  const first = supabase.from('product_images').update({ sort_order: b.sort_order }).eq('id', a.id)
  const second = supabase.from('product_images').update({ sort_order: a.sort_order }).eq('id', b.id)
  const [r1, r2] = await Promise.all([first, second])
  if (r1.error) throw r1.error
  if (r2.error) throw r2.error
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = getSupabase()

  const images = await listProductImages(id)
  if (images.length > 0) {
    await supabase.storage.from('product-images').remove(images.map((i) => i.storage_path))
  }

  // product_images rows cascade with the product.
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// -----------------------------------------------------------------------------
// Curated link detail (scope §G: timestamps, and which products were viewed)
// -----------------------------------------------------------------------------

export interface CollectionViewRow {
  viewed_at: string
  mobile: string | null
  viewer_name: string | null
  product_id: string | null
  product_name: string | null
}

export interface CollectionProductView {
  product_id: string
  product_name: string
  views: number
  unique_viewers: number
}

export async function listCollectionViews(collectionId: string): Promise<CollectionViewRow[]> {
  const { data, error } = await getSupabase().rpc('collection_views_detail', {
    p_collection_id: collectionId,
  })
  if (error) throw error
  return (data ?? []) as CollectionViewRow[]
}

export async function listCollectionProductViews(
  collectionId: string,
): Promise<CollectionProductView[]> {
  const { data, error } = await getSupabase().rpc('collection_product_views', {
    p_collection_id: collectionId,
  })
  if (error) throw error
  return ((data ?? []) as CollectionProductView[]).map((r) => ({
    ...r,
    views: Number(r.views),
    unique_viewers: Number(r.unique_viewers),
  }))
}

export async function getCollection(id: string): Promise<{
  id: string
  title: string
  token: string
  is_active: boolean
  welcome_message: string | null
  min_tier: CollectionAudience
} | null> {
  const { data, error } = await getSupabase()
    .from('collections')
    .select('id, title, token, is_active, welcome_message, min_tier')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as never) ?? null
}

// -----------------------------------------------------------------------------
// Creating a client (scope §F)
// -----------------------------------------------------------------------------

export interface NewClient {
  name: string
  mobile: string
  company?: string
  email?: string
  password: string
  isPremium?: boolean
}

/**
 * Creates a client account through the add-client Edge Function.
 *
 * Not done from here directly: creating a login needs the service-role key,
 * which bypasses RLS and must never reach the browser. The function holds it,
 * and asks the database whether the caller is an administrator before doing
 * anything — so this call carries no authority of its own.
 */
export async function createClient(input: NewClient): Promise<void> {
  const supabase = getSupabase()

  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again.')

  const { data, error } = await supabase.functions.invoke('add-client', {
    body: input,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) {
    // The function returns a readable reason in the body; surface that rather
    // than "Edge Function returned a non-2xx status code".
    const detail = (data as { error?: string } | null)?.error
    throw new Error(detail || readableFunctionError(error))
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
}

function readableFunctionError(error: unknown): string {
  const message = (error as Error)?.message ?? ''
  if (message.includes('Failed to send') || message.includes('Failed to fetch')) {
    return 'The add-client function is not deployed yet. Run: supabase functions deploy add-client'
  }
  return message || 'Could not create the client.'
}
