#!/usr/bin/env node
/**
 * Applies the SQL in supabase/ to the project configured in .env.
 *
 *   node tools/db.mjs push [match]
 *                              apply migrations in order; [match] limits it to
 *                              filenames containing that text
 *   node tools/db.mjs seed     load sample data (development only)
 *   node tools/db.mjs status   show what exists in the database
 *   node tools/db.mjs bundle [match] [--no-seed]
 *                              write one paste-ready .sql for the dashboard.
 *                              [match] limits it to migrations whose filename
 *                              contains that text, e.g. `bundle 0002 --no-seed`
 *                              to apply only the newest migration.
 *
 * Connects through the session pooler rather than the direct host: new
 * Supabase projects expose the direct connection over IPv6 only, which fails
 * on most home and office networks.
 *
 * Each file runs as a single multi-statement query, which Postgres executes in
 * one implicit transaction — so a file either applies completely or not at all.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function readEnv() {
  const values = {}
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      // `host` and `user` appear twice (direct, then pooler). Keep both.
      if (values[key] === undefined) values[key] = value
      else if (Array.isArray(values[key])) values[key].push(value)
      else values[key] = [values[key], value]
    }
  }
  return values
}

function connectionConfig() {
  const env = readEnv()

  const password = env.DB_PASSWORD
  if (!password) throw new Error('DB_PASSWORD is not set in .env')

  const hosts = [].concat(env.host ?? [])
  const users = [].concat(env.user ?? [])

  const poolerHost = hosts.find((h) => h.includes('pooler'))
  const poolerUser = users.find((u) => u.includes('.'))

  if (!poolerHost || !poolerUser) {
    throw new Error('Could not find the session pooler host/user in .env')
  }

  return {
    host: poolerHost,
    port: 5432, // session mode; 6543 is transaction mode and rejects some DDL
    database: env.database ?? 'postgres',
    user: poolerUser,
    password,
    ssl: { rejectUnauthorized: false },
    // Fail fast rather than hanging on a blocked network.
    connectionTimeoutMillis: 20000,
    statement_timeout: 120000,
  }
}

function migrations() {
  const dir = join(ROOT, 'supabase', 'migrations')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(dir, f), 'utf8') }))
}

async function withClient(fn) {
  const client = new pg.Client(connectionConfig())
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function push() {
  const match = process.argv[3]
  await withClient(async (client) => {
    for (const migration of migrations()) {
      if (match && !migration.name.includes(match)) continue
      process.stdout.write(`  ${migration.name} … `)
      try {
        await client.query(migration.sql)
        console.log('applied')
      } catch (error) {
        console.log('FAILED')
        console.error(`\n  ${error.message}`)
        if (error.hint) console.error(`  hint: ${error.hint}`)
        if (error.position) console.error(`  at character ${error.position}`)
        process.exitCode = 1
        return
      }
    }
  })
}

async function seed() {
  const path = join(ROOT, 'supabase', 'seed.sql')
  await withClient(async (client) => {
    process.stdout.write('  seed.sql … ')
    try {
      await client.query(readFileSync(path, 'utf8'))
      console.log('loaded')
    } catch (error) {
      console.log('FAILED')
      console.error(`\n  ${error.message}`)
      process.exitCode = 1
    }
  })
}

async function status() {
  await withClient(async (client) => {
    const tables = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `)

    console.log('\n  Tables:')
    if (tables.rows.length === 0) console.log('    (none — run: node tools/db.mjs push)')
    for (const row of tables.rows) console.log(`    · ${row.table_name}`)

    const names = tables.rows.map((r) => r.table_name)
    if (!names.includes('products')) return

    const rls = await client.query(`
      select c.relname as table_name, c.relrowsecurity as enabled,
             count(p.polname)::int as policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy p on p.polrelid = c.oid
      where n.nspname = 'public' and c.relkind = 'r'
      group by c.relname, c.relrowsecurity
      order by c.relname
    `)

    console.log('\n  Row Level Security:')
    for (const row of rls.rows) {
      const flag = row.enabled ? 'on ' : 'OFF'
      console.log(`    ${flag}  ${row.table_name.padEnd(18)} ${row.policies} policy(ies)`)
    }

    const counts = await client.query(`
      select
        (select count(*) from public.products)        as products,
        (select count(*) from public.categories)      as categories,
        (select count(*) from public.product_images)  as images,
        (select count(*) from public.collections)     as collections
    `)
    const c = counts.rows[0]
    console.log('\n  Rows:')
    console.log(`    products ${c.products}   categories ${c.categories}   images ${c.images}   collections ${c.collections}`)

    const buckets = await client.query(
      `select id, public from storage.buckets where id = 'product-images'`,
    )
    console.log('\n  Storage:')
    if (buckets.rows.length === 0) console.log('    product-images bucket missing')
    else {
      const b = buckets.rows[0]
      console.log(`    product-images — ${b.public ? 'PUBLIC (wrong!)' : 'private (correct)'}`)
    }
    console.log('')
  })
}

/**
 * Writes migrations + seed into a single file, for pasting into the Supabase
 * dashboard SQL editor when the database password is not to hand.
 *
 * Generated from the source files every time, so it cannot drift from them.
 * The output is gitignored — never edit it, edit the migration.
 */
function bundle() {
  const outDir = join(ROOT, 'supabase', '.generated')
  mkdirSync(outDir, { recursive: true })

  const args = process.argv.slice(3)
  const match = args.find((a) => !a.startsWith('--'))
  const withSeed = !args.includes('--no-seed')

  const selected = migrations().filter((m) => (match ? m.name.includes(match) : true))
  if (selected.length === 0) {
    console.error(`\n  No migration matches "${match}".\n`)
    process.exitCode = 1
    return Promise.resolve()
  }

  const parts = ['-- GENERATED by tools/db.mjs bundle — do not edit.', '']
  for (const migration of selected) {
    parts.push(`-- ===== ${migration.name} =====`, migration.sql, '')
  }
  if (withSeed) {
    parts.push('-- ===== seed.sql (development data only) =====')
    parts.push(readFileSync(join(ROOT, 'supabase', 'seed.sql'), 'utf8'))
  }

  const out = join(outDir, match ? `apply-${match}.sql` : 'apply-all.sql')
  writeFileSync(out, parts.join('\n'), 'utf8')
  console.log(`\n  Wrote ${out}`)
  console.log('  Paste the whole file into the Supabase dashboard SQL editor and run it.\n')
  return Promise.resolve()
}

const command = process.argv[2]
const commands = { push, seed, status, bundle }

if (!commands[command]) {
  console.error('Usage: node tools/db.mjs <push|seed|status|bundle>')
  process.exit(2)
}

commands[command]().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
