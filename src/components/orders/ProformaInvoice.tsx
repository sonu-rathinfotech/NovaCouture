import type { OrderWithItems } from '@/types/db'

/**
 * The printed document. Rendered for a client and for the admin from the same
 * component, so there is one layout to keep correct.
 *
 * ── It reads snapshots, never live data ─────────────────────────────────────
 * Every value here comes from `buyer_snapshot`, `seller_snapshot` and
 * `product_name` — copies taken when the invoice was issued (migration 0012).
 * Joining to the live tables would mean that correcting a GST number or
 * renaming a piece silently rewrote documents clients are already holding.
 * That is also why an unissued order cannot render one: there is nothing to
 * read, and inventing the missing halves is the failure this design exists to
 * prevent.
 *
 * ── No money, anywhere ──────────────────────────────────────────────────────
 * No rate, no amount, no total, no tax. The catalogue has never carried
 * prices, and a proforma with an empty Amount column invites someone to read
 * it as free. The document states what was ordered and how many.
 */

function Line({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <p className="text-sm leading-relaxed">
      <span className="text-[var(--color-fg-muted)]">{label}: </span>
      <span className="text-[var(--color-fg)]">{value}</span>
    </p>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ProformaInvoice({ order }: { order: OrderWithItems }) {
  const seller = order.seller_snapshot
  const buyer = order.buyer_snapshot

  if (!seller || !buyer) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
        <p className="text-[var(--color-fg-muted)]">
          This order has not been issued yet, so there is no invoice to show. The pieces and
          quantities are listed above.
        </p>
      </div>
    )
  }

  const totalPieces = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <article className="invoice-sheet mx-auto max-w-3xl bg-[var(--color-bg-elevated)] p-8 lg:p-12">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-[var(--color-fg)]">
            {seller.legal_name}
          </h1>
          {seller.address && (
            <p className="mt-2 max-w-[36ch] text-sm leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
              {seller.address}
            </p>
          )}
          <div className="mt-2">
            <Line label="Phone" value={seller.phone} />
            <Line label="Email" value={seller.email} />
            <Line label="GSTIN" value={seller.gst_number} />
          </div>
        </div>

        <div className="text-right">
          <p className="text-[0.65rem] font-light tracking-[0.22em] text-[var(--color-fg-muted)] uppercase">
            Proforma Invoice
          </p>
          <p className="mt-2 font-display text-xl text-[var(--color-fg)]">{order.order_number}</p>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {formatDate(order.issued_at)}
          </p>
        </div>
      </header>

      <section className="invoice-keep-together border-b border-[var(--color-border)] py-6">
        <p className="mb-3 text-[0.65rem] font-light tracking-[0.22em] text-[var(--color-fg-muted)] uppercase">
          Billed to
        </p>
        <p className="font-display text-lg text-[var(--color-fg)]">
          {buyer.company || buyer.name}
        </p>
        {buyer.company && buyer.name && (
          <p className="text-sm text-[var(--color-fg-muted)]">{buyer.name}</p>
        )}
        {buyer.billing_address && (
          <p className="mt-2 max-w-[36ch] text-sm leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
            {buyer.billing_address}
          </p>
        )}
        <div className="mt-2">
          <Line label="Phone" value={buyer.mobile} />
          <Line label="Email" value={buyer.email} />
          <Line label="GSTIN" value={buyer.gst_number} />
        </div>
      </section>

      <section className="py-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="pb-3 text-[0.65rem] font-light tracking-[0.18em] text-[var(--color-fg-muted)] uppercase">
                #
              </th>
              <th className="pb-3 text-[0.65rem] font-light tracking-[0.18em] text-[var(--color-fg-muted)] uppercase">
                Piece
              </th>
              <th className="pb-3 text-right text-[0.65rem] font-light tracking-[0.18em] text-[var(--color-fg-muted)] uppercase">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]/60">
                <td className="py-3 align-top text-sm text-[var(--color-fg-muted)]">{i + 1}</td>
                <td className="py-3 align-top text-[var(--color-fg)]">
                  {/* Copied at issue. A piece deleted since still prints. */}
                  {item.product_name ?? 'Piece no longer listed'}
                </td>
                <td className="py-3 text-right align-top tabular-nums text-[var(--color-fg)]">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td className="pt-4 text-sm text-[var(--color-fg-muted)]">
                {order.items.length} {order.items.length === 1 ? 'line' : 'lines'}
              </td>
              <td className="pt-4 text-right font-display text-lg tabular-nums text-[var(--color-fg)]">
                {totalPieces}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Said plainly, because a document headed "invoice" that shows no
            money will otherwise be read as one that is settled or free. */}
        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
          This proforma lists pieces and quantities only. It is not a demand for payment, and no
          prices are stated or implied.
        </p>
      </section>

      {order.notes && (
        <section className="invoice-keep-together border-t border-[var(--color-border)] py-6">
          <p className="mb-2 text-[0.65rem] font-light tracking-[0.22em] text-[var(--color-fg-muted)] uppercase">
            Notes
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--color-fg)]">
            {order.notes}
          </p>
        </section>
      )}

      {seller.bank_account_number && (
        <section className="invoice-keep-together border-t border-[var(--color-border)] py-6">
          <p className="mb-3 text-[0.65rem] font-light tracking-[0.22em] text-[var(--color-fg-muted)] uppercase">
            Bank details
          </p>
          <Line label="Bank" value={seller.bank_name} />
          <Line label="Account name" value={seller.bank_account_name} />
          <Line label="Account number" value={seller.bank_account_number} />
          <Line label="IFSC" value={seller.bank_ifsc} />
          <Line label="Branch" value={seller.bank_branch} />
        </section>
      )}

      <footer className="border-t border-[var(--color-border)] pt-6">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Issued {formatDate(order.issued_at)} · {seller.legal_name}
        </p>
      </footer>
    </article>
  )
}
