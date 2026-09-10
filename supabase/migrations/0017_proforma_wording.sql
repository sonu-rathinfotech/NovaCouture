-- =============================================================================
-- Back to "Proforma invoice"
--
-- The document was renamed to "Quotation" in 0016 and is renamed back here,
-- on the client's decision after checking with their team.
--
-- Nothing structural moved either time. The heading is a string on the page,
-- and the stored text lives in company_settings.invoice_declaration, which
-- kept its name throughout precisely so that documents already issued would
-- keep resolving their declaration from the seller snapshot taken at issue.
-- =============================================================================

update public.company_settings set
  invoice_declaration =
    'This is a proforma invoice issued to confirm items and quantities only. ' ||
    'It is not a tax invoice and not a demand for payment. No prices, taxes or ' ||
    'amounts are stated or implied. A tax invoice will follow on supply.',
  updated_at = now()
where singleton;
