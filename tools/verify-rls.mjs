#!/usr/bin/env node
/**
 * Verifies the access rules from OUTSIDE the database, over the same REST API
 * the browser uses, with real session tokens.
 *
 *   node tools/verify-rls.mjs
 *
 * This is the check that matters. The unit tests prove the JavaScript fixture
 * stand-in behaves correctly; they say nothing about whether the RLS policies
 * do. This talks to the real project and asks the questions an attacker would.
 *
 * Guest runs with the publishable key alone. Registered and premium sign in
 * with the temporary review accounts (scope §B) created by
 * tools/create-review-accounts.mjs, so every cell of the 3x3 matrix is
 * exercised at the privilege level it describes.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
const KEY = e.VITE_SUPABASE_ANON_KEY || e.VITE_SUPABASE_PUBLISHABLE_KEY

if (!URL_BASE || !KEY) {
  console.error('Missing VITE_SUPABASE_URL / key in .env(.local)')
  process.exit(2)
}

/** Administrator credentials, as written by grant-admin.mjs. */
function adminAccount() {
  const path = join(ROOT, 'supabase', '.generated', 'admin-account.txt')
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8')
  const email = /email\s*:\s*(\S+)/.exec(text)
  const pw = /password\s*:\s*(\S+)/.exec(text)
  return email && pw ? { email: email[1], password: pw[1] } : null
}

/**
 * Admin boundary (scope §F, audit §3).
 *
 * The dangerous direction is not "can the admin work" — it is whether an
 * ordinary client can do admin things. A registered user who can set their own
 * is_premium has just granted themselves the entire premium catalogue.
 */
async function checkAdminBoundary(tokens) {
  const { body: mine } = await rest('profiles?select=id,is_premium', tokens.registered)
  const myId = mine?.[0]?.id

  if (myId) {
    const escalate = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${myId}`, {
      method: 'PATCH',
      headers: { ...headersFor(tokens.registered), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ is_premium: true }),
    })
    let escalated = false
    if (escalate.ok) {
      const rows = await escalate.json().catch(() => [])
      escalated = Array.isArray(rows) && rows.some((r) => r.is_premium === true)
    }
    check('registered CANNOT make themselves premium', !escalated, escalated ? 'ESCALATED' : `HTTP ${escalate.status}`)
  }

  const write = await fetch(`${URL_BASE}/rest/v1/products?slug=eq.${PREMIUM_SLUG}`, {
    method: 'PATCH',
    headers: { ...headersFor(tokens.registered), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ visibility: 'public' }),
  })
  const changed = write.ok && (await write.json().catch(() => [])).length > 0
  check('registered CANNOT change product visibility', !changed, changed ? 'CHANGED' : `HTTP ${write.status}`)

  const others = await rest('profiles?select=id&limit=50', tokens.registered)
  check(
    'registered CANNOT list other clients',
    Array.isArray(others.body) && others.body.length <= 1,
    `${others.body?.length ?? '?'} rows`,
  )

  const metrics = await fetch(`${URL_BASE}/rest/v1/rpc/collection_metrics`, {
    method: 'POST',
    headers: { ...headersFor(tokens.registered), 'Content-Type': 'application/json' },
    body: '{}',
  })
  const rows = metrics.ok ? await metrics.json().catch(() => []) : []
  check('registered CANNOT read link metrics', rows.length === 0, `${rows.length} rows`)

  // Storage writes: the admin uploads photography from the browser, so the
  // bucket policy must admit them — and must not admit anyone else.
  const probePath = 'products/00000000-0000-4000-8000-000000000000/1.jpg'
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9])

  const clientUpload = await fetch(
    `${URL_BASE}/storage/v1/object/product-images/${probePath}`,
    {
      method: 'POST',
      headers: { ...headersFor(tokens.registered), 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: jpeg,
    },
  )
  check('registered CANNOT upload to the image bucket', clientUpload.status >= 400, `HTTP ${clientUpload.status}`)

  if (!tokens.admin) return

  const adminProfiles = await rest('profiles?select=id&limit=50', tokens.admin)
  check(
    'admin CAN list every client',
    Array.isArray(adminProfiles.body) && adminProfiles.body.length > 1,
    `${adminProfiles.body?.length ?? '?'} rows`,
  )

  const adminMetrics = await fetch(`${URL_BASE}/rest/v1/rpc/collection_metrics`, {
    method: 'POST',
    headers: { ...headersFor(tokens.admin), 'Content-Type': 'application/json' },
    body: '{}',
  })
  check('admin CAN read link metrics', adminMetrics.status === 200, `HTTP ${adminMetrics.status}`)

  // Change a visibility and put it straight back, so the check leaves no trace.
  const flip = await fetch(`${URL_BASE}/rest/v1/products?slug=eq.${LOGIN_SLUG}`, {
    method: 'PATCH',
    headers: { ...headersFor(tokens.admin), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ visibility: 'premium_only' }),
  })
  const ok = flip.ok && (await flip.json().catch(() => [])).length > 0
  check('admin CAN change product visibility', ok, `HTTP ${flip.status}`)

  await fetch(`${URL_BASE}/rest/v1/products?slug=eq.${LOGIN_SLUG}`, {
    method: 'PATCH',
    headers: { ...headersFor(tokens.admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ visibility: 'login_required' }),
  })

  const adminUpload = await fetch(
    `${URL_BASE}/storage/v1/object/product-images/${probePath}`,
    {
      method: 'POST',
      headers: { ...headersFor(tokens.admin), 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: jpeg,
    },
  )
  check('admin CAN upload to the image bucket', adminUpload.status < 400, `HTTP ${adminUpload.status}`)

  if (adminUpload.status < 400) {
    const removed = await fetch(`${URL_BASE}/storage/v1/object/product-images`, {
      method: 'DELETE',
      headers: { ...headersFor(tokens.admin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [probePath] }),
    })
    check('admin CAN remove an image', removed.status < 400, `HTTP ${removed.status}`)
  }
}

/** Review-account credentials, as written by create-review-accounts.mjs. */
function reviewAccounts() {
  const path = join(ROOT, 'supabase', '.generated', 'review-accounts.txt')
  if (!existsSync(path)) return {}

  const text = readFileSync(path, 'utf8')
  const found = {}
  let currentEmail = null
  for (const line of text.split('\n')) {
    const email = /email\s*:\s*(\S+)/.exec(line)
    if (email) currentEmail = email[1]
    const pw = /password\s*:\s*(\S+)/.exec(line)
    if (pw && currentEmail) {
      if (currentEmail.includes('premium')) found.premium = { email: currentEmail, password: pw[1] }
      else found.registered = { email: currentEmail, password: pw[1] }
      currentEmail = null
    }
  }
  return found
}

async function signIn(account) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  if (!res.ok) return null
  const body = await res.json()
  return body.access_token ?? null
}

function headersFor(token) {
  return { apikey: KEY, Authorization: `Bearer ${token ?? KEY}` }
}

async function rest(path, token) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: headersFor(token) })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* no body */
  }
  return { status: res.status, body }
}

const results = []
const check = (name, pass, detail = '') => results.push({ name, pass, detail })

/** The table from the signed scope, §3. */
const MATRIX = {
  guest: { public: true, login_required: false, premium_only: false },
  registered: { public: true, login_required: true, premium_only: false },
  premium: { public: true, login_required: true, premium_only: true },
}

const PREMIUM_SLUG = 'padma-bridal-set'
const LOGIN_SLUG = 'anjali-layered-chain'

/** Id of the premium test product, discovered with a premium token. */
let premiumProductId = null

async function checkTier(tier, token) {
  const listed = await rest('products?select=slug,visibility&limit=500', token)
  const rows = Array.isArray(listed.body) ? listed.body : []
  const levels = new Set(rows.map((r) => r.visibility))

  for (const [level, allowed] of Object.entries(MATRIX[tier])) {
    const has = levels.has(level)
    check(
      `${tier.padEnd(10)} ${allowed ? 'sees    ' : 'CANNOT see'} ${level}`,
      has === allowed,
      has === allowed ? '' : allowed ? 'MISSING' : 'LEAKED',
    )
  }

  // Direct probing by exact slug, the way someone would actually try.
  for (const [slug, level] of [
    [PREMIUM_SLUG, 'premium_only'],
    [LOGIN_SLUG, 'login_required'],
  ]) {
    const probe = await rest(`products?select=slug&slug=eq.${slug}`, token)
    const got = Array.isArray(probe.body) && probe.body.length > 0
    const allowed = MATRIX[tier][level]
    check(`${tier.padEnd(10)} direct slug probe: ${level}`, got === allowed, got === allowed ? '' : 'MISMATCH')
  }

  // Galleries are never gated separately — if the product is visible, all of
  // its images are (scope §1).
  //
  // Match on product_id, not on the path: uploaded objects are keyed by id
  // (products/<uuid>/<n>.jpg), so a slug-based check silently stopped testing
  // anything the moment real uploads replaced the seed/<slug> placeholders.
  const images = await rest('product_images?select=product_id,storage_path&limit=1000', token)
  const imageRows = Array.isArray(images.body) ? images.body : []
  const hasPremiumImages = premiumProductId
    ? imageRows.some((i) => i.product_id === premiumProductId)
    : imageRows.some((i) => i.storage_path.includes(PREMIUM_SLUG))
  check(
    `${tier.padEnd(10)} ${MATRIX[tier].premium_only ? 'sees    ' : 'CANNOT see'} premium gallery images`,
    hasPremiumImages === MATRIX[tier].premium_only,
    hasPremiumImages === MATRIX[tier].premium_only ? '' : 'MISMATCH',
  )

  // Nobody may write through the browser key.
  const write = await fetch(`${URL_BASE}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headersFor(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'rls probe', slug: `rls-probe-${Date.now()}`, visibility: 'public' }),
  })
  check(`${tier.padEnd(10)} cannot insert a product`, write.status >= 400, `HTTP ${write.status}`)

  // Curated link: premium only (scope §G).
  const rpc = await fetch(`${URL_BASE}/rest/v1/rpc/get_collection`, {
    method: 'POST',
    headers: { ...headersFor(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: 'seed-token-diwali-preview-2026' }),
  })
  const opened = rpc.status === 200
  check(
    `${tier.padEnd(10)} ${MATRIX[tier].premium_only ? 'opens   ' : 'DENIED  '} the curated link`,
    opened === MATRIX[tier].premium_only,
    `HTTP ${rpc.status}`,
  )
}

/**
 * Signed-URL access (audit §1).
 *
 * `paths` are real object paths discovered with a premium token, then probed
 * by every tier — which is exactly what someone who had seen a premium gallery
 * and kept the path would try.
 */
async function checkStorage(tier, token, paths) {
  for (const [label, path, allowed] of [
    ['public', paths.public, true],
    ['premium', paths.premium, MATRIX[tier].premium_only],
  ]) {
    if (!path) continue

    const res = await fetch(`${URL_BASE}/storage/v1/object/sign/product-images/${path}`, {
      method: 'POST',
      headers: { ...headersFor(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
    })
    const signed = res.status === 200

    check(
      `${tier.padEnd(10)} ${allowed ? 'can sign  ' : 'CANNOT sign'} a ${label} image URL`,
      signed === allowed,
      `HTTP ${res.status}`,
    )
  }
}

async function checkPrivacy(tier, token) {
  // A client must never be able to read another client's details.
  const profiles = await rest('profiles?select=mobile,name&limit=50', token)
  const rows = Array.isArray(profiles.body) ? profiles.body : []
  const limit = tier === 'guest' ? 0 : 1
  check(
    `${tier.padEnd(10)} sees ${limit} profile row${limit === 1 ? '' : 's'} (own only)`,
    rows.length === limit,
    `${rows.length} rows`,
  )
}

async function run() {
  const probe = await rest('products?select=slug&limit=1')
  if (probe.status === 404) {
    console.error('\n  The schema is not applied yet — public.products does not exist.\n')
    process.exit(1)
  }

  const accounts = reviewAccounts()
  const tokens = { guest: null }

  const adminCreds = adminAccount()
  if (adminCreds) {
    tokens.admin = await signIn(adminCreds)
    check('admin      account can sign in', Boolean(tokens.admin))
  }

  for (const tier of ['registered', 'premium']) {
    if (!accounts[tier]) continue
    tokens[tier] = await signIn(accounts[tier])
    check(`${tier.padEnd(10)} review account can sign in`, Boolean(tokens[tier]))
  }

  // Discover real object paths using the most privileged token available.
  const paths = { public: null, premium: null }
  if (tokens.premium) {
    const { body } = await rest(`products?select=id&slug=eq.${PREMIUM_SLUG}`, tokens.premium)
    premiumProductId = body?.[0]?.id ?? null

    for (const [key, slug] of [['public', 'meera-temple-haram'], ['premium', PREMIUM_SLUG]]) {
      const { body } = await rest(
        `products?select=slug,product_images(storage_path)&slug=eq.${slug}`,
        tokens.premium,
      )
      const path = body?.[0]?.product_images?.[0]?.storage_path
      // Placeholder rows are not in the bucket, so there is nothing to sign.
      if (path && !path.startsWith('seed/')) paths[key] = path
    }
  }

  for (const tier of ['guest', 'registered', 'premium']) {
    if (tier !== 'guest' && !tokens[tier]) continue
    await checkTier(tier, tokens[tier])
    await checkPrivacy(tier, tokens[tier])
    await checkStorage(tier, tokens[tier], paths)
  }

  if (!paths.premium) {
    console.log('')
    console.log('  NOTE: images are still placeholder rows, so signed-URL access was')
    console.log('        not tested. Run: npm run db:upload-samples')
  }

  if (tokens.registered) await checkAdminBoundary(tokens)

  // Storage must not be readable without a signed URL.
  const object = await fetch(
    `${URL_BASE}/storage/v1/object/public/product-images/seed/${PREMIUM_SLUG}-1.jpg`,
  )
  check('product-images bucket is not publicly readable', object.status >= 400, `HTTP ${object.status}`)

  console.log('')
  let failed = 0
  for (const r of results) {
    if (!r.pass) failed++
    console.log(`  [${r.pass ? ' ok ' : 'FAIL'}] ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
  }

  console.log('')
  console.log(`  ${results.length - failed}/${results.length} checks passed`)

  const missing = ['registered', 'premium'].filter((t) => !tokens[t])
  if (missing.length > 0) {
    console.log(`  NOT VERIFIED: ${missing.join(', ')} — run tools/create-review-accounts.mjs`)
  }
  console.log('')

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
