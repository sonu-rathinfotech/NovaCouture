import { Link, useParams } from 'react-router-dom'
import { AdminError, AdminHeading, AdminTable, Stat } from './AdminLayout'
import { AUDIENCE } from './audience'
import { useAsync } from '@/hooks/useAsync'
import {
  getCollection,
  listCollectionProductViews,
  listCollectionViews,
} from '@/data/admin'
import { formatMobile } from '@/lib/mobile'
import { features } from '@/lib/env'

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * One curated link, in detail (scope §G).
 *
 * The list screen answers "how many"; this answers "who, and when" — the two
 * questions an admin actually has after sending a selection to a client.
 */
export function AdminLinkDetail() {
  const { collectionId = '' } = useParams()

  const { data: link } = useAsync(() => getCollection(collectionId), [collectionId])
  const { data: views, error } = useAsync(() => listCollectionViews(collectionId), [collectionId])
  const { data: productViews } = useAsync(
    () => listCollectionProductViews(collectionId),
    [collectionId],
  )

  const rows = views ?? []
  const opens = rows.filter((v) => v.product_id === null)
  const uniqueViewers = new Set(rows.map((v) => v.mobile).filter(Boolean)).size

  return (
    <>
      <AdminHeading
        title={link?.title ?? 'Collection link'}
        note={link ? `/collection/${link.token}` : undefined}
      />
      <AdminError error={error ? error.message : null} />

      <div className="mb-4">
        <Link
          to="/admin/links"
          className="text-[0.625rem] tracking-[0.12em] text-charcoal-400 uppercase underline underline-offset-4"
        >
          Back to links
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Opens" value={opens.length} />
        <Stat label="Unique viewers" value={uniqueViewers} />
        <Stat
          label="Last opened"
          value={opens[0] ? WHEN.format(new Date(opens[0].viewed_at)) : '—'}
        />
        <Stat label="Status" value={link?.is_active ? 'Active' : 'Disabled'} />
      </div>

      {link && (
        <p className="mb-8 max-w-[70ch] text-sm leading-relaxed text-[var(--admin-fg-muted)]">
          <strong className="font-medium text-[var(--admin-fg)]">
            {AUDIENCE[link.min_tier].label}.
          </strong>{' '}
          {AUDIENCE[link.min_tier].note}
          {link.min_tier === 'guest' && (
            /* A guest link records opens but has no number to attribute them
               to, so "unique viewers" above would read 0 and look broken. */
            <span className="mt-2 block">
              Opens are counted, but a viewer who is not signed in cannot be identified, so unique
              viewers only counts signed-in clients.
            </span>
          )}
        </p>
      )}

      <h2 className="mb-3 font-serif text-xl font-normal">Pieces opened</h2>
      {features.collectionProductViews ? (
        <AdminTable columns={['Piece', 'Times opened', 'By how many clients']}>
          {(productViews ?? []).map((p) => (
            <tr key={p.product_id} className="border-b border-ivory-300 last:border-0">
              <td className="px-5 py-4 font-serif text-lg text-charcoal-800">{p.product_name}</td>
              <td className="px-5 py-4 tabular-nums">{p.views}</td>
              <td className="px-5 py-4 tabular-nums">{p.unique_viewers}</td>
            </tr>
          ))}
          {(productViews ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="px-5 py-12 text-center font-light text-charcoal-400">
                No pieces opened from this link yet.
              </td>
            </tr>
          )}
        </AdminTable>
      ) : (
        // Marked "(optional)" in the scope, and it records a named client's
        // browsing — so it stays off until VK Jewellers asks for it and the
        // Privacy Policy describes it.
        <p className="border border-ivory-300 bg-ivory-50 px-5 py-4 text-sm leading-relaxed font-light text-charcoal-400">
          Recording which pieces a client opens is switched off. It is optional in the agreed
          scope, and it tracks a named client's browsing — so it needs a decision from VK
          Jewellers and a line in the Privacy Policy before it is turned on. Enable it with{' '}
          <code className="bg-ivory-200 px-1.5 py-0.5">VITE_FEATURE_COLLECTION_PRODUCT_VIEWS=true</code>.
        </p>
      )}

      <h2 className="mt-10 mb-3 font-serif text-xl font-normal">Every open</h2>
      <AdminTable columns={['When', 'Client', 'Mobile', 'Piece']}>
        {rows.map((v, i) => (
          <tr key={i} className="border-b border-ivory-300 last:border-0">
            <td className="px-4 py-3 whitespace-nowrap text-charcoal-400 tabular-nums">
              {WHEN.format(new Date(v.viewed_at))}
            </td>
            <td className="px-5 py-4">{v.viewer_name ?? '—'}</td>
            <td className="px-5 py-4 font-light text-charcoal-400 tabular-nums">
              {v.mobile ? formatMobile(v.mobile) : '—'}
            </td>
            <td className="px-5 py-4 font-light text-charcoal-400">{v.product_name ?? 'Opened the link'}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-5 py-14 text-center font-light text-charcoal-400">
              This link has not been opened yet.
            </td>
          </tr>
        )}
      </AdminTable>

      <p className="mt-4 text-sm leading-relaxed font-light text-charcoal-400">
        Showing the most recent 500 opens. Clients are identified by the mobile number on their
        account.
      </p>
    </>
  )
}
