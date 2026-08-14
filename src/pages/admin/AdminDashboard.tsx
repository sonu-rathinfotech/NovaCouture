import { AdminHeading, Stat } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listAllCategories, listAllProducts, listCollectionMetrics, listProfiles } from '@/data/admin'

export function AdminDashboard() {
  const { data: products } = useAsync(() => listAllProducts(), [])
  const { data: categories } = useAsync(() => listAllCategories(), [])
  const { data: profiles } = useAsync(() => listProfiles(), [])
  const { data: links } = useAsync(() => listCollectionMetrics(), [])

  const all = products ?? []
  const counts = {
    public: all.filter((p) => p.visibility === 'public').length,
    registered: all.filter((p) => p.visibility === 'login_required').length,
    premium: all.filter((p) => p.visibility === 'premium_only').length,
  }

  return (
    <>
      <AdminHeading title="Dashboard" note="A summary of the catalogue and client accounts." />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Products" value={all.length} />
        <Stat label="Categories" value={(categories ?? []).filter((c) => !c.parent_id).length} />
        <Stat label="Registered clients" value={(profiles ?? []).length} />
        <Stat label="Premium clients" value={(profiles ?? []).filter((p) => p.is_premium).length} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Public pieces" value={counts.public} />
        <Stat label="Registered only" value={counts.registered} />
        <Stat label="Premium only" value={counts.premium} />
        <Stat label="Active links" value={(links ?? []).filter((l) => l.is_active).length} />
      </div>

      <p className="mt-6 text-sm leading-relaxed font-light text-charcoal-400">
        Hidden products are counted here but do not appear on the site. Client numbers include
        every registered account, premium or not.
      </p>
    </>
  )
}
