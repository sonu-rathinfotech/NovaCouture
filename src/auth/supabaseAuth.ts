import { getSupabase } from '@/lib/supabase'
import type { AuthAdapter, AuthResult, OtpRequestResult } from './types'
import type { Profile } from '@/types/db'

/**
 * Interim credential sign-in against Supabase Auth (scope §B).
 *
 * The destination is WhatsApp number + OTP. Until the Business API and an
 * approved template exist, gated areas are reached with a temporary credential
 * — which is what the signed scope specifies. The accounts are created
 * server-side by tools/create-review-accounts.mjs and handed over by hand;
 * there is no self-registration in this mode.
 *
 * Why email and password rather than phone: Supabase phone auth requires an
 * SMS provider, which is exactly the thing being procured. Email sign-in needs
 * no provider, so it works today and is thrown away when OTP arrives. The
 * mobile number remains the real identifier — it lives on `profiles`, and the
 * OTP adapter will key off it without touching anything else.
 */
export const supabaseAuth: AuthAdapter = {
  method: 'credentials',

  async signInWithPassword(identifier: string, password: string): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: identifier.trim(),
      password,
    })

    if (error || !data.user) {
      // Deliberately vague: distinguishing "no such account" from "wrong
      // password" tells someone which addresses are real.
      return { ok: false, error: 'Those details were not recognised.' }
    }

    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    return { ok: true, profile: (profile as Profile) ?? undefined }
  },

  async register(): Promise<AuthResult> {
    // Registration opens with the OTP flow. Allowing self-signup here would
    // create accounts with passwords that the real login cannot use.
    return {
      ok: false,
      error:
        'Registration is not open yet. Access is arranged by Nova Couture while the WhatsApp sign-in is being set up.',
    }
  },

  async requestOtp(): Promise<OtpRequestResult> {
    return { ok: false, error: 'One-time codes are not available yet.' }
  },

  async verifyOtp(): Promise<AuthResult> {
    return { ok: false, error: 'One-time codes are not available yet.' }
  },

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut()
  },

  /** SessionProvider owns the profile once Supabase is in play. */
  currentProfile(): null {
    return null
  },
}
