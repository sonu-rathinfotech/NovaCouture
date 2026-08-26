import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { selectAuthMode } from '@/auth'

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8')

/**
 * The administrator must always be able to get in with a password.
 *
 * Client sign-in switches to WhatsApp codes the moment VITE_FEATURE_OTP_LOGIN
 * is turned on. If the admin panel ever went through that same adapter, then
 * administering the site would depend on the WhatsApp provider being up — and
 * a rejected message template would lock Nova Couture out of the one screen they need in
 * order to fix it.
 *
 * It does not today: the panel calls Supabase's password sign-in directly.
 * These tests exist so that a later refactor "tidying up" the duplication
 * cannot quietly take that door away.
 */
describe('the admin door does not depend on WhatsApp', () => {
  it('client sign-in does switch to codes when the flag is on', () => {
    expect(selectAuthMode(true, true)).toBe('whatsapp')
    expect(selectAuthMode(true, false)).toBe('supabase')
  })

  it('admin sign-in asks for a password, whatever the flag says', () => {
    const source = read('./AdminSignIn.tsx')
    expect(source).toContain('signInWithPassword')
    expect(source).not.toContain("from '@/auth'")
    expect(source).not.toMatch(/requestOtp|verifyOtp|authMode/)
  })

  it('the admin shell does not route sign-in through the adapter either', () => {
    const source = read('./AdminLayout.tsx')
    expect(source).not.toContain("from '@/auth'")
  })
})
