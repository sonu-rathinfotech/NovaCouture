-- =============================================================================
-- Order requests and proforma invoices
--
-- A client selects pieces and quantities and submits a request; the admin
-- reviews it and issues a proforma invoice. There are no prices anywhere in
-- this file, deliberately — the catalogue has never carried them, and the
-- document is a statement of what was ordered, not what it costs.
--
-- ── Snapshots, and why the invoice does not join ─────────────────────────────
-- An issued invoice is a record of what was true when it was issued. If it
-- read its details live, renaming a piece or correcting a GST number would
-- silently rewrite documents a client is already holding — the paper in their
-- hand would stop matching the screen. So issuing copies the buyer's details,
-- the seller's details and each piece's name onto the order, and the invoice
-- renders from those copies alone.
--
-- Before issue there is nothing to protect, so a submitted request reads live.
--
-- ── Where the basket lives ──────────────────────────────────────────────────
-- Not here. A client assembles an order in their own browser (localStorage)
-- and rows appear only on submit, so an abandoned basket is not a row anybody
-- has to clean up, and there is no draft state for RLS to police.
-- =============================================================================

create type public.order_status as enum ('submitted', 'issued', 'cancelled');


-- -----------------------------------------------------------------------------
-- 1. Seller details
-- -----------------------------------------------------------------------------

-- One row, ever. The `singleton` primary key is what enforces that: a second
-- insert collides rather than creating a second set of company details that
-- half the invoices would silently use.
create table public.company_settings (
  singleton            boolean primary key default true check (singleton),
  legal_name           text,
  address              text,
  phone                text,
  email                text,
  gst_number           text,
  bank_name            text,
  bank_account_name    text,
  bank_account_number  text,
  bank_ifsc            text,
  bank_branch          text,
  updated_at           timestamptz not null default now()
);

comment on table public.company_settings is
  'Seller details printed on a proforma invoice. Every column is nullable and '
  'starts null on purpose: none of these had been supplied when the feature '
  'was built, and an invoice must show a blank rather than an invented GST '
  'number or bank account. Read by nobody except the admin — clients see only '
  'the copy taken onto their own order at issue.';

insert into public.company_settings (singleton) values (true)
  on conflict (singleton) do nothing;


-- -----------------------------------------------------------------------------
-- 2. Buyer details
-- -----------------------------------------------------------------------------

-- A proforma invoice carries the buyer's GST and billing address. Registration
-- collects neither (it asks for name, mobile, company, email), so they are
-- added here as nullable and filled in the first time a client orders.
alter table public.profiles add column if not exists billing_address text;
alter table public.profiles add column if not exists gst_number text;


-- -----------------------------------------------------------------------------
-- 3. Orders
-- -----------------------------------------------------------------------------

create sequence if not exists public.order_number_seq;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  -- Human-readable and stable. What a client quotes on the phone.
  order_number    text not null unique,
  status          public.order_status not null default 'submitted',
  -- The client's covering note, e.g. "for the Diwali order, need by the 20th".
  notes           text,

  -- Filled at issue. See the note on snapshots at the top of this file.
  buyer_snapshot  jsonb,
  seller_snapshot jsonb,
  issued_at       timestamptz,
  -- Why an order was cancelled, so the admin screen is not a mystery later.
  cancel_reason   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_profile_idx on public.orders (profile_id, created_at desc);
create index orders_status_idx on public.orders (status);

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  -- The piece may be deleted later; the order still has to render, so the name
  -- is copied at issue and the reference is allowed to go null.
  product_id   uuid references public.products (id) on delete set null,
  product_name text,
  quantity     integer not null check (quantity > 0 and quantity <= 9999),
  sort_order   integer not null default 0,

  -- The same piece twice in one order is a quantity, not two lines.
  unique (order_id, product_id)
);

create index order_items_order_idx on public.order_items (order_id, sort_order);


-- -----------------------------------------------------------------------------
-- 4. Order numbers
-- -----------------------------------------------------------------------------

-- Assigned by the database, never by the browser. Two clients submitting at
-- the same moment must not be able to produce the same number, and a client
-- must not be able to choose one.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.order_number :=
    'NC-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.order_number_seq')::text, 4, '0');
  return new;
end;
$$;

create trigger orders_assign_number before insert on public.orders
  for each row execute function public.assign_order_number();


-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.company_settings enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- company_settings: admin only, both ways. Clients never read this table —
-- they read the copy on their own order, which is what the invoice shows.
create policy company_settings_admin_read on public.company_settings
  for select to authenticated using (public.is_admin());

create policy company_settings_admin_write on public.company_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- orders: a client sees and creates only their own.
create policy orders_select_own on public.orders
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- status and the snapshots are the admin's to set. A client inserting an order
-- already marked 'issued', with a seller_snapshot of their own invention,
-- would be writing themselves an invoice.
create policy orders_insert_own on public.orders
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'submitted'
    and buyer_snapshot is null
    and seller_snapshot is null
    and issued_at is null
  );

create policy orders_admin_update on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No delete policy for anyone. An order a client submitted is a record of what
-- they asked for; it is cancelled, not erased.

-- order_items: reachable only through an order the caller may see.
create policy order_items_select_by_parent on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.profile_id = auth.uid() or public.is_admin())
    )
  );

create policy order_items_insert_own on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.profile_id = auth.uid()
        and o.status = 'submitted'
    )
    -- The client must be entitled to the piece they are ordering. Without
    -- this, a crafted insert could put a premium_only piece on a registered
    -- client's order and its name would come straight back on the invoice —
    -- turning the order form into a way to read the withheld catalogue.
    and exists (
      select 1 from public.products p
      where p.id = product_id
        and p.is_active
        and p.visibility = any (public.visible_levels())
    )
  );

create policy order_items_admin_write on public.order_items
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- -----------------------------------------------------------------------------
-- 6. Issuing
-- -----------------------------------------------------------------------------

-- Issuing is one step: take the snapshots and flip the status together. Doing
-- it from the browser as three updates would allow an order that is 'issued'
-- with no seller details, which is precisely the document that must not exist.
create or replace function public.issue_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller public.company_settings;
begin
  if not public.is_admin() then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_seller from public.company_settings where singleton;

  -- Bank details on a document a retailer may pay against. Blank ones are a
  -- worse outcome than no document, so issuing is refused until they exist.
  if v_seller.legal_name is null or v_seller.gst_number is null
     or v_seller.bank_account_number is null or v_seller.bank_ifsc is null then
    raise exception 'company_details_incomplete'
      using errcode = '23514',
            hint = 'Fill in the company legal name, GST number and bank details before issuing.';
  end if;

  update public.order_items i
  set product_name = p.name
  from public.products p
  where i.order_id = p_order_id and p.id = i.product_id;

  update public.orders o
  set status = 'issued',
      issued_at = now(),
      seller_snapshot = to_jsonb(v_seller),
      buyer_snapshot = (
        select to_jsonb(x) from (
          select pr.name, pr.company, pr.mobile, pr.email,
                 pr.billing_address, pr.gst_number
          from public.profiles pr where pr.id = o.profile_id
        ) x
      )
  where o.id = p_order_id and o.status = 'submitted';

  if not found then
    raise exception 'order_not_submitted'
      using errcode = '23514',
            hint = 'Only a submitted order can be issued.';
  end if;
end;
$$;

revoke all on function public.issue_order(uuid) from public;
grant execute on function public.issue_order(uuid) to authenticated;

grant usage on sequence public.order_number_seq to authenticated;
