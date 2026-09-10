import { describe, expect, it } from 'vitest'
import { missingCompanyDetails } from './orders'
import type { CompanySettings } from '@/types/db'

/**
 * The gate on issuing an invoice.
 *
 * This is the check that stops a quotation going out with a blank bank account
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
  pan: 'AAAAA0000A',
  state: 'Karnataka',
  state_code: '29',
  default_hsn_code: '7113',
  invoice_declaration: 'Not a tax invoice.',
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
    const blank = missingCompanyDetails({ ...COMPLETE, legal_name: null, gst_number: null })
    expect(blank).toEqual(['Registered business name', 'GST number'])
  })

  it('blocks on a missing GSTIN alone', () => {
    // The identifying block is the whole point of the document. Without it
    // there is nothing an accounts department can file the quotation against.
    expect(missingCompanyDetails({ ...COMPLETE, gst_number: null })).toEqual(['GST number'])
  })

  /**
   * Bank details were required until migration 0014, on the grounds that an
   * invoice a retailer may pay against must not carry a blank account number.
   * The document states no amounts at all, so nothing is payable against it,
   * and the requirement was blocking every order over details the client had
   * never been asked for. Pinned here so the reasoning is not quietly undone
   * in one direction or the other -- this must agree with issue_order().
   */
  it('does not block on bank details, which are optional', () => {
    expect(
      missingCompanyDetails({
        ...COMPLETE,
        bank_name: null,
        bank_account_name: null,
        bank_account_number: null,
        bank_ifsc: null,
        bank_branch: null,
      }),
    ).toEqual([])
  })

  it('does not block on the descriptive or GST-optional fields', () => {
    expect(
      missingCompanyDetails({
        ...COMPLETE,
        address: null,
        phone: null,
        email: null,
        pan: null,
        state: null,
        state_code: null,
        default_hsn_code: null,
        invoice_declaration: null,
      }),
    ).toEqual([])
  })
})
