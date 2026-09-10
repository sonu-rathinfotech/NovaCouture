import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button, ButtonLink, EmptyState } from '@/components/ui'
import { Field, Textarea, Select, FormMessage } from '@/components/ui/Field'
import { GalleryImage } from '@/components/catalogue/GalleryImage'
import { artKindFor } from '@/components/catalogue/art'
import { useSession } from '@/hooks/useSession'
import { useOrderDraft } from '@/hooks/useOrderDraft'
import { useAsync } from '@/hooks/useAsync'
import { usePageTitle } from '@/hooks/usePageTitle'
import { catalogue } from '@/data/catalogue'
import { ordersAvailable, saveBillingDetails, submitOrder } from '@/data/orders'
import { GST_STATES, looksLikeGstin, stateFromGstin } from '@/lib/gstStates'

/**
 * The basket, and the one form that sends it.
 *
 * Billing address and GST are asked for here rather than at registration,
 * because they are only needed by an invoice and demanding them from every
 * visitor who wants to browse would cost sign-ups for a document most of them
 * will never request. Once saved they are reused, so this asks once.
 */
export function OrderDraftPage() {
  usePageTitle('Your order')
  const navigate = useNavigate()
  const { tier, profile, refresh } = useSession()
  const { lines, count, setQuantity, remove, clear } = useOrderDraft()

  const [address, setAddress] = useState(profile?.billing_address ?? '')
  const [gst, setGst] = useState(profile?.gst_number ?? '')
  const [stateCode, setStateCode] = useState(profile?.billing_state_code ?? '')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Only pieces this viewer may see are fetched, so a draft carrying a piece
  // they have since lost access to simply drops out of the list rather than
  // confirming it exists.
  const { data: products, loading } = useAsync(
    () =>
      lines.length
        ? catalogue.listProducts({ tier })
        : Promise.resolve([]),
    [lines.length, tier],
  )

  const rows = lines
    .map((line) => ({ line, product: (products ?? []).find((p) => p.id === line.productId) }))
    .filter((r) => r.product)

  const missing = lines.length - rows.length

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFailure(null)

    const next: Record<string, string> = {}
    if (!address.trim()) next.address = 'A billing address is needed on the invoice'
    if (!stateCode) next.state = 'Place of supply on the invoice comes from this'
    // A GSTIN carries its own state in the first two digits. If it disagrees
    // with the state chosen, one of the two is wrong, and it is far cheaper to
    // say so here than to find it on a document later.
    if (gst.trim() && !looksLikeGstin(gst)) {
      next.gst = 'That does not look like a 15-character GSTIN'
    } else if (gst.trim() && stateCode && gst.trim().slice(0, 2) !== stateCode) {
      const implied = stateFromGstin(gst)
      next.gst = implied
        ? `This GSTIN belongs to ${implied.name}, not the state selected`
        : 'This GSTIN does not match the state selected'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const chosen = GST_STATES.find((x) => x.code === stateCode)
      await saveBillingDetails({
        billingAddress: address,
        gstNumber: gst,
        state: chosen?.name ?? '',
        stateCode,
      })
      refresh()
      const order = await submitOrder(
        rows.map((r) => ({ productId: r.line.productId, quantity: r.line.quantity })),
        notes,
      )
      clear()
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      setFailure((err as Error).message || 'The order could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  if (tier === 'guest') {
    return (
      <section className="container py-16 lg:py-24">
        <EmptyState
          title="Sign in to place an order"
          message="Orders are placed by registered clients. Sign in and the pieces you choose will be kept here."
          action={{ label: 'Sign in', href: '/sign-in', variant: 'primary' }}
        />
      </section>
    )
  }

  if (!ordersAvailable) {
    return (
      <section className="container py-16 lg:py-24">
        <EmptyState
          title="Ordering needs the live catalogue"
          message="This preview runs on sample data. Ordering is available once the site is connected to its database."
          action={{ label: 'Browse the collections', href: '/collections', variant: 'primary' }}
        />
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="container py-16 lg:py-24">
        <EmptyState
          title="No pieces chosen yet"
          message="Open a piece and choose Add to order. You can set quantities here before sending."
          action={{ label: 'Browse the collections', href: '/collections', variant: 'primary' }}
        />
      </section>
    )
  }

  return (
    <section className="container py-12 lg:py-16">
      <header className="mb-10">
        <p className="eyebrow text-[var(--color-accent)]">Your order</p>
        <h1 className="mt-3 font-display text-[length:var(--text-h1)] tracking-tight text-[var(--color-fg)]">
          {count} {count === 1 ? 'piece' : 'pieces'}
        </h1>
        <p className="mt-4 max-w-[52ch] leading-relaxed text-[var(--color-fg-muted)]">
          Sending this creates your quotation straight away, listing the pieces, weights and
          quantities. It carries no prices and is not a demand for payment.
        </p>
      </header>

      {missing > 0 && (
        <FormMessage tone="error">
          {missing} {missing === 1 ? 'piece is' : 'pieces are'} no longer available to you and{' '}
          {missing === 1 ? 'has' : 'have'} been left off this order.
        </FormMessage>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {loading ? (
            <p className="text-[var(--color-fg-muted)]">Loading your pieces…</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {rows.map(({ line, product }) => (
                <li key={line.productId} className="flex gap-4 py-5">
                  <Link
                    to={`/p/${product!.slug}`}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-muted)]"
                  >
                    {product!.images[0] && (
                      <GalleryImage
                        image={product!.images[0]}
                        kind={artKindFor(product!.category?.slug)}
                        index={0}
                      />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        to={`/p/${product!.slug}`}
                        className="font-display text-lg text-[var(--color-fg)] hover:text-[var(--color-accent)]"
                      >
                        {product!.name}
                      </Link>
                      {product!.category && (
                        <p className="text-[0.7rem] tracking-[0.15em] text-[var(--color-fg-muted)] uppercase">
                          {product!.category.name}
                        </p>
                      )}
                      {!product!.is_available && (
                        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                          Currently unavailable — we will confirm whether it can be made.
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="cursor-pointer p-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                          aria-label={`One fewer ${product!.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <label className="sr-only" htmlFor={`qty-${line.productId}`}>
                          Quantity of {product!.name}
                        </label>
                        <input
                          id={`qty-${line.productId}`}
                          value={line.quantity}
                          inputMode="numeric"
                          onChange={(e) =>
                            setQuantity(line.productId, Number(e.target.value.replace(/\D/g, '')))
                          }
                          className="w-12 border-x border-[var(--color-border)] bg-transparent py-2 text-center tabular-nums text-[var(--color-fg)]"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          className="cursor-pointer p-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                          aria-label={`One more ${product!.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        className="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-danger)]"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <ButtonLink to="/collections" variant="ghost" size="md">
              Add more pieces
            </ButtonLink>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6">
            <h2 className="mb-1 font-display text-xl text-[var(--color-fg)]">Billing details</h2>
            <p className="mb-5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
              These print on the quotation. We keep them for your next order.
            </p>

            <Textarea
              label="Billing address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors.address}
              rows={4}
              required
              placeholder={'Shop name\nStreet\nCity, State, PIN'}
            />

            <Select
              label="State"
              required
              value={stateCode}
              error={errors.state}
              onChange={(e) => setStateCode(e.target.value)}
              help="This is the place of supply shown on the invoice."
              options={[
                { value: '', label: 'Select a state' },
                ...GST_STATES.map((st) => ({
                  value: st.code,
                  label: `${st.name} (${st.code})`,
                })),
              ]}
            />

            <Field
              label="GST number"
              value={gst}
              error={errors.gst}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                setGst(value)
                // Filling the state from the GSTIN saves a step and makes the
                // two agree by default.
                const implied = stateFromGstin(value)
                if (implied && !stateCode) setStateCode(implied.code)
              }}
              placeholder="27AAAAA0000A1Z5"
              help="Optional. Leave blank if you are not registered."
            />

            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything we should know — timing, sizes, occasion."
            />

            {failure && <FormMessage tone="error">{failure}</FormMessage>}

            <Button type="submit" variant="primary" size="lg" disabled={busy || rows.length === 0}>
              {busy ? 'Sending…' : 'Send order'}
            </Button>

            <p className="mt-4 text-sm leading-relaxed text-[var(--color-fg-muted)]">
              Sending does not commit you to a purchase. We will confirm availability and come back
              to you.
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
