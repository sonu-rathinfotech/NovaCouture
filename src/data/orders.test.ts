import { describe, expect, it } from 'vitest'
import { missingCompanyDetails } from './orders'
import type { CompanySettings } from '@/types/db'

/**
 * The gate on issuing an invoice.
 *
 * This is the check that stops a proforma going out with a blank bank account
 * or GST number — a document a retailer may pay against. The database enforces
 * it too, inside public.issue_order() (migration 0012); this copy exists so the
 * admin sees the reason before clicking rather than as an error afterwards.
 * The two must agree, so the required set is asserted rather than assumed.
 */

const COMPLETE: CompanySettings = {
  legal_name: 'Nova Couture Private Limited',
  address: '12 Example Road, Bengaluru',
  phone: '+91 80 0000 0000',
  email: 'orders@example.com',
  gst_number: '29AAAAA0000A1Z5',
  bank_name: 'Example Bank',
  bank_account_name: 'Nova Couture Private Limited',
  bank_account_number: '000111222333',
  bank_ifsc: 'EXMP0000123',
  bank_branch: 'MG Road',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('missingCompanyDetails', () => {
  it('passes a fully filled record', () => {
    expect(missingCompanyDetails(COMPLETE)).toEqual([])
  })

  it('blocks when nothing has been set up at all', () => {
    expect(missingCompanyDetails(null)).toHaveLength(1)
  })

  it('names each missing field so the admin knows what to fill', () => {
    const blank = missingCompanyDetails({
      ...COMPLETE,
      legal_name: null,
      gst_number: null,
      bank_account_number: null,
      bank_ifsc: null,
    })
    expect(blank).toEqual([
      'Registered business name',
      'GST number',
      'Bank account number',
      'IFSC code',
    ])
  })

  it('blocks on a missing bank account number alone', () => {
    // The single most damaging blank on the document: an invoice that looks
    // payable but names no account.
    expect(missingCompanyDetails({ ...COMPLETE, bank_account_number: null })).toEqual([
      'Bank account number',
    ])
  })

  it('blocks on a missing IFSC alone', () => {
    expect(missingCompanyDetails({ ...COMPLETE, bank_ifsc: null })).toEqual(['IFSC code'])
  })

  /**
   * Bank name, account name and branch are printed but not required. They are
   * descriptive; the account number and IFSC are what money moves on. Pinned
   * here so nobody quietly promotes a nice-to-have into a blocker, or the
   * reverse.
   */
  it('does not block on the descriptive bank fields', () => {
    expect(
      missingCompanyDetails({
        ...COMPLETE,
        bank_name: null,
        bank_account_name: null,
        bank_branch: null,
        address: null,
        phone: null,
        email: null,
      }),
    ).toEqual([])
  })
})
