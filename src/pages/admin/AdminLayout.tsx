import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Gem,
  FolderTree,
  Users,
  Link2,
  Upload,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { checkIsAdmin } from '@/data/admin'
import { getSupabase } from '@/lib/supabase'
import { AdminSignIn } from './AdminSignIn'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Gem },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/users', label: 'Clients', icon: Users },
  { to: '/admin/links', label: 'Collection Links', icon: Link2 },
  { to: '/admin/bulk-upload', label: 'Bulk Upload', icon: Upload },
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
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const { data: isAdmin, loading } = useAsync(() => checkIsAdmin(), [reload])

  // Re-check whenever the session changes — signing in from another tab, or a
  // token refresh, should not leave a stale verdict.
  useEffect(() => {
    /*
     * Re-check only when the account actually changes.
     *
     * onAuthStateChange also fires on a token refresh, which happens every time
     * the tab regains focus. Bumping the counter on every event meant a fresh
     * is_admin() round trip each time the admin came back to the tab, to
     * confirm something that cannot change while they sit there.
     */
    let current: string | null = null

    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      const next = session?.user?.id ?? null
      if (next === current) return
      current = next
      setReload((n) => n + 1)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // On a phone the sidebar covers the page, so it has to close once a section
  // has been chosen.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

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
    <div className="admin-root min-h-screen lg:flex">
      {/* Mobile bar. The sidebar is off-canvas below lg, because a fixed
          240px rail on a phone leaves nothing for the table. */}
      <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3 lg:hidden">
        <Link to="/admin" className="flex items-baseline gap-2">
          <span className="admin-mark">Nova</span>
          <span className="admin-label">Management</span>
        </Link>
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="admin-icon-btn"
          aria-label="Open menu"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      </div>

      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`admin-sidebar ${navOpen ? 'is-open' : ''}`}
        aria-label="Admin sections"
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-7">
          <Link to="/admin" className="flex items-baseline gap-2">
            <span className="admin-mark">Nova</span>
            <span className="admin-label">Management</span>
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="admin-icon-btn lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Leaving the panel and ending the session are not navigation, so they
            sit apart from it rather than as two more items in the list. */}
        <div className="border-t border-[var(--admin-border)] px-3 py-4">
          <a href="/" className="admin-nav-link">
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
            View site
          </a>
          <button type="button" onClick={signOut} className="admin-nav-link w-full">
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] px-5 py-7 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
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
    /* A portal page header: the title, the actions, and a rule under both.
       It was a 4xl serif masthead with a paragraph beneath, which spent a
       quarter of the screen before the first row of data. */
    <div className="mb-6 border-b border-[var(--admin-border)] pb-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="admin-title text-xl">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {note && (
        <p className="mt-2 max-w-3xl text-[0.8125rem] leading-relaxed text-[var(--admin-fg-muted)]">
          {note}
        </p>
      )}
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
    <div className="admin-panel px-4 py-4">
      <div className="admin-label">{label}</div>
      <div className="admin-stat-value mt-2">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[var(--admin-fg-muted)]">{sub}</div>}
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
