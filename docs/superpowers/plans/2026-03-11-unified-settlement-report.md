# Unified Settlement Report Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure settlement PDF from per-batch report into a unified "Payment/Reimbursement Request Form" with per-payee individual forms and receipts grouped together.

**Architecture:** Modify `exportBatchSettlementPdf()` in `pdfExport.ts` to generate the new page order (cover → payee summary → per-payee forms+receipts → bank books). Update `SettlementReportPage.tsx` web preview to match. Update i18n keys for new title/labels.

**Tech Stack:** React, TypeScript, i18next, HTML-to-PDF (browser print)

---

## Chunk 1: i18n and PDF Restructure

### Task 1: Update i18n keys

**Files:**
- Modify: `apps/finance/src/locales/ko.json:213-251` (settlement section)
- Modify: `apps/finance/src/locales/en.json:213-251` (settlement section)

- [ ] **Step 1: Add new i18n keys to ko.json**

In the `"settlement"` section, update/add these keys:

```json
"reportTitle": "지불 / 환불 신청서",
"reportSubtitle": "Payment / Reimbursement Request Form",
"batchReport": "지불 / 환불 통합 신청서",
"individualForm": "개별 신청서",
"seeAttached": "See attached below"
```

- [ ] **Step 2: Add new i18n keys to en.json**

In the `"settlement"` section, update/add these keys:

```json
"reportTitle": "Payment / Reimbursement Request Form",
"reportSubtitle": "Payment / Reimbursement Request Form",
"batchReport": "Payment / Reimbursement Request Form (Combined)",
"individualForm": "Individual Request Form",
"seeAttached": "See attached below"
```

- [ ] **Step 3: Commit i18n changes**

```bash
git add apps/finance/src/locales/ko.json apps/finance/src/locales/en.json
git commit -m "feat: update i18n keys for unified settlement report"
```

### Task 2: Restructure PDF generation — Cover page

**Files:**
- Modify: `apps/finance/src/lib/pdfExport.ts:125-403`

The `exportBatchSettlementPdf()` function currently builds 4 HTML parts (pages). We restructure to the new order.

- [ ] **Step 1: Update Page 1 (Cover) for multi-payee handling**

In `pdfExport.ts`, modify the Page 1 section (lines 217-278). Key changes:

1. For multi-payee: payee shows "Multi", bank account shows "See attached below", signature shows "See attached below"
2. For single payee: same as current (show actual name, account, signature)

Replace the info-grid and signature sections. The budget code summary table stays the same.

```typescript
// In the info-grid section, replace payee/bank lines:
const isBatch = settlements.length > 1

// Info grid - payee line
const payeeDisplay = isBatch ? 'Multi' : escapeHtml(uniquePayees[0])
const bankDisplay = isBatch
  ? t('settlement.seeAttached')
  : `${escapeHtml(settlements[0].bankName)} ${escapeHtml(settlements[0].bankAccount)}`

// In signature section:
// Requested by: if multi → "See attached below", else → actual signature
// Approved by: keep as-is (same approver for all)
```

- [ ] **Step 2: Commit cover page changes**

```bash
git add apps/finance/src/lib/pdfExport.ts
git commit -m "feat: update cover page for multi-payee handling"
```

### Task 3: Restructure PDF generation — Payee summary + Individual forms

**Files:**
- Modify: `apps/finance/src/lib/pdfExport.ts`

- [ ] **Step 1: Replace Page 2 with payee summary only (multi-payee)**

Current Page 2 has both the detailed reimbursement table AND payee summary. Change to:
- Multi-payee: Show ONLY the payee summary table (no detailed items table)
- Single payee: Skip this page entirely

```typescript
// Page 2: Payee Summary (multi-payee only)
if (isBatch) {
  parts.push(`
  <div class="page-break">
    <h2>${t('settlement.payeeSummary')}</h2>
    <table>
      <thead><tr>
        <th>#</th>
        <th>${t('field.payee')}</th>
        <th>${t('field.bank')}</th>
        <th>${t('field.bankAccount')}</th>
        <th class="text-right">${t('field.totalAmount')}</th>
      </tr></thead>
      <tbody>
        ${settlements.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(s.payee)}</td>
            <td>${escapeHtml(s.bankName)}</td>
            <td>${escapeHtml(s.bankAccount)}</td>
            <td class="text-right">₩${s.totalAmount.toLocaleString()}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="4" class="text-right">${t('field.totalAmount')}</td>
          <td class="text-right">₩${grandTotal.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `)
}
```

- [ ] **Step 2: Add per-payee individual forms with receipts**

After the payee summary, generate for EACH settlement:
1. Individual request form page (payee info + items table + signatures)
2. That payee's receipts

This replaces the current "all receipts at end" approach. Receipts must be loaded per-settlement and placed after each form.

```typescript
// Page 3+: Individual forms + receipts per payee
for (const settlement of settlements) {
  const settlementRows = rows.filter(r => r.settlementId === settlement.id)
  const settlementTotal = settlementRows.reduce((sum, r) => sum + r.amount, 0)

  // Individual form
  parts.push(`
  <div class="page-break">
    <h2>${t('settlement.individualForm')} — ${escapeHtml(settlement.payee)}</h2>
    <div class="info-grid">
      <div><span class="label">${t('field.payee')}:</span> ${escapeHtml(settlement.payee)}</div>
      <div><span class="label">${t('field.phone')}:</span> ${escapeHtml(settlement.phone)}</div>
      <div><span class="label">${t('field.session')}:</span> ${escapeHtml(settlement.session)}</div>
      <div><span class="label">${t('field.bankAndAccount')}:</span> ${escapeHtml(settlement.bankName)} ${escapeHtml(settlement.bankAccount)}</div>
      <div><span class="label">${t('committee.label')}:</span> ${t(\`committee.\${settlement.committee}\`)}</div>
    </div>
    <table>
      <thead><tr>
        <th>#</th>
        <th>${t('field.budgetCode')}</th>
        <th>${t('field.comments')}</th>
        <th>${t('field.transportType')}</th>
        <th>${t('settlement.transportCost')}</th>
        <th class="text-right">${t('field.totalAmount')}</th>
      </tr></thead>
      <tbody>
        ${settlementRows.map((row, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${row.budgetCode}<br/><span class="small-text">${t(\`budgetCode.\${row.budgetCode}\`)}</span></td>
            <td>${escapeHtml(row.description)}</td>
            <td>${row.transportInfo || '-'}</td>
            <td>${row.transportCost || '-'}</td>
            <td class="text-right">₩${row.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="5" class="text-right">${t('field.totalAmount')}</td>
          <td class="text-right">₩${settlementTotal.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <!-- Signatures -->
    <div style="margin-top:20px; display:flex; justify-content:space-between;">
      <div style="flex:1;">
        <p style="font-size:10px; color:#666;">Requested by</p>
        ${settlement.requestedBySignature ? `<img src="${settlement.requestedBySignature}" style="max-height:50px;" />` : ''}
        <div style="border-top:1px solid #ccc; width:200px; margin-top:4px; padding-top:2px; font-size:10px;">${escapeHtml(settlement.payee)}</div>
      </div>
      <div style="flex:1; text-align:center;">
        <p style="font-size:10px; color:#666;">Approved by</p>
        ${settlement.approvalSignature ? `<img src="${settlement.approvalSignature}" style="max-height:50px;" />` : ''}
        <div style="border-top:1px solid #ccc; width:200px; margin:4px auto 0; padding-top:2px; font-size:10px;">${settlement.approvedBy ? escapeHtml(settlement.approvedBy.name) : '&nbsp;'}</div>
      </div>
    </div>
  </div>
  `)

  // This payee's receipts
  const payeeReceipts = numberedReceipts.filter(nr => nr.label.includes(settlement.payee))
  const payeeImages = payeeReceipts.map(nr => {
    const idx = numberedReceipts.indexOf(nr)
    return images[idx]
  })

  if (payeeImages.length > 0) {
    parts.push(`
    <div class="page-break">
      <h2>${t('field.receipts')} — ${escapeHtml(settlement.payee)}</h2>
      <div class="receipt-grid">
        ${payeeReceipts.map((nr, i) => {
          const img = payeeImages[i]
          if (!img.dataUrl) return `<div class="receipt-card">
            <div class="receipt-number">${escapeHtml(nr.label)}</div>
            <div class="receipt-fail">Failed to load</div>
            <p class="receipt-name">${escapeHtml(img.fileName)}</p>
          </div>`
          return `<div class="receipt-card">
            <div class="receipt-number">${escapeHtml(nr.label)}</div>
            <img src="${escapeHtml(img.dataUrl)}" />
            <p class="receipt-name">${escapeHtml(img.fileName)}</p>
          </div>`
        }).join('')}
      </div>
    </div>
    `)
  }
}
```

- [ ] **Step 3: Keep bank books at the end (unchanged)**

The bank books section stays the same — optional, at the very end.

- [ ] **Step 4: Commit PDF restructure**

```bash
git add apps/finance/src/lib/pdfExport.ts
git commit -m "feat: restructure PDF to per-payee individual forms with receipts"
```

### Task 4: Update web preview (SettlementReportPage)

**Files:**
- Modify: `apps/finance/src/pages/SettlementReportPage.tsx:78-208`

- [ ] **Step 1: Update report title and header**

Change the `<h2>` title from `settlement.batchReport` / `settlement.reportTitle` to always use the new title. Update the overview InfoGrid to show "Multi" / "See attached below" for multi-payee.

- [ ] **Step 2: Reorder sections in the JSX**

Current order: Overview → Budget Summary → Per-settlement details → Payee Summary

New order:
1. Overview (with Multi/See attached handling)
2. Budget Code Summary (unchanged)
3. Payee Summary table (multi-payee only, moved UP)
4. Per-settlement details with receipts inline (each settlement = card with items + receipts)

```tsx
{/* Payee Summary — moved before individual details */}
{isBatch && (
  <div className="mb-6">
    <h3 ...>{t('settlement.payeeSummary')}</h3>
    {/* same table as before */}
  </div>
)}

{/* Per-settlement detail — each with inline receipts */}
{settlements.map((s, idx) => (
  <div key={s.id} className="mb-6 border rounded-lg p-4">
    {/* ... existing settlement detail ... */}
    <ItemsTable items={s.items} totalAmount={s.totalAmount} />
    <ReceiptGallery receipts={s.receipts} />
  </div>
))}
```

- [ ] **Step 3: Update InfoGrid for multi-payee display**

```tsx
const payeeDisplay = isBatch ? 'Multi' : uniquePayees[0]
const bankDisplay = isBatch ? t('settlement.seeAttached') : `${settlements[0].bankName} ${settlements[0].bankAccount}`

<InfoGrid className="mb-6" items={[
  { label: t('field.payee'), value: payeeDisplay },
  { label: t('field.bankAndAccount'), value: bankDisplay },
  { label: t('settlement.settlementDate'), value: dateStr },
  { label: t('settlement.requestCount'), value: String(totalRequests) },
]} />
```

- [ ] **Step 4: Commit web preview changes**

```bash
git add apps/finance/src/pages/SettlementReportPage.tsx
git commit -m "feat: update web preview to match new report structure"
```

### Task 5: Visual verification

- [ ] **Step 1: Run dev server and verify**

```bash
cd apps/finance && npm run dev
```

Test scenarios:
1. Single payee settlement → PDF should show: cover (with name/account/signature) → items detail → receipts → bank book
2. Multi payee settlement → PDF should show: cover (Multi/See attached) → payee summary → individual form #1 → receipts #1 → individual form #2 → receipts #2 → bank books

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: unified payment/reimbursement request form report"
```
