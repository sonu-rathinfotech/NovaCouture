import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import type { DraftLine } from '@/types/db'

/**
 * The basket a client assembles before sending an order.
 *
 * ── Why this is not in the database ─────────────────────────────────────────
 * A draft is not a commitment. Keeping it here means an abandoned basket is
 * not a row somebody has to clean up, there is no draft state for RLS to
 * police, and browsing the catalogue writes nothing. Rows appear on submit.
 *
 * The cost is that a basket does not follow a client between devices. For a
 * retailer assembling an order in one sitting that is the right trade; if it
 * ever needs to follow them, it becomes a table and this provider becomes its
 * cache.
 *
 * ── Cleared on sign-out ─────────────────────────────────────────────────────
 * A basket names pieces, and some of those are only shown to the account that
 * built it. Leaving it in localStorage past sign-out would let the next person
 * at that browser read a list of premium piece ids. The key is per account for
 * the same reason.
 */

export interface OrderDraftState {
  lines: DraftLine[]
  /** Total pieces, not lines — what the header badge counts. */
  count: number
  add: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  has: (productId: string) => boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export const OrderDraftContext = createContext<OrderDraftState | null>(null)

const KEY_PREFIX = 'nova:order-draft:'
const MAX_QUANTITY = 9999

function keyFor(accountId: string | null): string | null {
  return accountId ? `${KEY_PREFIX}${accountId}` : null
}

function read(key: string | null): DraftLine[] {
  if (!key || typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    // Anything in localStorage may have been edited by hand. A malformed line
    // would otherwise reach the order form and fail at the database.
    return parsed
      .filter(
        (l): l is DraftLine =>
          typeof l?.productId === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0,
      )
      .map((l) => ({ productId: l.productId, quantity: Math.min(l.quantity, MAX_QUANTITY) }))
  } catch {
    return []
  }
}

export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const { session, profile, isPreview } = useSession()
  // In preview mode there is no Supabase user, but there is a mock profile.
  const accountId = session?.user?.id ?? (isPreview ? (profile?.id ?? null) : null)
  const key = keyFor(accountId)

  const [lines, setLines] = useState<DraftLine[]>(() => read(key))

  // Re-read when the account changes, which also empties the basket on
  // sign-out — signing out is exactly when the previous list must disappear.
  useEffect(() => {
    setLines(read(key))
  }, [key])

  useEffect(() => {
    if (!key) return
    if (lines.length === 0) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(lines))
  }, [key, lines])

  const add = useCallback((productId: string, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === productId)
      if (!existing) return [...current, { productId, quantity }]
      // Adding a piece already in the basket raises its quantity rather than
      // creating a second line — the unique constraint in 0012 says the same.
      return current.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QUANTITY) }
          : l,
      )
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) =>
            l.productId === productId
              ? { ...l, quantity: Math.min(Math.floor(quantity), MAX_QUANTITY) }
              : l,
          ),
    )
  }, [])

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<OrderDraftState>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      has: (productId: string) => lines.some((l) => l.productId === productId),
    }),
    [lines, add, setQuantity, remove, clear],
  )

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>
}
