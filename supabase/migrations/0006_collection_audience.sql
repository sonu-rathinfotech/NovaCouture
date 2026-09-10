-- =============================================================================
-- Who a curated link opens for (scope §G, extended)
--
-- Until now every curated link required a signed-in PREMIUM client. That is
-- the right default and it stays the default. But it makes the commonest real
-- errand impossible: VK photographs six bangles for a customer who is merely
-- registered, sends the link on WhatsApp, and the customer is told the
-- collection "is not available". The link is useless precisely when it is
-- needed.
--
-- So the audience becomes a property of the link, chosen when it is created:
--
--   premium     signed in and premium          (default, unchanged)
--   registered  signed in, premium or not
--   guest       anyone holding the link
--
-- WHAT "GUEST" REALLY MEANS — read before offering it
--
-- A curated link shows the pieces the admin picked, whatever each piece's own
-- visibility is. That is the point of curation. So a guest-audience link makes
-- those particular pieces — names, photographs — visible to anyone the link
-- reaches, including whoever the recipient forwards it to. It is a deliberate
-- act of publishing a handful of items, not a hole: the admin chooses it per
-- link, and it touches nothing outside that link. The admin UI says so in
-- those words.
--
-- WHY THE RPC NOW RETURNS THE IMAGES
--
-- The client used to re-read the products through ordinary RLS after the RPC
-- told it which ones to fetch. For a premium viewer that agreed. For a
-- registered viewer looking at a link containing a premium piece it does not:
-- RLS drops the row and the piece vanishes from a collection chosen for them,
-- silently. The link's audience is the authority inside a link, so the link
-- has to return its own contents.
--
-- Re-runnable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The column
-- -----------------------------------------------------------------------------

alter table public.collections
  add column if not exists min_tier text not null default 'premium';

-- Existing links keep the behaviour they were created under. Only new links
-- can be anything other than premium.
alter table public.collections
  drop constraint if exists collections_min_tier_check;

alter table public.collections
  add constraint collections_min_tier_check
  check (min_tier in ('guest', 'registered', 'premium'));

comment on column public.collections.min_tier is
  'Who may open this link: guest = anyone holding it, registered = any signed-in client, premium = signed-in premium only.';


-- -----------------------------------------------------------------------------
-- 2. One place that decides whether a caller may open a link
-- -----------------------------------------------------------------------------

-- Used by get_collection(), record_collection_view() and the storage read
-- policy. Three copies of this rule that could drift apart is exactly how a
-- link ends up showing its photographs to someone it refused to open for.
create or replace function public.collection_allows(p_min_tier text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_min_tier
    when 'guest'      then true
    when 'registered' then auth.uid() is not null
    else auth.uid() is not null and public.is_premium()
  end;
$$;

grant execute on function public.collection_allows(text) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Opening a link
-- -----------------------------------------------------------------------------

-- The signature changes (image columns are added), so the old one must go
-- first: postgres would otherwise keep both and the client would get whichever
-- matched.
drop function if exists public.get_collection(text);

create or replace function public.get_collection(p_token text)
returns table (
  collection_id   uuid,
  title           text,
  welcome_message text,
  product_id      uuid,
  product_name    text,
  product_slug    text,
  visibility      text,
  category_name   text,
  category_slug   text,
  sort_order      integer,
  image_id        uuid,
  image_path      text,
  image_alt       text,
  image_position  integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_min_tier text;
begin
  -- Read the audience before deciding, but reveal nothing by the decision: a
  -- token that does not exist is treated exactly like one the caller may not
  -- open. Distinguishing them would let someone guess tokens and learn from
  -- the difference which guesses were real.
  select c.min_tier into v_min_tier
  from public.collections c
  where c.token = p_token and c.is_active;

  if v_min_tier is null or not public.collection_allows(v_min_tier) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
    select
      c.id, c.title, c.welcome_message,
      p.id, p.name, p.slug, p.visibility::text,
      -- The card shows the category under the name. Read here rather than by a
      -- second query: categories are readable to everyone, but a viewer who
      -- cannot see the PRODUCT would have no way to join the two.
      cat.name, cat.slug,
      ci.sort_order,
      i.id, i.storage_path, i.alt, i.sort_order
    from public.collections c
    join public.collection_items ci on ci.collection_id = c.id
    join public.products p on p.id = ci.product_id
    left join public.categories cat on cat.id = p.category_id
    -- left join: a piece whose photographs have not been uploaded yet still
    -- belongs in the collection. Dropping it would make the link quietly
    -- shorter than the selection the admin made.
    left join public.product_images i on i.product_id = p.id
    where c.token = p_token
      and c.is_active
      and p.is_active
    order by ci.sort_order, i.sort_order;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Recording the visit
-- -----------------------------------------------------------------------------

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
  v_min_tier      text;
  v_mobile        text;
begin
  select c.id, c.min_tier into v_collection_id, v_min_tier
  from public.collections c
  where c.token = p_token and c.is_active;

  if v_collection_id is null then
    return;
  end if;

  -- A viewer who could not open the link cannot register a visit to it, or the
  -- open count would answer questions the collection itself refused to.
  if not public.collection_allows(v_min_tier) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  -- Null for a guest viewer: the visit is counted, but there is nobody to
  -- attribute it to. The admin's metrics page distinguishes the two.
  select p.mobile into v_mobile from public.profiles p where p.id = auth.uid();

  insert into public.collection_views (collection_id, profile_id, mobile, product_id)
  values (v_collection_id, auth.uid(), v_mobile, p_product_id);
end;
$$;

revoke all on function public.get_collection(text) from public;
revoke all on function public.record_collection_view(text, uuid) from public;

-- anon is granted deliberately: a guest-audience link has to open for someone
-- who is not signed in. Both functions check the audience themselves, so the
-- grant widens nothing on a premium or registered link.
grant execute on function public.get_collection(text) to anon, authenticated;
grant execute on function public.record_collection_view(text, uuid) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. Photographs
-- -----------------------------------------------------------------------------

-- The gallery of a piece inside a curated link, for a caller the link opens
-- for. The client signs these paths itself; signing is governed by the storage
-- policy below, which applies the same rule.
create or replace function public.collection_gallery(p_token text)
returns table (product_id uuid, storage_path text, sort_order integer, alt text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_min_tier text;
begin
  select c.min_tier into v_min_tier
  from public.collections c
  where c.token = p_token and c.is_active;

  if v_min_tier is null or not public.collection_allows(v_min_tier) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  return query
    select i.product_id, i.storage_path, i.sort_order, i.alt
    from public.collections c
    join public.collection_items ci on ci.collection_id = c.id
    join public.product_images i on i.product_id = ci.product_id
    where c.token = p_token and c.is_active
    order by ci.sort_order, i.sort_order;
end;
$$;

revoke all on function public.collection_gallery(text) from public;
grant execute on function public.collection_gallery(text) to anon, authenticated;


-- The storage policy in 0007 asks "is this product in an active link?" once per
-- object it considers, and collection_items is keyed the other way round.
create index if not exists collection_items_product_idx
  on public.collection_items (product_id);


-- -----------------------------------------------------------------------------
-- 6. The admin's list of links needs to show who each one opens for
-- -----------------------------------------------------------------------------

-- Adding a column changes the signature, so replace is not enough.
drop function if exists public.collection_metrics();

create or replace function public.collection_metrics()
returns table (
  collection_id  uuid,
  title          text,
  token          text,
  min_tier       text,
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
  select c.id, c.title, c.token, c.min_tier, c.is_active, c.created_at,
         count(v.id)              as opens,
         -- Guest viewers have no mobile number, so they cannot be told apart.
         -- They are counted as opens and excluded here rather than lumped
         -- together as one "viewer", which would be a lie in the other
         -- direction.
         count(distinct v.mobile) as unique_viewers,
         max(v.viewed_at)         as last_opened_at
  from public.collections c
  left join public.collection_views v on v.collection_id = c.id
  where public.is_admin()
  group by c.id
  order by c.created_at desc;
$$;

revoke all on function public.collection_metrics() from public;
grant execute on function public.collection_metrics() to authenticated;
