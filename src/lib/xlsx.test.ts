import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildXlsx, columnName, escapeXml, sheetXml } from './xlsx'
import { profilesToRows } from '@/data/admin'
import type { Profile } from '@/types/db'

/**
 * A corrupt export is a bad failure: the admin only finds out when Excel
 * refuses to open it, usually in front of somebody. These check the parts that
 * silently produce an unreadable file.
 *
 * The test also writes a real workbook to F:/tmp so it can be opened by hand.
 */

describe('columnName', () => {
  it('numbers columns the way a spreadsheet does', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
    expect(columnName(27)).toBe('AB')
    expect(columnName(51)).toBe('AZ')
    expect(columnName(52)).toBe('BA')
  })
})

describe('escapeXml', () => {
  it('escapes the characters that would break the XML', () => {
    expect(escapeXml('Rao & Sons')).toBe('Rao &amp; Sons')
    expect(escapeXml('a<b>c')).toBe('a&lt;b&gt;c')
    expect(escapeXml('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('strips control characters', () => {
    // Illegal in XML 1.0 — Excel refuses the whole file, not just the cell.
    expect(escapeXml('Anjali\u0007Rao')).toBe('AnjaliRao')
  })

  it('leaves ordinary accented text alone', () => {
    expect(escapeXml('Rivière')).toBe('Rivière')
  })
})

describe('sheetXml', () => {
  it('writes every cell as an inline string', () => {
    // Inline strings are data, never formulas — so a client named "=Rao"
    // needs no apostrophe prefix and keeps their real name.
    const xml = sheetXml([['=Rao']])
    expect(xml).toContain('t="inlineStr"')
    expect(xml).toContain('=Rao')
    expect(xml).not.toContain("'=Rao")
  })

  it('skips empty cells rather than writing empty elements', () => {
    const xml = sheetXml([['A', '', 'C']])
    expect(xml).toContain('r="A1"')
    expect(xml).not.toContain('r="B1"')
    expect(xml).toContain('r="C1"')
  })

  it('preserves leading and trailing spaces', () => {
    expect(sheetXml([[' padded ']])).toContain('xml:space="preserve"')
  })
})

describe('buildXlsx', () => {
  it('produces a ZIP', async () => {
    const blob = buildXlsx([['Name'], ['Anjali Rao']])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    // "PK\x03\x04"
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04])
  })

  it('declares the spreadsheet MIME type', () => {
    expect(buildXlsx([['a']]).type).toContain('spreadsheetml.sheet')
  })

  it('writes a workbook that can be opened by hand', async () => {
    const profiles: Profile[] = [
      {
        id: 'u-1',
        mobile: '+919876543210',
        name: 'Anjali Rao',
        company: 'Rao & Sons',
        email: 'anjali@example.com',
        is_premium: true,
        consent_at: '2026-05-01T10:00:00.000Z',
        extra: {},
        created_at: '2026-05-01T10:00:00.000Z',
      },
      {
        id: 'u-2',
        mobile: '+919812345678',
        name: '=Rivière "Test" <b>',
        company: null,
        email: null,
        is_premium: false,
        consent_at: null,
        created_at: '2026-06-02T10:00:00.000Z',
        extra: {},
      },
    ]

    const rows = profilesToRows(profiles)
    expect(rows[0][0]).toBe('Name')
    expect(rows[1][4]).toBe('Yes')
    expect(rows[2][4]).toBe('No')
    expect(rows[1][5]).toBe('2026-05-01')

    const blob = buildXlsx(rows, 'Clients')
    const bytes = Buffer.from(await blob.arrayBuffer())
    try {
      writeFileSync('F:/tmp/vk-clients-test.xlsx', bytes)
    } catch {
      // Only a convenience for opening the file by hand; not the assertion.
    }
    expect(bytes.length).toBeGreaterThan(500)
  })
})
