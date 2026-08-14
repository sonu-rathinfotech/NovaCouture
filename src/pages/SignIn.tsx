import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Field, FormMessage } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { normaliseMobile, formatMobile } from '@/lib/mobile'
import { auth, authMode } from '@/auth'
import { useSession } from '@/hooks/useSession'

/**
 * Sign-in.
 *
 * The destination is WhatsApp number + one-time code (scope §B). Until the
 * Business API is available the adapter asks for a temporary credential
 * instead, so the screen renders whichever form the active adapter supports.
 * Neither branch knows anything about how the credentials are checked.
 */
export function SignIn() {
  return auth.method === 'credentials' ? <CredentialSignIn /> : <OtpSignIn />
}

function RegisterFooter() {
  return (
    <p className="text-sm font-light text-charcoal-400">
      New to VK Jewellers?{' '}
      <Link
        to="/register"
        className="text-charcoal-800 underline underline-offset-4 transition-colors hover:text-champagne-800"
      >
        Request membership
      </Link>
    </p>
  )
}

// ---------------------------------------------------------------------------
// Interim: temporary credential
// ---------------------------------------------------------------------------

function CredentialSignIn() {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const unavailable = authMode !== 'supabase'

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
      title="Welcome to VK Jewellers"
      intro="Access your private jewellery catalogue."
      footer={<RegisterFooter />}
    >
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

      <p className="mt-8 border-l-2 border-champagne-400 bg-ivory-50 px-5 py-4 text-[0.8125rem] leading-relaxed font-light text-charcoal-500">
        <strong className="font-medium text-charcoal-800">Temporary sign-in.</strong> WhatsApp
        one-time codes replace this once the Business API is connected. Access is arranged by VK
        Jewellers in the meantime.
      </p>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Destination: WhatsApp number + one-time code
// ---------------------------------------------------------------------------

function OtpSignIn() {
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

    const result = await auth.requestOtp(target)
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

    const result = await auth.verifyOtp(e164, code)
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
      title={step === 'mobile' ? 'Welcome to VK Jewellers' : 'Enter your code'}
      intro={
        step === 'mobile'
          ? 'Access your private jewellery catalogue.'
          : `We sent a one-time code to ${formatMobile(e164)}.`
      }
      footer={step === 'mobile' ? <RegisterFooter /> : undefined}
    >
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

          <div className="mt-6 flex items-center justify-between text-sm font-light text-charcoal-400">
            <button
              type="button"
              onClick={() => {
                setStep('mobile')
                setCode('')
                setDevCode(null)
              }}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-charcoal-700"
            >
              Change number
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void sendCode(e164)}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-charcoal-700 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {devCode && (
        <p className="mt-8 border-l-2 border-champagne-400 bg-ivory-50 px-5 py-4 text-[0.8125rem] leading-relaxed font-light text-charcoal-500">
          <strong className="font-medium text-charcoal-800">Preview mode.</strong> No message is
          sent — the WhatsApp Business API is still being procured. Use code{' '}
          <strong className="font-medium text-charcoal-800">{devCode}</strong>.
        </p>
      )}
    </AuthLayout>
  )
}
