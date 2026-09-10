#!/usr/bin/env node
/**
 * Creates or promotes the administrator (scope §F).
 *
 *   node tools/grant-admin.mjs <email> [password]
 *   node tools/grant-admin.mjs --list
 *   node tools/grant-admin.mjs --revoke <email>
 *
 * Runs with the service-role key, from a terminal. Deliberately not a screen:
 * `admin_users` has no write policy at all, so an administrator cannot appoint
 * another one from the browser, and a compromised admin session cannot widen
 * its own reach. Adding an admin is a decision taken at the keyboard.
 *
 * The scope specifies a single administrator. Nothing here enforces that —
 * it lists what exists so a second one cannot appear unnoticed.
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
if (!URL_BASE || !SERVICE_KEY) throw new Error('Missing VITE_SUPABASE_URL / service_role')

const admin = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...admin, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function findUser(email) {
  const res = await fetch(
    `${URL_BASE}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers: admin },
  )
  if (!res.ok) return null
  const body = await res.json()
  return (body.users ?? []).find((u) => u.email === email) ?? null
}

async function list() {
  const rows = await rest('admin_users?select=id,note,created_at')
  console.log('')
  if (rows.length === 0) {
    console.log('  No administrators. Create one:')
    console.log('    node tools/grant-admin.mjs admin@vkjewellers.com')
  }
  for (const row of rows) {
    const user = await fetch(`${URL_BASE}/auth/v1/admin/users/${row.id}`, { headers: admin })
    const body = user.ok ? await user.json() : {}
    console.log(`  · ${body.email ?? row.id}   ${row.note ?? ''}`)
  }
  if (rows.length > 1) {
    console.log('')
    console.log(`  NOTE: ${rows.length} administrators exist. The scope specifies one.`)
  }
  console.log('')
}

async function revoke(email) {
  const user = await findUser(email)
  if (!user) throw new Error(`No account for ${email}`)
  await rest(`admin_users?id=eq.${user.id}`, { method: 'DELETE' })
  console.log(`\n  Removed admin rights from ${email}. The account still exists.\n`)
}

async function grant(email, providedPassword) {
  let user = await findUser(email)
  let password = providedPassword ?? null
  let created = false

  if (!user) {
    password = password ?? `vk-${randomBytes(9).toString('base64url')}`
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
      method: 'POST',
      headers: admin,
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    if (!res.ok) throw new Error(`creating ${email}: ${await res.text()}`)
    user = await res.json()
    created = true
  } else if (password) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({ password, email_confirm: true }),
    })
    if (!res.ok) throw new Error(`updating ${email}: ${await res.text()}`)
  }

  await rest('admin_users?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: user.id, note: 'VK Jewellers administrator' }),
  })

  console.log('')
  console.log(`  ${created ? 'Created' : 'Promoted'} administrator: ${email}`)
  if (password) {
    console.log(`  Password: ${password}`)
    const outDir = join(ROOT, 'supabase', '.generated')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(
      join(outDir, 'admin-account.txt'),
      `VK Jewellers administrator\n\n  email    : ${email}\n  password : ${password}\n\nChange this before go-live.\n`,
      'utf8',
    )
    console.log('  Saved to supabase/.generated/admin-account.txt (gitignored)')
  }
  console.log('')
  console.log('  Sign in at /admin')
  console.log('')
}

const args = process.argv.slice(2)

if (args[0] === '--list') {
  await list()
} else if (args[0] === '--revoke') {
  if (!args[1]) throw new Error('Usage: --revoke <email>')
  await revoke(args[1])
} else if (args[0]) {
  await grant(args[0], args[1])
} else {
  console.error('Usage: node tools/grant-admin.mjs <email> [password] | --list | --revoke <email>')
  process.exit(2)
}
