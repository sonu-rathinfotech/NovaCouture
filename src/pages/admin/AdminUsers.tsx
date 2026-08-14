import { useMemo, useState } from 'react'
import { AdminButton, AdminError, AdminHeading, AdminTable } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listProfiles, profilesToRows, setPremium } from '@/data/admin'
import { buildXlsx } from '@/lib/xlsx'
import { formatMobile } from '@/lib/mobile'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function AdminUsers() {
  const [query, setQuery] = useState('')
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
      />
      <AdminError error={error} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex-1">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, number or company"
            className="w-full max-w-sm border border-ivory-300 bg-ivory-50 px-4 py-2.5 text-sm focus:border-charcoal-800 focus:outline-none"
          />
        </label>
        <AdminButton onClick={exportExcel} disabled={loading || (profiles ?? []).length === 0}>
          Export to Excel
        </AdminButton>
      </div>

      <AdminTable columns={['Name', 'Mobile', 'Company', 'Registered', 'Premium', '']}>
        {rows.map((p) => (
          <tr key={p.id} className="border-b border-ivory-300 last:border-0">
            <td className="px-5 py-4">{p.name}</td>
            <td className="px-5 py-4 font-light text-charcoal-400 tabular-nums">{formatMobile(p.mobile)}</td>
            <td className="px-5 py-4 font-light text-charcoal-400">{p.company ?? '—'}</td>
            <td className="px-5 py-4 font-light text-charcoal-400">{DATE.format(new Date(p.created_at))}</td>
            <td className="px-5 py-4">
              {p.is_premium ? (
                <span className="border border-charcoal-800 px-2 py-1 text-[0.625rem] tracking-[0.12em] uppercase">
                  Premium
                </span>
              ) : (
                <span className="text-charcoal-400">—</span>
              )}
            </td>
            <td className="px-5 py-4 text-right">
              <AdminButton
                disabled={busyId === p.id}
                onClick={() => togglePremium(p.id, !p.is_premium)}
              >
                {p.is_premium ? 'Remove premium' : 'Make premium'}
              </AdminButton>
            </td>
          </tr>
        ))}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-14 text-center font-light text-charcoal-400">
              {query ? `No clients match “${query}”.` : 'No clients have registered yet.'}
            </td>
          </tr>
        )}
      </AdminTable>

      <p className="mt-4 text-sm leading-relaxed font-light text-charcoal-400">
        The export is an Excel file. It contains personal data — name, mobile number and consent
        date — so treat the file the way the Privacy Policy says VK will.
      </p>
    </>
  )
}
