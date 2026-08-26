import type { AuthAdapter, AuthResult, OtpRequestResult, RegistrationInput } from './types'
import type { Profile } from '@/types/db'

/**
 * Browser-only auth stand-in. No backend, no security value.
 *
 * Exists so the registration and OTP screens can be built and reviewed while
 * the Supabase project and the WhatsApp Business API are being arranged. It
 * mirrors the two rules that matter for the real flow:
 *
 *   1. one account per mobile number (the unique index on profiles.mobile)
 *   2. consent is mandatory before an account is created
 *
 * Accounts live in localStorage and are wiped by clearing site data. Nothing
 * here ships to production — index.ts selects it only while Supabase is
 * unconfigured.
 */

const ACCOUNTS_KEY = 'nova:mock-accounts'
const SESSION_KEY = 'nova:mock-session'
const PENDING_KEY = 'nova:mock-otp'

/** Fixed code, shown on screen. A real adapter never reveals the code. */
const DEV_CODE = '123456'
const RESEND_SECONDS = 30

type Accounts = Record<string, Profile>

function readAccounts(): Accounts {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}') as Accounts
  } catch {
    return {}
  }
}

function writeAccounts(accounts: Accounts): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function delay<T>(value: T, ms = 350): Promise<T> {
  // Simulated latency, so loading and disabled states are actually visible
  // during review instead of flashing past.
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const mockAuth: AuthAdapter = {
  method: 'otp',

  async signInWithPassword(): Promise<AuthResult> {
    return delay({ ok: false, error: 'This site signs in with a one-time code, not a password.' })
  },

  async register(input: RegistrationInput): Promise<AuthResult> {
    if (!input.consent) {
      return delay({ ok: false, error: 'Please accept the Privacy Policy to continue' })
    }

    const accounts = readAccounts()
    if (accounts[input.mobile]) {
      // Mirrors the unique index on profiles.mobile.
      return delay({
        ok: false,
        error: 'An account already exists for this number. Sign in instead.',
      })
    }

    const profile: Profile = {
      id: `mock-${input.mobile}`,
      mobile: input.mobile,
      name: input.name,
      company: input.company?.trim() || null,
      email: input.email?.trim() || null,
      is_premium: false,
      consent_at: new Date().toISOString(),
      extra: input.extra ?? {},
      created_at: new Date().toISOString(),
    }

    accounts[input.mobile] = profile
    writeAccounts(accounts)
    localStorage.setItem(SESSION_KEY, input.mobile)

    return delay({ ok: true, profile })
  },

  async requestOtp(mobile: string): Promise<OtpRequestResult> {
    const accounts = readAccounts()
    if (!accounts[mobile]) {
      return delay({ ok: false, error: 'No account found for this number. Register first.' })
    }

    localStorage.setItem(PENDING_KEY, mobile)
    return delay({ ok: true, retryAfter: RESEND_SECONDS, devCode: DEV_CODE })
  },

  async verifyOtp(mobile: string, code: string): Promise<AuthResult> {
    if (code.trim() !== DEV_CODE) {
      return delay({ ok: false, error: 'That code is not correct' })
    }

    const profile = readAccounts()[mobile]
    if (!profile) return delay({ ok: false, error: 'No account found for this number' })

    localStorage.setItem(SESSION_KEY, mobile)
    localStorage.removeItem(PENDING_KEY)
    return delay({ ok: true, profile })
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(PENDING_KEY)
  },

  currentProfile(): Profile | null {
    const mobile = localStorage.getItem(SESSION_KEY)
    if (!mobile) return null
    return readAccounts()[mobile] ?? null
  },
}

/**
 * Review helper: marks the signed-in mock account premium, which the admin
 * does by hand in the real system (scope §F). Used by the preview bar only.
 */
export function setMockPremium(isPremium: boolean): void {
  const mobile = localStorage.getItem(SESSION_KEY)
  if (!mobile) return
  const accounts = readAccounts()
  const profile = accounts[mobile]
  if (!profile) return
  accounts[mobile] = { ...profile, is_premium: isPremium }
  writeAccounts(accounts)
}
