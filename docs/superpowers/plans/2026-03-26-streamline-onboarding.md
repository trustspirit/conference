# Streamline Onboarding & Inline Profile Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify initial setup to name/phone/committee/consent only; let users complete bank info and signature inline when they first submit a request or approve, syncing back to profile.

**Architecture:** Remove bank fields from DisplayNameModal. Add conditional bank book upload and signature pad sections to RequestFormPage/ResubmitPage (personal requests only). Update validation to accept either profile data or inline input. Modify RequestDetailPage to allow approvers without saved signature to sign inline. All inline completions sync to profile via updateAppUser.

**Tech Stack:** React, TypeScript, Firebase Cloud Functions, Firestore

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/components/DisplayNameModal.tsx` | Remove bank fields, keep name/phone/committee/consent |
| Modify | `src/pages/RequestFormPage.tsx` | Add inline bank book upload + signature pad for personal requests |
| Modify | `src/pages/ResubmitPage.tsx` | Same inline fields as RequestFormPage |
| Modify | `src/pages/RequestDetailPage.tsx` | Remove signature gate, allow inline signing for approvers |
| Modify | `src/components/AdminRequestModals.tsx` | Accept onSignatureSync callback for profile sync |
| Modify | `src/locales/ko.json` | Add new UI strings |
| Modify | `src/locales/en.json` | Add new UI strings |
| Modify | `functions/src/ai/context/app-usage.md` | Update documentation |

All paths relative to `apps/finance/`.

---

### Task 1: Simplify DisplayNameModal

**Files:**
- Modify: `src/components/DisplayNameModal.tsx`

- [ ] **Step 1: Remove bank-related imports and state**

Remove: `BANKS` import, `bankName`/`setBankName`, `bankAccount`/`setBankAccount`, `bankBookFile`/`setBankBookFile`, `bankBookError`/`setBankBookError` state variables, `bankNameMounted` ref and its useEffect, `formatBankAccount` from utils import.

- [ ] **Step 2: Update validate function**

Remove checks for bankName, bankAccount. Keep: displayName, phone, committee, consentAgreed.

```typescript
const validate = (): string[] => {
  const errs: string[] = []
  if (!displayName.trim()) errs.push(t('validation.displayNameRequired'))
  if (!phone.trim()) errs.push(t('validation.phoneRequired'))
  if (!committee) errs.push(t('validation.committeeRequired'))
  if (!consentAgreed) errs.push(t('validation.consentRequired'))
  return errs
}
```

- [ ] **Step 3: Update handleSave**

Remove the bankBookFile upload branch. Simplify to always call:

```typescript
await updateAppUser({
  displayName: displayName.trim(),
  phone: phone.trim(),
  defaultCommittee: committee as Committee,
  consentAgreedAt: new Date().toISOString()
})
```

Remove `httpsCallable`, `functions`, `fileToBase64`, `validateBankBookFile` imports if no longer used.

- [ ] **Step 4: Update JSX**

Remove: native `<select>` for bank, bankAccount TextField, bank book upload `<div>`, and related error displays. Keep: displayName TextField, phone TextField, CommitteeSelect, consent checkbox.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/finance && npx tsc --noEmit`

---

### Task 2: Add localization strings

**Files:**
- Modify: `src/locales/ko.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add Korean strings**

Add to `"form"` section:
```json
"bankBookUploadInline": "통장 사본 (프로필에 등록됩니다)",
"bankBookUploadInlineHint": "통장 사본을 첨부하세요. 제출 시 프로필에 자동 저장됩니다. (PNG, JPG, PDF / 최대 800KB)",
"signatureInline": "전자 서명 (프로필에 등록됩니다)",
"signatureInlineHint": "서명을 등록하세요. 제출 시 프로필에 자동 저장됩니다."
```

- [ ] **Step 2: Add English strings**

Add equivalent entries to `en.json`:
```json
"bankBookUploadInline": "Bank Book (will be saved to your profile)",
"bankBookUploadInlineHint": "Attach your bank book. It will be automatically saved to your profile on submission. (PNG, JPG, PDF / max 800KB)",
"signatureInline": "Signature (will be saved to your profile)",
"signatureInlineHint": "Register your signature. It will be automatically saved to your profile on submission."
```

---

### Task 3: Update RequestFormPage with inline profile completion

**Files:**
- Modify: `src/pages/RequestFormPage.tsx`

This is the largest task. The key principle: for **personal requests** (not vendor), if profile is missing bank book or signature, show inline fields. On submit, sync to profile.

- [ ] **Step 1: Add imports and state**

Add `SignaturePad` import:
```typescript
import SignaturePad from '../components/SignaturePad'
```

Add state for inline profile fields (after existing vendor state):
```typescript
const [inlineBankBookFile, setInlineBankBookFile] = useState<File | null>(null)
const [inlineBankBookError, setInlineBankBookError] = useState<string | null>(null)
const [inlineSignature, setInlineSignature] = useState('')
```

Add derived flags:
```typescript
const needsBankBook = !isVendorRequest && !appUser?.bankBookUrl && !appUser?.bankBookDriveUrl
const needsSignature = !isVendorRequest && !appUser?.signature
```

- [ ] **Step 2: Update validation**

Replace the bank book and signature validation block:

```typescript
if (!appUser?.signature && !inlineSignature) errs.push(t('validation.signatureRequired'))
// Bank book validation
if (isVendorRequest) {
  if (!vendorBankBookFile) errs.push(t('validation.vendorBankBookRequired'))
} else {
  if (!appUser?.bankBookUrl && !appUser?.bankBookDriveUrl && !inlineBankBookFile)
    errs.push(t('validation.bankBookRequired'))
}
```

- [ ] **Step 3: Update handleSubmit — inline bank book upload + signature sync**

After the vendor bank book upload block and before the profile update block, add inline bank book upload:

```typescript
// Upload inline bank book for personal requests (profile sync)
if (!isVendorRequest && inlineBankBookFile) {
  const data = await fileToBase64(inlineBankBookFile)
  const uploadFn = httpsCallable<
    { file: { name: string; data: string } },
    { fileName: string; storagePath: string; url: string }
  >(functions, 'uploadBankBookV2')
  const result = await uploadFn({ file: { name: inlineBankBookFile.name, data } })
  profileUpdates.bankBookPath = result.data.storagePath
  profileUpdates.bankBookUrl = result.data.url
  profileUpdates.bankBookImage = ''
}
```

And inline signature sync:
```typescript
if (!isVendorRequest && inlineSignature && !appUser?.signature) {
  profileUpdates.signature = inlineSignature
}
```

**Important:** The `profileUpdates` object construction needs to move BEFORE these blocks so it's accessible. Restructure the non-vendor profile update section:

```typescript
if (!isVendorRequest) {
  const profileUpdates: Record<string, string> = {}
  if (phone.trim() !== (appUser.phone || '')) profileUpdates.phone = phone.trim()
  if (bankName.trim() !== (appUser.bankName || '')) profileUpdates.bankName = bankName.trim()
  if (bankAccount.trim() !== (appUser.bankAccount || ''))
    profileUpdates.bankAccount = bankAccount.trim()

  // Inline bank book upload → profile sync
  if (inlineBankBookFile) {
    const data = await fileToBase64(inlineBankBookFile)
    const uploadFn = httpsCallable<
      { file: { name: string; data: string } },
      { fileName: string; storagePath: string; url: string }
    >(functions, 'uploadBankBookV2')
    const result = await uploadFn({ file: { name: inlineBankBookFile.name, data } })
    profileUpdates.bankBookPath = result.data.storagePath
    profileUpdates.bankBookUrl = result.data.url
    profileUpdates.bankBookImage = ''
  }

  // Inline signature → profile sync
  if (inlineSignature && !appUser?.signature) {
    profileUpdates.signature = inlineSignature
  }

  if (Object.keys(profileUpdates).length > 0) {
    await updateAppUser(profileUpdates)
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
  }
}
```

- [ ] **Step 4: Add inline bank book upload UI**

After the vendor bank book section and before comments, add (only for personal requests missing bank book):

```tsx
{needsBankBook && (
  <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {t('form.bankBookUploadInline')} <span className="text-red-500">*</span>
    </label>
    <input
      type="file"
      accept=".png,.jpg,.jpeg,.pdf"
      onChange={(e) => {
        const f = e.target.files?.[0] || null
        if (f) {
          const err = validateBankBookFile(f)
          if (err) {
            setInlineBankBookError(err)
            setInlineBankBookFile(null)
            e.target.value = ''
            return
          }
        }
        setInlineBankBookError(null)
        setInlineBankBookFile(f)
      }}
      className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
    />
    {inlineBankBookError && <p className="text-xs text-red-600 mt-1">{inlineBankBookError}</p>}
    {inlineBankBookFile && (
      <p className="text-xs text-green-600 mt-1">
        {inlineBankBookFile.name} ({(inlineBankBookFile.size / 1024).toFixed(0)}KB)
      </p>
    )}
    <p className="text-xs text-gray-400 mt-1">{t('form.bankBookUploadInlineHint')}</p>
  </div>
)}
```

- [ ] **Step 5: Add inline signature pad UI**

After the inline bank book section, add (only for personal requests missing signature):

```tsx
{needsSignature && (
  <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {t('form.signatureInline')} <span className="text-red-500">*</span>
    </label>
    <SignaturePad onChange={setInlineSignature} />
    <p className="text-xs text-gray-400 mt-1">{t('form.signatureInlineHint')}</p>
  </div>
)}
```

- [ ] **Step 6: Update handleClearDraft**

Add resets:
```typescript
setInlineBankBookFile(null)
setInlineBankBookError(null)
setInlineSignature('')
```

---

### Task 4: Update ResubmitPage with same inline fields

**Files:**
- Modify: `src/pages/ResubmitPage.tsx`

Apply the same pattern as Task 3, adapted for ResubmitPage:

- [ ] **Step 1: Add imports, state, derived flags**

Same as RequestFormPage: `SignaturePad` import, `inlineBankBookFile`/`inlineBankBookError`/`inlineSignature` state, `needsBankBook`/`needsSignature` derived flags.

- [ ] **Step 2: Update validation**

Same conditional: accept either profile data or inline input for bank book and signature. For vendor requests, keep existing behavior.

- [ ] **Step 3: Update handleSubmit**

For non-vendor: add inline bank book upload via `uploadBankBookV2` + inline signature to `profileUpdates`, then `updateAppUser`.

- [ ] **Step 4: Add inline UI sections**

Same JSX blocks as RequestFormPage — bank book upload and signature pad, shown conditionally when profile is missing these.

---

### Task 5: Update RequestDetailPage — approver inline signature

**Files:**
- Modify: `src/pages/RequestDetailPage.tsx`
- Modify: `src/components/AdminRequestModals.tsx`

- [ ] **Step 1: Remove signature gate in handleApproveOpen**

In `RequestDetailPage.tsx`, remove the early return that blocks the modal:

```typescript
// REMOVE these lines:
// if (!appUser?.signature) {
//   toast({ variant: 'danger', message: t('validation.signatureRequired') })
//   return
// }
```

Now the modal opens regardless of whether the approver has a saved signature.

- [ ] **Step 2: Add onSignatureSync callback to ApprovalModal**

In `AdminRequestModals.tsx`, add a new prop:

```typescript
interface ApprovalModalProps {
  // ... existing props ...
  onSignatureSync?: (signature: string) => void
}
```

- [ ] **Step 3: Update ApprovalModal onConfirm to sync signature**

In `ApprovalModal`, when the user confirms with a NEW signature (not the saved one), call `onSignatureSync`:

```typescript
<Button
  variant="primary"
  onClick={() => {
    // If user drew a new signature (not reusing saved), sync to profile
    if (signatureData && signatureData !== savedSignature && onSignatureSync) {
      onSignatureSync(signatureData)
    }
    onConfirm(signatureData)
  }}
  disabled={!signatureData || isPending}
  loading={isPending}
>
```

- [ ] **Step 4: Pass onSignatureSync from RequestDetailPage**

In `RequestDetailPage.tsx`, where `<ApprovalModal>` is rendered:

```tsx
<ApprovalModal
  // ... existing props ...
  savedSignature={appUser?.signature}
  onConfirm={handleApproveConfirm}
  onSignatureSync={async (sig) => {
    try {
      await updateAppUser({ signature: sig })
    } catch {
      // Non-blocking — approval still proceeds
    }
  }}
  isPending={approveMutation.isPending}
/>
```

---

### Task 6: Update AI chatbot context

**Files:**
- Modify: `functions/src/ai/context/app-usage.md`

- [ ] **Step 1: Update initial setup section (1-1)**

Replace the required fields list to reflect only: name, phone, committee, consent.

- [ ] **Step 2: Update request submission section (2-1)**

Add note that if bank info or signature is missing from profile, users can complete them inline during first submission and they'll be saved to profile.

- [ ] **Step 3: Update FAQ**

Add Q&A:
```
Q: 은행 정보나 서명을 등록하지 않아도 신청서를 작성할 수 있나요?
A: 네. 프로필에 은행 정보나 서명이 없더라도 신청서 작성 화면에서 직접 입력할 수 있습니다. 입력한 정보는 제출 시 프로필에 자동으로 저장되어 다음 신청부터는 자동으로 채워집니다.
```

---

### Task 7: Build verification

- [ ] **Step 1: TypeScript check frontend**

Run: `cd apps/finance && npx tsc --noEmit`

- [ ] **Step 2: TypeScript check functions**

Run: `cd apps/finance/functions && npx tsc --noEmit`

- [ ] **Step 3: Manual test checklist**

1. New user → initial setup: only name, phone, committee, consent required
2. New user → first request: bank name/account fields empty, bank book upload + signature pad shown
3. Submit → profile now has bank info + signature
4. Second request → bank book upload and signature pad hidden (profile has data)
5. Vendor request → inline fields NOT shown (vendor uses own bank book, profile signature required)
6. Approver without signature → approval modal opens, signature pad shown, approve → signature saved to profile
7. Approver with signature → approval modal shows "use saved signature" checkbox as before
