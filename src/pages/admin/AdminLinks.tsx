import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminButton, AdminError, AdminHeading, AdminTable } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listCollectionMetrics, setCollectionActive } from '@/data/admin'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function AdminLinks() {
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: links, loading } = useAsync(() => listCollectionMetrics(), [reload])

  async function toggle(id: string, next: boolean) {
    setBusyId(id)
    setError(null)
    try {
      await setCollectionActive(id, next)
      setReload((n) => n + 1)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusyId(null)
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/collection/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <AdminHeading
        title="Collection links"
        note="Curated selections sent to premium clients. Opens and unique viewers are counted by mobile number."
      />
      <AdminError error={error} />

      <div className="mb-4 flex justify-end">
        <Link
          to="/admin/links/new"
          className="cursor-pointer border border-ivory-400 px-4 py-2 text-[0.6rem] tracking-[0.18em] text-charcoal-500 uppercase transition-colors duration-500 ease-lux hover:border-charcoal-800 hover:text-charcoal-900"
        >
          New link
        </Link>
      </div>

      <AdminTable
        columns={['Title', 'Created', 'Opens', 'Unique viewers', 'Last opened', 'Status', '']}
      >
        {(links ?? []).map((link) => (
          <tr key={link.collection_id} className="border-b border-ivory-300 last:border-0">
            <td className="px-5 py-4">
              <Link
                to={`/admin/links/${link.collection_id}`}
                className="font-serif text-base underline decoration-line underline-offset-4 hover:decoration-gold"
              >
                {link.title}
              </Link>
              <button
                type="button"
                onClick={() => copy(link.token)}
                className="mt-1 cursor-pointer font-mono text-[0.6875rem] break-all text-charcoal-400 underline underline-offset-2 hover:text-charcoal-800"
              >
                {copied === link.token ? 'Copied to clipboard' : `/collection/${link.token}`}
              </button>
            </td>
            <td className="px-5 py-4 font-light text-charcoal-400">{DATE.format(new Date(link.created_at))}</td>
            <td className="px-5 py-4 tabular-nums">{link.opens}</td>
            <td className="px-5 py-4 tabular-nums">{link.unique_viewers}</td>
            <td className="px-5 py-4 font-light text-charcoal-400">
              {link.last_opened_at ? DATE.format(new Date(link.last_opened_at)) : '—'}
            </td>
            <td className="px-5 py-4">
              {link.is_active ? (
                <span className="border border-success px-2 py-1 text-[0.625rem] tracking-[0.12em] text-success uppercase">
                  Active
                </span>
              ) : (
                <span className="border border-ivory-300 px-2 py-1 text-[0.625rem] tracking-[0.12em] text-charcoal-400 uppercase">
                  Disabled
                </span>
              )}
            </td>
            <td className="px-5 py-4 text-right whitespace-nowrap">
              <AdminButton
                disabled={busyId === link.collection_id}
                tone={link.is_active ? 'danger' : 'default'}
                onClick={() => toggle(link.collection_id, !link.is_active)}
              >
                {link.is_active ? 'Disable' : 'Enable'}
              </AdminButton>
            </td>
          </tr>
        ))}
        {!loading && (links ?? []).length === 0 && (
          <tr>
            <td colSpan={7} className="px-5 py-14 text-center font-light text-charcoal-400">
              No collection links yet.
            </td>
          </tr>
        )}
      </AdminTable>

      {/* Links never expire by design (scope §G), which makes this the only
          way to withdraw one. Worth stating plainly on the screen. */}
      <p className="mt-4 text-sm leading-relaxed font-light text-charcoal-400">
        Links do not expire. Disabling one is the only way to withdraw it — a disabled link shows
        the same “not available” message as an unknown one, so the recipient learns nothing.
      </p>
    </>
  )
}
