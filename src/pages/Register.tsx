import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Field, Checkbox, FormMessage } from '@/components/ui'
import { Button } from '@/components/ui/Button'
import { REGISTRATION_FIELDS } from '@/data/registrationFields'
import { formatMobile, normaliseMobile } from '@/lib/mobile'
import { auth, authMode, otpAuth, otpAvailable } from '@/auth'
import { useSession } from '@/hooks/useSession'
import { usePageTitle } from '@/hooks/usePageTitle'

type Values = Record<string, string>

/*
 * With the database connected, registration runs on the WhatsApp-code adapter
 * (dbOtpAuth): the form asks for a code, and the account is created only once
 * the code proves the number belongs to the person registering. Until the
 * WhatsApp Business API is live, the administrator reads the code in
 * Admin -> Login Codes and passes it on.
 *
 * `auth` here was supabaseAuth, which refuses every registration -- so nobody
 * could create an account at all. On fixtures, mockAuth still registers
 * directly with no code step.
 */
const adapter = otpAvailable ? otpAuth : auth
const needsCode = otpAvailable

export function Register() {
  usePageTitle('Request membership')
  const navigate = useNavigate()
  const { refresh } = useSession()

  const [values, setValues] = useState<Values>({})
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState<'details' | 'code'>('details')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function set(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((e) => (e[name] ? { ...e, [name]: '' } : e))
  }

  function validate(): { ok: boolean; mobile?: string } {
    const next: Record<string, string> = {}

    for (const field of REGISTRATION_FIELDS) {
      const value = (values[field.name] ?? '').trim()
      if (field.required && !value) next[field.name] = `${field.label} is required`
      if (field.type === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        next[field.name] = 'Enter a valid email address'
      }
    }

    const mobile = normaliseMobile(values.mobile ?? '')
    if (!mobile.ok) next.mobile = mobile.error ?? 'Enter a valid mobile number'

    if (!consent) next.consent = 'Please accept the Privacy Policy to continue'

    setErrors(next)
    return { ok: Object.keys(next).length === 0, mobile: mobile.value }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const { ok, mobile } = validate()
    if (!ok || !mobile) return

    setSubmitting(true)

    // Fields marked store: 'extra' go to the jsonb column, so a field added
    // later needs no migration and no change here.
    const extra: Record<string, unknown> = {}
    for (const field of REGISTRATION_FIELDS) {
      if (field.store === 'extra' && values[field.name]) extra[field.name] = values[field.name]
    }

    const result = await adapter.register({
      mobile,
      name: values.name?.trim() ?? '',
      company: values.company,
      email: values.email,
      consent,
      extra,
    })

    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.error ?? 'Could not create the account')
      return
    }

    if (needsCode) {
      setE164(mobile)
      setCooldown(60)
      setStep('code')
      return
    }

    refresh()
    navigate('/', { replace: true })
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const result = await adapter.verifyOtp(e164, code)
    setSubmitting(false)

    if (!result.ok) {
      setFormError(result.error ?? 'Could not verify the code')
      return
    }

    refresh()
    navigate('/', { replace: true })
  }

  async function resend() {
    setSubmitting(true)
    setFormError(null)
    const result = await adapter.requestOtp(e164)
    setSubmitting(false)
    if (!result.ok) {
      setFormError(result.error ?? 'Could not send the code')
      return
    }
    setCooldown(result.retryAfter ?? 60)
  }

  if (step === 'code') {
    return (
      <AuthLayout
        eyebrow="Request membership"
        title="Enter your code"
        intro={`We are sending a one-time code to ${formatMobile(e164)} on WhatsApp.`}
      >
        <form onSubmit={onSubmitCode} noValidate>
          {formError && <FormMessage tone="error">{formError}</FormMessage>}

          <Field
            label="One-time code"
            help="It can take a few minutes to arrive. Not received yet? Please wait, or contact us."
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Button type="submit" size="lg" disabled={submitting || code.length < 6} className="w-full">
            {submitting ? 'Verifying…' : 'Verify and create account'}
          </Button>

          <div className="mt-6 flex items-center justify-between text-sm font-light text-[var(--color-fg-muted)]">
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setCode('')
                setFormError(null)
              }}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-accent)]"
            >
              Change details
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || submitting}
              onClick={() => void resend()}
              className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Request membership"
      title="Create an account"
      intro="Registered clients see a wider selection of the catalogue."
      footer={
        <p className="text-sm font-light text-[var(--color-fg-muted)]">
          Already registered?{' '}
          <Link
            to="/sign-in"
            className="text-[var(--color-accent)] underline underline-offset-4 transition-colors hover:text-[var(--color-accent-hover)]"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {authMode === 'unavailable' && (
          <FormMessage tone="error">
            Self-registration is not open yet. Nova Couture arranges access while the WhatsApp
            sign-in is being set up.
          </FormMessage>
        )}
        {formError && <FormMessage tone="error">{formError}</FormMessage>}

        {REGISTRATION_FIELDS.map((field, i) => (
          <Field
            key={field.name}
            label={field.label}
            type={field.type}
            required={field.required}
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            help={field.help}
            error={errors[field.name]}
            autoFocus={i === 0}
            value={values[field.name] ?? ''}
            onChange={(e) => set(field.name, e.target.value)}
          />
        ))}

        {/* Mandatory consent, linking to the Privacy Policy page (scope §B). */}
        <Checkbox
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          error={errors.consent}
          label={
            <>
              I agree to the{' '}
              <Link to="/privacy" className="text-[var(--color-accent)] underline underline-offset-4">
                Privacy Policy
              </Link>{' '}
              and consent to Nova Couture storing these details.
            </>
          }
        />

        <Button
          type="submit"
          size="lg"
          disabled={submitting || authMode === 'unavailable'}
          className="w-full"
        >
          {submitting
            ? needsCode
              ? 'Sending code…'
              : 'Creating account…'
            : needsCode
              ? 'Continue'
              : 'Create account'}
          {!submitting && <ArrowRight size={16} strokeWidth={1.5} className="ml-2" />}
        </Button>
      </form>
    </AuthLayout>
  )
}