/**
 * Creates a client account on the administrator's behalf (scope §F).
 *
 * WHY THIS EXISTS AS A FUNCTION AND NOT A BUTTON
 *
 * Creating a login account needs the service-role key, which bypasses Row
 * Level Security completely. It cannot go anywhere near the browser. This runs
 * on Supabase, holds the key server-side, and does one narrow job.
 *
 * WHAT IT CHECKS BEFORE DOING ANYTHING
 *
 * The caller's own JWT is used to ask the database `is_admin()`. If that says
 * no, nothing happens. The service-role key is never used to decide who may
 * call — only to carry out the work once the database has already confirmed
 * the caller is an administrator. Getting that order wrong would turn this
 * function into a way for anyone to create accounts.
 *
 * DEPLOY
 *   supabase functions deploy add-client
 *
 * The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY variables are injected by the
 * platform; there is nothing to configure by hand.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/** Must match the CHECK constraint on profiles.mobile. */
function normaliseMobile(input: string): string | null {
  const raw = input.trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  let e164: string
  if (raw.startsWith('+')) e164 = `+${digits}`
  else if (digits.length === 10) e164 = `+91${digits}`
  else if (digits.startsWith('91') && digits.length === 12) e164 = `+${digits}`
  else if (digits.startsWith('0') && digits.length === 11) e164 = `+91${digits.slice(1)}`
  else return null

  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401)

  // --- 1. Is the caller an administrator? Asked as the caller, not as us. ---
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: isAdmin, error: adminError } = await asCaller.rpc('is_admin')
  if (adminError || isAdmin !== true) {
    // Same answer whether the caller is signed out, signed in as a client, or
    // signed in as an admin whose rights were just revoked.
    return json({ error: 'Not permitted' }, 403)
  }

  // --- 2. Validate the input before touching anything -----------------------
  let body: {
    name?: string
    mobile?: string
    company?: string | null
    email?: string | null
    password?: string
    isPremium?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Malformed request' }, 400)
  }

  const name = (body.name ?? '').trim()
  const mobile = normaliseMobile(body.mobile ?? '')
  const password = body.password ?? ''

  if (!name) return json({ error: 'A name is required' }, 400)
  if (!mobile) return json({ error: 'Enter a valid mobile number' }, 400)
  if (password.length < 6) return json({ error: 'The password must be at least 6 characters' }, 400)

  // The interim login is email and password. A client who gave no address gets
  // a placeholder on a reserved domain that can never receive mail, so no
  // message is ever sent to a real stranger's inbox by accident.
  const email = (body.email ?? '').trim() || `${mobile.replace('+', '')}@vk-client.invalid`

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // One account per number (scope §B). Checked before creating the auth user,
  // so a duplicate does not leave an orphaned login with no profile.
  const { data: clash } = await admin
    .from('profiles')
    .select('id')
    .eq('mobile', mobile)
    .maybeSingle()

  if (clash) return json({ error: 'An account already exists for this number' }, 409)

  // --- 3. Create the login --------------------------------------------------
  // Phone is set alongside email so the identity already exists when WhatsApp
  // OTP goes live; the client keeps the same account rather than starting over.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    phone: mobile,
    password,
    email_confirm: true,
    phone_confirm: true,
  })

  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Could not create the account' }, 400)
  }

  // --- 4. Create the profile ------------------------------------------------
  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    mobile,
    name,
    company: (body.company ?? '')?.trim() || null,
    email: body.email?.trim() || null,
    is_premium: body.isPremium === true,
    // The administrator is recording that consent was given in person or by
    // message. It is not the client ticking a box, and the Privacy Policy
    // should say so if VK onboards this way regularly.
    consent_at: new Date().toISOString(),
    extra: { created_by_admin: true },
  })

  if (profileError) {
    // Do not leave a login with no profile behind: that account can sign in
    // and would see an empty, nameless session.
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: `Account rolled back: ${profileError.message}` }, 400)
  }

  return json({ ok: true, id: created.user.id, mobile, email })
})
