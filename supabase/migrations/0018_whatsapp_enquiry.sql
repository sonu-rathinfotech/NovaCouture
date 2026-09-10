-- =============================================================================
-- The house WhatsApp number, for the per-product enquiry button
--
-- A WhatsApp icon on each piece opens a chat with Nova Couture, prefilled with
-- the piece and a link back to it. That needs the number, which the client has
-- not supplied, so it is a setting rather than a constant.
--
-- Null is the working state, not a broken one: while it is null the button is
-- not rendered at all. An icon that opens an empty WhatsApp chat, or one
-- addressed to nobody, is worse than no icon -- the client taps it, types a
-- question, and it goes nowhere.
--
-- E.164 with no punctuation is what wa.me expects: 919876543210, not
-- +91 98765 43210. The check enforces that rather than trusting the form.
-- =============================================================================

alter table public.company_settings add column if not exists whatsapp_number text;

alter table public.company_settings
  drop constraint if exists company_settings_whatsapp_e164;

alter table public.company_settings
  add constraint company_settings_whatsapp_e164 check (
    whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'
  );

comment on column public.company_settings.whatsapp_number is
  'Digits only, country code first, no plus or spaces -- the form wa.me wants. '
  'Null hides the per-product WhatsApp button entirely. See migration 0018.';

-- Readable without being an administrator: the button is on a public product
-- page, so a guest has to be able to see the number to open a chat with it.
-- This is the one column on the table that is not admin-only, so it is exposed
-- through a function rather than by relaxing the table policy, which would
-- also hand out the bank details.
create or replace function public.public_whatsapp_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select whatsapp_number from public.company_settings where singleton;
$$;

revoke all on function public.public_whatsapp_number() from public;
grant execute on function public.public_whatsapp_number() to anon, authenticated;
