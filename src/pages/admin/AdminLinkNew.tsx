import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminButton, AdminError, AdminHeading } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { createCollection, listAllProducts } from '@/data/admin'

const VISIBILITY_LABEL: Record<string, string> = {
  public: 'Public',
  login_required: 'Registered',
  premium_only: 'Premium',
}

/**
 * Create a curated collection link (scope §G).
 *
 * The admin picks pieces by hand and the order is the order they were picked —
 * a curated selection is a sequence, not a set, and the first piece is the one
 * the client sees first.
 */
export function AdminLinkNew() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [welcome, setWelcome] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const { data: products } = useAsync(() => listAllProducts(), [])

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? [])
      .filter((p) => p.is_active)
      .filter((p) =>
        !q ? true : p.name.toLowerCase().includes(q) || (p.category?.name ?? '').toLowerCase().includes(q),
      )
  }, [products, query])

  const byId = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  )

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    )
  }

  function move(index: number, delta: number) {
    setPicked((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function onCreate() {
    setBusy(true)
    setError(null)
    try {
      setToken(await createCollection(title, welcome, picked))
    } catch (e) {
      setError((e as Error).message || 'The link could not be created.')
    } finally {
      setBusy(false)
    }
  }

  if (token) {
    const url = `${window.location.origin}/collection/${token}`
    return (
      <>
        <AdminHeading title="Link created" note="Send this to the client. It does not expire." />
        <div className="border border-ivory-300 bg-ivory-50 p-6">
          <p className="font-mono text-sm break-all">{url}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AdminButton onClick={() => navigator.clipboard.writeText(url)}>Copy link</AdminButton>
            <AdminButton onClick={() => navigate('/admin/links')}>Done</AdminButton>
          </div>
        </div>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed font-light text-charcoal-400">
          Only a signed-in premium client can open this. Anyone else — including someone the
          recipient forwards it to — sees the same “not available” message, so the link reveals
          nothing on its own.
        </p>
      </>
    )
  }

  return (
    <>
      <AdminHeading
        title="New collection link"
        note="Choose the pieces to show. The order below is the order the client sees."
      />
      <AdminError error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[0.6rem] tracking-[0.2em] text-charcoal-400 uppercase">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Diwali Preview for Rao & Sons"
              className="w-full border border-ivory-300 bg-ivory-50 px-3 py-2 text-sm focus:border-charcoal-800 focus:outline-none"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[0.6rem] tracking-[0.2em] text-charcoal-400 uppercase">
              Welcome message <span className="normal-case">optional</span>
            </span>
            <textarea
              rows={3}
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              placeholder="Welcome. A private selection, chosen for you."
              className="w-full resize-y border border-ivory-300 bg-ivory-50 px-3 py-2 text-sm focus:border-charcoal-800 focus:outline-none"
            />
          </label>

          <div className="border border-ivory-300 bg-ivory-50">
            <div className="border-b border-ivory-300 px-4 py-3 text-[0.6rem] tracking-[0.2em] text-charcoal-400 uppercase">
              Selected — {picked.length}
            </div>
            {picked.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-charcoal-400">
                Nothing chosen yet. Pick pieces from the right.
              </p>
            ) : (
              <ol className="divide-y divide-line">
                {picked.map((id, i) => (
                  <li key={id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 text-xs tabular-nums text-charcoal-400">{i + 1}</span>
                    <span className="flex-1 font-serif">{byId.get(id)?.name ?? id}</span>
                    <span className="flex gap-1">
                      <AdminButton onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </AdminButton>
                      <AdminButton onClick={() => move(i, 1)} disabled={i === picked.length - 1}>
                        ↓
                      </AdminButton>
                      <AdminButton tone="danger" onClick={() => toggle(id)}>
                        Remove
                      </AdminButton>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AdminButton onClick={onCreate} disabled={busy || !title.trim() || picked.length === 0}>
              {busy ? 'Creating…' : 'Create link'}
            </AdminButton>
            <Link
              to="/admin/links"
              className="text-[0.625rem] tracking-[0.12em] text-charcoal-400 uppercase underline underline-offset-4"
            >
              Cancel
            </Link>
            {picked.length === 0 && (
              <span className="text-[0.8125rem] text-charcoal-400">
                A link with no pieces would open to an empty page.
              </span>
            )}
          </div>
        </div>

        <div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the catalogue"
            className="mb-3 w-full border border-ivory-300 bg-ivory-50 px-3 py-2 text-sm focus:border-charcoal-800 focus:outline-none"
          />

          <div className="max-h-[560px] overflow-y-auto border border-ivory-300 bg-ivory-50">
            <ul className="divide-y divide-line">
              {available.map((p) => {
                const chosen = picked.includes(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ${
                        chosen ? 'bg-ivory-200/60' : 'hover:bg-ivory-200/40'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`grid size-4 shrink-0 place-items-center border text-[0.5rem] ${
                          chosen ? 'border-charcoal-800 bg-ink text-ivory' : 'border-ivory-300'
                        }`}
                      >
                        {chosen ? '✓' : ''}
                      </span>
                      <span className="flex-1 font-serif">{p.name}</span>
                      <span className="text-[0.625rem] tracking-[0.12em] text-charcoal-400 uppercase">
                        {VISIBILITY_LABEL[p.visibility]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* A curated link is premium-only, so any piece in it is reachable by
              the recipient regardless of its own visibility. Say so, rather
              than letting the admin wonder. */}
          <p className="mt-3 text-sm leading-relaxed font-light text-charcoal-400">
            Pieces of any visibility can be included — the recipient must be a premium client to
            open the link at all.
          </p>
        </div>
      </div>
    </>
  )
}
