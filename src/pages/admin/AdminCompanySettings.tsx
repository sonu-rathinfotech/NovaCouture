import { useEffect, useState } from 'react'
import { AdminButton, AdminError, AdminHeading } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { getCompanySettings, missingCompanyDetails, updateCompanySettings } from '@/data/orders'
import type { CompanySettings } from '@/types/db'

/**
 * The seller's details, as printed on every proforma invoice.
 *
 * ── Why this is a screen and not a constant in the code ─────────────────────
 * None of it had been supplied when the ordering feature was built — the
 * static pages still carry "[[to supply: full postal address]]", and a GST
 * number and bank account had never been asked for at all. Hard-coding
 * placeholders would have put invented bank details on a document a retailer
 * might pay against. So every field starts blank, issuing is refused until the
 * critical ones are filled, and filling them is a thing the admin does rather
 * than a thing a developer deploys.
 */

type Key = Exclude<keyof CompanySettings, 'updated_at'>

const FIELDS: { key: Key; label: string; help?: string; area?: boolean }[] = [
  { key: 'legal_name', label: 'Registered business name', help: 'Exactly as on the GST certificate. This heads the invoice.' },
  { key: 'address', label: 'Address', area: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
]

/** The block an accounts department reads first. */
const GST_FIELDS: { key: Key; label: string; help?: string; area?: boolean }[] = [
  { key: 'gst_number', label: 'GSTIN', help: '15 characters, e.g. 27AALCN6631N1ZU.' },
  { key: 'pan', label: 'PAN', help: 'Characters 3 to 12 of the GSTIN.' },
  { key: 'state', label: 'State' },
  { key: 'state_code', label: 'State code', help: 'The first two digits of the GSTIN. 27 is Maharashtra.' },
  { key: 'default_hsn_code', label: 'Default HSN code', help: '7113 is articles of jewellery of precious metal. Used for any piece with no HSN of its own.' },
  { key: 'invoice_declaration', label: 'Declaration', area: true, help: 'Printed at the foot of every proforma. It is what stops the document being read as a tax invoice.' },
]

const BANK_FIELDS: { key: Key; label: string }[] = [
  { key: 'bank_name', label: 'Bank name' },
  { key: 'bank_account_name', label: 'Account name' },
  { key: 'bank_account_number', label: 'Account number' },
  { key: 'bank_ifsc', label: 'IFSC code' },
  { key: 'bank_branch', label: 'Branch' },
]

const EMPTY: Record<Key, string> = {
  legal_name: '', address: '', phone: '', email: '',
  gst_number: '', pan: '', state: '', state_code: '',
  default_hsn_code: '', invoice_declaration: '',
  bank_name: '', bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_branch: '',
}

export function AdminCompanySettings() {
  const [values, setValues] = useState<Record<Key, string>>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reload, setReload] = useState(0)

  const { data: settings } = useAsync(() => getCompanySettings(), [reload])

  useEffect(() => {
    if (!settings) return
    const next = { ...EMPTY }
    for (const key of Object.keys(EMPTY) as Key[]) next[key] = settings[key] ?? ''
    setValues(next)
  }, [settings])

  const missing = missingCompanyDetails(settings ?? null)

  async function onSave() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateCompanySettings(values)
      setReload((n) => n + 1)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  const set = (key: Key, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  return (
    <>
      <AdminHeading
        title="Company details"
        note="Printed on every proforma invoice. An issued invoice keeps a copy of these as they were on the day, so correcting something here never rewrites a document a client already holds."
      />
      <AdminError error={error} />

      {missing.length > 0 && (
        <div className="mb-6 border border-[var(--admin-border-strong)] bg-[var(--admin-bg-muted)] p-5">
          <p className="admin-label mb-2">Invoices cannot be issued yet</p>
          <p className="text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            Still needed: <strong>{missing.join(', ')}</strong>. Until these are filled in, a new
            order will not produce its proforma automatically and the Issue button stays disabled.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-panel p-6">
          <p className="admin-label mb-4">Business</p>
          {FIELDS.map((f) => (
            <label key={f.key} className="mb-4 block">
              <span className="admin-label mb-2 block">{f.label}</span>
              {f.area ? (
                <textarea
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={4}
                  className="admin-input"
                />
              ) : (
                <input
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="admin-input"
                />
              )}
              {f.help && (
                <span className="mt-2 block text-sm text-[var(--admin-fg-muted)]">{f.help}</span>
              )}
            </label>
          ))}
        </div>

        <div className="admin-panel p-6">
          <p className="admin-label mb-4">GST</p>
          {GST_FIELDS.map((f) => (
            <label key={f.key} className="mb-4 block">
              <span className="admin-label mb-2 block">{f.label}</span>
              {f.area ? (
                <textarea
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={4}
                  className="admin-input"
                />
              ) : (
                <input
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="admin-input"
                />
              )}
              {f.help && (
                <span className="mt-2 block text-sm text-[var(--admin-fg-muted)]">{f.help}</span>
              )}
            </label>
          ))}
        </div>

        <div className="admin-panel p-6">
          <p className="admin-label mb-2">Bank details</p>
          <p className="mb-4 text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            Optional. The proforma states no amounts, so nothing is payable against it and these do
            not block issuing. They print only when filled in. If you do fill them in, check the
            account number and IFSC character by character.
          </p>
          {BANK_FIELDS.map((f) => (
            <label key={f.key} className="mb-4 block">
              <span className="admin-label mb-2 block">{f.label}</span>
              <input
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className="admin-input"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <AdminButton tone="primary" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save company details'}
        </AdminButton>
        {saved && <span className="text-sm text-[var(--admin-fg-muted)]">Saved.</span>}
      </div>
    </>
  )
}
