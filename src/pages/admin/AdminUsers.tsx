import { useMemo, useState } from 'react'
import { AdminButton, AdminError, AdminHeading, AdminTable, Status } from './AdminLayout'
import { Modal } from '@/components/ui/Modal'
import { AddClientModal } from './AddClientModal'
import { useAsync } from '@/hooks/useAsync'
import { listProfiles, profilesToRows, setPremium } from '@/data/admin'
import { buildXlsx } from '@/lib/xlsx'
import { formatMobile } from '@/lib/mobile'
import type { Profile } from '@/types/db'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function AdminUsers() {
  const [query, setQuery] = useState('')
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Profile | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: profiles, loading } = useAsync(() => listProfiles(), [reload])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (profiles ?? []).filter((p) =>
      !q
        ? true
        : p.name.toLowerCase().includes(q) ||
          p.mobile.includes(q.replace(/\s/g, '')) ||
          (p.company ?? '').toLowerCase().includes(q),
    )
  }, [profiles, query])

  async function togglePremium(id: string, next: boolean) {
    setBusyId(id)
    setError(null)
    try {
      await setPremium(id, next)
      setReload((n) => n + 1)
      setViewing(null)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusyId(null)
    }
  }

  function exportExcel() {
    const blob = buildXlsx(profilesToRows(profiles ?? []), 'Clients')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vk-clients-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <AdminHeading
        title="Users"
        note="Premium access is granted here, by hand. There is no self-serve upgrade."
        actions={
          <>
            <AdminButton onClick={exportExcel} disabled={loading || (profiles ?? []).length === 0}>
              Export to Excel
            </AdminButton>
            <AdminButton tone="primary" onClick={() => setAdding(true)}>
              + Add Client
            </AdminButton>
          </>
        }
      />
      <AdminError error={error} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="w-full max-w-sm">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, number or company"
            className="admin-input"
          />
        </label>
        <span className="admin-label">{loading ? 'Loading…' : `${rows.length} shown`}</span>
      </div>

      <AdminTable columns={['Name', 'Mobile', 'Company', 'Registered', 'Premium', 'Actions']}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className="text-sm font-medium">{p.name}</td>
            <td className="admin-num text-sm">{formatMobile(p.mobile)}</td>
            <td className="text-sm text-[var(--admin-fg-muted)]">{p.company ?? '—'}</td>
            <td className="text-sm text-[var(--admin-fg-muted)]">
              {DATE.format(new Date(p.created_at))}
            </td>
            <td>
              {p.is_premium ? (
                <Status tone="premium">Premium</Status>
              ) : (
                <span className="text-sm text-[var(--admin-fg-subtle)]">—</span>
              )}
            </td>
            <td>
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton onClick={() => setViewing(p)}>View</AdminButton>
                {/* A real navigation, not a router link: the preview is read
                    from the URL when the catalogue is queried, so the page has
                    to be loaded afresh for it to take effect. */}
                <a
                  href={`/?preview=${p.is_premium ? 'premium' : 'registered'}`}
                  className="admin-btn"
                  title={`See the catalogue as a ${p.is_premium ? 'premium' : 'registered'} client sees it`}
                >
                  View as
                </a>
                <AdminButton
                  disabled={busyId === p.id}
                  onClick={() => togglePremium(p.id, !p.is_premium)}
                >
                  {p.is_premium ? 'Remove Premium' : 'Make Premium'}
                </AdminButton>
              </div>
            </td>
          </tr>
        ))}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-14 text-center text-sm text-[var(--admin-fg-muted)]">
              {query ? `No clients match “${query}”.` : 'No clients have registered yet.'}
            </td>
          </tr>
        )}
      </AdminTable>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--admin-fg-muted)]">
        The export is an Excel file containing personal data — name, mobile number and consent
        date. Treat it the way the Privacy Policy says VK will.
      </p>

      <AddClientModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => setReload((n) => n + 1)}
      />

      <Modal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        description={viewing ? formatMobile(viewing.mobile) : undefined}
      >
        {viewing && (
          <>
            <dl className="text-sm">
              {[
                ['Company', viewing.company ?? '—'],
                ['Email', viewing.email ?? '—'],
                ['Registered', DATE.format(new Date(viewing.created_at))],
                [
                  'Consent given',
                  viewing.consent_at ? DATE.format(new Date(viewing.consent_at)) : '—',
                ],
                ['Access', viewing.is_premium ? 'Premium' : 'Registered'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-6 border-b border-[var(--admin-border)] py-3 last:border-0"
                >
                  <dt className="text-[var(--admin-fg-muted)]">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <AdminButton
                tone="primary"
                disabled={busyId === viewing.id}
                onClick={() => togglePremium(viewing.id, !viewing.is_premium)}
              >
                {viewing.is_premium ? 'Remove Premium' : 'Make Premium'}
              </AdminButton>
              <AdminButton onClick={() => setViewing(null)}>Close</AdminButton>
            </div>

            {/* Deleting a client is not offered here. It breaks the curated
                link history that points at them, so it stays a deliberate act
                through a tool rather than a button in a modal. */}
            <p className="mt-5 text-xs leading-relaxed text-[var(--admin-fg-muted)]">
              Accounts are not deleted from this screen — removing one affects the collection-link
              history that refers to it.
            </p>
          </>
        )}
      </Modal>
    </>
  )
}
