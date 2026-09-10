import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import type {
  CompanySettings,
  DraftLine,
  Order,
  OrderWithItems,
  Profile,
} from '@/types/db'

/**
 * Order requests and proforma invoices (migration 0012).
 *
 * ── Why there is no fixture repository here ─────────────────────────────────
 * Every other data module has one, because the catalogue had to be reviewable
 * before Supabase existed. Orders arrived after it was connected, and unlike a
 * product listing they are not a read of seeded data: an order belongs to a
 * real account, and issuing one takes a snapshot the database assembles inside
 * public.issue_order(). A localStorage imitation would be a second, weaker
 * implementation of the one part of this feature that must not drift — so the
 * screens refuse politely instead. `ordersAvailable` is what they check.
 *
 * ── Nothing here is a security boundary ─────────────────────────────────────
 * As everywhere else, these calls run with the client's own session and the
 * anon key. A client cannot read another's order, cannot put a piece they are
 * not entitled to on their own, and cannot issue anything — not because this
 * file is careful, but because the policies in 0012 refuse. Verified against
 * the live database.
 */

export const ordersAvailable = isConfigured

const ORDER_SELECT = `
  id, profile_id, order_number, status, notes,
  buyer_snapshot, seller_snapshot, issued_at, cancel_reason,
  created_at, updated_at,
  items:order_items (id, order_id, product_id, product_name, hsn_code, quantity, sort_order)
`

/** Newest first — a client checking back is looking for what they just sent. */
export async function listMyOrders(): Promise<OrderWithItems[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return sortItems((data ?? []) as unknown as OrderWithItems[])
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return sortItems([data as unknown as OrderWithItems])[0]
}

/** PostgREST does not order an embedded list, so the lines are sorted here. */
function sortItems(orders: OrderWithItems[]): OrderWithItems[] {
  for (const order of orders) {
    order.items = [...(order.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  }
  return orders
}

/**
 * Creates the order, its lines, then its proforma.
 *
 * Two round trips rather than one, because the line policy checks entitlement
 * against the order row — which has to exist first. If the lines fail, the
 * order is removed again so a client is never left with an empty request they
 * cannot edit or delete.
 */
export async function submitOrder(lines: DraftLine[], notes: string): Promise<Order> {
  if (lines.length === 0) throw new Error('Add at least one piece before sending.')

  const supabase = getSupabase()
  const { data: user } = await supabase.auth.getUser()
  const profileId = user.user?.id
  if (!profileId) throw new Error('Sign in to send an order.')

  const { data, error } = await supabase
    .from('orders')
    .insert({ profile_id: profileId, notes: notes.trim() || null })
    .select('*')
    .single()
  if (error) throw error
  const order = data as Order

  const { error: itemsError } = await supabase.from('order_items').insert(
    lines.map((line, i) => ({
      order_id: order.id,
      product_id: line.productId,
      quantity: line.quantity,
      sort_order: i,
    })),
  )

  if (itemsError) {
    // No delete policy exists for clients, by design — an order is cancelled,
    // not erased. That leaves this cleanup to the admin, so the order is
    // marked rather than silently abandoned.
    await supabase
      .from('orders')
      .update({ notes: `[incomplete — lines failed] ${notes}`.trim() })
      .eq('id', order.id)
    throw itemsError
  }

  /*
   * The proforma is produced as soon as the order exists, so the client leaves
   * with a document rather than a promise of one.
   *
   * Best effort on purpose. If the company legal name or GSTIN is still blank,
   * issue_order() refuses and the order simply stays 'submitted' for the admin
   * to issue later. Failing the whole submission there would throw away an
   * order the client has already placed, over a setting they have no part in
   * and cannot fix.
   */
  try {
    await issueOrder(order.id)
  } catch {
    // Left submitted. The admin sees it under "To action".
  }

  return order
}

/**
 * The billing details an invoice needs, which registration never asked for.
 * Collected the first time a client orders and reused afterwards.
 */
export async function saveBillingDetails(input: {
  billingAddress: string
  gstNumber: string
  /** Place of supply on the invoice is this state. */
  state: string
  stateCode: string
}): Promise<Profile | null> {
  const supabase = getSupabase()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user?.id) throw new Error('Sign in first.')

  const { data, error } = await supabase
    .from('profiles')
    .update({
      billing_address: input.billingAddress.trim() || null,
      gst_number: input.gstNumber.trim().toUpperCase() || null,
      billing_state: input.state.trim() || null,
      billing_state_code: input.stateCode.trim() || null,
    })
    .eq('id', user.user.id)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

// -----------------------------------------------------------------------------
// Admin
// -----------------------------------------------------------------------------

export async function listAllOrders(): Promise<OrderWithItems[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(`${ORDER_SELECT}, profile:profiles (name, company, mobile)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return sortItems((data ?? []) as unknown as OrderWithItems[])
}

/**
 * Issues the proforma invoice.
 *
 * One RPC, not three updates from here, because the snapshots and the status
 * change have to land together — an order marked issued with no seller details
 * is exactly the document this feature must never produce. The function also
 * refuses while the company's GST or bank details are blank.
 */
export async function issueOrder(orderId: string): Promise<void> {
  const { error } = await getSupabase().rpc('issue_order', { p_order_id: orderId })
  if (error) {
    if (error.message.includes('company_details_incomplete')) {
      throw new Error(
        'Fill in the company legal name and GST number before issuing an invoice.',
      )
    }
    if (error.message.includes('order_not_submitted')) {
      throw new Error('That order has already been issued or cancelled.')
    }
    throw error
  }
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await getSupabase()
    .from('orders')
    .update({ status: 'cancelled', cancel_reason: reason.trim() || null })
    .eq('id', orderId)
  if (error) throw error
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await getSupabase()
    .from('company_settings')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return (data as CompanySettings) ?? null
}

export async function updateCompanySettings(
  input: Partial<Omit<CompanySettings, 'updated_at'>>,
): Promise<void> {
  // Empty strings become null: a blank field means "not supplied", and an
  // invoice has to be able to tell that from a value someone typed.
  const cleaned = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, typeof v === 'string' && !v.trim() ? null : v]),
  )
  const { error } = await getSupabase()
    .from('company_settings')
    .update({ ...cleaned, updated_at: new Date().toISOString() })
    .eq('singleton', true)
  if (error) throw error
}

/**
 * What issue_order() insists on before it will produce a document.
 *
 * Bank details were on this list, on the grounds that an invoice a retailer
 * may pay against must not carry a blank account number. The document states
 * no amounts at all, so there is nothing to pay against, and the requirement
 * was blocking every order over details nobody had been asked for. They print
 * when present and are omitted when not. Mirrors migration 0014 -- change both
 * together or the button and the database will disagree.
 */
export function missingCompanyDetails(settings: CompanySettings | null): string[] {
  if (!settings) return ['Company details have not been set up.']
  const required: [keyof CompanySettings, string][] = [
    ['legal_name', 'Registered business name'],
    ['gst_number', 'GST number'],
  ]
  return required.filter(([key]) => !settings[key]).map(([, label]) => label)
}
