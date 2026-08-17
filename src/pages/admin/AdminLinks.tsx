import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AdminButton,
  AdminError,
  AdminHeading,
  AdminLinkButton,
  AdminTable,
  Status,
} from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listCollectionMetrics, setCollectionActive } from '@/data/admin'
import { AUDIENCE } from './audience'

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

  const rows = links ?? []

  return (
    <>
      <AdminHeading
        title="Collection Links"
        note="Curated selections sent to clients. Each link carries its own audience. Opens and unique viewers are counted by mobile number."
        actions={
          <AdminLinkButton to="/admin/links/new" tone="primary">
            + New Collection
          </AdminLinkButton>
        }
      />
      <AdminError error={error} />

      <AdminTable columns={['Collection', 'Audience', 'Opens', 'Viewers', 'Created', 'Status', 'Actions']}>
        {rows.map((link) => (
          <tr key={link.collection_id}>
            <td>
              <Link
                to={`/admin/links/${link.collection_id}`}
                className="admin-title text-lg underline decoration-[var(--admin-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--admin-accent-line)]"
              >
                {link.title}
              </Link>
              <div className="mt-1 font-mono text-[0.7rem] break-all text-[var(--admin-fg-subtle)]">
                /collection/{link.token}
              </div>
            </td>
            <td>
              <Status tone={link.min_tier === 'premium' ? 'premium' : 'default'}>
                {AUDIENCE[link.min_tier].short}
              </Status>
            </td>
            <td className="admin-num text-sm">{link.opens}</td>
            <td className="admin-num text-sm">{link.unique_viewers}</td>
            <td className="text-sm text-[var(--admin-fg-muted)]">
              {DATE.format(new Date(link.created_at))}
            </td>
            <td>
              {link.is_active ? (
                <Status tone="active">Active</Status>
              ) : (
                <Status tone="muted">Disabled</Status>
              )}
            </td>
            <td>
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton onClick={() => copy(link.token)}>
                  {copied === link.token ? 'Copied' : 'Copy Link'}
                </AdminButton>
                <Link to={`/admin/links/${link.collection_id}`} className="admin-btn">
                  View
                </Link>
                <AdminButton
                  disabled={busyId === link.collection_id}
                  tone={link.is_active ? 'danger' : 'default'}
                  onClick={() => toggle(link.collection_id, !link.is_active)}
                >
                  {link.is_active ? 'Disable' : 'Enable'}
                </AdminButton>
              </div>
            </td>
          </tr>
        ))}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={7} className="py-14 text-center text-sm text-[var(--admin-fg-muted)]">
              No collections yet.
            </td>
          </tr>
        )}
      </AdminTable>

      {/* Links never expire by design (scope §G), which makes this the only
          way to withdraw one. Worth stating plainly on the screen. */}
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--admin-fg-muted)]">
        Links do not expire. Disabling one is the only way to withdraw it — a disabled link shows
        the same “not available” message as an unknown one, so the recipient learns nothing. A
        public link is the only kind that opens without signing in; the pieces inside it are
        viewable by anyone it reaches until it is disabled.
      </p>
    </>
  )
}
