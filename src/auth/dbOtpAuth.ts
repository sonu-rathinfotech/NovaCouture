import { getSupabase } from '@/lib/supabase'
import type { AuthAdapter, AuthResult, OtpRequestResult, RegistrationInput } from './types'
import type { Profile } from '@/types/db'

/**
 * WhatsApp number + one-time code, working before the Business API exists.
 *
 * ── How this differs from whatsappAuth.ts ───────────────────────────────────
 * That adapter is the destination: Supabase generates, sends and verifies the
 * code through a configured phone provider. It needs a provider in the
 * dashboard and an approved WhatsApp template, neither of which exists, so it
 * has never run.
 *
 * This one does the same job against our own table (migration 0013). The code
 * is generated and checked in the database; only DELIVERY is missing, and
 * while it is, the administrator reads the code from Admin → Login Codes and
 * relays it. Everything else — expiry, single use, attempt limits, rate
 * limiting, session handling — is real.
 *
 * When the API arrives there are two ways forward: fill in
 * public.deliver_login_code() and keep this adapter, or configure the Supabase
 * provider and switch to whatsappAuth. Both are a change of one file.
 *
 * ── The code is never returned to the browser ───────────────────────────────
 * `devCode` is always null here. The mock adapter returns codes because its
 * accounts carry no authority; these accounts are real. An endpoint that
 * handed back the code for any number typed into it would not be a login, it
 * would be a door.
 */

/** What verify_login_code() hands back on success. */
interface VerifyResult {
  ok: boolean
  error?: string
  email?: string
  password?: string
}

interface RequestResult {
  ok: boolean
  error?: string
  retry_after?: number
  /** True once WhatsApp actually delivers. False while the admin relays it. */
  delivered?: boolean
}

/**
 * Held between register() and verifyOtp(), because the account is created only
 * after the code is proven — otherwise anyone could fill the client list with
 * numbers they do not own.
 */
let pendingRegistration: RegistrationInput | null = null

/** True when the last request was for a number that is registering. */
function currentPurpose(): 'register' | 'sign_in' {
  return pendingRegistration ? 'register' : 'sign_in'
}

async function loadProfile(userId: string): Promise<Profile | undefined> {
  const { data } = await getSupabase().from('profiles').select('*').eq('id', userId).maybeSingle()
  return (data as Profile) ?? undefined
}

export const dbOtpAuth: AuthAdapter = {
  method: 'otp',

  async signInWithPassword(): Promise<AuthResult> {
    return { ok: false, error: 'This form signs in with a one-time code, not a password.' }
  },

  async register(input: RegistrationInput): Promise<AuthResult> {
    if (!input.consent) {
      return { ok: false, error: 'Please accept the Privacy Policy to continue' }
    }
    if (!input.name.trim()) {
      return { ok: false, error: 'Your name is required' }
    }

    const { data, error } = await getSupabase().rpc('request_login_code', {
      p_mobile: input.mobile,
      p_purpose: 'register',
    })

    if (error) return { ok: false, error: 'Could not send the code. Please try again.' }
    const result = data as RequestResult
    if (!result.ok) return { ok: false, error: result.error }

    pendingRegistration = input
    return { ok: true }
  },

  async requestOtp(mobile: string): Promise<OtpRequestResult> {
    // A resend during registration must stay a registration: switching it to
    // sign_in would ask the database for a code for an account that does not
    // exist yet, and the client would be told to register — which they are
    // halfway through doing.
    const purpose = currentPurpose()

    const { data, error } = await getSupabase().rpc('request_login_code', {
      p_mobile: mobile,
      p_purpose: purpose,
    })

    if (error) return { ok: false, error: 'Could not send the code. Please try again.' }
    const result = data as RequestResult
    if (!result.ok) return { ok: false, error: result.error, retryAfter: result.retry_after }

    return { ok: true, retryAfter: result.retry_after ?? 60 }
  },

  async verifyOtp(mobile: string, code: string): Promise<AuthResult> {
    const input = pendingRegistration
    const purpose = input ? 'register' : 'sign_in'

    const { data, error } = await getSupabase().rpc('verify_login_code', {
      p_mobile: mobile,
      p_code: code.trim(),
      p_purpose: purpose,
      p_name: input?.name ?? null,
      p_company: input?.company ?? null,
      p_email: input?.email ?? null,
      p_consent: input?.consent ?? false,
    })

    if (error) return { ok: false, error: 'Could not verify the code. Please try again.' }

    const result = data as VerifyResult
    if (!result.ok || !result.email || !result.password) {
      // The code is spent either way, so the registration is not retried with
      // a stale one — the client asks for a new code and starts again.
      if (!result.ok && purpose === 'register') pendingRegistration = null
      return { ok: false, error: result.error ?? 'That code is not correct, or it has expired.' }
    }

    /*
     * The one-time credential the database just minted. It is exchanged
     * immediately for a real Supabase session and never stored, shown or
     * reused — verify_login_code() rotates it on the next verification.
     */
    const { data: session, error: signInError } = await getSupabase().auth.signInWithPassword({
      email: result.email,
      password: result.password,
    })

    pendingRegistration = null

    if (signInError || !session.user) {
      return { ok: false, error: 'Verified, but the session could not be started. Please try again.' }
    }

    return { ok: true, profile: await loadProfile(session.user.id) }
  },

  async signOut(): Promise<void> {
    pendingRegistration = null
    await getSupabase().auth.signOut()
  },

  /** SessionProvider owns the profile once Supabase is in play. */
  currentProfile(): null {
    return null
  },
}

/** Clears a half-finished registration when the visitor leaves the form. */
export function cancelPendingRegistration(): void {
  pendingRegistration = null
}
