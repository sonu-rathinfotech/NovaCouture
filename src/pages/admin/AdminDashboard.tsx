import { AdminHeading, Stat } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listAllCategories, listAllProducts, listCollectionMetrics, listProfiles } from '@/data/admin'

export function AdminDashboard() {
  const { data: products } = useAsync(() => listAllProducts(), [])
  const { data: categories } = useAsync(() => listAllCategories(), [])
  const { data: profiles } = useAsync(() => listProfiles(), [])
  const { data: links } = useAsync(() => listCollectionMetrics(), [])

  const all = products ?? []
  const clients = profiles ?? []
  const collections = links ?? []
  const active = collections.filter((l) => l.is_active)

  // Total opens across active collections — the useful second figure, since
  // "3 active" says nothing about whether anyone looked.
  const opens = active.reduce((n, l) => n + l.opens, 0)

  const counts = {
    public: all.filter((p) => p.visibility === 'public').length,
    registered: all.filter((p) => p.visibility === 'login_required').length,
    premium: all.filter((p) => p.visibility === 'premium_only').length,
  }

  return (
    <>
      <AdminHeading title="Dashboard" note="The catalogue and client accounts at a glance." />

      <div className="mb-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Products" value={all.length} />
        <Stat label="Categories" value={(categories ?? []).filter((c) => !c.parent_id).length} />
        <Stat label="Registered Clients" value={clients.length} />
        <Stat label="Premium Clients" value={clients.filter((p) => p.is_premium).length} />
      </div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Stat label="Public Products" value={counts.public} />
        <Stat label="Login Required" value={counts.registered} />
        <Stat label="Premium Only" value={counts.premium} />
        <Stat
          label="Active Collections"
          value={active.length}
          sub={`${opens} ${opens === 1 ? 'open' : 'opens'} in total`}
        />
      </div>

      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--admin-fg-muted)]">
        Hidden products are counted here but do not appear on the site. Client numbers include
        every registered account, premium or not.
      </p>
    </>
  )
}
