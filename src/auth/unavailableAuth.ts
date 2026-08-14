import type { AuthAdapter, AuthResult, OtpRequestResult } from './types'

/**
 * The adapter used when Supabase IS configured but no server-side auth
 * implementation exists yet.
 *
 * Why this exists: the mock adapter writes accounts to localStorage. If it
 * stayed selected once Supabase was connected, registration would report
 * success and navigate home while SessionProvider — which reads the real
 * Supabase session — still saw a guest. The visitor would believe they had an
 * account and simply never see the catalogue they registered for.
 *
 * A silent wrong answer is worse than a visible refusal, so every call here
 * fails with an explanation. Nothing throws at import, so the rest of the site
 * keeps working; only the auth screens report that they are not connected yet.
 *
 * Delete this file once supabaseAuth.ts lands.
 */

const MESSAGE =
  'Sign-in is not connected yet. The account system is being set up — please try again later.'

function refuse(): AuthResult {
  return { ok: false, error: MESSAGE }
}

export const unavailableAuth: AuthAdapter = {
  method: 'credentials',

  async signInWithPassword(): Promise<AuthResult> {
    return refuse()
  },

  async register(): Promise<AuthResult> {
    return refuse()
  },
  async requestOtp(): Promise<OtpRequestResult> {
    return { ok: false, error: MESSAGE }
  },
  async verifyOtp(): Promise<AuthResult> {
    return refuse()
  },
  async signOut(): Promise<void> {
    // Nothing to clear — this adapter never signs anyone in.
  },
  currentProfile(): null {
    return null
  },
}
