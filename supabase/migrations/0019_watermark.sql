-- =============================================================================
-- Watermark settings
--
-- Scope E and DESIGN.md 7 both say the watermark is burned into the file, never
-- overlaid in CSS -- an overlay comes off with one devtools click, so it
-- protects nothing while looking like protection. That has been unbuilt since
-- the start for one reason: there was no logo to burn in. There is now.
--
-- -- Why these are settings and not constants --------------------------------
-- A watermark is a judgement about the client's own photographs: how large
-- before it spoils the piece, how faint before it stops deterring anyone. That
-- is theirs to make and to change after seeing it on real work, not something
-- to redeploy for. Hence a panel in the admin.
--
-- The defaults are deliberately modest. A jewellery catalogue exists to show
-- the piece; a watermark across the middle of it defeats the purpose of the
-- site it is protecting.
-- =============================================================================

alter table public.company_settings
  add column if not exists watermark_enabled boolean not null default true;

alter table public.company_settings
  add column if not exists watermark_position text not null default 'bottom-right';

alter table public.company_settings
  drop constraint if exists company_settings_watermark_position;

alter table public.company_settings
  add constraint company_settings_watermark_position check (
    watermark_position in
      ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center', 'tiled')
  );

-- Percent of the image's WIDTH, so the mark scales with the photograph rather
-- than being a fixed pixel size that is huge on a thumbnail and lost on a
-- full-resolution shot.
alter table public.company_settings
  add column if not exists watermark_size_percent integer not null default 22;

alter table public.company_settings
  drop constraint if exists company_settings_watermark_size;

alter table public.company_settings
  add constraint company_settings_watermark_size check (
    watermark_size_percent between 5 and 150
  );

alter table public.company_settings
  add column if not exists watermark_opacity numeric(3, 2) not null default 0.45;

alter table public.company_settings
  drop constraint if exists company_settings_watermark_opacity;

alter table public.company_settings
  add constraint company_settings_watermark_opacity check (
    watermark_opacity between 0.05 and 1.00
  );

comment on column public.company_settings.watermark_enabled is
  'Applies to photographs uploaded from now on. Turning it off does not strip '
  'the mark from images already stored -- it is burned into those files, which '
  'is the point of burning it in.';

-- Readable by anyone, like the WhatsApp number: the bulk-upload screen needs
-- these before it processes a batch, and opening the table itself would hand
-- out the bank details along with them.
create or replace function public.watermark_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', watermark_enabled,
    'position', watermark_position,
    'sizePercent', watermark_size_percent,
    'opacity', watermark_opacity
  )
  from public.company_settings where singleton;
$$;

revoke all on function public.watermark_settings() from public;
grant execute on function public.watermark_settings() to anon, authenticated;
