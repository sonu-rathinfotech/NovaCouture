-- =============================================================================
-- Storage read policy (audit §1)
--
-- Split out of 0002 because storage.objects is owned by the storage extension.
-- Depending on the project, `create policy` on it must be run by an owner, and
-- if it fails inside a larger migration it takes everything else with it.
--
-- If this errors with "must be owner of table objects", create it through the
-- dashboard instead: Storage → Policies → product-images → New policy →
-- "For full customization", operation SELECT, roles anon + authenticated, and
-- paste the USING expression below.
--
-- Re-runnable.
-- =============================================================================

drop policy if exists product_images_read on storage.objects;

create policy product_images_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'product-images'
    -- objects.name must be qualified. public.products also has a `name`
    -- column, so a bare `name` inside the subquery below resolves to the
    -- PRODUCT name, and the policy silently never matches for anyone.
    and (storage.foldername(objects.name))[1] = 'products'
    and exists (
      select 1
      from public.products p
      where p.id::text = (storage.foldername(objects.name))[2]
        and p.is_active
        and p.visibility = any (public.visible_levels())
    )
  );
