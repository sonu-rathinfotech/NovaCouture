import { useContext } from 'react'
import { SessionContext, type SessionState } from '@/context/SessionProvider'

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
