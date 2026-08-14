import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { checkIsAdmin } from '@/data/admin'
import { getSupabase } from '@/lib/supabase'
import { AdminSignIn } from './AdminSignIn'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/links', label: 'Collection links' },
]

/**
 * Admin shell.
 *
 * The gate below is a convenience, not the protection. Admin rights are
 * enforced by RLS on every write (migration 0004), so someone who bypassed
 * this component would reach a panel where nothing works and nothing is
 * visible. Hiding a route protects nothing — the audit is right about that,
 * and this does not rely on it.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const { data: isAdmin, loading } = useAsync(() => checkIsAdmin(), [reload])

  // Also re-check whenever the session itself changes — signing in from
  // another tab, or a token refresh, should not leave a stale verdict.
  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange(() => setReload((n) => n + 1))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ivory-100">
        <span className="text-sm font-light text-charcoal-400">Checking access…</span>
      </div>
    )
  }

  if (!isAdmin) return <AdminSignIn onSignedIn={() => setReload((n) => n + 1)} />

  async function signOut() {
    await getSupabase().auth.signOut()
    setReload((n) => n + 1)
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ivory-100">
      <header className="border-b border-ivory-300 bg-ivory-50">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin" className="font-serif text-xl tracking-[0.2em] text-charcoal-900">
            VK <span className="font-sans text-[0.6rem] tracking-[0.3em] text-charcoal-400 uppercase">Admin</span>
          </Link>
          <div className="flex items-center gap-6 text-[0.65rem] tracking-[0.2em] uppercase">
            <Link to="/" className="text-charcoal-400 transition-colors hover:text-charcoal-900">
              View site
            </Link>
            <button type="button" onClick={signOut} className="cursor-pointer uppercase">
              Sign out
            </button>
          </div>
        </div>

        <nav aria-label="Admin sections" className="border-t border-ivory-300">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-6 px-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    '-mb-px border-b-2 py-4 text-[0.65rem] tracking-[0.2em] uppercase transition-colors duration-500 ease-lux',
                    isActive
                      ? 'border-champagne-500 text-charcoal-900'
                      : 'border-transparent text-charcoal-400 hover:text-charcoal-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <Outlet />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared admin primitives
// ---------------------------------------------------------------------------

export function AdminHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-4xl text-charcoal-800">{title}</h1>
      {note && <p className="mt-3 max-w-2xl text-sm leading-relaxed font-light text-charcoal-400">{note}</p>}
    </div>
  )
}

export function AdminTable({
  columns,
  children,
}: {
  columns: string[]
  children: React.ReactNode
}) {
  return (
    // Wide tables scroll inside their own container rather than pushing the
    // page sideways.
    <div className="overflow-x-auto border border-ivory-300 bg-ivory-50">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ivory-300">
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="px-5 py-4 text-left text-[0.6rem] font-medium tracking-[0.2em] text-charcoal-400 uppercase"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-ivory-300 bg-ivory-50 px-6 py-7">
      <div className="text-[0.6rem] font-medium tracking-[0.2em] text-charcoal-400 uppercase">{label}</div>
      <div className="mt-3 font-serif text-4xl text-charcoal-800 tabular-nums">{value}</div>
    </div>
  )
}

export function AdminButton({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'cursor-pointer border px-4 py-2 text-[0.6rem] tracking-[0.18em] uppercase transition-colors duration-500 ease-lux disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger'
          ? 'border-ivory-400 text-danger hover:border-danger'
          : 'border-ivory-300 text-charcoal-400 hover:border-charcoal-800 hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/** Inline error for a failed write, so a refused action is never silent. */
export function AdminError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="mb-6 border-l-2 border-danger bg-ivory-50 px-5 py-4 text-sm font-light text-danger">
      {error}
    </p>
  )
}
