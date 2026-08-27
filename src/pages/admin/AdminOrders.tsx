import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminError, AdminHeading, AdminTable, Status } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { listAllOrders } from '@/data/orders'
import type { OrderStatus } from '@/types/db'

const FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'submitted', label: 'To action' },
  { value: 'issued', label: 'Issued' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

/**
 * Opens on the orders that need something done, not on everything. An order
 * list whose default view is "all" buries the two that are waiting under a
 * year of issued ones.
 */
export function AdminOrders() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('submitted')
  const { data: orders, loading, error } = useAsync(() => listAllOrders(), [])

  const rows = useMemo(
    () => (orders ?? []).filter((o) => filter === 'all' || o.status === filter),
    [orders, filter],
  )

  const waiting = (orders ?? []).filter((o) => o.status === 'submitted').length

  return (
    <>
      <AdminHeading
        title="Orders"
        note={waiting > 0 ? `${waiting} waiting to be issued.` : 'Nothing waiting.'}
      />
      <AdminError error={error ? 'The orders could not be loaded.' : null} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={[
              'cursor-pointer border px-4 py-2 text-[0.65rem] tracking-[0.14em] uppercase transition-colors',
              filter === f.value
                ? 'border-[var(--admin-fg)] text-[var(--admin-fg)]'
                : 'border-[var(--admin-border)] text-[var(--admin-fg-muted)] hover:border-[var(--admin-border-strong)]',
            ].join(' ')}
          >
            {f.label}
            {f.value === 'submitted' && waiting > 0 ? ` (${waiting})` : ''}
          </button>
        ))}
      </div>

      <AdminTable columns={['Order', 'Client', 'Placed', 'Lines', 'Pieces', 'Status']}>
        {rows.map((order) => {
          const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0)
          return (
            <tr key={order.id}>
              <td>
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="admin-title text-lg underline decoration-[var(--admin-border-strong)] underline-offset-4 hover:decoration-[var(--admin-accent-line)]"
                >
                  {order.order_number}
                </Link>
              </td>
              <td className="text-sm">
                <span className="text-[var(--admin-fg)]">
                  {order.profile?.company || order.profile?.name || '—'}
                </span>
                {order.profile?.company && order.profile?.name && (
                  <span className="block text-[var(--admin-fg-muted)]">{order.profile.name}</span>
                )}
              </td>
              <td className="text-sm text-[var(--admin-fg-muted)]">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="admin-num text-sm">{order.items.length}</td>
              <td className="admin-num text-sm">{pieces}</td>
              <td>
                {order.status === 'submitted' && <Status tone="active">To action</Status>}
                {order.status === 'issued' && <Status>Issued</Status>}
                {order.status === 'cancelled' && <Status tone="muted">Cancelled</Status>}
              </td>
            </tr>
          )
        })}
        {!loading && rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-14 text-center text-sm text-[var(--admin-fg-muted)]">
              No orders here.
            </td>
          </tr>
        )}
      </AdminTable>
    </>
  )
}
