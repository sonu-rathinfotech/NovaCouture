-- =============================================================================
-- Centre the watermark, spanning the frame
--
-- 0019 defaulted to a modest corner mark, on the reasoning that a catalogue
-- exists to show the piece. The client saw it and asked for the opposite: the
-- large, faint, centred treatment they use elsewhere.
--
-- That is their call to make -- it is their photography and their risk -- and
-- the settings existed precisely so it would not need a redeploy. Only the
-- defaults and the current values move here.
--
-- 105% is deliberately over the frame width. A mark that stops short of the
-- edges can be cropped off; one that runs past them cannot, without also
-- cropping the piece.
--
-- 30% strength was picked by rendering 18, 30 and 45 over both a pale
-- lifestyle shot and a light plinth shot: 18 was too faint to deter anyone on
-- a busy photograph, 45 buried the piece.
-- =============================================================================

alter table public.company_settings
  alter column watermark_position set default 'center';

alter table public.company_settings
  alter column watermark_size_percent set default 105;

alter table public.company_settings
  alter column watermark_opacity set default 0.30;

update public.company_settings set
  watermark_enabled = true,
  watermark_position = 'center',
  watermark_size_percent = 105,
  watermark_opacity = 0.30,
  updated_at = now()
where singleton;
