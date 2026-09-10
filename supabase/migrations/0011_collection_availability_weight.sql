-- =============================================================================
-- Curated links carry availability and weight too
--
-- 0010 gave products `is_available` and `weight_grams`, and every catalogue
-- page shows them. get_collection() predates both, so a curated link was the
-- one place a piece appeared WITHOUT them — silently rendering an unavailable
-- piece as available, and never showing a weight.
--
-- That gap matters more in a curated link than anywhere else. A link is sent
-- to a named premium client, by hand, as a personal selection; it is the most
-- likely of all these screens to be the thing someone actually enquires about.
-- Being the only screen that says a sold piece is available is how a client is
-- told the wrong thing by the system that was supposed to be the careful one.
--
-- Access is untouched. The two columns are appended to an existing result, and
-- the audience check at the top of the function is unchanged.
-- =============================================================================

-- The return type gains two columns, which `create or replace` cannot do.
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
  image_position  integer,
  is_available    boolean,
  weight_grams    numeric
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
      i.id, i.storage_path, i.alt, i.sort_order,
      p.is_available, p.weight_grams
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

revoke all on function public.get_collection(text) from public;
grant execute on function public.get_collection(text) to anon, authenticated;
