import type { OrderWithItems } from '@/types/db'
import { formatWeight } from '@/lib/weight'

/**
 * The printed document, laid out as a GST proforma invoice.
 *
 * Rendered for the client and for the admin from this one component, so there
 * is a single layout to keep correct.
 *
 * -- It reads snapshots, never live data ------------------------------------
 * Every value comes from `buyer_snapshot`, `seller_snapshot`, and the line's
 * own `product_name`, `hsn_code` and `weight_grams` -- copies taken when the
 * invoice was issued (migrations 0012, 0014, 0015). Joining to the live tables
 * would mean that correcting a GSTIN, renaming a piece or re-weighing it
 * silently rewrote documents clients are already holding.
 *
 * The document was briefly renamed "Quotation" and then renamed back, on the
 * client's decision. Nothing in the data moved either time, because the label
 * is a string on this page and the stored field is `invoice_declaration`.
 *
 * -- Weight is a main column, not a detail ----------------------------------
 * This is a gold catalogue. Weight is what a retailer reads first, and the
 * first printed copy went out without it. A piece with no recorded weight
 * prints a blank cell rather than a zero, the same rule the product page
 * follows -- and the total adds up only what is actually known, with a note
 * when some of it is not.
 *
 * -- What is deliberately NOT on the sheet ----------------------------------
 * The client's covering note, the line count and a signatory caption were all
 * removed after the first printed copy was reviewed. The note in particular is
 * correspondence, not part of the document -- it is still shown to the admin
 * beside the invoice, it simply does not print.
 *
 * -- No money, anywhere -----------------------------------------------------
 * No rate, no taxable value, no CGST/SGST/IGST, no amount. The catalogue has
 * never carried prices, so every one of those figures would have to be
 * invented, and an invented tax figure under a printed GSTIN is worse than no
 * document. The declaration says so in plain words.
 */

function Line({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <p className="text-[0.8125rem] leading-relaxed">
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

const TH =
  'pb-2 text-[0.6rem] font-semibold tracking-[0.14em] text-[var(--invoice-ink)] uppercase'

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

  /*
   * Line weight is per piece, so the line total is weight x quantity. Pieces
   * with no recorded weight are counted separately rather than treated as
   * zero, because a total that quietly omits three unweighed pieces reads as
   * complete when it is not.
   */
  const weighed = order.items.filter((i) => i.weight_grams !== null)
  const unweighed = order.items.length - weighed.length
  const totalWeight = weighed.reduce((sum, i) => sum + Number(i.weight_grams) * i.quantity, 0)

  const sellerState = stateWithCode(seller.state, seller.state_code)
  const buyerState = stateWithCode(buyer.billing_state, buyer.billing_state_code)
  const placeOfSupply = stateWithCode(buyer.place_of_supply, buyer.place_of_supply_code)

  return (
    <article className="invoice-sheet mx-auto max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-8 lg:p-10">
      {/* Title band. A document headed with a GSTIN is read as a tax invoice
          unless it plainly says otherwise, so the disclaimer sits in the
          title, not in the small print. */}
      <div className="mb-5 border-b-2 border-[var(--invoice-accent)] pb-3 text-center">
        <h1 className="font-display text-[1.6rem] tracking-[0.1em] text-[var(--invoice-accent)] uppercase">
          Proforma Invoice
        </h1>
        <p className="mt-0.5 text-[0.65rem] tracking-[0.18em] text-[var(--color-fg-muted)] uppercase">
          Not a tax invoice
        </p>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--color-border)] pb-4">
        <div>
          <h2 className="font-display text-lg tracking-tight text-[var(--invoice-ink)]">
            {seller.legal_name}
          </h2>
          {seller.address && (
            <p className="mt-1 max-w-[38ch] text-[0.8125rem] leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
              {seller.address}
            </p>
          )}
          <div className="mt-1.5">
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

      <section className="invoice-keep-together border-b border-[var(--color-border)] py-4">
        <p className="mb-1.5 text-[0.6rem] font-semibold tracking-[0.18em] text-[var(--invoice-accent)] uppercase">
          Billed to
        </p>
        <p className="font-display text-base text-[var(--invoice-ink)]">
          {buyer.company || buyer.name}
        </p>
        {buyer.company && buyer.name && (
          <p className="text-[0.8125rem] text-[var(--color-fg-muted)]">{buyer.name}</p>
        )}
        {buyer.billing_address && (
          <p className="mt-1 max-w-[38ch] text-[0.8125rem] leading-relaxed whitespace-pre-line text-[var(--color-fg-muted)]">
            {buyer.billing_address}
          </p>
        )}
        <div className="mt-1.5">
          <Line label="GSTIN" value={buyer.gst_number} />
          <Line label="State" value={buyerState} />
          <Line label="Phone" value={buyer.mobile} />
          <Line label="Email" value={buyer.email} />
        </div>
      </section>

      <section className="py-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left">
            <thead>
              <tr className="border-b-2 border-[var(--invoice-accent)] bg-[var(--invoice-band)]">
                <th className={`${TH} pl-2`}>Sr</th>
                <th className={TH}>Description of goods</th>
                <th className={TH}>HSN</th>
                <th className={`${TH} text-right`}>Weight</th>
                <th className={`${TH} pr-2 text-right`}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={item.id} className="border-b border-[var(--color-border)]/60">
                  <td className="py-2 pl-2 align-top text-[0.8125rem] text-[var(--color-fg-muted)]">
                    {i + 1}
                  </td>
                  <td className="py-2 align-top text-[0.9375rem] text-[var(--invoice-ink)]">
                    {/* Copied at issue. A piece deleted since still prints. */}
                    {item.product_name ?? 'Piece no longer listed'}
                  </td>
                  <td className="py-2 align-top text-[0.8125rem] tabular-nums text-[var(--color-fg-muted)]">
                    {item.hsn_code ?? ''}
                  </td>
                  <td className="py-2 text-right align-top text-[0.8125rem] tabular-nums text-[var(--invoice-ink)]">
                    {/* Blank, never zero, when the piece has not been weighed. */}
                    {formatWeight(item.weight_grams) ?? ''}
                  </td>
                  <td className="py-2 pr-2 text-right align-top text-[0.9375rem] tabular-nums text-[var(--invoice-ink)]">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--invoice-accent)]">
                <td />
                <td />
                <td className="pt-2 text-right text-[0.6rem] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase">
                  Total
                </td>
                <td className="pt-2 text-right font-display text-base tabular-nums text-[var(--invoice-ink)]">
                  {totalWeight > 0 ? formatWeight(totalWeight) : ''}
                </td>
                <td className="pt-2 pr-2 text-right font-display text-base tabular-nums text-[var(--invoice-ink)]">
                  {totalPieces}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Said rather than left to be noticed. A total that silently omits
            unweighed pieces reads as complete when it is not. */}
        {unweighed > 0 && (
          <p className="mt-2 text-[0.75rem] text-[var(--color-fg-muted)]">
            {unweighed} {unweighed === 1 ? 'piece has' : 'pieces have'} no recorded weight and{' '}
            {unweighed === 1 ? 'is' : 'are'} not included in the total.
          </p>
        )}
      </section>

      {seller.bank_account_number && (
        <section className="invoice-keep-together border-t border-[var(--color-border)] py-3">
          <p className="mb-1 text-[0.6rem] font-semibold tracking-[0.18em] text-[var(--invoice-accent)] uppercase">
            Bank details
          </p>
          <Line label="Bank" value={seller.bank_name} />
          <Line label="Account name" value={seller.bank_account_name} />
          <Line label="Account number" value={seller.bank_account_number} />
          <Line label="IFSC" value={seller.bank_ifsc} />
          <Line label="Branch" value={seller.bank_branch} />
        </section>
      )}

      <section className="invoice-keep-together border-t border-[var(--color-border)] py-3">
        <p className="mb-1 text-[0.6rem] font-semibold tracking-[0.18em] text-[var(--invoice-accent)] uppercase">
          Declaration
        </p>
        <p className="max-w-[76ch] text-[0.75rem] leading-relaxed text-[var(--color-fg-muted)]">
          {seller.invoice_declaration ??
            'This is a proforma invoice issued to confirm items and quantities only. It is not a tax invoice and not a demand for payment. No prices, taxes or amounts are stated or implied.'}
        </p>
      </section>

      <footer className="invoice-keep-together flex flex-wrap items-end justify-between gap-6 border-t border-[var(--color-border)] pt-3">
        <p className="text-[0.75rem] text-[var(--color-fg-muted)]">
          Issued {formatDate(order.issued_at)}
        </p>
        <div className="text-right">
          <p className="text-[0.8125rem] text-[var(--invoice-ink)]">For {seller.legal_name}</p>
          {/* Room for a real signature. The line is left unlabelled: the
              company name above it already says whose signature it is. */}
          <div className="mt-10 w-56 border-t border-[var(--invoice-accent)]" />
        </div>
      </footer>
    </article>
  )
}
