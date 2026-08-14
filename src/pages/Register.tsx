import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Field, Checkbox, FormMessage } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { REGISTRATION_FIELDS } from '@/data/registrationFields'
import { normaliseMobile } from '@/lib/mobile'
import { auth, authMode } from '@/auth'
import { useSession } from '@/hooks/useSession'

type Values = Record<string, string>

export function Register() {
  const navigate = useNavigate()
  const { refresh } = useSession()

  const [values, setValues] = useState<Values>({})
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    const result = await auth.register({
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

    refresh()
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      eyebrow="Request membership"
      title="Create an account"
      intro="Registered clients see a wider selection of the catalogue."
      footer={
        <p className="text-sm font-light text-charcoal-400">
          Already registered?{' '}
          <Link
            to="/sign-in"
            className="text-charcoal-800 underline underline-offset-4 transition-colors hover:text-champagne-800"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {authMode !== 'mock' && (
          <FormMessage tone="error">
            Self-registration is not open yet. VK Jewellers arranges access while the WhatsApp
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
              <Link to="/privacy" className="text-charcoal-800 underline underline-offset-4">
                Privacy Policy
              </Link>{' '}
              and consent to VK Jewellers storing these details.
            </>
          }
        />

        <Button
          type="submit"
          size="lg"
          disabled={submitting || authMode !== 'mock'}
          className="w-full"
        >
          {submitting ? 'Creating account…' : 'Create account'}
          {!submitting && <ArrowRight size={16} strokeWidth={1.5} className="ml-2" />}
        </Button>
      </form>
    </AuthLayout>
  )
}
