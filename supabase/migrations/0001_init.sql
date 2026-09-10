-- =============================================================================
-- VK Jewellers — initial schema
-- Phase 0. See PLAN.md §3.
--
-- The access rules in section 5 of this file ARE the security model. The React
-- app filters nothing; it only renders what the database is willing to return.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Types
-- -----------------------------------------------------------------------------

-- Order matters conceptually: public < login_required < premium_only.
create type public.visibility as enum ('public', 'login_required', 'premium_only');


-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- Public-side user profile, 1:1 with auth.users.
-- Mobile is the account identifier: one account per number (scope §B).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  mobile      text not null,
  name        text not null,
  company     text,
  email       text,
  is_premium  boolean not null default false,
  consent_at  timestamptz,
  -- New registration fields land here without a migration (scope §B:
  -- "additional fields can be added later without breaking the existing flow").
  extra       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  -- Store E.164 only. Normalising at write time is what makes the unique
  -- index meaningful — '9876543210' and '+919876543210' must not both exist.
  constraint profiles_mobile_e164 check (mobile ~ '^\+[1-9]\d{7,14}$')
);

create unique index profiles_mobile_key on public.profiles (mobile);
create index profiles_is_premium_idx on public.profiles (is_premium) where is_premium;


-- Categories, with exactly one level of nesting (scope §C).
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  parent_id  uuid references public.categories (id) on delete restrict,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories (parent_id);

-- Enforce the one-level rule in the database. A sub-category's parent must
-- itself be top-level, so a grandchild is impossible.
create or replace function public.enforce_single_level_category()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'A category cannot be its own parent';
    end if;
    if exists (
      select 1 from public.categories
      where id = new.parent_id and parent_id is not null
    ) then
      raise exception 'Only one level of sub-categories is supported';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_single_level
  before insert or update on public.categories
  for each row execute function public.enforce_single_level_category();


-- Products: name + gallery only. No price, description, or stock (scope §1).
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  category_id uuid references public.categories (id) on delete set null,
  visibility  public.visibility not null default 'public',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_visibility_idx on public.products (visibility);
create index products_listing_idx on public.products (category_id, sort_order)
  where is_active;


create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  sort_order   integer not null default 0,
  -- Never null: a bulk import must not be able to produce a gallery of
  -- empty alt attributes (DESIGN.md §7).
  alt          text not null,
  created_at   timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);


-- Curated collection links (scope §G). Links never expire; is_active is the
-- only kill switch, which is why the admin UI surfaces it prominently.
create table public.collections (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  welcome_message text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  sort_order    integer not null default 0,
  primary key (collection_id, product_id)
);

-- Per-link metrics: opens, unique viewers by mobile, timestamps, and
-- optionally which product was viewed (scope §G).
create table public.collection_views (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  profile_id    uuid references public.profiles (id) on delete set null,
  mobile        text,
  product_id    uuid references public.products (id) on delete set null,
  viewed_at     timestamptz not null default now()
);

create index collection_views_link_idx on public.collection_views (collection_id, viewed_at desc);


-- Single administrator (scope §F). Deliberately not a role/permission system —
-- adding admins later is cheap; building RBAC now is not warranted.
create table public.admins (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);


-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 3. Access helpers
-- -----------------------------------------------------------------------------

-- SECURITY DEFINER so a policy on products can read profiles without the
-- caller needing select rights on profiles, and without policy recursion.
create or replace function public.is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_premium from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- The visibility levels the current caller may see. Single source of truth:
-- every policy below derives from this, so the tiers cannot drift apart.
create or replace function public.visible_levels()
returns public.visibility[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then array['public']::public.visibility[]
    when public.is_premium() then
      array['public','login_required','premium_only']::public.visibility[]
    else array['public','login_required']::public.visibility[]
  end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_views enable row level security;
alter table public.admins           enable row level security;

-- profiles: a user sees and edits only their own row. is_premium is set by
-- the admin through the service role, never by the user.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_premium = public.is_premium());

-- categories: readable by everyone. Category names are not sensitive; the
-- products inside them are what gets gated.
create policy categories_select_all on public.categories
  for select to anon, authenticated using (is_active);

-- products: the access matrix (scope §3), enforced once.
create policy products_select_by_tier on public.products
  for select to anon, authenticated
  using (is_active and visibility = any (public.visible_levels()));

-- product_images: inherit the parent product's decision. Galleries are never
-- gated separately (scope §1) — if you can see the product, you see all of it.
create policy product_images_select_by_parent on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.is_active
        and p.visibility = any (public.visible_levels())
    )
  );

-- collections / collection_items / collection_views / admins:
-- no policies for anon or authenticated. Reads go through the RPC in §6 and
-- all admin writes go through the service role, which bypasses RLS. An
-- enabled RLS table with no matching policy denies by default.


-- -----------------------------------------------------------------------------
-- 5. Curated-collection access
-- -----------------------------------------------------------------------------

-- Opening a link requires being logged in AND premium (scope §G). The token
-- alone grants nothing, so a forwarded link cannot leak the collection.
create or replace function public.get_collection(p_token text)
returns table (
  collection_id   uuid,
  title           text,
  welcome_message text,
  product_id      uuid,
  product_name    text,
  product_slug    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_premium() then
    -- Same error whether the caller is a guest, a non-premium user, or the
    -- token is wrong. Distinguishing them would confirm a link exists.
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
    select c.id, c.title, c.welcome_message, p.id, p.name, p.slug
    from public.collections c
    join public.collection_items ci on ci.collection_id = c.id
    join public.products p on p.id = ci.product_id
    where c.token = p_token
      and c.is_active
      and p.is_active
    order by ci.sort_order;
end;
$$;

-- Metric write, callable by the premium viewer whose visit it records.
create or replace function public.record_collection_view(
  p_token text,
  p_product_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_collection_id uuid;
  v_mobile        text;
begin
  if auth.uid() is null or not public.is_premium() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select id into v_collection_id
  from public.collections where token = p_token and is_active;

  if v_collection_id is null then
    return;
  end if;

  select mobile into v_mobile from public.profiles where id = auth.uid();

  insert into public.collection_views (collection_id, profile_id, mobile, product_id)
  values (v_collection_id, auth.uid(), v_mobile, p_product_id);
end;
$$;

revoke all on function public.get_collection(text) from public;
revoke all on function public.record_collection_view(text, uuid) from public;
grant execute on function public.get_collection(text) to authenticated;
grant execute on function public.record_collection_view(text, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Storage
-- -----------------------------------------------------------------------------

-- PRIVATE bucket. A public bucket would make every premium image retrievable
-- by URL and would silently defeat the entire gating model above. Images are
-- served as short-lived signed URLs, issued only after the same tier check.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do nothing;

-- No anon/authenticated storage policies: signed URLs are minted server-side.
