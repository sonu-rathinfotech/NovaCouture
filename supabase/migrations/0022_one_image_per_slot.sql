-- =============================================================================
-- One photograph per gallery slot
--
-- product_images had 208 rows over 144 files: 64 of them were exact duplicates,
-- same product, same sort_order, same storage_path. The affected products were
-- showing every photograph in their gallery twice.
--
-- The cause is in seed.sql, which ended its gallery insert with a bare
--
--     on conflict do nothing;
--
-- With no conflict target that clause only catches a primary-key collision, and
-- the primary key is gen_random_uuid() -- a fresh value on every run, which can
-- never collide. So the clause looked idempotent and was decorative: running
-- the seed a second time inserted the whole gallery again.
--
-- The clause cannot be given a target until a matching unique constraint
-- exists, which is what this migration adds. seed.sql now names it.
--
-- The same gap let the watermark backfill double-stamp 64 photographs: it
-- iterated rows rather than files, so a file two rows pointed at was marked
-- twice. That tool now groups by storage_path (and the images have been
-- restored and re-marked), but with this constraint in place the situation it
-- tripped over cannot arise again.
-- =============================================================================

-- Oldest row per slot wins. created_at is the tiebreaker anyone would expect;
-- id settles the case where two rows were inserted inside the same statement
-- and therefore carry an identical timestamp, so the ordering is total and the
-- result does not depend on which row the planner happens to see first.
delete from public.product_images a
using public.product_images b
where a.product_id = b.product_id
  and a.sort_order = b.sort_order
  and (b.created_at, b.id) < (a.created_at, a.id);

alter table public.product_images
  add constraint product_images_slot_unique unique (product_id, sort_order);

comment on constraint product_images_slot_unique on public.product_images is
  'A gallery slot holds one photograph. Without this, seed.sql and any importer '
  'that re-runs will silently duplicate an entire gallery -- which is how 64 '
  'duplicate rows arrived. Insert with: on conflict (product_id, sort_order).';
