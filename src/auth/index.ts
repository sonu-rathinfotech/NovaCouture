import type { AuthAdapter } from './types'
import { isConfigured, features } from '@/lib/env'
import { mockAuth } from './mockAuth'
import { unavailableAuth } from './unavailableAuth'
import { supabaseAuth } from './supabaseAuth'
import { whatsappAuth } from './whatsappAuth'
import { dbOtpAuth } from './dbOtpAuth'

/**
 * Auth adapter selection.
 *
 * | Supabase | OTP flag | Adapter        | Why                                 |
 * |----------|----------|----------------|-------------------------------------|
 * | no       | –        | mockAuth       | Fixture review; accounts in browser |
 * | yes      | off      | supabaseAuth   | Interim credential login (scope §B) |
 * | yes      | on       | whatsappAuth   | Live WhatsApp OTP (scope §B)        |
 *
 * whatsappAuth is written but has never run against a live provider. Turning
 * VITE_FEATURE_OTP_LOGIN on before the Supabase phone provider and an approved
 * WhatsApp template are configured will fail at the send step with a visible
 * error — not silently. See whatsappAuth.ts for the configuration checklist.
 *
 * The mock MUST NOT be selected once Supabase is configured. It writes accounts
 * to localStorage, so it would report a successful registration while
 * SessionProvider — reading the real Supabase session — still saw a guest. The
 * visitor would think they had an account and never see the catalogue they
 * registered for. Failing visibly beats failing silently.
 */
export type AuthMode = 'mock' | 'unavailable' | 'supabase' | 'whatsapp'

export function selectAuthMode(configured: boolean, otpEnabled: boolean): AuthMode {
  if (!configured) return 'mock'
  return otpEnabled ? 'whatsapp' : 'supabase'
}

export const authMode: AuthMode = selectAuthMode(isConfigured, features.otpLogin)

const ADAPTERS: Record<AuthMode, AuthAdapter> = {
  mock: mockAuth,
  supabase: supabaseAuth,
  unavailable: unavailableAuth,
  whatsapp: whatsappAuth,
}

export const auth: AuthAdapter = ADAPTERS[authMode]

/** True while accounts live in the browser and carry no real authority. */
export const usingMockAuth = authMode === 'mock'

/**
 * WhatsApp number + code, offered ALONGSIDE the adapter above rather than
 * instead of it.
 *
 * The two are not stages of a migration: some clients have an email login the
 * administrator issued, others will only ever have their number, and both must
 * keep working. The sign-in screen therefore shows both, and this is the
 * adapter behind the WhatsApp side.
 *
 * It runs against our own codes table (migration 0013), so it needs no
 * provider and works today — the administrator relays the code from Admin →
 * Login Codes until WhatsApp delivery is wired up. `whatsappAuth` remains the
 * destination for when a provider exists; see the note at the top of
 * dbOtpAuth.ts for how to switch.
 */
export const otpAuth: AuthAdapter = dbOtpAuth

/** WhatsApp sign-in needs the database; it cannot run on fixtures. */
export const otpAvailable = isConfigured

export type { AuthAdapter, AuthResult, OtpRequestResult, RegistrationInput } from './types'
