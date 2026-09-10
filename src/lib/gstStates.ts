/**
 * GST state codes.
 *
 * The first two digits of every GSTIN are the state code, and place of supply
 * on an invoice is stated as the state with its code. These are offered as a
 * list rather than a free-text box for two reasons: the code and the name have
 * to agree, and a buyer typing "Maharastra" into an accounts document creates
 * work for somebody later.
 *
 * Source: the GST state code list published with the GSTIN format. Union
 * territories are included; the codes are not contiguous because some have
 * been merged or reassigned over the years (for example 25 Daman & Diu and 26
 * Dadra & Nagar Haveli were merged into 26).
 */

export interface GstState {
  code: string
  name: string
}

export const GST_STATES: GstState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
]

const BY_CODE = new Map(GST_STATES.map((s) => [s.code, s]))

export function stateForCode(code: string | null | undefined): GstState | undefined {
  return code ? BY_CODE.get(code) : undefined
}

/**
 * The state a GSTIN belongs to, read from its first two digits.
 *
 * Used to fill the state in when a client types their GSTIN, and to catch the
 * case where they then pick a different one -- a GSTIN beginning 27 with
 * Gujarat selected is one of the two being wrong, and it is worth saying so
 * before it reaches a document.
 */
export function stateFromGstin(gstin: string | null | undefined): GstState | undefined {
  const trimmed = (gstin ?? '').trim()
  if (trimmed.length < 2) return undefined
  return BY_CODE.get(trimmed.slice(0, 2))
}

/** 15 characters: 2 state, 10 PAN, 1 entity, 1 'Z', 1 checksum. */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/

export function looksLikeGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value.trim().toUpperCase())
}
