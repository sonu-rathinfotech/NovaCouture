import type { Profile } from '@/types/db'

/**
 * Auth adapter.
 *
 * Login is WhatsApp number + OTP (scope §B), but the WhatsApp Business API is
 * still being procured. Rather than wait, the whole flow — form, validation,
 * resend cooldown, verification screen — is built against this interface, and
 * going live becomes: implement one file, flip VITE_FEATURE_OTP_LOGIN. No
 * refactor of the screens.
 *
 * Implementations:
 *   mockAuth.ts     — in-browser, no backend. In use today.
 *   whatsappAuth.ts — to be written when the API and an approved OTP template
 *                     exist. Sends via the Business API and verifies through
 *                     Supabase Auth.
 */

export interface RegistrationInput {
  /** E.164. Normalise with normaliseMobile() before calling. */
  mobile: string
  name: string
  company?: string
  email?: string
  /** Must be true — the consent checkbox is mandatory (scope §B). */
  consent: boolean
  /** Additional fields added later land here, not in new columns. */
  extra?: Record<string, unknown>
}

export interface AuthResult {
  ok: boolean
  error?: string
  profile?: Profile
}

export interface OtpRequestResult {
  ok: boolean
  error?: string
  /** Seconds before a resend is allowed. */
  retryAfter?: number
  /**
   * Development only. The mock adapter returns the code here so the flow can
   * be exercised without a live WhatsApp API. A real adapter never sets this.
   */
  devCode?: string
}

export interface AuthAdapter {
  /**
   * How this adapter expects a client to sign in, so the screen can render the
   * right form. 'otp' is the destination (scope §B); 'credentials' is the
   * interim temporary login used while the WhatsApp API is being procured.
   */
  readonly method: 'otp' | 'credentials'

  /** Interim credential sign-in. Refused by adapters whose method is 'otp'. */
  signInWithPassword(identifier: string, password: string): Promise<AuthResult>

  /** Creates the account. Rejects a mobile number that already has one. */
  register(input: RegistrationInput): Promise<AuthResult>
  /** Sends an OTP to the number, if an account exists for it. */
  requestOtp(mobile: string): Promise<OtpRequestResult>
  verifyOtp(mobile: string, code: string): Promise<AuthResult>
  signOut(): Promise<void>
  currentProfile(): Profile | null
}
