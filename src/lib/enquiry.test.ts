import { describe, expect, it } from 'vitest'
import { buildEnquiryMailto, enquiryVisibleTo } from './enquiry'

/**
 * mailto encoding is easy to get subtly wrong, and the failure mode is silent:
 * the visitor's mail client opens with a body truncated at the first bad
 * character, and VK receives an enquiry missing the mobile number.
 */

const BASE = {
  name: 'Anjali Rao',
  mobile: '+919876543210',
  productName: 'Rivière Tennis Line',
  productUrl: 'https://vkjewellers.example/p/riviere-tennis-line',
}

/** Decode a mailto header back to what the mail client would show. */
function header(href: string, key: 'subject' | 'body'): string {
  const match = new RegExp(`[?&]${key}=([^&]*)`).exec(href)
  return decodeURIComponent(match![1])
}

describe('buildEnquiryMailto', () => {
  it('refuses to build a link when no address is configured', () => {
    const result = buildEnquiryMailto('', BASE)
    expect(result.ok).toBe(false)
    expect(result.href).toBeUndefined()
  })

  it('addresses the mail to the configured enquiry inbox', () => {
    const { href } = buildEnquiryMailto('enquiries@vkjewellers.example', BASE)
    expect(href!.startsWith('mailto:enquiries%40vkjewellers.example?')).toBe(true)
  })

  it('names the product in the subject', () => {
    const { href } = buildEnquiryMailto('e@x.com', BASE)
    expect(header(href!, 'subject')).toBe('Enquiry: Rivière Tennis Line')
  })

  it('preserves the leading + on the mobile number', () => {
    // A raw + inside a mailto body is read as a space by some clients, which
    // would turn +919876543210 into ' 919876543210'.
    const { href } = buildEnquiryMailto('e@x.com', BASE)
    expect(href).not.toContain('+919876543210')
    expect(header(href!, 'body')).toContain('Mobile: +919876543210')
  })

  it('includes the product reference and a link back to it', () => {
    const body = header(buildEnquiryMailto('e@x.com', BASE).href!, 'body')
    expect(body).toContain('Product: Rivière Tennis Line')
    expect(body).toContain(BASE.productUrl)
  })

  it('omits company and message when they are blank', () => {
    const body = header(
      buildEnquiryMailto('e@x.com', { ...BASE, company: '   ', message: '' }).href!,
      'body',
    )
    expect(body).not.toContain('Company:')
    expect(body).not.toContain('Message:')
  })

  it('includes company and message when supplied', () => {
    const body = header(
      buildEnquiryMailto('e@x.com', {
        ...BASE,
        company: 'Rao & Sons',
        message: 'Could you send more views?',
      }).href!,
      'body',
    )
    expect(body).toContain('Company: Rao & Sons')
    expect(body).toContain('Could you send more views?')
  })

  it('encodes characters that would otherwise end the header early', () => {
    const { href } = buildEnquiryMailto('e@x.com', {
      ...BASE,
      productName: 'A&B "quoted" #1 ?maybe',
      message: 'Line one\nLine two & more',
    })
    // Neither & nor # may appear raw — both would truncate the value.
    const afterQuery = href!.slice(href!.indexOf('?') + 1)
    const rawSeparators = afterQuery.split('&').length - 1
    expect(rawSeparators).toBe(1) // only the subject/body separator
    expect(afterQuery).not.toContain('#')
    expect(header(href!, 'subject')).toBe('Enquiry: A&B "quoted" #1 ?maybe')
  })

  it('uses CRLF line breaks', () => {
    const { href } = buildEnquiryMailto('e@x.com', BASE)
    expect(href).toContain('%0D%0A')
  })
})

describe('enquiryVisibleTo', () => {
  it('always shows the enquiry to premium clients', () => {
    expect(enquiryVisibleTo('premium', false)).toBe(true)
    expect(enquiryVisibleTo('premium', true)).toBe(true)
  })

  it('never shows the enquiry to guests, whatever the flag says', () => {
    expect(enquiryVisibleTo('guest', false)).toBe(false)
    expect(enquiryVisibleTo('guest', true)).toBe(false)
  })

  it('shows it to registered users only when the flag is on', () => {
    // Open client question — the scope says "to be decided later", so the
    // default must stay off until VK Jewellers decides.
    expect(enquiryVisibleTo('registered', false)).toBe(false)
    expect(enquiryVisibleTo('registered', true)).toBe(true)
  })
})
