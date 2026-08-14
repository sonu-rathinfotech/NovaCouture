import type { Tier } from '@/types/db'

/**
 * Enquiry mailto builder (scope §D).
 *
 * On submit the enquiry opens a pre-filled email to a VK Jewellers address.
 * There is no server involved, which is what the signed scope specifies.
 *
 * Known limitation, stated plainly for the client: mailto: depends on the
 * visitor having a mail client configured, and leaves VK with no record of the
 * enquiry unless the visitor actually sends it. Reliable capture would mean
 * storing the enquiry and sending server-side — a change request, not a bug.
 */

/**
 * Who sees the enquiry button (scope §D):
 *   premium    — always
 *   guest      — never
 *   registered — "to be decided later", so it sits behind a flag that
 *                defaults off. This is an open client question (PLAN.md §6).
 */
export function enquiryVisibleTo(tier: Tier, allowRegistered: boolean): boolean {
  switch (tier) {
    case 'premium':
      return true
    case 'registered':
      return allowRegistered
    case 'guest':
      return false
  }
}

export interface EnquiryInput {
  name: string
  company?: string
  mobile: string
  productName: string
  productUrl: string
  message?: string
}

export interface MailtoResult {
  ok: boolean
  href?: string
  error?: string
}

/**
 * RFC 6068: within a mailto URL the header values are percent-encoded, and
 * encodeURIComponent leaves a few characters that must not survive there.
 * Getting this wrong truncates the body at the first stray character.
 */
function encodeHeader(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    // A literal + in a mailto body is decoded as a space by some clients,
    // which mangles the +91 in every mobile number we send.
    .replace(/%2B/g, '%2B')
}

export function buildEnquiryMailto(to: string, input: EnquiryInput): MailtoResult {
  if (!to) {
    return {
      ok: false,
      error: 'No enquiry address is configured yet.',
    }
  }

  const subject = `Enquiry: ${input.productName}`

  const lines = [
    `Product: ${input.productName}`,
    `Link: ${input.productUrl}`,
    '',
    `Name: ${input.name}`,
  ]

  if (input.company?.trim()) lines.push(`Company: ${input.company.trim()}`)
  lines.push(`Mobile: ${input.mobile}`)

  if (input.message?.trim()) {
    lines.push('', 'Message:', input.message.trim())
  }

  // CRLF: the line break mailto clients agree on.
  const body = lines.join('\r\n')

  return {
    ok: true,
    href: `mailto:${encodeHeader(to)}?subject=${encodeHeader(subject)}&body=${encodeHeader(body)}`,
  }
}
