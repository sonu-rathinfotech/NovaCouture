import { useState, type FormEvent } from 'react'
import { Field, FormMessage } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/data/admin'

/**
 * Administrator sign-in (scope §F).
 *
 * Signing in here grants nothing by itself. Admin rights come from the
 * database: every write is checked against is_admin() by RLS. This screen only
 * establishes the session that policy inspects — which is why a non-admin who
 * reaches /admin sees an empty panel rather than a working one.
 */
export function AdminSignIn({ onSignedIn }: { onSignedIn?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setBusy(false)
      setError('Those details were not recognised.')
      return
    }

    // A valid session is not the same as an administrator. Check, and refuse
    // to proceed rather than dropping someone into a panel where every action
    // will fail.
    if (!(await checkIsAdmin())) {
      await getSupabase().auth.signOut()
      setBusy(false)
      setError('That account is not an administrator.')
      return
    }

    setBusy(false)
    // Navigating alone was not enough: the shell had already decided this
    // visitor was not an admin and had no reason to ask again.
    onSignedIn?.()
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ivory-100 px-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-12 text-center">
          <span className="font-serif text-2xl tracking-[0.2em] text-charcoal-900">
            VK <span className="font-sans text-[0.6rem] tracking-[0.3em] text-charcoal-400 uppercase">Admin</span>
          </span>
          <p className="mt-4 text-sm font-light text-charcoal-400">Catalogue management</p>
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
