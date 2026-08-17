import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field, Textarea, FormMessage } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { normaliseMobile } from '@/lib/mobile'
import { buildEnquiryMailto } from '@/lib/enquiry'
import { env } from '@/lib/env'
import { useSession } from '@/hooks/useSession'
import type { ProductWithImages } from '@/types/db'

/**
 * Product enquiry (scope §D): name, optional company, mobile, product
 * reference and message, delivered as a pre-filled email.
 *
 * Whether this is shown at all is decided by the caller — guests never see it.
 */
export function EnquiryForm({ product }: { product: ProductWithImages }) {
  const { profile } = useSession()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [mobile, setMobile] = useState(profile?.mobile ?? '')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const configured = Boolean(env.enquiryEmail)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Your name is required'

    const parsed = normaliseMobile(mobile)
    if (!parsed.ok) next.mobile = parsed.error ?? 'Enter a valid mobile number'

    setErrors(next)
    if (Object.keys(next).length > 0) return

    const result = buildEnquiryMailto(env.enquiryEmail, {
      name: name.trim(),
      company,
      mobile: parsed.value!,
      productName: product.name,
      productUrl: window.location.href,
      message,
    })

    if (!result.ok || !result.href) {
      setFormError(result.error ?? 'Could not prepare the enquiry')
      return
    }

    window.location.href = result.href
    setSent(true)
  }

  return (
    <>
      {/* No button at all when there is nowhere to send the enquiry. A greyed
          button still looks like the way to enquire, so the customer clicks it,
          nothing happens, and they conclude the site is broken. The wording
          gives them somewhere to go instead — and does not tell a customer
          about our configuration, which is not their concern. */}
      {configured ? (
        <Button type="button" onClick={() => setOpen(true)} size="lg">
          Enquire about this piece
        </Button>
      ) : (
        <p className="text-sm leading-relaxed font-light text-[var(--color-fg-muted)]">
          Online enquiries are not available yet.{' '}
          <Link to="/contact" className="underline underline-offset-4 hover:opacity-80">
            Contact VK Jewellers
          </Link>{' '}
          about this piece and quote its name.
        </p>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Enquire"
        description={product.name}
      >
        <form onSubmit={onSubmit} noValidate>

      {formError && <FormMessage tone="error">{formError}</FormMessage>}
      {sent && (
        <FormMessage tone="success">
          Your email application should now be open with the enquiry filled in. If nothing
          happened, no mail application is configured on this device.
        </FormMessage>
      )}

      <Field
        label="Your name"
        required
        autoComplete="name"
        value={name}
        error={errors.name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Company"
        autoComplete="organization"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <Field
        label="Mobile number"
        type="tel"
        required
        autoComplete="tel"
        value={mobile}
        error={errors.mobile}
        onChange={(e) => setMobile(e.target.value)}
      />

          <Textarea
            label="Message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <p className="mb-6 text-sm leading-relaxed font-light text-[var(--color-fg-muted)]">
            Sending opens a pre-filled email to VK Jewellers from your own mail application.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Open email</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
