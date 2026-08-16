import { describe, expect, it } from 'vitest'
import { selectAuthMode } from './index'
import { unavailableAuth } from './unavailableAuth'

/**
 * Adapter selection is a correctness boundary, not a preference.
 *
 * The mock adapter stores accounts in localStorage. If it were still selected
 * once Supabase was configured, registration would report success while the
 * session provider — reading the real Supabase session — still saw a guest.
 * The visitor would believe they had an account and never see the catalogue
 * they registered for.
 */
describe('selectAuthMode', () => {
  it('uses the mock only while Supabase is unconfigured', () => {
    expect(selectAuthMode(false, false)).toBe('mock')
    expect(selectAuthMode(false, true)).toBe('mock')
  })

  it('never uses the mock once Supabase is configured', () => {
    expect(selectAuthMode(true, false)).not.toBe('mock')
    expect(selectAuthMode(true, true)).not.toBe('mock')
  })
})

describe('unavailableAuth', () => {
  it('refuses to register instead of reporting a false success', async () => {
    const result = await unavailableAuth.register({
      mobile: '+919876543210',
      name: 'Anjali Rao',
      consent: true,
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.profile).toBeUndefined()
  })

  it('refuses to send or verify a code', async () => {
    expect((await unavailableAuth.requestOtp('+919876543210')).ok).toBe(false)
    expect((await unavailableAuth.verifyOtp('+919876543210', '123456')).ok).toBe(false)
  })

  it('never reports a signed-in profile', () => {
    expect(unavailableAuth.currentProfile()).toBeNull()
  })

  it('explains itself rather than failing blankly', async () => {
    const { error } = await unavailableAuth.register({
      mobile: '+919876543210',
      name: 'Anjali Rao',
      consent: true,
    })
    expect(error).toMatch(/not connected/i)
  })
})

describe('selectAuthMode — live modes', () => {
  it('uses the WhatsApp adapter when the OTP flag is on', () => {
    // Scope §B: this is the destination. The flag is what flips it, so it
    // must actually reach whatsappAuth rather than the refusal adapter.
    expect(selectAuthMode(true, true)).toBe('whatsapp')
  })

  it('uses the interim credential adapter when the OTP flag is off', () => {
    expect(selectAuthMode(true, false)).toBe('supabase')
  })

  it('never reaches a live mode without Supabase', () => {
    expect(selectAuthMode(false, true)).toBe('mock')
    expect(selectAuthMode(false, false)).toBe('mock')
  })
})
