-- =============================================================================
-- Storage read policy, taking curated links into account (0006)
--
-- Split from 0006 for the same reason 0003 was split from 0002: storage.objects
-- is owned by the storage extension, `create policy` on it can be refused on
-- ownership, and that must not take a schema migration down with it.
--
-- If this errors with "must be owner of table objects", create it through the
-- dashboard instead: Storage → Policies → product-images → New policy →
-- "For full customization", operation SELECT, roles anon + authenticated, and
-- paste the USING expression below.
--
-- WHAT CHANGES
--
-- The first branch is 0003 unaltered: you may read a photograph of a piece the
-- catalogue would show you anyway. The second is new: you may also read a
-- photograph of a piece that is inside a curated link you are allowed to open.
--
-- Without it, a link sent to a registered client that contains a premium piece
-- renders as a card with no photograph — the worst possible outcome, because
-- it looks like the site is broken rather than like a refusal.
--
-- WHAT IT DOES NOT OPEN
--
-- It grants no way to FIND those paths. A path is products/<product id>/<n>,
-- and a caller who cannot see the product cannot learn its id from the
-- catalogue — only public.collection_gallery() will hand it over, and only to
-- someone holding the token. So the practical reach of the second branch is
-- "whoever has the link", which is what the admin chose when they set the
-- link's audience.
--
-- Re-runnable.
-- =============================================================================

drop policy if exists product_images_read on storage.objects;

create policy product_images_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'product-images'
    -- objects.name must be qualified. public.products also has a `name`
    -- column, so a bare `name` inside the subqueries below resolves to the
    -- PRODUCT name, and the policy silently never matches for anyone.
    and (storage.foldername(objects.name))[1] = 'products'
    and (
      -- (a) the catalogue would show you this piece
      exists (
        select 1
        from public.products p
        where p.id::text = (storage.foldername(objects.name))[2]
          and p.is_active
          and p.visibility = any (public.visible_levels())
      )
      -- (b) or it is inside a curated link you may open
      or exists (
        select 1
        from public.collection_items ci
        join public.collections c on c.id = ci.collection_id
        where ci.product_id::text = (storage.foldername(objects.name))[2]
          and c.is_active
          and public.collection_allows(c.min_tier)
      )
    )
  );
