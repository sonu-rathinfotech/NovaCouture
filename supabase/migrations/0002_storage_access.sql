-- =============================================================================
-- Secure image delivery (audit §1)
--
-- The product-images bucket is private, so raw storage paths cannot be used as
-- image URLs. Images must be fetched as short-lived signed URLs, and a signed
-- URL may only be issued to someone entitled to see the product it belongs to.
--
-- The obvious way to do that is a server holding the service-role key. This
-- takes the other route: teach Storage the same rule the catalogue already
-- uses, so the browser can sign its own URLs and the database stays the single
-- place where visibility is decided. No second copy of the access rule, and no
-- service-role key anywhere near the frontend.
--
-- Path convention, written by the importer and by tools/upload-samples.mjs:
--
--     products/<product_id>/<sort_order>.<ext>
--
-- storage.foldername('products/<uuid>/1.jpg') returns {products, <uuid>},
-- so element 2 is the product id.
-- =============================================================================

-- The storage policy itself lives in 0003_storage_policy.sql: creating a
-- policy on storage.objects can fail on ownership, and it must not take the
-- rest of this migration down with it.

-- No insert/update/delete policies: uploads run with the service role, from
-- the importer and the admin panel. A visitor cannot write to the bucket.

-- visible_levels() is already SECURITY DEFINER; make sure both browser roles
-- may call it from inside the storage policy above.
grant execute on function public.visible_levels() to anon, authenticated;
grant execute on function public.is_premium() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper: the gallery a caller is entitled to, with paths ready for signing.
--
-- Saves the client a round trip and keeps the ordering rule in one place.
-- RLS on product_images still applies inside it, so this grants nothing extra.
-- ---------------------------------------------------------------------------
create or replace function public.product_gallery(p_slug text)
returns table (id uuid, storage_path text, sort_order integer, alt text)
language sql
stable
as $$
  select i.id, i.storage_path, i.sort_order, i.alt
  from public.product_images i
  join public.products p on p.id = i.product_id
  where p.slug = p_slug
  order by i.sort_order;
$$;

grant execute on function public.product_gallery(text) to anon, authenticated;
