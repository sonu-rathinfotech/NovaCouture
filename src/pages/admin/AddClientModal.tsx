import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AdminButton, AdminError } from './AdminLayout'
import { createClient } from '@/data/admin'
import { normaliseMobile } from '@/lib/mobile'

/**
 * Add a client by hand (scope §F).
 *
 * Needed because self-registration is closed until WhatsApp OTP is live —
 * without this, VK cannot onboard anybody at all.
 */
export function AddClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setName('')
    setMobile('')
    setCompany('')
    setEmail('')
    setPassword('')
    setIsPremium(false)
    setErrors({})
    setFailure(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFailure(null)

    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'A name is required'

    const parsed = normaliseMobile(mobile)
    if (!parsed.ok) next.mobile = parsed.error ?? 'Enter a valid mobile number'
    if (password.length < 6) next.password = 'At least 6 characters'
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await createClient({
        name: name.trim(),
        mobile: parsed.value!,
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        password,
        isPremium,
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setFailure((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add client" description="Creates the account and its sign-in.">
      <AdminError error={failure} />

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Row label="Full name" error={errors.name} required>
          <input
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Row>

        <Row
          label="WhatsApp number"
          error={errors.mobile}
          required
          help="Identifies the account. One account per number."
        >
          <input
            className="admin-input"
            type="tel"
            placeholder="98765 43210"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </Row>

        <Row label="Company">
          <input
            className="admin-input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Row>

        <Row
          label="Email"
          error={errors.email}
          help="Used for the temporary sign-in. Left blank, a placeholder that cannot receive mail is generated."
        >
          <input
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Row>

        <Row
          label="Temporary password"
          error={errors.password}
          required
          help="Give this to the client. WhatsApp codes replace it once the Business API is live."
        >
          <input
            className="admin-input"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Row>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
            className="size-4 cursor-pointer accent-[var(--admin-fg)]"
          />
          Grant premium access immediately
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <AdminButton type="submit" tone="primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create client'}
          </AdminButton>
          <AdminButton onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
        </div>

        {/* The administrator is recording consent given in person or by
            message, not the client ticking a box. Worth saying out loud. */}
        <p className="text-xs leading-relaxed text-[var(--admin-fg-muted)]">
          Creating an account here records that the client agreed to the Privacy Policy. Only add
          someone who has actually agreed.
        </p>
      </form>
    </Modal>
  )
}

function Row({
  label,
  help,
  error,
  required,
  children,
}: {
  label: string
  help?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="admin-label mb-2 block">
        {label}
        {required && <span className="ml-1 text-[var(--admin-accent)]">*</span>}
      </span>
      {children}
      {help && !error && (
        <p className="mt-1.5 text-xs text-[var(--admin-fg-muted)]">{help}</p>
      )}
      {error && <p className="mt-1.5 text-xs text-[var(--admin-danger)]">{error}</p>}
    </div>
  )
}
