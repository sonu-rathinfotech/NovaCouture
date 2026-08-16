import type { AuthAdapter } from './types'
import { isConfigured, features } from '@/lib/env'
import { mockAuth } from './mockAuth'
import { unavailableAuth } from './unavailableAuth'
import { supabaseAuth } from './supabaseAuth'
import { whatsappAuth } from './whatsappAuth'

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

export type { AuthAdapter, AuthResult, OtpRequestResult, RegistrationInput } from './types'
