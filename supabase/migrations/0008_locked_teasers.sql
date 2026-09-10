-- =============================================================================
-- Blurred teaser tiles for withheld pieces
--
-- The catalogue used to end a guest's grid with a single band advertising that
-- more exists. It now shows one blurred tile per withheld piece instead, and
-- clicking one opens the sign-in page. That is a deliberate change to the
-- gating contract in DESIGN.md §6 — read the trade-off below before extending
-- this.
--
-- ── What changes, and what does not ──────────────────────────────────────────
-- NOT CHANGED: the products policy. `products_select_by_tier` in 0001 §4 still
-- withholds every restricted row, images and all. Nothing here relaxes it, no
-- policy is dropped, and `public.products` is still unreadable below tier.
--
-- CHANGED: the COUNT and CATEGORY of withheld pieces become public. A guest can
-- now learn "there are four pieces in Bridal I cannot see". That is inherent in
-- drawing a tile per piece — the tiles ARE the count — and it is the price of
-- the treatment. Everything that identifies a piece stays withheld.
--
-- ── What this function must never return ─────────────────────────────────────
-- No id. No name. No slug. No storage_path. Any of those turns a teaser into a
-- link to the piece, or into an oracle for guessing names. The select list
-- below is the whole security argument for this file; if you add a column to
-- it, you are changing what the platform leaks.
-- =============================================================================

create or replace function public.locked_teasers(p_category_slug text default null)
returns table (
  visibility    public.visibility,
  category_id   uuid,
  category_name text,
  category_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.visibility, c.id, c.name, c.slug
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.is_active
    -- The complement of the products policy, derived from the same function,
    -- so the two cannot drift: a piece is either shown or blurred, never both
    -- and never neither.
    and not (p.visibility = any (public.visible_levels()))
    and (
      p_category_slug is null
      -- A top-level slug takes its sub-categories with it, matching how
      -- listProducts scopes a category. A sub-category slug matches itself.
      or c.slug = p_category_slug
      or c.parent_id = (
        select id from public.categories where slug = p_category_slug and is_active
      )
    )
    -- A category hidden by the admin should not be advertised by its teasers.
    and (c.id is null or c.is_active)
  order by p.sort_order;
$$;

-- security definer is what lets this see the rows the caller cannot. It is
-- confined by the select list above and by visible_levels(), which reads the
-- caller's own JWT — there is no argument by which a caller can ask about
-- someone else's tier.
revoke all on function public.locked_teasers(text) from public;
grant execute on function public.locked_teasers(text) to anon, authenticated;
