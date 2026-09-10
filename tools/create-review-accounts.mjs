#!/usr/bin/env node
/**
 * Creates the two temporary review accounts described in scope §B:
 * "the gated areas are accessed using a temporary credential so the rest of
 * the platform can be built and reviewed without waiting for the API."
 *
 *   node tools/create-review-accounts.mjs
 *
 * One registered (non-premium) and one premium client. They exist so the
 * remaining six cells of the access matrix can be verified against the real
 * database, and so the client can be shown working gated access before the
 * WhatsApp Business API arrives.
 *
 * Uses the service-role key, which bypasses RLS — so it runs here, from a
 * terminal, and never from the browser. `is_premium` is set the same way the
 * admin panel eventually will: server-side only.
 *
 * Re-running is safe: existing accounts are updated, not duplicated.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function env() {
  const values = {}
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#') || t.startsWith('//')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      if (values[k] === undefined) values[k] = t.slice(i + 1).trim()
    }
  }
  return values
}

const e = env()
const URL_BASE = e.VITE_SUPABASE_URL
const SERVICE_KEY = e.service_role || e.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE) throw new Error('VITE_SUPABASE_URL is not set')
if (!SERVICE_KEY) throw new Error('service_role key is not set in .env')

const admin = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

/** Readable but not guessable. These are shared with the client by hand. */
function password() {
  return `vk-${randomBytes(9).toString('base64url')}`
}

const ACCOUNTS = [
  {
    label: 'Registered (non-premium)',
    email: 'review-registered@vkjewellers.invalid',
    mobile: '+919000000001',
    name: 'Review — Registered Client',
    isPremium: false,
  },
  {
    label: 'Premium',
    email: 'review-premium@vkjewellers.invalid',
    mobile: '+919000000002',
    name: 'Review — Premium Client',
    isPremium: true,
  },
]

async function findUser(email) {
  const res = await fetch(
    `${URL_BASE}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers: admin },
  )
  if (!res.ok) return null
  const body = await res.json()
  return (body.users ?? []).find((u) => u.email === email) ?? null
}

async function upsertUser(account, pw) {
  const existing = await findUser(account.email)

  if (existing) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ password: pw, email_confirm: true }),
    })
    if (!res.ok) throw new Error(`updating ${account.email}: ${await res.text()}`)
    return { id: existing.id, created: false }
  }

  const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({
      email: account.email,
      password: pw,
      // No mailbox exists for these addresses, so confirm them outright.
      email_confirm: true,
    }),
  })
  if (!res.ok) throw new Error(`creating ${account.email}: ${await res.text()}`)
  const body = await res.json()
  return { id: body.id, created: true }
}

async function upsertProfile(account, userId) {
  const res = await fetch(`${URL_BASE}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: { ...admin, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      id: userId,
      mobile: account.mobile,
      name: account.name,
      company: 'Rath Infotech (review account)',
      is_premium: account.isPremium,
      consent_at: new Date().toISOString(),
      extra: { review_account: true },
    }),
  })
  if (!res.ok) throw new Error(`profile for ${account.email}: ${await res.text()}`)
}

async function run() {
  const created = []

  for (const account of ACCOUNTS) {
    const pw = password()
    const { id, created: isNew } = await upsertUser(account, pw)
    await upsertProfile(account, id)
    created.push({ ...account, password: pw, id, isNew })
    console.log(`  ${isNew ? 'created' : 'updated'}  ${account.email}`)
  }

  const outDir = join(ROOT, 'supabase', '.generated')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, 'review-accounts.txt')

  const lines = [
    'VK Jewellers — temporary review accounts (scope §B)',
    'These replace the WhatsApp OTP login until the Business API is available.',
    'Not for production. Delete both before go-live.',
    '',
  ]
  for (const a of created) {
    lines.push(
      `${a.label}`,
      `  email    : ${a.email}`,
      `  password : ${a.password}`,
      `  mobile   : ${a.mobile}`,
      `  premium  : ${a.isPremium ? 'yes' : 'no'}`,
      '',
    )
  }
  writeFileSync(outFile, lines.join('\n'), 'utf8')

  console.log('')
  console.log(lines.join('\n'))
  console.log(`  Saved to ${outFile} (gitignored)`)
  console.log('')
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
