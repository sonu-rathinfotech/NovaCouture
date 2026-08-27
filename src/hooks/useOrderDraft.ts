import { useContext } from 'react'
import { OrderDraftContext, type OrderDraftState } from '@/context/OrderDraftProvider'

export function useOrderDraft(): OrderDraftState {
  const ctx = useContext(OrderDraftContext)
  if (!ctx) throw new Error('useOrderDraft must be used inside <OrderDraftProvider>')
  return ctx
}
