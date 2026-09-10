import { Link } from 'react-router-dom'
import { Badge, EmptyState } from '@/components/ui'
import { LoadError } from '@/components/LoadError'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { listMyOrders, ordersAvailable } from '@/data/orders'
import type { OrderStatus } from '@/types/db'

/** Plain words. "Submitted" is what the database calls it, not what a client
 *  wants to read about their own order. */
const STATUS: Record<OrderStatus, { label: string; variant: 'default' | 'success' | 'danger' }> = {
  submitted: { label: 'With us', variant: 'default' },
  issued: { label: 'Confirmed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
}

export function MyOrders() {
  usePageTitle('Your orders')
  const { tier } = useSession()

  const { data: orders, loading, error } = useAsync(
    () => (ordersAvailable && tier !== 'guest' ? listMyOrders() : Promise.resolve([])),
    [tier],
  )

  if (tier === 'guest') {
    return (
      <section className="container py-16 lg:py-24">
        <EmptyState
          title="Sign in to see your orders"
          message="Orders are kept against your account."
          action={{ label: 'Sign in', href: '/sign-in', variant: 'primary' }}
        />
      </section>
    )
  }

  const rows = orders ?? []

  return (
    <section className="container py-12 lg:py-16">
      <header className="mb-10">
        <p className="eyebrow text-[var(--color-accent)]">Your account</p>
        <h1 className="mt-3 font-display text-[length:var(--text-h1)] tracking-tight text-[var(--color-fg)]">
          Orders
        </h1>
      </header>

      {error ? (
        <LoadError what="your orders" />
      ) : loading ? (
        <p className="text-[var(--color-fg-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Choose pieces from the catalogue and send them to us. Each order gets a proforma invoice you can print."
          action={{ label: 'Browse the collections', href: '/collections', variant: 'primary' }}
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {rows.map((order) => {
            const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0)
            const status = STATUS[order.status]
            return (
              <li key={order.id}>
                <Link
                  to={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 transition-colors hover:text-[var(--color-accent)]"
                >
                  <div>
                    <p className="font-display text-lg text-[var(--color-fg)]">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      · {order.items.length} {order.items.length === 1 ? 'line' : 'lines'} ·{' '}
                      {pieces} {pieces === 1 ? 'piece' : 'pieces'}
                    </p>
                  </div>
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
