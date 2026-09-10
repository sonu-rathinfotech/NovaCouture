-- =============================================================================
-- Weight on the proforma
--
-- The first printed proforma came back with one obvious hole: no weight. For a
-- gold catalogue that is not a nice-to-have -- weight is what a retailer reads
-- first, and a quotation without it is not much use to them.
--
-- Snapshotted onto the line at issue, exactly like product_name and hsn_code
-- (migrations 0012 and 0014), and for the same reason: re-weighing a piece
-- afterwards must not silently rewrite a document a client is already holding.
--
-- Null stays null. A piece that has not been weighed prints a blank cell, not
-- a zero -- the same rule the product page follows.
-- =============================================================================

alter table public.order_items add column if not exists weight_grams numeric(8, 3);

comment on column public.order_items.weight_grams is
  'Copied from the piece at issue. Null means it had no recorded weight, and '
  'prints as a blank cell rather than a zero.';


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

  -- The client who placed the order may issue their own, because the proforma
  -- is produced the moment an order is created rather than as an approval step
  -- afterwards. The admin may issue any, which is what re-issuing relies on.
  if not (public.is_admin() or v_owner = auth.uid()) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select * into v_seller from public.company_settings where singleton;

  if v_seller.legal_name is null or v_seller.gst_number is null then
    raise exception 'company_details_incomplete'
      using errcode = '23514',
            hint = 'Fill in the company legal name and GST number before issuing.';
  end if;

  -- Name, HSN and now weight are all copied here, so that renaming,
  -- reclassifying or re-weighing a piece later cannot alter a document that
  -- has already gone out.
  update public.order_items i
  set product_name = p.name,
      hsn_code = coalesce(p.hsn_code, v_seller.default_hsn_code),
      weight_grams = p.weight_grams
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
