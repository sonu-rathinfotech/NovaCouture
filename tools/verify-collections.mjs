#!/usr/bin/env node
/**
 * End-to-end check of the curated collection link (scope §G).
 *
 *   node tools/verify-collections.mjs
 *
 * Creates a link as the administrator, opens it as each tier, records views,
 * reads the metrics back, disables it, and cleans up. Everything runs over the
 * REST API with real session tokens — the same path the browser takes.
 *
 * The question this answers is not "does the screen work" but "does a
 * forwarded link leak anything". A curated link will be forwarded; that is what
 * clients do with things they like.
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
const ANON = e.VITE_SUPABASE_ANON_KEY || e.VITE_SUPABASE_PUBLISHABLE_KEY
const SERVICE = e.service_role

function credentials(file) {
  const path = join(ROOT, 'supabase', '.generated', file)
  if (!existsSync(path)) return []
  const text = readFileSync(path, 'utf8')
  const out = []
  let email = null
  for (const line of text.split('\n')) {
    const e1 = /email\s*:\s*(\S+)/.exec(line)
    if (e1) email = e1[1]
    const p1 = /password\s*:\s*(\S+)/.exec(line)
    if (p1 && email) {
      out.push({ email, password: p1[1] })
      email = null
    }
  }
  return out
}

const headers = (token) => ({
  apikey: ANON,
  Authorization: `Bearer ${token ?? ANON}`,
  'Content-Type': 'application/json',
})

async function signIn(account) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  })
  return res.ok ? (await res.json()).access_token : null
}

const results = []
const check = (name, pass, detail = '') => results.push({ name, pass, detail })

async function openLink(token, sessionToken) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/get_collection`, {
    method: 'POST',
    headers: headers(sessionToken),
    body: JSON.stringify({ p_token: token }),
  })
  const rows = res.ok ? await res.json().catch(() => []) : []
  const list = Array.isArray(rows) ? rows : []
  // One row per photograph since 0006, so the number of rows is not the number
  // of pieces. Count distinct products, which is what every check below means.
  return {
    status: res.status,
    count: new Set(list.map((r) => r.product_id)).size,
    withImages: list.filter((r) => r.image_path).length,
    rows: list,
  }
}

async function run() {
  const [adminCreds] = credentials('admin-account.txt')
  const reviewers = credentials('review-accounts.txt')
  const premiumCreds = reviewers.find((a) => a.email.includes('premium'))
  const registeredCreds = reviewers.find((a) => !a.email.includes('premium'))

  if (!adminCreds || !premiumCreds || !registeredCreds) {
    console.error('\n  Missing accounts. Run grant-admin.mjs and create-review-accounts.mjs.\n')
    process.exit(2)
  }

  const adminToken = await signIn(adminCreds)
  const premiumToken = await signIn(premiumCreds)
  const registeredToken = await signIn(registeredCreds)
  check('admin, premium and registered can sign in', Boolean(adminToken && premiumToken && registeredToken))

  // --- admin creates a link -------------------------------------------------
  const products = await (
    await fetch(`${URL_BASE}/rest/v1/products?select=id,slug&limit=2`, { headers: headers(adminToken) })
  ).json()

  const createRes = await fetch(`${URL_BASE}/rest/v1/collections`, {
    method: 'POST',
    headers: { ...headers(adminToken), Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'E2E verification link', welcome_message: 'Chosen for you.' }),
  })
  const [collection] = await createRes.json()
  check('admin can create a link', Boolean(collection?.id), `HTTP ${createRes.status}`)
  if (!collection?.id) return report()

  check('the token is long and random', (collection.token ?? '').length >= 32, `${collection.token?.length} chars`)

  await fetch(`${URL_BASE}/rest/v1/collection_items`, {
    method: 'POST',
    headers: headers(adminToken),
    body: JSON.stringify(
      products.map((p, i) => ({ collection_id: collection.id, product_id: p.id, sort_order: i + 1 })),
    ),
  })

  // --- who can open it ------------------------------------------------------
  const asPremium = await openLink(collection.token, premiumToken)
  check('premium opens the link', asPremium.count === products.length, `${asPremium.count} items`)

  const asRegistered = await openLink(collection.token, registeredToken)
  check('registered is denied', asRegistered.count === 0, `HTTP ${asRegistered.status}`)

  const asGuest = await openLink(collection.token, null)
  check('guest is denied', asGuest.count === 0, `HTTP ${asGuest.status}`)

  const wrongToken = await openLink('not-a-real-token-at-all', premiumToken)
  check('an unknown token gives the same answer as a denial', wrongToken.count === 0, `HTTP ${wrongToken.status}`)

  // --- the photographs travel with the link (0006) --------------------------
  check(
    'the link carries its own photographs',
    asPremium.withImages > 0,
    `${asPremium.withImages} image rows`,
  )

  // --- audience: any signed-in client (0006) --------------------------------
  // The case this was built for: a selection sent to a customer who has an
  // account but is not premium. Before 0006 they were told "not available".
  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${collection.id}`, {
    method: 'PATCH',
    headers: headers(adminToken),
    body: JSON.stringify({ min_tier: 'registered' }),
  })

  const regOpens = await openLink(collection.token, registeredToken)
  check('a registered-audience link opens for a registered client', regOpens.count === products.length, `${regOpens.count} pieces`)

  const regPremium = await openLink(collection.token, premiumToken)
  check('and still opens for premium', regPremium.count === products.length, `${regPremium.count} pieces`)

  const regGuest = await openLink(collection.token, null)
  check('but not for a guest', regGuest.count === 0, `HTTP ${regGuest.status}`)

  // --- audience: anyone with the link (0006) --------------------------------
  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${collection.id}`, {
    method: 'PATCH',
    headers: headers(adminToken),
    body: JSON.stringify({ min_tier: 'guest' }),
  })

  const pubGuest = await openLink(collection.token, null)
  check('a public link opens without signing in', pubGuest.count === products.length, `${pubGuest.count} pieces`)

  // The point that matters: making ONE link public must not make anything else
  // public. A guest must still be refused every other link and the catalogue
  // rules must be untouched.
  const otherRes = await fetch(`${URL_BASE}/rest/v1/collections`, {
    method: 'POST',
    headers: { ...headers(adminToken), Prefer: 'return=representation' },
    body: JSON.stringify({ title: 'E2E control link', welcome_message: null }),
  })
  const [control] = await otherRes.json()
  await fetch(`${URL_BASE}/rest/v1/collection_items`, {
    method: 'POST',
    headers: headers(adminToken),
    body: JSON.stringify(products.map((p, i) => ({ collection_id: control.id, product_id: p.id, sort_order: i + 1 }))),
  })
  const controlGuest = await openLink(control.token, null)
  check('a public link does not open any other link', controlGuest.count === 0, `HTTP ${controlGuest.status}`)

  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${control.id}`, {
    method: 'DELETE',
    headers: headers(adminToken),
  })

  // Put it back to premium for the metrics checks below, which count opens by
  // a premium viewer only.
  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${collection.id}`, {
    method: 'PATCH',
    headers: headers(adminToken),
    body: JSON.stringify({ min_tier: 'premium' }),
  })

  // --- metrics (scope §G) ---------------------------------------------------
  for (let i = 0; i < 2; i++) {
    await fetch(`${URL_BASE}/rest/v1/rpc/record_collection_view`, {
      method: 'POST',
      headers: headers(premiumToken),
      body: JSON.stringify({ p_token: collection.token }),
    })
  }
  // A denied viewer must not be counted as an open.
  await fetch(`${URL_BASE}/rest/v1/rpc/record_collection_view`, {
    method: 'POST',
    headers: headers(registeredToken),
    body: JSON.stringify({ p_token: collection.token }),
  })

  const metrics = await (
    await fetch(`${URL_BASE}/rest/v1/rpc/collection_metrics`, {
      method: 'POST',
      headers: headers(adminToken),
      body: '{}',
    })
  ).json()
  const mine = metrics.find((m) => m.collection_id === collection.id)

  check('opens are counted', Number(mine?.opens) === 2, `opens=${mine?.opens}`)
  check('unique viewers counted by mobile', Number(mine?.unique_viewers) === 1, `unique=${mine?.unique_viewers}`)
  check('a denied viewer is not counted', Number(mine?.opens) === 2, `opens=${mine?.opens}`)

  // --- disabling withdraws it ----------------------------------------------
  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${collection.id}`, {
    method: 'PATCH',
    headers: headers(adminToken),
    body: JSON.stringify({ is_active: false }),
  })
  const afterDisable = await openLink(collection.token, premiumToken)
  check('disabling withdraws the link from premium too', afterDisable.count === 0, `${afterDisable.count} items`)

  // --- clean up -------------------------------------------------------------
  await fetch(`${URL_BASE}/rest/v1/collections?id=eq.${collection.id}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  })

  report()
}

function report() {
  console.log('')
  let failed = 0
  for (const r of results) {
    if (!r.pass) failed++
    console.log(`  [${r.pass ? ' ok ' : 'FAIL'}] ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
  }
  console.log('')
  console.log(`  ${results.length - failed}/${results.length} checks passed`)
  console.log('')
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
