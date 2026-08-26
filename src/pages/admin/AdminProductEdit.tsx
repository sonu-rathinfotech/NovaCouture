import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminButton, AdminError, AdminHeading } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  listAllCategories,
  listProductImages,
  setProductActive,
  swapProductImages,
  updateProduct,
  uploadProductImage,
  type AdminProductImage,
} from '@/data/admin'
import { checkImageFile, extensionFor, ACCEPTED_TYPES } from '@/lib/imageFile'
import { resolveImageUrl } from '@/lib/images'
import { VISIBILITY, type Visibility } from '@/types/db'

const LABEL: Record<Visibility, string> = {
  public: 'Public — everyone',
  login_required: 'Registered — signed-in clients',
  premium_only: 'Premium — premium clients only',
}

export function AdminProductEdit() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const isNew = !productId

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [visibility, setVisibility] = useState<Visibility>('premium_only')
  /** Held as the raw string so a half-typed "12." is not fought with. */
  const [weight, setWeight] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  const { data: categories } = useAsync(() => listAllCategories(), [])
  const { data: product } = useAsync(
    () => (productId ? getProduct(productId) : Promise.resolve(null)),
    [productId],
  )
  const { data: images } = useAsync(
    () => (productId ? listProductImages(productId) : Promise.resolve([])),
    [productId, reload],
  )

  useEffect(() => {
    if (!product) return
    setName(product.name)
    setCategoryId(product.category_id ?? '')
    setVisibility(product.visibility)
    setWeight(product.weight_grams === null ? '' : String(product.weight_grams))
  }, [product])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReload((n) => n + 1)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Blank means "not recorded", which is a legitimate answer and stores null.
   * Anything else must be a real, positive number — a typo saved as null would
   * silently drop a weight the admin believed they had entered, so this
   * returns an error string instead of guessing.
   */
  function readWeight(): { value: number | null } | { error: string } {
    const raw = weight.trim()
    if (!raw) return { value: null }
    const grams = Number(raw)
    if (!Number.isFinite(grams)) return { error: 'Weight must be a number, in grams.' }
    if (grams <= 0) return { error: 'Weight must be greater than zero.' }
    // Mirrors the products_weight_grams_sane constraint in migration 0010.
    if (grams > 99999.999) return { error: 'That weight looks like a mistake — check the decimal point.' }
    return { value: grams }
  }

  async function onSave() {
    const parsed = readWeight()
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }

    setBusy(true)
    setError(null)
    try {
      const input = {
        name,
        categoryId: categoryId || null,
        visibility,
        weightGrams: parsed.value,
      }
      if (isNew) {
        const id = await createProduct(input)
        navigate(`/admin/products/${id}`, { replace: true })
      } else {
        await updateProduct(productId!, input)
        setReload((n) => n + 1)
      }
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0 || !productId) return

    setBusy(true)
    setError(null)

    // Check everything before uploading anything: a batch that fails halfway
    // leaves a gallery the admin did not ask for.
    for (const file of files) {
      const result = await checkImageFile(file)
      if (!result.ok) {
        setError(result.error ?? 'That image could not be used.')
        setBusy(false)
        return
      }
    }

    try {
      let position = (images ?? []).reduce((max, i) => Math.max(max, i.sort_order), 0)
      for (const file of files) {
        position += 1
        await uploadProductImage(productId, name || 'Product', file, position, extensionFor(file))
      }
      setReload((n) => n + 1)
    } catch (e) {
      setError((e as Error).message || 'The upload was refused.')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteProduct() {
    if (!productId) return
    if (!window.confirm(`Delete "${name}" and its photographs? This cannot be undone.`)) return
    setBusy(true)
    try {
      await deleteProduct(productId)
      navigate('/admin/products', { replace: true })
    } catch (e) {
      setError((e as Error).message || 'That was refused.')
      setBusy(false)
    }
  }

  const gallery = images ?? []

  return (
    <>
      <AdminHeading
        title={isNew ? 'New product' : name || 'Product'}
        note={
          isNew
            ? 'Create the product first, then add its photographs.'
            : 'A product is a name and a gallery. There is no price or description.'
        }
      />
      <AdminError error={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="admin-panel p-6">
          <label className="mb-4 block">
            <span className="admin-label mb-2 block">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meera Temple Haram"
              className="admin-input"
            />
          </label>

          <label className="mb-4 block">
            <span className="admin-label mb-2 block">
              Category
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="admin-input cursor-pointer"
            >
              <option value="">No category</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? '— ' : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-4 block">
            <span className="admin-label mb-2 block">
              Weight in grams
            </span>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="84.32"
              className="admin-input"
            />
            {/* Left blank deliberately more often than not: the weight is
                frequently unknown when a piece is photographed, and a field
                that looks compulsory is how invented figures get into a
                catalogue. Blank shows nothing on the site. */}
            <span className="mt-2 block text-sm text-[var(--admin-fg-muted)]">
              Optional. Leave blank if it has not been weighed — the piece then shows no weight at
              all, rather than a zero.
            </span>
          </label>

          <fieldset className="mb-5">
            <legend className="admin-label mb-2">
              Who can see it
            </legend>
            {VISIBILITY.map((v) => (
              <label key={v} className="mb-1.5 flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className="cursor-pointer accent-[var(--admin-fg)]"
                />
                {LABEL[v]}
              </label>
            ))}
            {/* New pieces default to Premium. It is easy to widen access later;
                a piece shown publicly by accident cannot be un-shown. */}
            <p className="mt-2 text-sm text-[var(--admin-fg-muted)]">
              New pieces start as Premium. Widening access later is easy; a piece shown publicly by
              mistake cannot be un-shown.
            </p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <AdminButton onClick={onSave} disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </AdminButton>
            <Link
              to="/admin/products"
              className="admin-label underline underline-offset-4"
            >
              Back to products
            </Link>
            {/* Hiding used to be the button on every row of the products
                table. It moved here because it is the drastic one — a hidden
                piece is gone from the catalogue for everybody — while the
                everyday switch, Currently Unavailable, took its place there. */}
            {!isNew && product && (
              <span className="ml-auto flex items-center gap-3">
                <AdminButton
                  onClick={() => run(() => setProductActive(productId!, !product.is_active))}
                  disabled={busy}
                >
                  {product.is_active ? 'Hide from catalogue' : 'Return to catalogue'}
                </AdminButton>
                <AdminButton tone="danger" onClick={onDeleteProduct} disabled={busy}>
                  Delete
                </AdminButton>
              </span>
            )}
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[0.6rem] tracking-[0.2em] text-[var(--admin-fg-muted)] uppercase">
              Photographs — {gallery.length}
            </span>
            {!isNew && (
              <label className="cursor-pointer border border-ivory-400 px-4 py-2 text-[0.6rem] tracking-[0.18em] text-charcoal-500 uppercase transition-colors duration-500 ease-lux hover:border-charcoal-800 hover:text-charcoal-900">
                Add photographs
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={onUpload}
                  disabled={busy}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Scope §E: the watermark is burned in server-side at upload. Until
              Nova Couture supplies the logo there is nothing to burn in, and saying so is
              better than implying the images are protected. */}
          <p className="admin-label mb-4 border border-[var(--admin-border)] bg-[var(--admin-accent-wash)] px-4 py-2.5 text-[var(--admin-accent)]">
            Nova Couture watermark — pending logo file
          </p>

          {isNew ? (
            <p className="py-10 text-center text-sm text-[var(--admin-fg-muted)]">
              Photographs can be added once the product exists.
            </p>
          ) : gallery.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--admin-fg-muted)]">
              No photographs yet. The first one is used on the catalogue grid.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3">
              {gallery.map((image, i) => (
                <li key={image.id}>
                  <GalleryThumb image={image} />
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="text-xs text-[var(--admin-fg-muted)]">
                      {i === 0 ? 'Main' : i + 1}
                    </span>
                    <span className="flex gap-1">
                      <AdminButton
                        disabled={busy || i === 0}
                        onClick={() => run(() => swapProductImages(image, gallery[i - 1]))}
                      >
                        ←
                      </AdminButton>
                      <AdminButton
                        disabled={busy || i === gallery.length - 1}
                        onClick={() => run(() => swapProductImages(image, gallery[i + 1]))}
                      >
                        →
                      </AdminButton>
                      <AdminButton
                        tone="danger"
                        disabled={busy}
                        onClick={() => run(() => deleteProductImage(image))}
                      >
                        ×
                      </AdminButton>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-sm leading-relaxed font-light text-[var(--admin-fg-muted)]">
            Portrait photographs, plain light background, at least 600px on each side. The first
            photograph is what appears on the catalogue grid.
          </p>
        </div>
      </div>
    </>
  )
}

/** Thumbnails come from the private bucket, so each needs a signed URL. */
function GalleryThumb({ image }: { image: AdminProductImage }) {
  const { data: url } = useAsync(() => resolveImageUrl(image.storage_path), [image.storage_path])

  return (
    <div className="aspect-4/5 overflow-hidden rounded-[2px] bg-ivory-200">
      {url && <img src={url} alt={image.alt} className="h-full w-full object-cover" />}
    </div>
  )
}
