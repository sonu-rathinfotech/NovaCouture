import { getSupabase } from '@/lib/supabase'
import type { ImportProduct } from '@shared/import-validate.mjs'
import { loadWatermarkSettings, watermarkImage } from '@/lib/watermark'

/**
 * Browser-side bulk import (scope §H).
 *
 * Runs with the administrator's own session, not a service-role key — every
 * insert and every upload succeeds only because the caller satisfies
 * public.is_admin() inside an RLS policy (migrations 0004 and 0003). The same
 * import performed by someone who is not an administrator fails at the
 * database, whatever this file does.
 *
 * The command-line importer in tools/import.mjs remains for large batches and
 * for anyone who prefers a terminal. Both share the validation rules; this one
 * additionally cannot bypass RLS, which the CLI can.
 */

export interface ImportProgress {
  productsDone: number
  productsTotal: number
  imagesDone: number
  current: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mimeFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function extensionFor(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  return ext === '.png' || ext === '.webp' ? ext : '.jpg'
}

export async function importCatalogue(
  products: ImportProduct[],
  images: File[],
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportProgress> {
  const supabase = getSupabase()

  // Read once for the whole batch rather than per photograph: it is a single
  // setting and a bulk import is hundreds of files.
  const watermark = await loadWatermarkSettings()

  const progress: ImportProgress = {
    productsDone: 0,
    productsTotal: products.length,
    imagesDone: 0,
    current: '',
  }
  const report = () => onProgress?.({ ...progress })

  // --- categories, created once ------------------------------------------
  const { data: existing } = await supabase.from('categories').select('id, slug, parent_id')
  const bySlug = new Map(
    ((existing ?? []) as { id: string; slug: string; parent_id: string | null }[]).map((c) => [
      c.slug,
      c,
    ]),
  )

  // Parents first: a sub-category needs its parent's id to exist.
  const wanted: { slug: string; name: string; parent: string | null }[] = []
  for (const p of products) {
    const parentSlug = slugify(p.category)
    if (!wanted.some((w) => w.slug === parentSlug)) {
      wanted.push({ slug: parentSlug, name: p.category, parent: null })
    }
  }
  for (const p of products) {
    if (!p.subCategory) continue
    const slug = slugify(p.subCategory)
    if (!wanted.some((w) => w.slug === slug)) {
      wanted.push({ slug, name: p.subCategory, parent: slugify(p.category) })
    }
  }

  for (const c of wanted) {
    if (bySlug.has(c.slug)) continue
    progress.current = `Category: ${c.name}`
    report()

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: c.name,
        slug: c.slug,
        parent_id: c.parent ? (bySlug.get(c.parent)?.id ?? null) : null,
        sort_order: 50,
      })
      .select('id, slug, parent_id')
      .single()

    if (error) throw new Error(`Creating category "${c.name}": ${error.message}`)
    bySlug.set(c.slug, data as { id: string; slug: string; parent_id: string | null })
  }

  // --- products and their photographs ------------------------------------
  for (const product of products) {
    progress.current = product.name
    report()

    const slug = slugify(product.sku)
    const categorySlug = slugify(product.subCategory ?? product.category)

    const { data: row, error } = await supabase
      .from('products')
      .upsert(
        {
          name: product.name,
          slug,
          category_id: bySlug.get(categorySlug)?.id ?? null,
          visibility: product.visibility ?? 'premium_only',
          sort_order: product.sortOrder ?? 100,
          is_active: true,
          is_available: product.isAvailable,
          weight_grams: product.weightGrams,
          hsn_code: product.hsnCode,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single()

    if (error) throw new Error(`Importing "${product.name}": ${error.message}`)
    const productId = (row as { id: string }).id

    const gallery = images
      .filter((f) => f.name.startsWith(`${product.sku}_`))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    if (gallery.length > 0) {
      // Replace the gallery wholesale: a re-import with fewer photographs must
      // not leave the removed ones behind.
      await supabase.from('product_images').delete().eq('product_id', productId)
    }

    for (let i = 0; i < gallery.length; i++) {
      const file = gallery[i]
      const position = i + 1
      // Marked before upload, exactly as the single-image path does it.
      const marked = await watermarkImage(file, watermark)
      const extension = watermark.enabled ? '.jpg' : extensionFor(file.name)
      const path = `products/${productId}/${position}${extension}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, marked, {
          upsert: true,
          contentType: watermark.enabled ? 'image/jpeg' : mimeFor(file.name),
          // Asks Storage to let browsers hold the bytes for a day.
          //
          // Measured on this project, a signed-URL response comes back with an
          // ETag but NO cache-control, whichever way the object was uploaded.
          // So this currently changes nothing, and the saving comes from the
          // ETag instead: a repeat request for the same URL is answered 304 and
          // transfers no image. Keeping the value set is free and correct, and
          // it starts paying the day Storage honours it.
          cacheControl: '86400',
        })
      if (uploadError) throw new Error(`Uploading ${file.name}: ${uploadError.message}`)

      const { error: rowError } = await supabase.from('product_images').insert({
        product_id: productId,
        storage_path: path,
        sort_order: position,
        // Never null: a gallery of empty alt attributes is unusable with a
        // screen reader, and a bulk import is exactly where that happens.
        alt: `${product.name} — view ${position}`,
      })
      if (rowError) throw new Error(`Recording ${file.name}: ${rowError.message}`)

      progress.imagesDone += 1
      report()
    }

    progress.productsDone += 1
    report()
  }

  progress.current = ''
  return progress
}
