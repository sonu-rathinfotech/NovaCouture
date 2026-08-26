import { useState, type FormEvent } from 'react'
import { Field, FormMessage } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/data/admin'
import { HERO_PHOTO } from '@/components/catalogue/samplePhotos'
import { ArrowLeft } from 'lucide-react'

/**
 * Administrator sign-in (scope §F).
 *
 * Split-screen design matching the auth pages (AuthLayout).
 * Editorial photography on left, clean form on right.
 * Uses the new freeui design system tokens.
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

    if (!(await checkIsAdmin())) {
      await getSupabase().auth.signOut()
      setBusy(false)
      setError('That account is not an administrator.')
      return
    }

    setBusy(false)
    onSignedIn?.()
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-[var(--color-bg)]">
      {/* Image Side - Editorial/Tiffany style */}
      <div className="relative hidden lg:block overflow-hidden">
        <img
          src={HERO_PHOTO}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[var(--color-fg)]/70 via-[var(--color-fg)]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 lg:p-20">
          <p className="font-display text-3xl lg:text-4xl leading-tight text-white max-w-lg">
            Catalogue management
            <br />
            <span className="font-light">for Nova Couture</span>
          </p>
          <p className="mt-4 text-sm font-light tracking-widest text-[var(--base-300)] uppercase">
            Private access only
          </p>
        </div>
      </div>

      {/* Form Side - Clean/GIVA style */}
      <div className="flex items-center justify-center px-6 py-16 lg:p-20">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="mb-10 flex items-baseline gap-2" role="img" aria-label="Nova Couture Admin">
            <span className="font-display text-2xl font-medium text-[var(--color-fg)] tracking-tight">Nova</span>
            <span className="font-ui text-[0.6rem] tracking-[0.3em] text-[var(--color-fg-muted)] uppercase">Admin</span>
          </div>

          {/* Form Header */}
          <p className="eyebrow mb-3 text-[var(--color-accent)]">Private access</p>
          <h1 className="font-display text-[length:var(--text-h1)] text-[var(--color-fg)] tracking-tight">
            Sign in to manage the catalogue
          </h1>
          <p className="mt-4 text-[length:var(--text-body-lg)] leading-relaxed text-[var(--color-fg-muted)]">
            Only authorised administrators can access this area.
          </p>

          {/* Form Content */}
          <form onSubmit={onSubmit} noValidate className="mt-10">
            {error && <FormMessage tone="error">{error}</FormMessage>}

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

          {/* Back Link */}
          <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm tracking-[0.1em] text-[var(--color-fg-muted)] uppercase transition-colors hover:text-[var(--color-accent)]"
            >
              <ArrowLeft size={14} strokeWidth={2} />
              Back to catalogue
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}