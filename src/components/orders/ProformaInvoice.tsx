import type { OrderWithItems } from '@/types/db'

/**
 * The printed document, laid out as a GST proforma invoice.
 *
 * Rendered for the client and for the admin from this one component, so there
 * is a single layout to keep correct.
 *
 * -- It reads snapshots, never live data ------------------------------------
 * Every value comes from `buyer_snapshot`, `seller_snapshot`, `product_name`
 * and `hsn_code` -- copies taken when the invoice was issued (migrations 0012
 * and 0014). Joining to the live tables would mean that correcting a GSTIN or
 * renaming a piece silently rewrote documents clients are already holding.
 * That is also why an unissued order cannot render one: there is nothing to
 * read, and inventing the missing halves is the failure this design prevents.
 *
 * -- No money, anywhere -----------------------------------------------------
 * No rate, no taxable value, no CGST/SGST/IGST, no total. The catalogue has
 * never carried prices, so every one of those figures would have to be
 * invented, and an invented tax figure under a printed GSTIN is worse than no
 * document. The identifying block is still worth printing: both GSTINs, both
 * states with their codes, the place of supply and an HSN per line are what
 * make this usable to the buyer's accounts department when the tax invoice
 * follows on supply. The declaration says all of that in plain words.
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

/** "Maharashtra (27)", or just the name, or nothing. */
function stateWithCode(name: string | null, code: string | null): string | null {
  if (!name && !code) return null
  if (!code) return name
  if (!name) return `State code ${code}`
  return `${name} (${code})`
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
  const sellerState = stateWithCode(seller.state, seller.state_code)
  const buyerState = stateWithCode(buyer.billing_state, buyer.billing_state_code)
  const placeOfSupply = stateWithCode(buyer.place_of_supply, buyer.place_of_supply_code)

  return (
    <article className="invoice-sheet mx-auto max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 lg:p-12">
      {/* Title first and unmissable. A document headed with a GSTIN is read as
          a tax invoice unless it plainly says otherwise. */}
      <div className="mb-6 border-b-2 border-[var(--color-fg)] pb-4 text-center">
        <h1 className="font-display text-2xl tracking-[0.08em] text-[var(--color-fg)] uppercase">
          Proforma Invoice
        </h1>
        <p className="mt-1 text-[0.7rem] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase">
          Not a tax invoice
        </p>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--color-border)] pb-6">
        <div>
          <h2 className="font-display text-xl tracking-tight text-[var(--color-fg)]">
            {seller.legal_name}
          </h2>
          {seller.address && (
            <p className="mt-2 max-w-[38ch] text-sm leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
              {seller.address}
            </p>
          )}
          <div className="mt-2">
            <Line label="GSTIN" value={seller.gst_number} />
            <Line label="PAN" value={seller.pan} />
            <Line label="State" value={sellerState} />
            <Line label="Phone" value={seller.phone} />
            <Line label="Email" value={seller.email} />
          </div>
        </div>

        <div className="text-right">
          <Line label="Invoice no" value={order.order_number} />
          <Line label="Date" value={formatDate(order.issued_at)} />
          <Line label="Place of supply" value={placeOfSupply} />
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
          <p className="mt-2 max-w-[38ch] text-sm leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
            {buyer.billing_address}
          </p>
        )}
        <div className="mt-2">
          <Line label="GSTIN" value={buyer.gst_number} />
          <Line label="State" value={buyerState} />
          <Line label="Phone" value={buyer.mobile} />
          <Line label="Email" value={buyer.email} />
        </div>
      </section>

      <section className="py-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="pb-3 text-[0.65rem] font-light tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
                  Sr
                </th>
                <th className="pb-3 text-[0.65rem] font-light tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
                  Description of goods
                </th>
                <th className="pb-3 text-[0.65rem] font-light tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
                  HSN
                </th>
                <th className="pb-3 text-right text-[0.65rem] font-light tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
                  Qty
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
                  <td className="py-3 align-top text-sm tabular-nums text-[var(--color-fg-muted)]">
                    {item.hsn_code ?? ''}
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
                <td className="pt-4 text-right text-[0.65rem] tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
                  Total
                </td>
                <td className="pt-4 text-right font-display text-lg tabular-nums text-[var(--color-fg)]">
                  {totalPieces}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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

      {/* The declaration carries the legal weight of the "no prices" decision.
          Without it, a reader who sees a GSTIN and a quantity column assumes
          the amounts were simply left off by mistake. */}
      <section className="invoice-keep-together border-t border-[var(--color-border)] py-6">
        <p className="mb-2 text-[0.65rem] font-light tracking-[0.22em] text-[var(--color-fg-muted)] uppercase">
          Declaration
        </p>
        <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--color-fg-muted)]">
          {seller.invoice_declaration ??
            'This is a proforma invoice issued to confirm items and quantities only. It is not a tax invoice and not a demand for payment. No prices, taxes or amounts are stated or implied.'}
        </p>
      </section>

      <footer className="invoice-keep-together flex flex-wrap items-end justify-between gap-6 border-t border-[var(--color-border)] pt-6">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Issued {formatDate(order.issued_at)}
        </p>
        <div className="text-right">
          <p className="text-sm text-[var(--color-fg-muted)]">For {seller.legal_name}</p>
          {/* Space for a real signature on the printed sheet. */}
          <div className="mt-10 border-t border-[var(--color-border)] pt-2">
            <p className="text-[0.65rem] tracking-[0.16em] text-[var(--color-fg-muted)] uppercase">
              Authorised signatory
            </p>
          </div>
        </div>
      </footer>
    </article>
  )
}
