/**
 * Typed environment access.
 *
 * Deliberately does not throw at import time: a missing .env.local should
 * produce a readable setup notice, not a blank screen. `isConfigured` is what
 * the app checks.
 */

function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

// Supabase is renaming the browser-safe key from "anon" to "publishable", and
// the dashboard now shows the newer name. Accept either, so copying the value
// straight from the dashboard cannot silently leave the app in fixture mode.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  ''

export const env = {
  /** Falls back to the default local Supabase URL so createClient stays valid. */
  supabaseUrl: supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey: supabaseAnonKey || 'anon-key-not-set',

  /** VK Jewellers enquiry inbox. Scope §D — mailto delivery. */
  enquiryEmail: import.meta.env.VITE_ENQUIRY_EMAIL ?? '',
} as const

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Feature flags. Both are open questions in the signed scope, so they must
 * stay one-line switches — not code changes. See PLAN.md §6, items 1 and 3.
 */
export const features = {
  /** Scope §D: "Whether registered (non-premium) users see it will be
   *  decided later." Default off — premium only. */
  enquiryForRegistered: flag(import.meta.env.VITE_FEATURE_ENQUIRY_FOR_REGISTERED),

  /** Scope §B: live WhatsApp OTP login. Off until the Business API and an
   *  approved OTP template exist; interim credential login is used meanwhile. */
  otpLogin: flag(import.meta.env.VITE_FEATURE_OTP_LOGIN),

  /**
   * Scope §G marks per-product view tracking in curated links as "(optional)".
   * Default OFF: it records which pieces a named client looked at, which is a
   * decision for VK Jewellers to take deliberately — and the Privacy Policy
   * has to describe it before it is switched on.
   */
  collectionProductViews: flag(import.meta.env.VITE_FEATURE_COLLECTION_PRODUCT_VIEWS),
} as const
