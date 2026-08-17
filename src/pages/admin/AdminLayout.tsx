import { useEffect, useState, type ReactNode } from 'react'
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
  { to: '/admin/links', label: 'Collection Links' },
]

/**
 * Admin shell.
 *
 * The gate below is a convenience, not the protection. Admin rights are
 * enforced by RLS on every write (migration 0004), so someone who bypassed
 * this component would reach a panel where nothing works and nothing is
 * visible. Hiding a route protects nothing, and this does not rely on it.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const [reload, setReload] = useState(0)
  const { data: isAdmin, loading } = useAsync(() => checkIsAdmin(), [reload])

  // Re-check whenever the session changes — signing in from another tab, or a
  // token refresh, should not leave a stale verdict.
  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange(() => setReload((n) => n + 1))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="admin-root grid min-h-screen place-items-center">
        <span className="text-sm text-[var(--admin-fg-muted)]">Checking access…</span>
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
    <div className="admin-root min-h-screen">
      <header className="border-b border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/admin" className="flex items-baseline gap-2.5">
            <span className="admin-title text-xl tracking-[0.2em]">VK</span>
            <span className="admin-label">Management</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--admin-fg-muted)] uppercase transition-colors hover:text-[var(--admin-fg)]"
            >
              View site
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="cursor-pointer text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--admin-fg-muted)] uppercase transition-colors hover:text-[var(--admin-fg)]"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav aria-label="Admin sections" className="border-t border-[var(--admin-border)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap gap-8 px-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    '-mb-px border-b-2 py-4 text-[0.65rem] font-semibold tracking-[0.16em] uppercase transition-colors duration-200',
                    isActive
                      ? 'border-[var(--admin-accent-line)] text-[var(--admin-fg)]'
                      : 'border-transparent text-[var(--admin-fg-muted)] hover:text-[var(--admin-fg)]',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <Outlet />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export function AdminHeading({
  title,
  note,
  actions,
}: {
  title: string
  note?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="admin-title text-4xl">{title}</h1>
        {note && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            {note}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

export function AdminTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    // Wide tables scroll inside their own container rather than pushing the
    // page sideways.
    <div className="overflow-x-auto border border-[var(--admin-border)]">
      <table className="admin-table min-w-[760px]">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c || i} scope="col">
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

export function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  /** Optional second figure, e.g. total opens under Active Collections. */
  sub?: string
}) {
  return (
    <div className="admin-panel px-6 py-6">
      <div className="admin-label">{label}</div>
      <div className="admin-stat-value mt-3">{value}</div>
      {sub && <div className="mt-2 text-xs text-[var(--admin-fg-muted)]">{sub}</div>}
    </div>
  )
}

export function AdminButton({
  children,
  onClick,
  disabled,
  tone = 'default',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'default' | 'primary' | 'danger'
  type?: 'button' | 'submit'
}) {
  const cls =
    tone === 'primary' ? 'admin-btn admin-btn-primary'
    : tone === 'danger' ? 'admin-btn admin-btn-danger'
    : 'admin-btn'

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

/** Same shape as AdminButton, for navigation rather than an action. */
export function AdminLinkButton({
  to,
  children,
  tone = 'default',
}: {
  to: string
  children: ReactNode
  tone?: 'default' | 'primary'
}) {
  return (
    <Link to={to} className={tone === 'primary' ? 'admin-btn admin-btn-primary' : 'admin-btn'}>
      {children}
    </Link>
  )
}

export function Status({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'premium' | 'active' | 'muted'
}) {
  const cls =
    tone === 'premium' ? 'admin-status admin-status-premium'
    : tone === 'active' ? 'admin-status admin-status-active'
    : tone === 'muted' ? 'admin-status admin-status-muted'
    : 'admin-status'

  return <span className={cls}>{children}</span>
}

/** Inline error for a failed write, so a refused action is never silent. */
export function AdminError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p
      role="alert"
      className="mb-6 border-l-2 border-[var(--admin-danger)] bg-[var(--admin-surface)] px-5 py-4 text-sm text-[var(--admin-danger)]"
    >
      {error}
    </p>
  )
}
