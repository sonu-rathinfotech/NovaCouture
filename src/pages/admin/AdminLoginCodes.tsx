import { useState } from 'react'
import { AdminError, AdminButton, AdminHeading, AdminTable, Status } from './AdminLayout'
import { useAsync } from '@/hooks/useAsync'
import { getSupabase } from '@/lib/supabase'

/**
 * The WhatsApp login codes, for relaying by hand.
 *
 * -- Why this screen exists at all ------------------------------------------
 * Login is a WhatsApp number and a one-time code (scope B). The code is
 * generated and checked for real by the database (migration 0013); the only
 * part that does not work yet is DELIVERY, because the Business API has not
 * been procured. So the code is written to a column an administrator can read,
 * and this screen is where they read it to pass on by phone.
 *
 * -- It disappears on its own -----------------------------------------------
 * The readable copy is written only while company_settings.whatsapp_api_
 * configured is false, and is cleared the moment a code is used. Once WhatsApp
 * delivery is switched on, this table fills with rows whose code column is
 * blank, which is exactly right: nobody, including the administrator, should
 * be able to read a live code once it can be delivered properly.
 *
 * -- Nothing here weakens the login -----------------------------------------
 * Reading a code is not the same as bypassing one. Expiry, single use, the
 * five-attempt limit and the per-number rate limits all still apply, and the
 * only select policy on login_codes requires is_admin().
 */

interface LoginCode {
  id: string
  mobile: string
  purpose: 'sign_in' | 'register'
  debug_code: string | null
  expires_at: string
  attempts: number
  consumed_at: string | null
  created_at: string
}

function timeLeft(expiresAt: string): string {
  const seconds = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (seconds <= 0) return 'expired'
  if (seconds < 60) return `${seconds}s left`
  return `${Math.floor(seconds / 60)}m left`
}

export function AdminLoginCodes() {
  const [reload, setReload] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: codes, error } = useAsync(async () => {
    const { data, error: queryError } = await getSupabase()
      .from('login_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25)
    if (queryError) throw queryError
    return (data ?? []) as LoginCode[]
  }, [reload])

  const rows = codes ?? []
  const live = rows.filter((r) => !r.consumed_at && new Date(r.expires_at) > new Date())

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard access can be refused. Saying nothing beats claiming a copy
      // that did not happen -- the code is on screen to read either way.
    }
  }

  return (
    <>
      <AdminHeading
        title="Login codes"
        note="Codes are generated and checked for real; only WhatsApp delivery is missing. Read the live code here and pass it to the client. It expires in ten minutes and works once."
        actions={<AdminButton onClick={() => setReload((n) => n + 1)}>Refresh</AdminButton>}
      />
      <AdminError error={error ? 'The codes could not be loaded.' : null} />

      {live.length === 0 && (
        <p className="mb-5 text-sm text-[var(--admin-fg-muted)]">
          No live codes. One appears here the moment a client asks to sign in or register.
        </p>
      )}

      <AdminTable columns={['Number', 'For', 'Code', 'Status', 'Requested']}>
        {rows.map((row) => {
          const expired = new Date(row.expires_at) <= new Date()
          const spent = Boolean(row.consumed_at)
          return (
            <tr key={row.id} className={spent || expired ? 'opacity-60' : ''}>
              <td className="admin-num text-sm">{row.mobile}</td>
              <td className="text-sm text-[var(--admin-fg-muted)]">
                {row.purpose === 'register' ? 'New account' : 'Sign in'}
              </td>
              <td>
                {row.debug_code && !spent && !expired ? (
                  <button
                    type="button"
                    onClick={() => copy(row.debug_code!)}
                    className="cursor-pointer font-mono text-lg tracking-[0.3em] text-[var(--admin-fg)] underline decoration-[var(--admin-border-strong)] underline-offset-4"
                    title="Copy"
                  >
                    {row.debug_code}
                  </button>
                ) : (
                  // Blank once used, once expired, or once WhatsApp delivers
                  // codes properly and the readable copy stops being written.
                  <span className="text-sm text-[var(--admin-fg-muted)]">-</span>
                )}
                {copied === row.debug_code && (
                  <span className="ml-3 text-sm text-[var(--admin-fg-muted)]">Copied</span>
                )}
              </td>
              <td>
                {spent ? (
                  <Status tone="muted">Used</Status>
                ) : expired ? (
                  <Status tone="muted">Expired</Status>
                ) : (
                  <Status tone="active">{timeLeft(row.expires_at)}</Status>
                )}
                {row.attempts > 0 && !spent && (
                  <span className="ml-2 text-sm text-[var(--admin-fg-muted)]">
                    {row.attempts}/5 tried
                  </span>
                )}
              </td>
              <td className="text-sm text-[var(--admin-fg-muted)]">
                {new Date(row.created_at).toLocaleString('en-IN')}
              </td>
            </tr>
          )
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="py-14 text-center text-sm text-[var(--admin-fg-muted)]">
              No codes have been requested yet.
            </td>
          </tr>
        )}
      </AdminTable>
    </>
  )
}
