# Unified Settlement Report — Payment/Reimbursement Request Form

**Date:** 2026-03-11
**Status:** Approved

## Summary

Restructure the settlement report PDF from a per-batch "정산 리포트" into a unified "지불/환불 신청서 (Payment/Reimbursement Request Form)" that consolidates multiple payees into a single document with clear per-payee sections.

## PDF Structure

### Page 1: Cover/Summary
- Title: "지불/환불 신청서 (Payment/Reimbursement Request Form)"
- Payee: single → name, multi → "Multi"
- Bank account: single → account info, multi → "See attached below"
- Budget code summary table (code, description, count, total per code)
- Signature: single → actual signature, multi → "See attached below"
- Area Office verification section (document no, signature, date, comments)

### Page 2: Payee Summary Table (multi-payee only)
- Table: #, payee name, bank, account, amount
- Grand total row
- Skipped when single payee

### Page 3+: Individual Request Forms (per payee, repeated)
For each payee:
1. **Individual request form page**
   - Payee info: name, phone, session, bank/account, committee
   - Detailed items table: #, budgetCode, description, transport info, transport cost, amount
   - Subtotal
   - Signatures (requester + approver)
2. **Receipts for this payee**
   - Numbered receipt images in 2-column grid
   - Label includes payee name

### Last Page (optional): Bank Book Copies
- All bank book images in 2-column grid
- Labeled with payee name

## Single vs Multi Payee Behavior

| Element | Single Payee | Multi Payee |
|---------|-------------|-------------|
| Cover payee | Name | "Multi" |
| Cover account | Account info | "See attached below" |
| Cover signature | Actual signature | "See attached below" |
| Payee summary (p2) | Skipped | Shown |
| Individual forms | Shown (with details) | Shown (per payee) |

## Files to Modify

1. `apps/finance/src/lib/pdfExport.ts` — PDF generation logic
2. `apps/finance/src/pages/SettlementReportPage.tsx` — Web preview UI
3. `apps/finance/src/locales/ko.json` — Korean translations
4. `apps/finance/src/locales/en.json` — English translations

## Key Changes

- Rename report title in i18n
- Restructure `exportBatchSettlementPdf()` to new page order
- Add individual request form HTML generation (per payee)
- Move receipts to after each payee's form
- Handle multi-payee cover page with "Multi" / "See attached below"
- Conditionally show/hide payee summary table
