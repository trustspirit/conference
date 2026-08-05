# 영수증 PDF 기본 표시 크기 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/finance` 프로젝트 설정에서 영수증 PDF 기본 표시 크기(`일반`/`크게`)를 고를 수 있게 하고, 개별 영수증 토글이 그 기본값보다 우선하도록 한다.

**Architecture:** `Record<string, 'large'>`(부재 = 일반) 이던 `receiptDisplaySizes`를 `'large' | 'normal'` 3상태 모델(키 부재 = 기본값 상속)로 넓힌다. "이 영수증이 크게 나오는가" 판정은 `lib/receiptDisplaySize.ts` 의 `resolveReceiptDisplaySize()` 한 함수로 모아, 갤러리·PDF·토글 훅이 모두 같은 답을 내게 한다. 기본값은 프로젝트 문서(`projects/{id}.defaultReceiptDisplaySize`)에 저장한다.

**Tech Stack:** React 18 + TypeScript, TanStack Query, Firestore, react-i18next, Vitest + @testing-library/react, Tailwind.

## Global Constraints

- 작업 디렉터리는 `apps/finance`. 이 계획의 모든 상대 경로는 `apps/finance/` 기준이다.
- 테스트: `pnpm --filter @conference/finance test <path>` (내부적으로 `vitest run`). 타입체크: `pnpm --filter @conference/finance typecheck` (`tsc -b`).
- `pnpm lint`는 이 앱에서 동작하지 않는다. 사용하지 말 것.
- 에뮬레이터 없이는 항상 실패하는 테스트 파일이 있다. 전체 `test` 대신 **변경한 파일만 지정해서** 실행할 것.
- Firestore 규칙 파일(`firestore.rules`)은 **수정하지 않는다**. 기존 규칙이 값을 검증하지 않아 그대로 통과한다.
- 데이터 마이그레이션 스크립트를 작성하지 않는다. `defaultReceiptDisplaySize` 부재 = `'normal'` 로 해석되어 기존 동작과 동일하다.
- i18n 문자열은 `src/locales/ko.json` 과 `src/locales/en.json` **양쪽 모두**에 추가한다.
- 커밋 메시지는 conventional commits 형식(`feat:` / `fix:` / `refactor:` / `test:`).

---

### Task 1: 타입 확장 + 해석 헬퍼 + PDF 반영

`ReceiptDisplaySizes` 를 넓히면 `pdfExport.ts` 의 수집부가 곧바로 타입 에러를 내므로, 두 변경은 같은 태스크에서 함께 끝낸다.

**Files:**
- Modify: `src/types/index.ts:174-177` (ReceiptDisplaySizes), `src/types/index.ts:64-83` (Project)
- Create: `src/lib/receiptDisplaySize.ts`
- Create: `src/lib/receiptDisplaySize.test.ts`
- Modify: `src/lib/pdfExport.ts:229-232` (NumberedReceiptImage), `src/lib/pdfExport.ts:274-276` (expandReceiptImages 시그니처), `src/lib/pdfExport.ts:312-319` (PdfExportOptions), `src/lib/pdfExport.ts:428-444` (수집부)
- Modify: `src/lib/pdfExport.test.ts`

**Interfaces:**
- Produces: `ReceiptDisplaySize = 'normal' | 'large'` (from `../types`), `ReceiptDisplaySizes = Record<string, ReceiptDisplaySize>`, `Project.defaultReceiptDisplaySize?: ReceiptDisplaySize`, `DEFAULT_RECEIPT_DISPLAY_SIZE`, `resolveReceiptDisplaySize(sizes, storagePath, projectDefault): ReceiptDisplaySize`, `PdfExportOptions.defaultReceiptDisplaySize?: ReceiptDisplaySize`

- [ ] **Step 1: 타입 선언 추가**

`src/types/index.ts` 의 기존 블록(174~177행)을 아래로 교체한다.

```ts
/** 영수증이 PDF에서 렌더되는 크기. 'large'는 한 장에 한 개로 렌더된다. */
export type ReceiptDisplaySize = 'normal' | 'large'

/** storagePath → 표시 크기. 키가 없으면 프로젝트 기본값
 *  (`Project.defaultReceiptDisplaySize`, 그것도 없으면 'normal')을 상속한다.
 *  receipts 배열과 분리된 top-level 맵이라, 스태프가 영수증 신원 필드
 *  (storagePath / url / fileName)에 쓰기 권한 없이 크기만 바꿀 수 있다. */
export type ReceiptDisplaySizes = Record<string, ReceiptDisplaySize>
```

같은 파일의 `Project` 인터페이스(64~83행)에 `usdToKrwRate` 바로 아래로 필드를 추가한다.

```ts
  /** 영수증 PDF 기본 표시 크기. undefined = 'normal' (하위 호환). */
  defaultReceiptDisplaySize?: ReceiptDisplaySize
```

- [ ] **Step 2: 실패하는 헬퍼 테스트 작성**

`src/lib/receiptDisplaySize.test.ts` 를 새로 만든다.

```ts
import { describe, it, expect } from 'vitest'
import { resolveReceiptDisplaySize } from './receiptDisplaySize'

describe('resolveReceiptDisplaySize', () => {
  it('명시값이 프로젝트 기본값을 이긴다', () => {
    expect(resolveReceiptDisplaySize({ a: 'normal' }, 'a', 'large')).toBe('normal')
    expect(resolveReceiptDisplaySize({ a: 'large' }, 'a', 'normal')).toBe('large')
  })

  it('명시값이 없으면 프로젝트 기본값을 상속한다', () => {
    expect(resolveReceiptDisplaySize({ b: 'large' }, 'a', 'large')).toBe('large')
    expect(resolveReceiptDisplaySize({}, 'a', 'normal')).toBe('normal')
  })

  it("둘 다 없으면 'normal'이다 (기존 동작 하위 호환)", () => {
    expect(resolveReceiptDisplaySize(undefined, 'a', undefined)).toBe('normal')
    expect(resolveReceiptDisplaySize({}, 'a', undefined)).toBe('normal')
  })

  it('빈 storagePath는 기본값으로 떨어진다', () => {
    expect(resolveReceiptDisplaySize({ '': 'large' }, '', 'normal')).toBe('large')
    expect(resolveReceiptDisplaySize({}, '', 'large')).toBe('large')
  })
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @conference/finance test src/lib/receiptDisplaySize.test.ts`
Expected: FAIL — `Failed to resolve import "./receiptDisplaySize"`

- [ ] **Step 4: 헬퍼 구현**

`src/lib/receiptDisplaySize.ts` 를 새로 만든다.

```ts
import type { ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'

/** 프로젝트 설정이 없을 때의 크기. 이 기능 이전의 하드코딩 동작과 같다. */
export const DEFAULT_RECEIPT_DISPLAY_SIZE: ReceiptDisplaySize = 'normal'

/**
 * 영수증 하나의 최종 표시 크기를 정한다: 명시값 > 프로젝트 기본값 > 'normal'.
 *
 * 갤러리(배지·토글 버튼), PDF 렌더, 토글 훅이 모두 이 함수만 쓴다. 판정이 흩어지면
 * 화면에 보이는 상태와 PDF 결과가 어긋나기 때문이다.
 */
export function resolveReceiptDisplaySize(
  sizes: ReceiptDisplaySizes | undefined,
  storagePath: string,
  projectDefault: ReceiptDisplaySize | undefined
): ReceiptDisplaySize {
  return sizes?.[storagePath] ?? projectDefault ?? DEFAULT_RECEIPT_DISPLAY_SIZE
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @conference/finance test src/lib/receiptDisplaySize.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: pdfExport 타입 넓히기**

`src/lib/pdfExport.ts` 상단 import에 헬퍼와 타입을 추가한다.

```ts
import { resolveReceiptDisplaySize } from './receiptDisplaySize'
```

`ReceiptDisplaySize` 는 기존 `../types` import 목록에 `type` 으로 추가한다 (기존 `Receipt`, `Settlement` 등이 오는 곳).

`NumberedReceiptImage` (229~232행):

```ts
type NumberedReceiptImage = {
  nr: { label: string; receipt: Receipt; displaySize?: ReceiptDisplaySize }
  img: { fileName: string; dataUrl: string | null }
}
```

`expandReceiptImages` 의 첫 인자(274~276행):

```ts
export function expandReceiptImages(
  entries: { label: string; receipt: Receipt; displaySize?: ReceiptDisplaySize }[],
  images: { fileName: string; dataUrls: (string | null)[] }[]
): NumberedReceiptImage[] {
```

`displaySize` 는 **optional로 유지**한다. 기존 `pdfExport.test.ts` 가 `displaySize` 없는 entry를 넘기고 있어, 필수로 바꾸면 무관한 테스트 4개가 타입 에러를 낸다. `splitBySize` 의 `=== 'large'` 판정은 그대로 둔다.

- [ ] **Step 7: PdfExportOptions에 기본값 추가**

312~319행:

```ts
export interface PdfExportOptions {
  includeBankBooks?: boolean
  originalRequests?: PaymentRequest[]
  payeeUsers?: Map<string, AppUser>
  reportTitle?: string
  createdBySignature?: string | null
  createdByName?: string
  /** 프로젝트의 영수증 PDF 기본 크기. 개별 영수증의 명시값이 이보다 우선한다. */
  defaultReceiptDisplaySize?: ReceiptDisplaySize
}
```

- [ ] **Step 8: 수집부를 헬퍼로 교체**

428~444행의 주석과 루프를 아래로 바꾼다.

```ts
  // Collect receipts per form source (original request or settlement). The
  // display size resolves as: per-receipt override > project default > 'normal'.
  const receiptsByForm = new Map<
    string,
    { label: string; receipt: Receipt; displaySize?: ReceiptDisplaySize }[]
  >()
  for (let idx = 0; idx < formSources.length; idx++) {
    const source = formSources[idx]
    const sizeMap = source.receiptDisplaySizes
    const entries = source.receipts.map((receipt) => ({
      label: `#${idx + 1} ${source.payee}`,
      receipt,
      displaySize: resolveReceiptDisplaySize(
        sizeMap,
        receipt.storagePath,
        options.defaultReceiptDisplaySize
      )
    }))
    receiptsByForm.set(source.id, entries)
  }
```

- [ ] **Step 9: pdfExport 테스트 보강**

`src/lib/pdfExport.test.ts` 의 `describe('expandReceiptImages', ...)` 블록 안, 기존 `'carries the large display-size hint onto every page of a receipt'` 테스트 바로 뒤에 추가한다.

```ts
  it("carries an explicit 'normal' hint onto every page too", () => {
    const entries = [
      { label: '#1 Erin', receipt: receipt('note.pdf'), displaySize: 'normal' as const }
    ]
    const images = [{ fileName: 'note.pdf', dataUrls: ['data:img/p1', 'data:img/p2'] }]

    const result = expandReceiptImages(entries, images)

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.nr.displaySize === 'normal')).toBe(true)
  })
```

- [ ] **Step 10: 테스트 + 타입체크**

Run: `pnpm --filter @conference/finance test src/lib/receiptDisplaySize.test.ts src/lib/pdfExport.test.ts`
Expected: PASS (모두)

Run: `pnpm --filter @conference/finance typecheck`
Expected: 에러 없음

- [ ] **Step 11: 커밋**

```bash
git add apps/finance/src/types/index.ts \
        apps/finance/src/lib/receiptDisplaySize.ts \
        apps/finance/src/lib/receiptDisplaySize.test.ts \
        apps/finance/src/lib/pdfExport.ts \
        apps/finance/src/lib/pdfExport.test.ts
git commit -m "feat(finance): resolve receipt PDF size against a project default"
```

---

### Task 2: 토글 훅이 'normal'을 명시 저장하도록 변경

기본값이 `'large'` 가 되면 "키 삭제 = 일반" 규약이 무너진다. 토글은 이제 두 값 모두를 문서에 명시적으로 쓴다.

**Files:**
- Modify: `src/hooks/useReceiptSizeToggle.ts`
- Modify: `src/hooks/useReceiptSizeToggle.test.tsx`

**Interfaces:**
- Consumes: `ReceiptDisplaySize`, `resolveReceiptDisplaySize` (Task 1)
- Produces: `useReceiptSizeToggle(requests, projectId, enabled, projectDefault?)` → `ReceiptSizeToggle`, 이제 `defaultSize?: ReceiptDisplaySize` 필드를 포함한다. 두 페이지가 `{...receiptSizeToggle}` 로 `ReceiptGallery` 에 스프레드하므로, `defaultSize` 는 Task 3의 갤러리 prop 이름과 정확히 일치해야 한다.

- [ ] **Step 1: 실패하는 테스트로 기대값 뒤집기**

`src/hooks/useReceiptSizeToggle.test.tsx` 의 86~98행 테스트("'normal' 토글은 키를 삭제하고...")를 아래로 교체한다.

```tsx
  it("'normal' 토글은 키를 삭제하지 않고 'normal'을 명시 저장한다", async () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a', 'b'], { a: 'large', b: 'large' })], 'p1', true)
    )
    await act(async () => {
      await result.current.onToggleDisplaySize!('a', 'normal')
    })
    expect(mutateAsyncSpy).toHaveBeenCalledWith({
      requestId: 'r1',
      projectId: 'p1',
      receiptDisplaySizes: { a: 'normal', b: 'large' }
    })
  })
```

같은 파일 33~37행의 `req` 헬퍼 시그니처도 넓힌다.

```tsx
function req(
  id: string,
  storagePaths: string[],
  receiptDisplaySizes?: ReceiptDisplaySizes
): PaymentRequest {
```

30행의 import를 바꾼다.

```tsx
import type { PaymentRequest, ReceiptDisplaySizes } from '../types'
```

파일 맨 끝 `describe` 블록 안에 기본값 통과 테스트를 추가한다.

```tsx
  it('projectDefault를 defaultSize로 그대로 돌려준다 (갤러리에 스프레드되는 값)', () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a'])], 'p1', true, 'large')
    )
    expect(result.current.defaultSize).toBe('large')
  })

  it('enabled=false여도 defaultSize는 전달된다', () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a'])], 'p1', false, 'large')
    )
    expect(result.current.onToggleDisplaySize).toBeUndefined()
    expect(result.current.defaultSize).toBe('large')
  })
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @conference/finance test src/hooks/useReceiptSizeToggle.test.tsx`
Expected: FAIL — `'normal'` 테스트가 `{ b: 'large' }` 를 받아 불일치, `defaultSize` 테스트는 `undefined` 반환

- [ ] **Step 3: 훅 구현 변경**

`src/hooks/useReceiptSizeToggle.ts`:

`ReceiptSizeToggle` 인터페이스에 필드를 추가한다.

```ts
  /** 프로젝트의 기본 표시 크기. 그대로 ReceiptGallery의 `defaultSize` prop으로 스프레드된다. */
  defaultSize?: ReceiptDisplaySize
```

import에 타입을 추가한다.

```ts
import type { PaymentRequest, ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'
```

시그니처에 네 번째 인자를 추가한다.

```ts
export function useReceiptSizeToggle(
  requests: PaymentRequest[] | undefined,
  projectId: string | undefined,
  enabled: boolean,
  projectDefault?: ReceiptDisplaySize
): ReceiptSizeToggle {
```

두 개의 조기 반환(53행, 56행)에 `defaultSize` 를 실어준다.

```ts
  if (!enabled) return { displaySizes, isPending: false, defaultSize: projectDefault }
  if (ownerByPath.size === 0) return { displaySizes, isPending: false, defaultSize: projectDefault }
```

66~69행의 분기를 지우고 명시 저장으로 바꾼다.

```ts
    // 두 값 모두 명시 저장한다. 프로젝트 기본값이 'large'일 수 있으므로 키를 지우면
    // '일반'이 아니라 '기본값 상속'을 뜻하게 되어 의도와 달라진다.
    const map: ReceiptDisplaySizes = { ...(owner.receiptDisplaySizes ?? {}) }
    map[storagePath] = next
```

마지막 반환문(82행)도 바꾼다.

```ts
  return {
    displaySizes,
    onToggleDisplaySize,
    isPending: mutation.isPending,
    defaultSize: projectDefault
  }
```

훅 상단 JSDoc의 "'large'만 명시적으로 저장" 관련 설명이 있으면 3상태 모델 설명으로 갱신한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @conference/finance test src/hooks/useReceiptSizeToggle.test.tsx`
Expected: PASS (13 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/finance/src/hooks/useReceiptSizeToggle.ts \
        apps/finance/src/hooks/useReceiptSizeToggle.test.tsx
git commit -m "feat(finance): store explicit normal receipt size instead of deleting the key"
```

---

### Task 3: 갤러리 배지·토글을 기본값 기준으로

배지는 **기본값과 다를 때만** 뜬다. 기본이 `'large'` 인 프로젝트에서 모든 타일에 "크게" 배지가 박히는 노이즈를 피하기 위함이다.

**Files:**
- Modify: `src/components/ReceiptGallery.tsx`
- Create: `src/components/ReceiptGallery.test.tsx`
- Modify: `src/locales/ko.json:646`, `src/locales/en.json:646` (receipts 블록)

**Interfaces:**
- Consumes: `resolveReceiptDisplaySize`, `DEFAULT_RECEIPT_DISPLAY_SIZE`, `ReceiptDisplaySize` (Task 1); `defaultSize` prop 이름은 Task 2의 훅 반환 필드와 일치해야 한다
- Produces: `ReceiptGallery` prop `defaultSize?: ReceiptDisplaySize`

- [ ] **Step 1: i18n 키 추가**

`src/locales/ko.json` 의 `"sizeLargeBadge": "크게",` 다음 줄에 추가:

```json
    "sizeNormalBadge": "일반",
```

`src/locales/en.json` 의 `"sizeLargeBadge": "Large",` 다음 줄에 추가:

```json
    "sizeNormalBadge": "Normal",
```

- [ ] **Step 2: 실패하는 컴포넌트 테스트 작성**

`src/components/ReceiptGallery.test.tsx` 를 새로 만든다.

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

// BankBookPreview는 이미지/PDF 로딩을 하므로 렌더만 스텁한다.
vi.mock('./BankBookPreview', () => ({
  default: () => null
}))

import ReceiptGallery from './ReceiptGallery'
import type { Receipt } from '../types'

const receipts: Receipt[] = [
  { fileName: 'a.jpg', storagePath: 'a', url: 'https://x/a.jpg' },
  { fileName: 'b.jpg', storagePath: 'b', url: 'https://x/b.jpg' }
]

describe('ReceiptGallery 표시 크기 배지', () => {
  it("기본값이 normal이면 large로 지정된 영수증에만 '크게' 배지를 단다", () => {
    render(<ReceiptGallery receipts={receipts} displaySizes={{ a: 'large' }} />)
    expect(screen.getAllByText('receipts.sizeLargeBadge')).toHaveLength(1)
    expect(screen.queryByText('receipts.sizeNormalBadge')).toBeNull()
  })

  it("기본값이 large이면 normal로 지정된 영수증에만 '일반' 배지를 단다", () => {
    render(
      <ReceiptGallery receipts={receipts} displaySizes={{ a: 'normal' }} defaultSize="large" />
    )
    expect(screen.getAllByText('receipts.sizeNormalBadge')).toHaveLength(1)
    expect(screen.queryByText('receipts.sizeLargeBadge')).toBeNull()
  })

  it('명시값이 없고 기본값만 있으면 아무 배지도 달지 않는다', () => {
    render(<ReceiptGallery receipts={receipts} defaultSize="large" />)
    expect(screen.queryByText('receipts.sizeLargeBadge')).toBeNull()
    expect(screen.queryByText('receipts.sizeNormalBadge')).toBeNull()
  })

  it('기본값이 large면 명시값 없는 영수증의 토글은 normal로 내린다', () => {
    const onToggleDisplaySize = vi.fn()
    render(
      <ReceiptGallery
        receipts={receipts}
        defaultSize="large"
        onToggleDisplaySize={onToggleDisplaySize}
      />
    )
    // 타일당 버튼은 토글 하나뿐이다 (썸네일 자체는 <a>).
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onToggleDisplaySize).toHaveBeenCalledWith('a', 'normal')
  })
})
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @conference/finance test src/components/ReceiptGallery.test.tsx`
Expected: FAIL — `defaultSize` prop이 없어 타입 에러 및 배지 기대 불일치

- [ ] **Step 4: 갤러리 구현 변경**

`src/components/ReceiptGallery.tsx`:

import를 추가한다.

```tsx
import { Receipt, ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'
import { DEFAULT_RECEIPT_DISPLAY_SIZE, resolveReceiptDisplaySize } from '../lib/receiptDisplaySize'
```

`Props` 를 고친다 (9~10행 주석 포함).

```tsx
  /** storagePath → 명시적 표시 크기. 키가 없으면 `defaultSize`를 상속한다. */
  displaySizes?: ReceiptDisplaySizes
  /** 프로젝트의 기본 표시 크기. 생략하면 'normal'. */
  defaultSize?: ReceiptDisplaySize
```

`defaultSize` 를 구조분해 목록(18~24행)에 추가한다.

`handleToggle` (28~33행)은 수정하지 않는다. 이미 넘겨받은 `isLarge` 를 뒤집을 뿐이라,
호출부가 해석된 값을 넘겨주면 그대로 올바르게 동작한다.

48행을 아래로 교체한다.

```tsx
          const size = resolveReceiptDisplaySize(displaySizes, r.storagePath, defaultSize)
          const isLarge = size === 'large'
          // 기본값과 다를 때만 배지를 단다. 기본이 'large'인 프로젝트에서 모든 타일에
          // 배지가 박히면 예외를 못 알아본다.
          const effectiveDefault = defaultSize ?? DEFAULT_RECEIPT_DISPLAY_SIZE
          const badge =
            size === effectiveDefault
              ? null
              : isLarge
                ? t('receipts.sizeLargeBadge')
                : t('receipts.sizeNormalBadge')
```

67~71행의 배지 렌더를 바꾼다.

```tsx
                {badge && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-finance-accent text-[10px] font-semibold text-white shadow">
                    {badge}
                  </span>
                )}
```

75~114행의 토글 버튼(`onClick`, `aria-label`, `title`, 아이콘 분기)은 이미 `isLarge` 를 쓰므로 수정 불필요하다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @conference/finance test src/components/ReceiptGallery.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: 커밋**

```bash
git add apps/finance/src/components/ReceiptGallery.tsx \
        apps/finance/src/components/ReceiptGallery.test.tsx \
        apps/finance/src/locales/ko.json \
        apps/finance/src/locales/en.json
git commit -m "feat(finance): badge receipts only when their size differs from the project default"
```

---

### Task 4: 프로젝트 설정 UI

**Files:**
- Modify: `src/components/settings/ProjectGeneralSettings.tsx`
- Modify: `src/locales/ko.json:562-563` 근처 (`project` 블록), `src/locales/en.json:562-563` 근처

**Interfaces:**
- Consumes: `Project.defaultReceiptDisplaySize`, `DEFAULT_RECEIPT_DISPLAY_SIZE`, `ReceiptDisplaySize` (Task 1)
- Produces: 없음 (UI 종단)

- [ ] **Step 1: i18n 키 추가**

`src/locales/ko.json` 의 `project` 블록, `"corporateCardReportTitleHint"` 줄 뒤에 콤마를 붙이고 추가한다.

```json
    "defaultReceiptSize": "영수증 PDF 기본 크기",
    "defaultReceiptSizeHint": "PDF 내보내기에서 영수증이 기본으로 렌더되는 크기입니다. 영수증별로 크기를 따로 지정하면 이 기본값보다 우선합니다.",
    "receiptSizeNormal": "일반",
    "receiptSizeLarge": "크게 (한 장에 한 개)"
```

`src/locales/en.json` 의 같은 위치에 추가한다.

```json
    "defaultReceiptSize": "Default Receipt Size in PDF",
    "defaultReceiptSizeHint": "The size receipts render at by default in PDF exports. Per-receipt overrides take precedence over this default.",
    "receiptSizeNormal": "Normal",
    "receiptSizeLarge": "Large (one per page)"
```

- [ ] **Step 2: 상태 추가**

`src/components/settings/ProjectGeneralSettings.tsx` 상단 import에 타입을 추가한다.

```tsx
import { Project, ReceiptDisplaySize } from '../../types'
import { DEFAULT_RECEIPT_DISPLAY_SIZE } from '../../lib/receiptDisplaySize'
```

16행(`ccReportTitle`) 다음에 상태를 추가한다.

```tsx
  const [receiptSize, setReceiptSize] = useState<ReceiptDisplaySize>(
    project.defaultReceiptDisplaySize ?? DEFAULT_RECEIPT_DISPLAY_SIZE
  )
```

- [ ] **Step 3: dirty 판정과 저장에 반영**

22~29행의 `dirty` 마지막 줄 뒤에 `||` 로 이어붙인다.

```tsx
    ccReportTitle !== (project.corporateCardReportTitle || '') ||
    receiptSize !== (project.defaultReceiptDisplaySize ?? DEFAULT_RECEIPT_DISPLAY_SIZE)
```

35~46행 `updateProject.mutateAsync` 의 `data` 에 필드를 추가한다 (`corporateCardReportTitle` 스프레드 뒤).

```tsx
          defaultReceiptDisplaySize: receiptSize,
```

- [ ] **Step 4: select 필드 렌더**

`corporateCardReportTitle` 블록(132~144행) 바로 뒤, 저장 버튼 `div` 앞에 넣는다.

```tsx
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.defaultReceiptSize')}</label>
        <select
          value={receiptSize}
          onChange={(e) => setReceiptSize(e.target.value as ReceiptDisplaySize)}
          className="w-full border border-finance-border rounded px-3 py-2 text-sm focus:border-finance-primary focus:outline-none"
        >
          <option value="normal">{t('project.receiptSizeNormal')}</option>
          <option value="large">{t('project.receiptSizeLarge')}</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">{t('project.defaultReceiptSizeHint')}</p>
      </div>
```

- [ ] **Step 5: 타입체크 + JSON 유효성 확인**

Run: `pnpm --filter @conference/finance typecheck`
Expected: 에러 없음

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/finance/src/locales/ko.json','utf8')); JSON.parse(require('fs').readFileSync('apps/finance/src/locales/en.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 6: 커밋**

```bash
git add apps/finance/src/components/settings/ProjectGeneralSettings.tsx \
        apps/finance/src/locales/ko.json \
        apps/finance/src/locales/en.json
git commit -m "feat(finance): add default receipt PDF size to project settings"
```

---

### Task 5: 페이지 배선

두 페이지 모두 `{...receiptSizeToggle}` 로 갤러리에 스프레드하므로, 훅에 기본값을 넘기기만 하면 갤러리까지 자동으로 흐른다. PDF 내보내기 옵션만 따로 연결한다.

**Files:**
- Modify: `src/pages/SettlementReportPage.tsx:75-79` (훅 호출), `src/pages/SettlementReportPage.tsx:153-166` (PDF 옵션)
- Modify: `src/pages/RequestDetailPage.tsx:81-85` (훅 호출)

**Interfaces:**
- Consumes: `useReceiptSizeToggle(..., projectDefault)` (Task 2), `PdfExportOptions.defaultReceiptDisplaySize` (Task 1), `Project.defaultReceiptDisplaySize` (Task 1)

- [ ] **Step 1: SettlementReportPage 훅 호출**

75~79행:

```tsx
  const receiptSizeToggle = useReceiptSizeToggle(
    originalRequests,
    currentProject?.id,
    isStaff(role),
    currentProject?.defaultReceiptDisplaySize
  )
```

- [ ] **Step 2: SettlementReportPage PDF 옵션**

153~166행의 options 객체에 한 줄 추가한다.

```tsx
        {
          includeBankBooks,
          originalRequests: originalRequests || [],
          payeeUsers,
          reportTitle: isCorporateCard ? corporateCardTitle : undefined,
          createdBySignature: creatorSignature,
          createdByName: creatorName,
          defaultReceiptDisplaySize: currentProject?.defaultReceiptDisplaySize
        }
```

- [ ] **Step 3: RequestDetailPage 훅 호출**

81~85행:

```tsx
  const receiptSizeToggle = useReceiptSizeToggle(
    receiptSizeToggleRequests,
    currentProject?.id,
    isStaff(role),
    currentProject?.defaultReceiptDisplaySize
  )
```

- [ ] **Step 4: 세 페이지의 ReceiptGallery 호출은 손대지 않는다**

`SettlementReportPage.tsx:488`, `SettlementReportPage.tsx:562`, `RequestDetailPage.tsx:518` 은 모두
`{...receiptSizeToggle}` 스프레드이므로 Task 2가 추가한 `defaultSize` 가 자동으로 전달된다. 확인만 하고 수정하지 않는다.

Run: `grep -n "ReceiptGallery" apps/finance/src/pages/SettlementReportPage.tsx apps/finance/src/pages/RequestDetailPage.tsx`
Expected: 세 군데 모두 `{...receiptSizeToggle}` 형태

- [ ] **Step 5: 전체 검증**

Run: `pnpm --filter @conference/finance typecheck`
Expected: 에러 없음

Run: `pnpm --filter @conference/finance test src/lib/receiptDisplaySize.test.ts src/lib/pdfExport.test.ts src/hooks/useReceiptSizeToggle.test.tsx src/components/ReceiptGallery.test.tsx`
Expected: 모두 PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/finance/src/pages/SettlementReportPage.tsx \
        apps/finance/src/pages/RequestDetailPage.tsx
git commit -m "feat(finance): wire the project default receipt size into galleries and PDF export"
```

---

## 수동 확인 (구현 후)

에뮬레이터 또는 개발 서버에서:

1. 설정 → 프로젝트 설정 → 일반 → "영수증 PDF 기본 크기"를 `크게` 로 저장한다.
2. 정산서 화면에서 모든 영수증 타일에 배지가 없는지 확인한다 (모두 기본값 상속 상태).
3. PDF 내보내기 → 모든 영수증이 한 장에 한 개로 렌더되는지 확인한다.
4. 영수증 하나의 토글을 눌러 축소 → "일반" 배지가 그 타일에만 뜨는지 확인한다.
5. PDF 내보내기 → 그 영수증만 작게 렌더되는지 확인한다.
6. 설정을 `일반` 으로 되돌린다 → 방금 `normal` 로 지정한 영수증에는 배지가 사라지고, 나머지는 그대로 일반 크기인지 확인한다.
