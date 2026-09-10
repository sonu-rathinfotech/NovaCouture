-- =============================================================================
-- The document is a quotation, not a proforma invoice
--
-- Renamed on request after the first printed copies were reviewed. In Indian
-- practice the two are different things: a proforma confirms an order before
-- supply, a quotation offers terms for the client to consider. This document
-- lists pieces, weights and quantities with no amounts at all, which is the
-- second of those.
--
-- -- Why the column is still called invoice_declaration ----------------------
-- Because renaming it would orphan the declaration on every document already
-- issued. A seller snapshot is a copy of this whole row taken at issue
-- (migration 0012), so the old rows carry the old key; a renamed column would
-- simply stop being read and those documents would print with no declaration
-- at all. The label is what a client sees. The column name is not, and it is
-- not worth silently breaking history over.
-- =============================================================================

update public.company_settings set
  invoice_declaration =
    'This is a quotation of items and quantities only. It is not a tax invoice ' ||
    'and not a demand for payment. No prices, taxes or amounts are stated or ' ||
    'implied. A tax invoice will follow on supply.',
  updated_at = now()
where singleton;

comment on column public.company_settings.invoice_declaration is
  'Printed at the foot of every quotation. Kept under its original name so '
  'that seller snapshots taken before the rename still resolve. See 0016.';
