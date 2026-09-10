-- =============================================================================
-- Admin platform (scope §F, audit §3)
--
-- The audit asks for admin access to be enforced by a server session rather
-- than by hiding a frontend route. This enforces it in the database instead,
-- which is stronger than either: a hidden route protects nothing, and a Node
-- service holding the service-role key would be a second place where the rule
-- could drift. The browser can lie about who it is; Postgres cannot be talked
-- out of a policy.
--
-- The admin therefore signs in through Supabase Auth like any other user, and
-- every write is checked against is_admin() by RLS. No service-role key exists
-- outside a terminal.
--
-- Deviation from scope §F worth recording: the scope says "username and
-- password". Supabase Auth identifies by email, so the administrator's email
-- IS the username. Same single-administrator model, same password login.
-- =============================================================================

-- The unused admins table from 0001 assumed a bespoke server holding password
-- hashes. Supabase Auth owns credentials now, so that table would be a second,
-- rotting copy of the identity. It has never held a row.
drop table if exists public.admins;

create table public.admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No policies: only the service role (i.e. tools/grant-admin.mjs) may write
-- here. An admin cannot appoint another admin from the browser.

-- SECURITY DEFINER so policies can consult it without the caller needing to
-- read admin_users, and so it cannot be subverted by a search_path trick.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users a where a.id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;


-- -----------------------------------------------------------------------------
-- Catalogue management
--
-- Read policies stay as they are: an admin browsing the public site sees what
-- a premium client sees. These add the admin's ability to see inactive rows
-- and to write.
-- -----------------------------------------------------------------------------

create policy products_admin_read on public.products
  for select to authenticated using (public.is_admin());
create policy products_admin_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_admin_read on public.categories
  for select to authenticated using (public.is_admin());
create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy product_images_admin_read on public.product_images
  for select to authenticated using (public.is_admin());
create policy product_images_admin_write on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy collections_admin_all on public.collections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy collection_items_admin_all on public.collection_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy collection_views_admin_read on public.collection_views
  for select to authenticated using (public.is_admin());


-- -----------------------------------------------------------------------------
-- Clients
--
-- The admin reads every profile and grants premium by hand (scope §F). Note
-- what is NOT here: no delete policy. Removing a client is a decision with
-- consequences for the curated-link history that points at them, so it stays a
-- deliberate act through a tool rather than a button.
-- -----------------------------------------------------------------------------

create policy profiles_admin_read on public.profiles
  for select to authenticated using (public.is_admin());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- -----------------------------------------------------------------------------
-- Storage
--
-- The admin uploads and replaces product photography. Reads already work
-- through product_images_read; these add write.
-- -----------------------------------------------------------------------------

drop policy if exists product_images_admin_write on storage.objects;

create policy product_images_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());


-- -----------------------------------------------------------------------------
-- Link metrics, aggregated (scope §G)
--
-- Counts opens and unique viewers by mobile number. Written as an RPC so the
-- admin screen does not pull every view row across the wire to count them.
-- -----------------------------------------------------------------------------

create or replace function public.collection_metrics()
returns table (
  collection_id  uuid,
  title          text,
  token          text,
  is_active      boolean,
  created_at     timestamptz,
  opens          bigint,
  unique_viewers bigint,
  last_opened_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.title, c.token, c.is_active, c.created_at,
         count(v.id)                       as opens,
         count(distinct v.mobile)          as unique_viewers,
         max(v.viewed_at)                  as last_opened_at
  from public.collections c
  left join public.collection_views v on v.collection_id = c.id
  where public.is_admin()
  group by c.id
  order by c.created_at desc;
$$;

revoke all on function public.collection_metrics() from public;
grant execute on function public.collection_metrics() to authenticated;
