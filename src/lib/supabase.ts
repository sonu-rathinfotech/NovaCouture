import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Browser Supabase client, created on first use.
 *
 * Lazy on purpose: creating the client also spins up a realtime client, which
 * this app never uses and which fails outright under Node 20 (no native
 * WebSocket). Deferring construction keeps the fixture path — and the test
 * suite — free of a dependency they do not need.
 *
 * IMPORTANT: this client is subject to Row Level Security. Product visibility
 * is enforced by the policies in supabase/migrations/0001_init.sql, NOT by the
 * queries written against it. Never add a service-role key to the frontend —
 * it bypasses RLS and would expose the entire premium catalogue.
 */
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
