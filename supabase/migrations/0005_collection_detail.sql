-- =============================================================================
-- Curated link detail (scope §G)
--
-- The links screen already shows opens and unique viewers. The scope also asks
-- for "timestamps, and which products were viewed (optional)", visible to the
-- admin in the links-management screen. That needs the individual view rows,
-- not just the aggregate.
--
-- Reading another client's viewing history is exactly the sort of thing RLS
-- exists to prevent, so this is SECURITY DEFINER with an explicit is_admin()
-- check rather than a plain view.
-- =============================================================================

-- Each open of one link, most recent first.
create or replace function public.collection_views_detail(p_collection_id uuid)
returns table (
  viewed_at    timestamptz,
  mobile       text,
  viewer_name  text,
  product_id   uuid,
  product_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select v.viewed_at,
         v.mobile,
         p.name  as viewer_name,
         v.product_id,
         pr.name as product_name
  from public.collection_views v
  left join public.profiles p  on p.id = v.profile_id
  left join public.products pr on pr.id = v.product_id
  where v.collection_id = p_collection_id
    and public.is_admin()
  order by v.viewed_at desc
  limit 500;
$$;

-- Which pieces in a link were actually opened, and how often.
create or replace function public.collection_product_views(p_collection_id uuid)
returns table (
  product_id     uuid,
  product_name   text,
  views          bigint,
  unique_viewers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select v.product_id,
         pr.name,
         count(*)                  as views,
         count(distinct v.mobile)  as unique_viewers
  from public.collection_views v
  join public.products pr on pr.id = v.product_id
  where v.collection_id = p_collection_id
    and v.product_id is not null
    and public.is_admin()
  group by v.product_id, pr.name
  order by count(*) desc;
$$;

revoke all on function public.collection_views_detail(uuid) from public;
revoke all on function public.collection_product_views(uuid) from public;
grant execute on function public.collection_views_detail(uuid) to authenticated;
grant execute on function public.collection_product_views(uuid) to authenticated;

-- Reading a link's own row, so the detail screen can show its title and token.
create policy collections_admin_read on public.collections
  for select to authenticated using (public.is_admin());

-- Opening a piece is recorded far more often than opening a link, so the
-- lookup wants its own index rather than riding on the link one.
create index if not exists collection_views_product_idx
  on public.collection_views (collection_id, product_id)
  where product_id is not null;
