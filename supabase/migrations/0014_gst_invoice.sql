-- =============================================================================
-- GST details, and the proforma in GST invoice form
--
-- The company's GST registration certificate (Form GST REG-06, registration
-- 27AALCN6631N1ZU, issued 27/06/2026) supplied the details that had been blank
-- placeholders since the ordering feature was built. They are seeded at the
-- bottom of this file.
--
-- A proforma in Indian practice carries the same identifying block as a tax
-- invoice: both GSTINs, both states with their codes, the place of supply, and
-- an HSN against each line. This adds the columns for that.
--
-- -- What it still does NOT carry, and why ------------------------------------
-- No rate, no taxable value, no CGST/SGST/IGST, no total. The catalogue has
-- never held prices, so any tax figure would have to be invented, and an
-- invented tax figure under a printed GSTIN is worse than no document at all.
-- The place-of-supply block is still worth printing: it is what makes the
-- proforma usable to the buyer's accounts department when the tax invoice
-- follows on supply.
--
-- -- Bank details are no longer required to issue ----------------------------
-- They were, on the grounds that an invoice a retailer may pay against must
-- not carry a blank account number. With no amounts anywhere on the document
-- there is nothing to pay against, and the requirement was blocking the whole
-- feature over details the client had never been asked for. Legal name and
-- GSTIN are still required; bank details print only when present.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seller
-- -----------------------------------------------------------------------------

alter table public.company_settings add column if not exists state text;
alter table public.company_settings add column if not exists state_code text;
alter table public.company_settings add column if not exists pan text;
alter table public.company_settings add column if not exists default_hsn_code text;
alter table public.company_settings add column if not exists invoice_declaration text;

comment on column public.company_settings.state_code is
  'The two digits a GSTIN starts with. 27 is Maharashtra. Printed beside the '
  'state name because an accounts department reads the code, not the name.';

comment on column public.company_settings.default_hsn_code is
  'Used for any piece with no hsn_code of its own. 7113 is articles of '
  'jewellery of precious metal.';


-- -----------------------------------------------------------------------------
-- 2. Buyer
-- -----------------------------------------------------------------------------

-- Place of supply is the buyer's state, so it has to be recorded to be printed.
alter table public.profiles add column if not exists billing_state text;
alter table public.profiles add column if not exists billing_state_code text;


-- -----------------------------------------------------------------------------
-- 3. Lines
-- -----------------------------------------------------------------------------

-- Per piece, because a gold chain and a loose stone are not the same heading.
-- Null falls back to company_settings.default_hsn_code.
alter table public.products add column if not exists hsn_code text;

-- Snapshotted at issue like the name, so a later reclassification cannot
-- silently change the HSN on a document already sent.
alter table public.order_items add column if not exists hsn_code text;


-- -----------------------------------------------------------------------------
-- 4. Issuing
-- -----------------------------------------------------------------------------

create or replace function public.issue_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_seller public.company_settings;
  v_owner  uuid;
begin
  select o.profile_id into v_owner from public.orders o where o.id = p_order_id;

  if v_owner is null then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  /*
   * The client who placed the order may issue their own, because the proforma
   * is now produced the moment an order is created rather than as an approval
   * step afterwards. The admin may issue any, which is what re-issuing after a
   * correction relies on. Nobody else gets past here.
   */
  if not (public.is_admin() or v_owner = auth.uid()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_seller from public.company_settings where singleton;

  -- Bank details are deliberately absent from this check. See the header.
  if v_seller.legal_name is null or v_seller.gst_number is null then
    raise exception 'company_details_incomplete'
      using errcode = '23514',
            hint = 'Fill in the company legal name and GST number before issuing.';
  end if;

  -- Name and HSN are copied here so a later rename or reclassification cannot
  -- rewrite a document the client is already holding.
  update public.order_items i
  set product_name = p.name,
      hsn_code = coalesce(p.hsn_code, v_seller.default_hsn_code)
  from public.products p
  where i.order_id = p_order_id and p.id = i.product_id;

  update public.orders o
  set status = 'issued',
      issued_at = now(),
      seller_snapshot = to_jsonb(v_seller),
      buyer_snapshot = (
        select to_jsonb(x) from (
          select pr.name, pr.company, pr.mobile, pr.email,
                 pr.billing_address, pr.gst_number,
                 pr.billing_state, pr.billing_state_code,
                 -- Place of supply is the buyer's state. Recorded rather than
                 -- worked out at render time, so the document stays fixed.
                 pr.billing_state as place_of_supply,
                 pr.billing_state_code as place_of_supply_code
          from public.profiles pr where pr.id = o.profile_id
        ) x
      )
  where o.id = p_order_id and o.status = 'submitted';

  if not found then
    raise exception 'order_not_submitted'
      using errcode = '23514',
            hint = 'Only a submitted order can be issued.';
  end if;
end;
$$;

revoke all on function public.issue_order(uuid) from public;
grant execute on function public.issue_order(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. The registration details themselves
-- -----------------------------------------------------------------------------

-- From Form GST REG-06. Only what the certificate actually states is set here.
-- Phone, email and bank details were not on it and stay null rather than
-- guessed; the invoice prints around whatever is missing.
update public.company_settings set
  legal_name = 'NOVA COUTURE PRIVATE LIMITED',
  gst_number = '27AALCN6631N1ZU',
  -- PAN is characters 3 to 12 of a GSTIN.
  pan = 'AALCN6631N',
  address = 'Floor 2, 202 A Wing, Mahalaxmi Apt Rajkamal' || chr(10) ||
            'Mahatma Gandhi Marg, Parel' || chr(10) ||
            'Mumbai, Maharashtra 400012',
  state = 'Maharashtra',
  state_code = '27',
  default_hsn_code = '7113',
  invoice_declaration =
    'This is a proforma invoice issued to confirm items and quantities only. ' ||
    'It is not a tax invoice and not a demand for payment. No prices, taxes or ' ||
    'amounts are stated or implied. A tax invoice will follow on supply.',
  updated_at = now()
where singleton;
