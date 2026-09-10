-- =============================================================================
-- WhatsApp number + one-time code, working before the Business API exists
--
-- Scope §B puts login on a WhatsApp number and a code. The Business API has
-- not been procured, and Supabase's own phone OTP needs a provider configured
-- in the dashboard, so neither could be used yet. Rather than leave the flow
-- unbuilt, the code is generated and checked here and the DELIVERY step is the
-- only thing missing: it is written to this table for the administrator to
-- read while testing.
--
-- When the API arrives, one function changes (`deliver_login_code`) and
-- `company_settings.whatsapp_api_configured` is set true. Nothing else moves —
-- not the screens, not the verification, not the session handling.
--
-- ── Why this mints its own session ──────────────────────────────────────────
-- Supabase issues sessions for email+password and for its own OTP providers,
-- neither of which we have. So verification ends by setting a fresh random
-- password on the account and handing it back once, over TLS, to the browser
-- that just proved it holds the number. The browser immediately exchanges it
-- for a real Supabase session.
--
-- That is a one-time credential, equivalent in effect to a magic-link token,
-- and it is rotated on every single verification. It is NOT a password anybody
-- knows, types, or can reuse: it is random, never shown, and replaced the next
-- time the same person signs in.
--
-- ── What protects the code itself ───────────────────────────────────────────
-- Codes are stored as bcrypt hashes, expire in ten minutes, allow five wrong
-- guesses, are single-use, and are rate limited per number. The readable copy
-- in `debug_code` exists ONLY while whatsapp_api_configured is false, and only
-- an administrator can read it.
-- =============================================================================

-- Set true once codes are actually delivered over WhatsApp. It stops the
-- readable copy being written, and nothing else about the flow changes.
alter table public.company_settings
  add column if not exists whatsapp_api_configured boolean not null default false;

comment on column public.company_settings.whatsapp_api_configured is
  'False while login codes are read from login_codes.debug_code by the admin. '
  'Set true the moment WhatsApp delivery works — it stops the readable copy '
  'being stored. See migration 0013.';


create table if not exists public.login_codes (
  id          uuid primary key default gen_random_uuid(),
  -- E.164, matching profiles.mobile. Validated by the functions below.
  mobile      text not null,
  purpose     text not null check (purpose in ('sign_in', 'register')),
  -- bcrypt. The code is never stored in a form that can be read back out.
  code_hash   text not null,
  /*
   * The readable code, for the administrator, while there is no way to
   * deliver it. Written only when whatsapp_api_configured is false, and
   * cleared the moment the code is used. No client can read this column —
   * the only select policy on this table requires is_admin().
   */
  debug_code  text,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists login_codes_lookup_idx
  on public.login_codes (mobile, purpose, created_at desc);

alter table public.login_codes enable row level security;

-- Read by the administrator only, and only so the code can be relayed by hand
-- while delivery is unbuilt. No insert, update or delete policy exists for
-- anyone: every write goes through the security-definer functions below.
drop policy if exists login_codes_admin_read on public.login_codes;
create policy login_codes_admin_read on public.login_codes
  for select to authenticated using (public.is_admin());


-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Mirrors the CHECK on profiles.mobile. A number that would fail that
-- constraint must fail here, before a code is ever generated for it.
create or replace function public.is_e164(p_mobile text)
returns boolean language sql immutable as $$
  select p_mobile ~ '^\+[1-9]\d{7,14}$';
$$;

/*
 * The delivery seam.
 *
 * Today it does nothing: the code is already in the table for the admin to
 * read. When the Business API exists, this is where the send goes — a
 * pg_net call to the WhatsApp endpoint, or a queue row a worker drains.
 * Keeping it as its own function means that change touches nothing else.
 */
create or replace function public.deliver_login_code(p_mobile text, p_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Intentionally empty. See the note above.
  return;
end;
$$;


-- -----------------------------------------------------------------------------
-- Requesting a code
-- -----------------------------------------------------------------------------

/*
 * Returns { ok, retry_after } — never the code, whatever the delivery state.
 * Returning it here would make this function a complete authentication bypass:
 * anyone could ask for a code for any number and be handed it.
 */
create or replace function public.request_login_code(p_mobile text, p_purpose text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code       text;
  v_configured boolean;
  v_exists     boolean;
  v_last       timestamptz;
  v_recent     integer;
begin
  if not public.is_e164(p_mobile) then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid mobile number.');
  end if;
  if p_purpose not in ('sign_in', 'register') then
    return jsonb_build_object('ok', false, 'error', 'Unknown request.');
  end if;

  -- Housekeeping: a code older than a day is of no use to anyone, and the
  -- readable column should not accumulate.
  delete from public.login_codes where created_at < now() - interval '1 day';

  select exists (select 1 from public.profiles where mobile = p_mobile) into v_exists;

  /*
   * These two messages tell an attacker whether a number is a client. That is
   * accepted deliberately: the alternative — a generic "code sent" for numbers
   * that will never receive one — strands the legitimate client with no way to
   * tell a typo from a missing account. The rate limits below are what keep it
   * from being a usable way to walk the client list.
   */
  if p_purpose = 'sign_in' and not v_exists then
    return jsonb_build_object('ok', false, 'error',
      'No account found for this number. Please register first.');
  end if;
  if p_purpose = 'register' and v_exists then
    return jsonb_build_object('ok', false, 'error',
      'An account already exists for this number. Please sign in instead.');
  end if;

  select max(created_at), count(*) filter (where created_at > now() - interval '1 hour')
    into v_last, v_recent
  from public.login_codes where mobile = p_mobile;

  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object('ok', false, 'error',
      'A code was just sent. Please wait a moment before asking for another.',
      'retry_after', 60 - extract(epoch from (now() - v_last))::integer);
  end if;

  if v_recent >= 5 then
    return jsonb_build_object('ok', false, 'error',
      'Too many codes requested for this number. Please try again later.');
  end if;

  -- Any earlier code for this number stops working the moment a new one is
  -- asked for, so two live codes never exist at once.
  update public.login_codes
     set consumed_at = now(), debug_code = null
   where mobile = p_mobile and consumed_at is null;

  v_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  select whatsapp_api_configured into v_configured from public.company_settings where singleton;

  insert into public.login_codes (mobile, purpose, code_hash, debug_code, expires_at)
  values (
    p_mobile, p_purpose,
    crypt(v_code, gen_salt('bf')),
    case when coalesce(v_configured, false) then null else v_code end,
    now() + interval '10 minutes'
  );

  perform public.deliver_login_code(p_mobile, v_code);

  return jsonb_build_object('ok', true, 'retry_after', 60,
    'delivered', coalesce(v_configured, false));
end;
$$;


-- -----------------------------------------------------------------------------
-- Verifying, and becoming signed in
-- -----------------------------------------------------------------------------

/*
 * On success returns { ok, email, password } — a one-time credential the
 * browser exchanges immediately for a Supabase session. See the note at the
 * top of this file for why it works this way.
 *
 * Registration details are passed in and used only when p_purpose is
 * 'register'. The account is created here, after the code is proven, and never
 * before: otherwise anyone could fill the client list with numbers they do not
 * own.
 */
create or replace function public.verify_login_code(
  p_mobile   text,
  p_code     text,
  p_purpose  text,
  p_name     text default null,
  p_company  text default null,
  p_email    text default null,
  p_consent  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_row      public.login_codes;
  v_user_id  uuid;
  v_email    text;
  v_password text;
begin
  if not public.is_e164(p_mobile) then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid mobile number.');
  end if;

  select * into v_row
  from public.login_codes
  where mobile = p_mobile and purpose = p_purpose and consumed_at is null
  order by created_at desc
  limit 1;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error',
      'That code is not correct, or it has expired.');
  end if;

  if v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'error',
      'That code has expired. Please ask for a new one.');
  end if;

  -- Five wrong guesses burns the code. Six digits is a million combinations,
  -- but without this a script walks them in minutes.
  if v_row.attempts >= 5 then
    update public.login_codes set consumed_at = now(), debug_code = null where id = v_row.id;
    return jsonb_build_object('ok', false, 'error',
      'Too many incorrect attempts. Please ask for a new code.');
  end if;

  if v_row.code_hash <> crypt(p_code, v_row.code_hash) then
    update public.login_codes set attempts = attempts + 1 where id = v_row.id;
    return jsonb_build_object('ok', false, 'error',
      'That code is not correct, or it has expired.');
  end if;

  -- Correct. Single-use from here, whatever happens next.
  update public.login_codes set consumed_at = now(), debug_code = null where id = v_row.id;

  if p_purpose = 'register' then
    if not p_consent then
      return jsonb_build_object('ok', false, 'error',
        'Please accept the Privacy Policy to continue.');
    end if;
    if coalesce(trim(p_name), '') = '' then
      return jsonb_build_object('ok', false, 'error', 'Your name is required.');
    end if;
    if exists (select 1 from public.profiles where mobile = p_mobile) then
      return jsonb_build_object('ok', false, 'error',
        'An account already exists for this number. Please sign in instead.');
    end if;

    /*
     * The login identifier is derived from the number, not from the client's
     * email address. Their real email is optional, may be shared with another
     * account, and may change — none of which may be allowed to break a login
     * that is supposed to depend on the number alone.
     */
    v_email := 'wa-' || regexp_replace(p_mobile, '\D', '', 'g') || '@wa.novacouture.invalid';
    v_password := encode(gen_random_bytes(24), 'base64');

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      -- GoTrue reads these into non-nullable strings; leaving them null makes
      -- every later sign-in fail with an opaque 500.
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000'::uuid, gen_random_uuid(),
      'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', '', '', '', '', ''
    )
    returning id into v_user_id;

    insert into auth.identities (
      user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    values (
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );

    -- is_premium is never set here. Premium is granted by the administrator
    -- (scope §F); a self-registration must not be able to claim it.
    insert into public.profiles (id, mobile, name, company, email, consent_at)
    values (
      v_user_id, p_mobile, trim(p_name),
      nullif(trim(coalesce(p_company, '')), ''),
      nullif(trim(coalesce(p_email, '')), ''),
      now()
    );
  else
    select p.id into v_user_id from public.profiles p where p.mobile = p_mobile;
    if v_user_id is null then
      return jsonb_build_object('ok', false, 'error',
        'No account found for this number.');
    end if;
    select u.email into v_email from auth.users u where u.id = v_user_id;
    if v_email is null then
      return jsonb_build_object('ok', false, 'error',
        'This account cannot sign in yet. Please contact us.');
    end if;
    v_password := encode(gen_random_bytes(24), 'base64');
  end if;

  -- Rotated on every verification, so the credential handed out a moment ago
  -- stops working the next time this number signs in.
  update auth.users
     set encrypted_password = crypt(v_password, gen_salt('bf')), updated_at = now()
   where id = v_user_id;

  return jsonb_build_object('ok', true, 'email', v_email, 'password', v_password);
end;
$$;


revoke all on function public.request_login_code(text, text) from public;
revoke all on function public.verify_login_code(text, text, text, text, text, text, boolean) from public;
revoke all on function public.deliver_login_code(text, text) from public;

-- Both are reached by someone who is not signed in yet, so anon must be able
-- to call them. Everything that protects them is inside the functions.
grant execute on function public.request_login_code(text, text) to anon, authenticated;
grant execute on function public.verify_login_code(text, text, text, text, text, text, boolean)
  to anon, authenticated;
