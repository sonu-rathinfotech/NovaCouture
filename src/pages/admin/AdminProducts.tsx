import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminButton, AdminError, AdminHeading, AdminTable } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listAllProducts, setProductActive, setProductVisibility } from '@/data/admin'
import { VISIBILITY, type Visibility } from '@/types/db'

const LABEL: Record<Visibility, string> = {
  public: 'Public',
  login_required: 'Registered',
  premium_only: 'Premium',
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
      !q ? true : p.name.toLowerCase().includes(q) || (p.category?.name ?? '').toLowerCase().includes(q),
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
      />
      <AdminError error={error} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex-1">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or categories"
            className="w-full max-w-sm border border-ivory-300 bg-ivory-50 px-4 py-2.5 text-sm focus:border-charcoal-800 focus:outline-none"
          />
        </label>
        <span className="flex items-center gap-4">
          <span className="text-[0.65rem] tracking-[0.2em] text-charcoal-400 uppercase">
            {loading ? 'Loading…' : `${rows.length} shown`}
          </span>
          <Link
            to="/admin/products/new"
            className="cursor-pointer border border-ivory-400 px-4 py-2 text-[0.6rem] tracking-[0.18em] text-charcoal-500 uppercase transition-colors duration-500 ease-lux hover:border-charcoal-800 hover:text-charcoal-900"
          >
            New product
          </Link>
        </span>
      </div>

      <AdminTable columns={['Name', 'Category', 'Visibility', 'Images', 'Status', '']}>
        {rows.map((p) => (
          <tr key={p.id} className={`border-b border-ivory-300 last:border-0 ${p.is_active ? '' : 'opacity-55'}`}>
            <td className="px-5 py-4 font-serif text-lg text-charcoal-800">{p.name}</td>
            <td className="px-5 py-4 font-light text-charcoal-400">{p.category?.name ?? '—'}</td>
            <td className="px-5 py-4">
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
                className="cursor-pointer border border-ivory-300 bg-ivory-50 px-2 py-1.5 text-[0.6875rem] tracking-[0.1em] uppercase focus:border-charcoal-800 focus:outline-none"
              >
                {VISIBILITY.map((v) => (
                  <option key={v} value={v}>
                    {LABEL[v]}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-5 py-4 font-light text-charcoal-400 tabular-nums">{p.image_count}</td>
            <td className="px-5 py-4 font-light text-charcoal-400">{p.is_active ? 'Listed' : 'Hidden'}</td>
            <td className="px-5 py-4 text-right whitespace-nowrap">
              <span className="inline-flex gap-2">
                <Link
                  to={`/admin/products/${p.id}`}
                  className="cursor-pointer border border-ivory-400 px-4 py-2 text-[0.6rem] tracking-[0.18em] text-charcoal-500 uppercase transition-colors duration-500 ease-lux hover:border-charcoal-800 hover:text-charcoal-900"
                >
                  Edit
                </Link>
                <AdminButton
                  disabled={busyId === p.id}
                  onClick={() => run(p.id, () => setProductActive(p.id, !p.is_active))}
                >
                  {p.is_active ? 'Hide' : 'List'}
                </AdminButton>
              </span>
            </td>
          </tr>
        ))}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-14 text-center font-light text-charcoal-400">
              No products match “{query}”.
            </td>
          </tr>
        )}
      </AdminTable>

      <p className="mt-4 text-sm leading-relaxed font-light text-charcoal-400">
        Hiding a piece removes it from the site for everyone, including premium clients, without
        deleting it or its photographs.
      </p>
    </>
  )
}
