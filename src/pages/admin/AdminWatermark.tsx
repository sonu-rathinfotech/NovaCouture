import { useEffect, useState } from 'react'
import { AdminButton, AdminError, AdminHeading } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { getCompanySettings, updateCompanySettings } from '@/data/orders'
import { watermarkPreview, type WatermarkSettings } from '@/lib/watermark'
import { samplePhoto } from '@/components/catalogue/samplePhotos'

/**
 * The watermark, and what it looks like on a real photograph.
 *
 * -- Why there is a preview --------------------------------------------------
 * These four settings are a judgement about the client's own work: how large
 * before it spoils the piece, how faint before it stops deterring anyone. That
 * cannot be judged from a number in a box. The preview draws the mark exactly
 * as the uploader will, using the same placement code, so what is on screen is
 * what will be burned in.
 *
 * -- What changing them does NOT do -----------------------------------------
 * Nothing to photographs already uploaded. The mark is burned into those
 * files, which is the whole point of burning it in -- there is no unmarked
 * original to re-mark. Changing a setting affects the next upload. The screen
 * says so, because the alternative is a client turning the watermark off,
 * seeing it still on their catalogue, and concluding the feature is broken.
 */

const POSITIONS: { value: WatermarkSettings['position']; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
  { value: 'center', label: 'Centre' },
  { value: 'tiled', label: 'Tiled across the photograph' },
]

export function AdminWatermark() {
  const [values, setValues] = useState<WatermarkSettings>({
    enabled: true,
    position: 'bottom-right',
    sizePercent: 22,
    opacity: 0.45,
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reload, setReload] = useState(0)

  const { data: settings } = useAsync(() => getCompanySettings(), [reload])

  useEffect(() => {
    if (!settings) return
    setValues({
      enabled: settings.watermark_enabled,
      position: settings.watermark_position,
      sizePercent: settings.watermark_size_percent,
      opacity: Number(settings.watermark_opacity),
    })
  }, [settings])

  // Redrawn on every change. A jewellery photograph rather than a grey box,
  // because the question being answered is whether the mark ruins the piece.
  useEffect(() => {
    let live = true
    watermarkPreview(samplePhoto('necklace', 0), values)
      .then((url) => live && setPreview(url))
      .catch(() => live && setPreview(null))
    return () => {
      live = false
    }
  }, [values])

  async function onSave() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateCompanySettings({
        watermark_enabled: values.enabled,
        watermark_position: values.position,
        watermark_size_percent: values.sizePercent,
        watermark_opacity: values.opacity,
      })
      setReload((n) => n + 1)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  const set = <K extends keyof WatermarkSettings>(key: K, value: WatermarkSettings[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  return (
    <>
      <AdminHeading
        title="Watermark"
        note="Burned into each photograph as it is uploaded, so it cannot be removed by saving the image. It does not stop a screenshot; it makes a copied photograph traceable."
      />
      <AdminError error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-panel p-6">
          <label className="mb-5 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--admin-fg)]"
            />
            <span className="admin-label">Watermark new photographs</span>
          </label>

          <label className="mb-5 block">
            <span className="admin-label mb-2 block">Position</span>
            <select
              value={values.position}
              onChange={(e) => set('position', e.target.value)}
              disabled={!values.enabled}
              className="admin-input cursor-pointer"
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-5 block">
            <span className="admin-label mb-2 block">Size — {values.sizePercent}% of width</span>
            <input
              type="range"
              min={5}
              max={150}
              value={values.sizePercent}
              onChange={(e) => set('sizePercent', Number(e.target.value))}
              disabled={!values.enabled}
              className="w-full cursor-pointer accent-[var(--admin-fg)]"
            />
            <span className="mt-2 block text-sm text-[var(--admin-fg-muted)]">
              A share of the photograph's width, so the mark keeps its weight whether the shot is
              a tall portrait or a wide crop.
            </span>
          </label>

          <label className="mb-5 block">
            <span className="admin-label mb-2 block">
              Strength — {Math.round(values.opacity * 100)}%
            </span>
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(values.opacity * 100)}
              onChange={(e) => set('opacity', Number(e.target.value) / 100)}
              disabled={!values.enabled}
              className="w-full cursor-pointer accent-[var(--admin-fg)]"
            />
          </label>

          <div className="border border-[var(--admin-border-strong)] bg-[var(--admin-bg-muted)] p-4">
            <p className="text-sm leading-relaxed text-[var(--admin-fg-muted)]">
              These apply to photographs uploaded <strong>from now on</strong>. Pictures already in
              the catalogue keep the mark they were given, because it is part of the file rather
              than something drawn over it — there is no unmarked copy to change.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <AdminButton tone="primary" onClick={onSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save watermark settings'}
            </AdminButton>
            {saved && <span className="text-sm text-[var(--admin-fg-muted)]">Saved.</span>}
          </div>
        </div>

        <div className="admin-panel p-6">
          <p className="admin-label mb-4">Preview</p>
          {preview ? (
            <img
              src={preview}
              alt="A sample photograph with the watermark applied"
              className="w-full rounded-[2px] border border-[var(--admin-border)]"
            />
          ) : (
            <div className="aspect-4/5 w-full animate-pulse bg-[var(--admin-bg-muted)]" />
          )}
          <p className="mt-4 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            Drawn by the same code that marks an upload, so this is exactly what will be burned
            in. The photograph is a sample, not one of yours.
          </p>
        </div>
      </div>
    </>
  )
}
