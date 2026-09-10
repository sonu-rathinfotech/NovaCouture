-- =============================================================================
-- Record which photographs have been marked
--
-- Two things needed this. Watermarking arrived after 208 photographs were
-- already in storage, so there has to be a way to go back over them; and
-- marking is not idempotent -- run it twice and the logo is burned in twice,
-- with no unmarked original to recover from.
--
-- A timestamp rather than a boolean, because "when" answers the question the
-- boolean cannot: whether a photograph was marked before or after the client
-- last changed the settings.
--
-- Null means not marked, which is the honest state for everything uploaded
-- before this existed.
-- =============================================================================

alter table public.product_images
  add column if not exists watermarked_at timestamptz;

comment on column public.product_images.watermarked_at is
  'When the house mark was burned into this file. Null means it was uploaded '
  'before watermarking existed, or with the setting off. tools/watermark-'
  'existing.mjs marks null rows and skips the rest, so it is safe to re-run.';

create index if not exists product_images_unmarked_idx
  on public.product_images (product_id) where watermarked_at is null;
