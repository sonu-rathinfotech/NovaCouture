import { Link, useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { LoadError } from '@/components/LoadError'
import { NotFound } from './NotFound'
import { ProformaInvoice } from '@/components/orders/ProformaInvoice'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { getOrder, ordersAvailable } from '@/data/orders'

/**
 * One order, from the client's side.
 *
 * Before it is issued this shows what they asked for. After, it shows the
 * proforma invoice — the same component the admin sees, reading the same
 * snapshots, so the two can never disagree about what was issued.
 */
export function OrderDetail() {
  const { orderId = '' } = useParams()
  const { tier } = useSession()

  const { data: order, loading, error } = useAsync(
    () => (ordersAvailable ? getOrder(orderId) : Promise.resolve(null)),
    [orderId],
  )

  // `product_name` is copied onto a line only at issue, so a submitted order
  // has none and has to read the live catalogue for its names. An issued one
  // must NOT — its snapshot is the record, and joining live would let a later
  // rename rewrite a document the client is already holding.
  const { data: products } = useAsync(
    () =>
      ordersAvailable && order && order.status !== 'issued'
        ? catalogue.listProducts({ tier })
        : Promise.resolve([]),
    [order?.id, order?.status, tier],
  )

  usePageTitle(order ? `Order ${order.order_number}` : 'Order')

  if (error) return <LoadError what="this order" />
  if (loading) {
    return (
      <section className="container py-16">
        <p className="text-[var(--color-fg-muted)]">Loading…</p>
      </section>
    )
  }
  // RLS returns nothing for another client's order, so "not yours" and "does
  // not exist" are the same page — as with a gated product.
  if (!order) return <NotFound />

  const issued = order.status === 'issued'
  const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <section className="container py-12 lg:py-16">
      <div className="no-print mb-10">
        <Link
          to="/orders"
          className="text-sm tracking-[0.1em] text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          ← All orders
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[length:var(--text-h1)] tracking-tight text-[var(--color-fg)]">
              {order.order_number}
            </h1>
            <p className="mt-2 text-[var(--color-fg-muted)]">
              {order.items.length} {order.items.length === 1 ? 'line' : 'lines'} · {pieces}{' '}
              {pieces === 1 ? 'piece' : 'pieces'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {order.status === 'submitted' && <Badge size="sm">With us</Badge>}
            {order.status === 'cancelled' && (
              <Badge variant="danger" size="sm">
                Cancelled
              </Badge>
            )}
            {issued && (
              <Button variant="secondary" size="md" onClick={() => window.print()}>
                <Printer size={16} className="mr-2" />
                Print / Save as PDF
              </Button>
            )}
          </div>
        </div>

        {order.status === 'submitted' && (
          <p className="mt-6 max-w-[56ch] leading-relaxed text-[var(--color-fg-muted)]">
            We have your order. Your proforma invoice is being prepared and will appear here
            shortly. Nothing is committed until we come back to you.
          </p>
        )}

        {order.status === 'cancelled' && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-5">
            <p className="leading-relaxed text-[var(--color-fg-muted)]">
              This order was cancelled.
              {order.cancel_reason ? ` ${order.cancel_reason}` : ' Please contact us if that is unexpected.'}
            </p>
          </div>
        )}
      </div>

      {issued ? (
        <ProformaInvoice order={order} />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {order.items.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-[var(--color-fg-muted)]">{i + 1}</span>
              <span className="flex-1 text-[var(--color-fg)]">
                {/* Live name before issue; the snapshot only exists after. A
                    piece withdrawn from the client's tier since they ordered
                    is named neutrally rather than confirmed to still exist. */}
                {(products ?? []).find((p) => p.id === item.product_id)?.name ??
                  item.product_name ??
                  'Piece no longer listed'}
              </span>
              <span className="tabular-nums text-[var(--color-fg)]">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}

      {order.notes && !issued && (
        <div className="mt-8">
          <p className="eyebrow mb-2 text-[var(--color-accent)]">Your notes</p>
          <p className="leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
            {order.notes}
          </p>
        </div>
      )}
    </section>
  )
}
