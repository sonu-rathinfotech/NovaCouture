import { useState, type ChangeEvent } from 'react'
import { AdminButton, AdminError, AdminHeading, AdminTable, Status } from './AdminLayout'
import {
  validateSheet,
  validateImages,
  validateImageFile,
  IMAGE_EXTENSIONS,
  type ImportProduct,
} from '@shared/import-validate.mjs'
import { importCatalogue, type ImportProgress } from '@/data/bulkImport'
import { formatWeight } from '@/lib/weight'

/**
 * Bulk upload (scope §H).
 *
 * The rules come from tools/lib/import-validate.mjs — the same module the
 * command-line importer runs. That is deliberate: if this screen accepted a
 * sheet the CLI rejects, the client would be told two different things about
 * the same file.
 *
 * Nothing is written until the sheet AND every image passes. A half-finished
 * import on someone's real catalogue is a bad way to discover a typo in row 40.
 */

/*
 * weight_grams, available and hsn_code are all optional, and the sample rows
 * show each shape on purpose: a weight given and a weight left blank because
 * the piece has not been weighed, a piece marked unavailable, and an HSN both
 * left blank (use the company default) and set (a different heading).
 */
const TEMPLATE = [
  'sku,name,category,sub_category,visibility,sort_order,weight_grams,available,hsn_code',
  'NC-NK-0001,Meera Temple Haram,Necklaces,Temple,Public,1,84.32,Yes,',
  'NC-NK-0002,Anjali Layered Chain,Necklaces,,Registered,2,,Yes,711319',
  'NC-BG-0001,Kanchi Broad Kada,Bangles,Kada,Premium,3,46.5,No,',
].join('\r\n')

type Stage = 'idle' | 'checking' | 'ready' | 'importing' | 'done'

export function AdminBulkUpload() {
  const [csvName, setCsvName] = useState<string | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])

  const [stage, setStage] = useState<Stage>('idle')
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [products, setProducts] = useState<ImportProduct[]>([])
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  function downloadTemplate() {
    // BOM so Excel opens it as UTF-8 rather than mangling accented names.
    const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nova-products-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCsvName(file.name)
    setCsvText(await file.text())
    setStage('idle')
  }

  function onImages(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) =>
      IMAGE_EXTENSIONS.has(f.name.slice(f.name.lastIndexOf('.')).toLowerCase()),
    )
    e.target.value = ''
    setImages(picked)
    setStage('idle')
  }

  async function check() {
    if (!csvText) return
    setStage('checking')
    setFailure(null)

    const sheet = validateSheet(csvText)
    const matched = validateImages(
      sheet.products,
      images.map((f) => f.name),
    )

    const allErrors = [...sheet.errors, ...matched.errors]
    const allWarnings = [...sheet.warnings, ...matched.warnings]

    // Names and numbering can be perfect while the files are unusable — a
    // screenshot renamed .jpg, or a thumbnail too small to show.
    for (const file of images) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      allErrors.push(...validateImageFile(file.name, bytes))
    }

    setErrors(allErrors)
    setWarnings(allWarnings)
    setProducts(sheet.products)
    setStage(allErrors.length === 0 && sheet.products.length > 0 ? 'ready' : 'idle')
  }

  async function runImport() {
    setStage('importing')
    setFailure(null)
    try {
      const result = await importCatalogue(products, images, setProgress)
      setProgress(result)
      setStage('done')
    } catch (e) {
      setFailure((e as Error).message || 'The import was refused.')
      setStage('ready')
    }
  }

  const counts = {
    public: products.filter((p) => p.visibility === 'public').length,
    registered: products.filter((p) => p.visibility === 'login_required').length,
    premium: products.filter((p) => p.visibility === 'premium_only').length,
  }

  return (
    <>
      <AdminHeading
        title="Bulk Upload"
        note="Import a prepared sheet and its photographs. Nothing is written until every row and every image passes."
        actions={<AdminButton onClick={downloadTemplate}>Download Template</AdminButton>}
      />
      <AdminError error={failure} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="admin-panel p-6">
          <div className="admin-label mb-3">Step 1 — Product sheet</div>
          <p className="mb-4 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            A CSV in the template format. Visibility must read Public, Registered or Premium.
          </p>
          <label className="admin-btn w-full cursor-pointer">
            Choose CSV
            <input type="file" accept=".csv,text/csv" onChange={onCsv} className="sr-only" />
          </label>
          {csvName && <p className="mt-3 text-sm text-[var(--admin-fg)]">{csvName}</p>}
        </div>

        <div className="admin-panel p-6">
          <div className="admin-label mb-3">Step 2 — Photographs</div>
          <p className="mb-4 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            Named <code className="text-[var(--admin-fg)]">SKU_1.jpg</code>,{' '}
            <code className="text-[var(--admin-fg)]">SKU_2.jpg</code> and so on. Numbering must
            start at 1 with no gaps.
          </p>
          <label className="admin-btn w-full cursor-pointer">
            Choose Images
            <input type="file" multiple accept="image/*" onChange={onImages} className="sr-only" />
          </label>
          {images.length > 0 && (
            <p className="mt-3 text-sm text-[var(--admin-fg)]">
              {images.length} {images.length === 1 ? 'file' : 'files'} selected
            </p>
          )}
        </div>

        <div className="admin-panel p-6">
          <div className="admin-label mb-3">Step 3 — Check</div>
          <p className="mb-4 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            Every rule is checked before anything is written, using the same code as the
            command-line importer.
          </p>
          <AdminButton
            onClick={check}
            disabled={!csvText || stage === 'checking' || stage === 'importing'}
          >
            {stage === 'checking' ? 'Checking…' : 'Validate'}
          </AdminButton>
        </div>
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="mt-8 space-y-4">
          {errors.length > 0 && (
            <div className="admin-panel border-l-2 border-l-[var(--admin-danger)] p-6">
              <div className="admin-label mb-3 text-[var(--admin-danger)]">
                {errors.length} {errors.length === 1 ? 'error' : 'errors'} — nothing will be
                imported
              </div>
              <ul className="space-y-2 text-sm text-[var(--admin-fg)]">
                {errors.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="admin-panel border-l-2 border-l-[var(--admin-accent-line)] p-6">
              <div className="admin-label mb-3">
                {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'} — these will not
                stop the import
              </div>
              <ul className="space-y-2 text-sm text-[var(--admin-fg-muted)]">
                {warnings.map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(stage === 'ready' || stage === 'importing' || stage === 'done') && products.length > 0 && (
        <div className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Status>{products.length} products</Status>
              <Status>{counts.public} public</Status>
              <Status>{counts.registered} login required</Status>
              <Status tone="premium">{counts.premium} premium</Status>
            </div>
            {stage !== 'done' && (
              <AdminButton tone="primary" onClick={runImport} disabled={stage === 'importing'}>
                {stage === 'importing' ? 'Importing…' : `Import ${products.length} products`}
              </AdminButton>
            )}
          </div>

          {progress && (
            <p className="mb-5 text-sm text-[var(--admin-fg-muted)]">
              {stage === 'done' ? 'Imported' : 'Importing'} — {progress.productsDone} of{' '}
              {progress.productsTotal} products, {progress.imagesDone} images
              {progress.current ? ` · ${progress.current}` : ''}
            </p>
          )}

          {/* Weight and availability are shown here because this preview is
              the last point before the write. A wrong decimal or a stray "No"
              is far cheaper to catch on this screen than to find later on a
              piece a client is looking at. */}
          <AdminTable
            columns={[
              'SKU', 'Name', 'Category', 'Visibility', 'Weight', 'HSN', 'Available', 'Images',
            ]}
          >
            {products.map((p) => (
              <tr key={p.sku}>
                <td className="admin-num text-sm">{p.sku}</td>
                <td className="admin-title text-lg">{p.name}</td>
                <td className="text-sm text-[var(--admin-fg-muted)]">
                  {p.subCategory ? `${p.category} → ${p.subCategory}` : p.category}
                </td>
                <td>
                  {p.visibility === 'premium_only' ? (
                    <Status tone="premium">Premium</Status>
                  ) : (
                    <Status>{p.visibility === 'public' ? 'Public' : 'Login Required'}</Status>
                  )}
                </td>
                <td className="admin-num text-sm text-[var(--admin-fg-muted)]">
                  {formatWeight(p.weightGrams) ?? 'Not recorded'}
                </td>
                <td className="admin-num text-sm text-[var(--admin-fg-muted)]">
                  {p.hsnCode ?? 'Default'}
                </td>
                <td>
                  {p.isAvailable ? (
                    <span className="text-sm text-[var(--admin-fg-muted)]">Yes</span>
                  ) : (
                    <Status tone="muted">Unavailable</Status>
                  )}
                </td>
                <td className="admin-num text-sm">
                  {images.filter((f) => f.name.startsWith(`${p.sku}_`)).length}
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      {stage === 'done' && (
        <p className="mt-6 text-sm leading-relaxed text-[var(--admin-fg)]">
          Import complete. Photographs carry the Nova Couture watermark, burned in as they were uploaded —
          until then they are stored exactly as uploaded.
        </p>
      )}
    </>
  )
}
