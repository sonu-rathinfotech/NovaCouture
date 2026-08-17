import { useMemo, useState } from 'react'
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
import { listAllProducts, setProductActive, setProductVisibility } from '@/data/admin'
import { VISIBILITY, type Visibility } from '@/types/db'

const LABEL: Record<Visibility, string> = {
  public: 'Public',
  login_required: 'Login Required',
  premium_only: 'Premium Only',
}

export function AdminProducts() {
  const [query, setQuery] = useState('')
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: products, loading } = useAsync(() => listAllProducts(), [reload])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? []).filter((p) =>
      !q
        ? true
        : p.name.toLowerCase().includes(q) || (p.category?.name ?? '').toLowerCase().includes(q),
    )
  }, [products, query])

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id)
    setError(null)
    try {
      await action()
      setReload((n) => n + 1)
    } catch (e) {
      // A refused write must be visible. Silently reverting would leave the
      // admin believing a change was saved.
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AdminHeading
        title="Products"
        note="Visibility decides who can see each piece. Changes apply immediately."
        actions={
          <>
            <AdminLinkButton to="/admin/bulk-upload">Bulk Upload</AdminLinkButton>
            <AdminLinkButton to="/admin/products/new" tone="primary">
              + New Product
            </AdminLinkButton>
          </>
        }
      />
      <AdminError error={error} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="w-full max-w-sm">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or categories"
            className="admin-input"
          />
        </label>
        <span className="admin-label">
          {loading ? 'Loading…' : `${rows.length} shown`}
        </span>
      </div>

      <AdminTable columns={['Name', 'Category', 'Visibility', 'Images', 'Status', 'Actions']}>
        {rows.map((p) => (
          <tr key={p.id} className={p.is_active ? '' : 'opacity-60'}>
            <td>
              <Link
                to={`/admin/products/${p.id}`}
                className="admin-title text-lg underline decoration-[var(--admin-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--admin-accent-line)]"
              >
                {p.name}
              </Link>
            </td>
            <td className="text-sm text-[var(--admin-fg-muted)]">{p.category?.name ?? '—'}</td>
            <td>
              <label className="sr-only" htmlFor={`vis-${p.id}`}>
                Visibility for {p.name}
              </label>
              <select
                id={`vis-${p.id}`}
                value={p.visibility}
                disabled={busyId === p.id}
                onChange={(e) =>
                  run(p.id, () => setProductVisibility(p.id, e.target.value as Visibility))
                }
                className="admin-input cursor-pointer py-1.5 text-[0.7rem] tracking-[0.08em] uppercase"
              >
                {VISIBILITY.map((v) => (
                  <option key={v} value={v}>
                    {LABEL[v]}
                  </option>
                ))}
              </select>
            </td>
            <td className="admin-num text-sm">{p.image_count}</td>
            <td>
              {p.is_active ? (
                <Status tone="active">Listed</Status>
              ) : (
                <Status tone="muted">Hidden</Status>
              )}
            </td>
            <td>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/admin/products/${p.id}`} className="admin-btn">
                  Edit
                </Link>
                <Link to={`/admin/products/${p.id}#images`} className="admin-btn">
                  Images
                </Link>
                <AdminButton
                  disabled={busyId === p.id}
                  onClick={() => run(p.id, () => setProductActive(p.id, !p.is_active))}
                >
                  {p.is_active ? 'Hide' : 'List'}
                </AdminButton>
              </div>
            </td>
          </tr>
        ))}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-14 text-center text-sm text-[var(--admin-fg-muted)]">
              {query ? `No products match “${query}”.` : 'No products yet.'}
            </td>
          </tr>
        )}
      </AdminTable>

      {/* Delete lives on the edit screen, not here. A delete button in a row
          of a long table is one mis-click from removing a piece and its
          photographs, and there is no undo. */}
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--admin-fg-muted)]">
        Hiding a piece removes it from the site for everyone, including premium clients, without
        deleting it or its photographs. Deleting is on the edit screen.
      </p>
    </>
  )
}
