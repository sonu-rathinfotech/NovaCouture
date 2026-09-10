-- =============================================================================
-- Currently Unavailable, and weight in grams
--
-- Two additions to `products`, both plain columns with no effect on access.
--
-- ── is_available is NOT is_active, and must not drift into it ────────────────
-- is_active decides whether a piece is IN the catalogue. It is load-bearing:
-- the RLS policies in 0001 §4, the storage policy in 0003 and locked_teasers()
-- in 0008 all filter on it, and an inactive piece is absent everywhere.
--
-- is_available decides whether a piece that IS in the catalogue is currently
-- obtainable. It is presentational: the piece still lists, still opens, still
-- accepts enquiries, and simply carries a "Currently Unavailable" mark. No
-- policy references it, deliberately — if it ever starts gating access, the
-- two concepts have been confused and the security model has quietly gained a
-- second, weaker switch.
--
-- ── weight_grams ────────────────────────────────────────────────────────────
-- The first attribute this catalogue has carried. Until now a product was a
-- name and a gallery, which is why there are no filters (see the note at the
-- top of CategoryPage.tsx). Nullable, because the weight of a piece is often
-- not known at the moment it is photographed, and a required field would push
-- someone into inventing one.
-- =============================================================================

alter table public.products
  add column if not exists is_available boolean not null default true;

comment on column public.products.is_available is
  'Presentational only. False shows a "Currently Unavailable" mark; the piece '
  'still lists, opens and accepts enquiries. NOT an access control — that is '
  'is_active plus visibility. No RLS policy may reference this column.';

alter table public.products
  add column if not exists weight_grams numeric(8, 3);

comment on column public.products.weight_grams is
  'Gross weight in grams, to milligram precision. Null means not recorded, '
  'which is shown as nothing at all rather than as zero.';

-- Zero is not a weight, and a negative one is a typo. The upper bound is a
-- transposed-decimal guard: 99.999 kg is far beyond any piece here, so
-- anything above it is a data-entry error rather than a heavy necklace.
alter table public.products
  drop constraint if exists products_weight_grams_sane;

alter table public.products
  add constraint products_weight_grams_sane check (
    weight_grams is null or (weight_grams > 0 and weight_grams <= 99999.999)
  );
