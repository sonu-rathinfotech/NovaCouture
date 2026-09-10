import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Field, FormMessage } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { normaliseMobile, formatMobile } from '@/lib/mobile'
import { auth, authMode, otpAuth, otpAvailable } from '@/auth'
import type { AuthAdapter } from '@/auth'
import { useSession } from '@/hooks/useSession'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * Sign-in, by WhatsApp code or by email.
 *
 * ── Why both, rather than one replacing the other ───────────────────────────
 * Scope §B puts login on a WhatsApp number and a code, and that is the default
 * here. But clients already exist whose accounts the administrator issued with
 * an email and password, and those have to keep working — a client who signed
 * in yesterday must not find the door moved. So the two sit side by side and
 * the visitor chooses.
 *
 * The WhatsApp side runs against the codes table (migration 0013), so it works
 * today without the Business API: the code is generated and checked for real,
 * and only the delivery is by hand until the API is connected.
 */
type Method = 'whatsapp' | 'email'

export function SignIn() {
  usePageTitle('Sign in')

  // WhatsApp is the destination, so it leads — but not on fixtures, where
  // there is no database to hold a code.
  const [method, setMethod] = useState<Method>(otpAvailable ? 'whatsapp' : 'email')

  const tabs = otpAvailable ? <MethodTabs method={method} onChange={setMethod} /> : null

  if (method === 'whatsapp' && otpAvailable) return <OtpSignIn adapter={otpAuth} tabs={tabs} />
  return <CredentialSignIn tabs={tabs} />
}

function MethodTabs({ method, onChange }: { method: Method; onChange: (m: Method) => void }) {
  const base =
    'flex-1 cursor-pointer border-b-2 pb-3 text-sm tracking-[0.08em] uppercase transition-colors'
  return (
    <div className="mb-8 flex gap-6" role="tablist" aria-label="How to sign in">
      {(
        [
          ['whatsapp', 'WhatsApp code'],
          ['email', 'Email & password'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={method === value}
          onClick={() => onChange(value)}
          className={[
            base,
            method === value
              ? 'border-[var(--color-accent)] text-[var(--color-fg)]'
              : 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function RegisterFooter() {
  return (
    <p className="text-sm font-light text-[var(--color-fg-muted)]">
      New to Nova Couture?{' '}
      <Link
        to="/register"
        className="text-[var(--color-accent)] underline underline-offset-4 transition-colors hover:text-[var(--color-accent-hover)]"
      >
        Request membership
      </Link>
    </p>
  )
}

// ---------------------------------------------------------------------------
// Interim: temporary credential
// ---------------------------------------------------------------------------

function CredentialSignIn({ tabs }: { tabs?: ReactNode }) {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const unavailable = authMode === 'unavailable'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const result = await auth.signInWithPassword(identifier, password)
    setBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'Could not sign in')
      return
    }

    refresh()
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Private access"
      title="Welcome to Nova Couture"
      intro="Access your private jewellery catalogue."
      footer={<RegisterFooter />}
    >
      {tabs}
      {unavailable && (
        <FormMessage tone="error">
          Sign-in is not connected yet. The account system is being set up.
        </FormMessage>
      )}
      {error && <FormMessage tone="error">{error}</FormMessage>}

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" disabled={busy || unavailable} className="w-full">
          {busy ? 'Signing in…' : 'Continue'}
          {!busy && <ArrowRight size={16} strokeWidth={1.5} className="ml-2" />}
        </Button>
      </form>

      <div className="mt-8 p-4 bg-[var(--color-bg-muted)] border-l-4 border-[var(--color-accent)] rounded-r-lg">
        <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
          <strong className="font-medium text-[var(--color-fg)]">Temporary sign-in.</strong> WhatsApp
          one-time codes replace this once the Business API is connected. Access is arranged by Nova
          Couture in the meantime.
        </p>
      </div>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Destination: WhatsApp number + one-time code
// ---------------------------------------------------------------------------

function OtpSignIn({ adapter, tabs }: { adapter: AuthAdapter; tabs?: ReactNode }) {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const [step, setStep] = useState<'mobile' | 'code'>('mobile')
  const [mobile, setMobile] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Resend cooldown. Real OTP delivery costs money per message and is rate
  // limited by the provider, so the button must not be spammable.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendCode(target: string) {
    setBusy(true)
    setError(null)

    const result = await adapter.requestOtp(target)
    setBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'Could not send the code')
      return false
    }

    setDevCode(result.devCode ?? null)
    setCooldown(result.retryAfter ?? 30)
    return true
  }

  async function onSubmitMobile(e: FormEvent) {
    e.preventDefault()
    setFieldError(null)

    const parsed = normaliseMobile(mobile)
    if (!parsed.ok || !parsed.value) {
      setFieldError(parsed.error ?? 'Enter a valid mobile number')
      return
    }

    setE164(parsed.value)
    if (await sendCode(parsed.value)) setStep('code')
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const result = await adapter.verifyOtp(e164, code)
    setBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'Could not verify the code')
      return
    }

    refresh()
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Private access"
      title={step === 'mobile' ? 'Welcome to Nova Couture' : 'Enter your code'}
      intro={
        step === 'mobile'
          ? 'Access your private jewellery catalogue.'
          : `We sent a one-time code to ${formatMobile(e164)}.`
      }
      footer={step === 'mobile' ? <RegisterFooter /> : undefined}
    >
      {step === 'mobile' && tabs}
      {error && <FormMessage tone="error">{error}</FormMessage>}

      {step === 'mobile' ? (
        <form onSubmit={onSubmitMobile} noValidate>
          <Field
            label="WhatsApp number"
            type="tel"
            required
            autoComplete="tel"
            autoFocus
            placeholder="98765 43210"
            help="We will send a verification code to this number."
            value={mobile}
            error={fieldError ?? undefined}
            onChange={(e) => {
              setMobile(e.target.value)
              setFieldError(null)
            }}
          />
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? 'Sending code…' : 'Continue'}
            {!busy && <ArrowRight size={16} strokeWidth={1.5} className="ml-2" />}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitCode} noValidate>
          <Field
            label="One-time code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Button type="submit" size="lg" disabled={busy || code.length < 6} className="w-full">
            {busy ? 'Verifying…' : 'Verify and sign in'}
          </Button>

          <div className="mt-6 flex items-center justify-between text-sm font-light text-[var(--color-fg-muted)]">
            <button
              type="button"
              onClick={() => {
                setStep('mobile')
                setCode('')
                setDevCode(null)
              }}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
            >
              Change number
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void sendCode(e164)}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {devCode && (
        <div className="mt-8 p-4 bg-[var(--color-bg-muted)] border-l-4 border-[var(--color-accent)] rounded-r-lg">
          <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
            <strong className="font-medium text-[var(--color-fg)]">Preview mode.</strong> No message is
            sent — the WhatsApp Business API is still being procured. Use code{' '}
            <strong className="font-medium text-[var(--color-fg)]">{devCode}</strong>.
          </p>
        </div>
      )}
    </AuthLayout>
  )
}