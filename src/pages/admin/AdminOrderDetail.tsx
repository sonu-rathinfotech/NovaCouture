import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminButton, AdminError, AdminHeading, AdminTable, Status } from './AdminLayout'
import { ProformaInvoice } from '@/components/orders/ProformaInvoice'
import { useAsync } from '@/hooks/useAsync'
import { listAllProducts } from '@/data/admin'
import {
  cancelOrder,
  getCompanySettings,
  getOrder,
  issueOrder,
  missingCompanyDetails,
} from '@/data/orders'

/**
 * One order, from the admin's side: what was asked for, and the two things
 * that can be done about it.
 *
 * Most orders arrive already issued: the proforma is produced the moment the
 * client sends the order. One lands here still 'submitted' only when the
 * company name or GSTIN was blank at the time, so the Issue button is a
 * recovery path rather than the normal one.
 *
 * The check is enforced inside public.issue_order() (migrations 0012 and
 * 0014); it is repeated here so the reason appears before the click rather
 * than as a database error after it.
 */
export function AdminOrderDetail() {
  const { orderId = '' } = useParams()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  const { data: order } = useAsync(() => getOrder(orderId), [orderId, reload])
  const { data: settings } = useAsync(() => getCompanySettings(), [reload])
  // Lines carry no name until issue, so a submitted order has to be read
  // against the live catalogue. An issued one renders from its snapshot.
  const { data: products } = useAsync(() => listAllProducts(), [])

  const missing = missingCompanyDetails(settings ?? null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setReload((n) => n + 1)
      setCancelling(false)
    } catch (e) {
      setError((e as Error).message || 'That change was refused.')
    } finally {
      setBusy(false)
    }
  }

  if (!order) {
    return (
      <>
        <AdminHeading title="Order" />
        <p className="text-sm text-[var(--admin-fg-muted)]">Loading…</p>
      </>
    )
  }

  const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <>
      <AdminHeading
        title={order.order_number}
        note={`${order.items.length} ${order.items.length === 1 ? 'line' : 'lines'}, ${pieces} ${
          pieces === 1 ? 'piece' : 'pieces'
        }.`}
        actions={
          <>
            <Link to="/admin/orders" className="admin-label underline underline-offset-4">
              All orders
            </Link>
            {order.status === 'submitted' && (
              <>
                <AdminButton
                  tone="primary"
                  disabled={busy || missing.length > 0}
                  onClick={() => run(() => issueOrder(order.id))}
                >
                  {busy ? 'Issuing…' : 'Issue proforma invoice'}
                </AdminButton>
                <AdminButton tone="danger" disabled={busy} onClick={() => setCancelling(true)}>
                  Cancel order
                </AdminButton>
              </>
            )}
            {order.status === 'issued' && (
              <AdminButton onClick={() => window.print()}>Print / Save as PDF</AdminButton>
            )}
          </>
        }
      />
      <AdminError error={error} />

      {order.status === 'submitted' && missing.length > 0 && (
        <div className="no-print mb-6 border border-[var(--admin-border-strong)] bg-[var(--admin-bg-muted)] p-5">
          <p className="admin-label mb-2">Cannot issue yet</p>
          <p className="text-sm leading-relaxed text-[var(--admin-fg-muted)]">
            A proforma has to carry the company name and GSTIN to be of any use, so issuing is
            blocked until these are filled in: <strong>{missing.join(', ')}</strong>.{' '}
            <Link to="/admin/settings" className="underline underline-offset-4">
              Company details
            </Link>
          </p>
        </div>
      )}

      {cancelling && (
        <div className="no-print mb-6 border border-[var(--admin-border-strong)] p-5">
          <label className="mb-3 block">
            <span className="admin-label mb-2 block">Why is it being cancelled?</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Out of stock — client informed by phone"
              className="admin-input"
            />
            {/* The client sees this on their own order page, so it is written
                to them, not filed for us. */}
            <span className="mt-2 block text-sm text-[var(--admin-fg-muted)]">
              The client sees this on their order.
            </span>
          </label>
          <div className="flex gap-2">
            <AdminButton
              tone="danger"
              disabled={busy}
              onClick={() => run(() => cancelOrder(order.id, reason))}
            >
              Confirm cancellation
            </AdminButton>
            <AdminButton disabled={busy} onClick={() => setCancelling(false)}>
              Keep it
            </AdminButton>
          </div>
        </div>
      )}

      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        {order.status === 'submitted' && <Status tone="active">To action</Status>}
        {order.status === 'issued' && <Status>Issued</Status>}
        {order.status === 'cancelled' && <Status tone="muted">Cancelled</Status>}
        <span className="text-sm text-[var(--admin-fg-muted)]">
          Placed {new Date(order.created_at).toLocaleString('en-IN')}
        </span>
      </div>

      {order.status === 'issued' ? (
        <>
          {/* The client's note is correspondence, not part of the document, so
              it was taken off the sheet. It still has to reach you, so it sits
              beside the invoice and does not print. */}
          {order.notes && (
            <div className="no-print mb-6 border border-[var(--admin-border)] p-5">
              <p className="admin-label mb-2">Client's notes</p>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--admin-fg)]">
                {order.notes}
              </p>
            </div>
          )}
          <ProformaInvoice order={order} />
        </>
      ) : (
        <>
          <AdminTable columns={['#', 'Piece', 'Quantity']}>
            {order.items.map((item, i) => (
              <tr key={item.id}>
                <td className="admin-num text-sm">{i + 1}</td>
                <td className="admin-title text-lg">
                  {(products ?? []).find((p) => p.id === item.product_id)?.name ??
                    item.product_name ??
                    'Piece no longer listed'}
                </td>
                <td className="admin-num text-sm">{item.quantity}</td>
              </tr>
            ))}
          </AdminTable>

          {order.notes && (
            <div className="mt-6 border border-[var(--admin-border)] p-5">
              <p className="admin-label mb-2">Client's notes</p>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--admin-fg)]">
                {order.notes}
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
