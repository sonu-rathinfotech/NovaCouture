import { getSupabase } from '@/lib/supabase'
import type { AuthAdapter, AuthResult, OtpRequestResult, RegistrationInput } from './types'
import type { Profile } from '@/types/db'

/**
 * WhatsApp number + one-time code (scope §B) — the destination login.
 *
 * ── STATUS ──────────────────────────────────────────────────────────────────
 * WRITTEN BUT NEVER RUN AGAINST A LIVE PROVIDER. The WhatsApp Business API has
 * not been procured, so nothing here has been exercised end to end. Treat the
 * first real send as a test, not a formality.
 *
 * It is deliberately complete rather than a stub: when the API arrives the work
 * is configuration and a flag, not a build.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * WHAT MUST BE CONFIGURED BEFORE THIS IS SWITCHED ON
 *
 *   1. Supabase dashboard → Authentication → Providers → Phone: enable it,
 *      choose Twilio (or MessageBird/Vonage), and set the WhatsApp sender.
 *   2. Supabase dashboard → Authentication → Templates → set the OTP message
 *      to the template WhatsApp approved. An unapproved template is silently
 *      rejected by Meta, which looks exactly like "the code never arrived".
 *   3. web/.env.local → VITE_FEATURE_OTP_LOGIN=true
 *
 * WHY THERE IS NO SERVER HERE
 *
 * Sending the code through our own service would mean holding the WhatsApp
 * credentials somewhere and minting Supabase sessions by hand. Supabase Auth
 * already does both: it generates the code, sends it through the configured
 * provider, verifies it, and issues the session. The browser never sees a
 * secret and never sees the code.
 */

/** Profile row for a freshly verified number, created once. */
async function ensureProfile(
  userId: string,
  mobile: string,
  input?: RegistrationInput,
): Promise<Profile | undefined> {
  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (existing) return existing as Profile

  // No row yet: this is the first verification for the number. Only a
  // registration carries the details needed to create one.
  if (!input) return undefined

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      mobile,
      name: input.name.trim(),
      company: input.company?.trim() || null,
      email: input.email?.trim() || null,
      // Never set here. Premium is granted by the administrator, server-side
      // (scope §F) — a client-side insert must not be able to claim it.
      consent_at: new Date().toISOString(),
      extra: input.extra ?? {},
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Profile
}

/** Held between requestOtp and verifyOtp so registration can finish. */
let pendingRegistration: RegistrationInput | null = null

export const whatsappAuth: AuthAdapter = {
  method: 'otp',

  async signInWithPassword(): Promise<AuthResult> {
    return { ok: false, error: 'This site signs in with a one-time code, not a password.' }
  },

  /**
   * Registration sends a code to the number. The account and profile are
   * created only once that code is verified — otherwise anyone could fill the
   * client list with numbers they do not own.
   */
  async register(input: RegistrationInput): Promise<AuthResult> {
    if (!input.consent) {
      return { ok: false, error: 'Please accept the Privacy Policy to continue' }
    }

    const { error } = await getSupabase().auth.signInWithOtp({
      phone: input.mobile,
      options: { channel: 'whatsapp', shouldCreateUser: true },
    })

    if (error) {
      // "already registered" must not be distinguishable here, or the form
      // becomes a way to test which numbers are clients.
      return { ok: false, error: 'Could not send the code. Please check the number.' }
    }

    pendingRegistration = input
    return { ok: true }
  },

  async requestOtp(mobile: string): Promise<OtpRequestResult> {
    const { error } = await getSupabase().auth.signInWithOtp({
      phone: mobile,
      // Sign-in must not create accounts: registration is the only way in,
      // and it is the only path that captures consent.
      options: { channel: 'whatsapp', shouldCreateUser: false },
    })

    if (error) {
      return { ok: false, error: 'Could not send the code. Please check the number.' }
    }

    // Never returns the code. Only the mock does that.
    return { ok: true, retryAfter: 60 }
  },

  async verifyOtp(mobile: string, code: string): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.verifyOtp({
      phone: mobile,
      token: code.trim(),
      type: 'sms', // Supabase's type for a phone code, whatever the channel.
    })

    if (error || !data.user) {
      return { ok: false, error: 'That code is not correct, or it has expired.' }
    }

    const input = pendingRegistration
    pendingRegistration = null

    try {
      const profile = await ensureProfile(data.user.id, mobile, input ?? undefined)
      if (!profile) {
        // Verified, but no profile and nothing to build one from. Signing them
        // out is kinder than a half-made account that shows an empty name.
        await getSupabase().auth.signOut()
        return { ok: false, error: 'No account found for this number. Please register first.' }
      }
      return { ok: true, profile }
    } catch {
      return { ok: false, error: 'Signed in, but the account details could not be saved.' }
    }
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
