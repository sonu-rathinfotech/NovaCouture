/**
 * Mobile number handling.
 *
 * The mobile number is the account identifier — one account per number
 * (scope §B) — and the unique index in the database is on the stored value.
 * That index only means something if every write is normalised to E.164 first,
 * otherwise '9876543210' and '+919876543210' both get accepted as different
 * accounts for the same person.
 *
 * Normalisation therefore happens here, once, and nowhere else.
 */

/** India. Change here if Nova Couture ever registers clients from other countries. */
const DEFAULT_COUNTRY_CODE = '91'
const DEFAULT_NATIONAL_LENGTH = 10

export interface MobileResult {
  ok: boolean
  /** E.164, e.g. +919876543210. Only set when ok. */
  value?: string
  error?: string
}

export function normaliseMobile(input: string): MobileResult {
  const raw = input.trim()
  if (!raw) return { ok: false, error: 'Enter your mobile number' }

  // Keep digits, and a leading + if present.
  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')

  if (!digits) return { ok: false, error: 'Enter your mobile number' }

  let e164: string

  if (hasPlus) {
    e164 = `+${digits}`
  } else if (digits.length === DEFAULT_NATIONAL_LENGTH) {
    e164 = `+${DEFAULT_COUNTRY_CODE}${digits}`
  } else if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === DEFAULT_NATIONAL_LENGTH + 2) {
    // Pasted as 919876543210, without the plus.
    e164 = `+${digits}`
  } else if (digits.startsWith('0') && digits.length === DEFAULT_NATIONAL_LENGTH + 1) {
    // Dialled form: 09876543210.
    e164 = `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`
  } else {
    return { ok: false, error: 'Enter a valid 10-digit mobile number' }
  }

  // Must match the CHECK constraint on profiles.mobile.
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { ok: false, error: 'Enter a valid mobile number' }
  }

  return { ok: true, value: e164 }
}

/** Display form: +91 98765 43210. Never store this — store the E.164 value. */
export function formatMobile(e164: string): string {
  const m = /^\+(\d{1,3})(\d{5})(\d{5})$/.exec(e164)
  if (!m) return e164
  return `+${m[1]} ${m[2]} ${m[3]}`
}
