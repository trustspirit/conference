# 영수증 PDF 기본 표시 크기 설정 (finance)

날짜: 2026-08-05
대상 앱: `apps/finance`

## 문제

영수증 타일의 토글 버튼을 누르면 해당 영수증이 PDF 내보내기에서 크게(한 장에 한 개) 렌더된다.
현재 이 값은 `requests/{id}.receiptDisplaySizes` 맵에 `'large'`만 저장되고, 키가 없으면 일반 크기다.
즉 "일반 크기"라는 기본값이 코드에 하드코딩되어 있어 프로젝트 단위로 바꿀 수 없다.

정산서 대부분의 영수증을 크게 내보내야 하는 프로젝트에서는 영수증마다 토글을 눌러야 한다.

## 목표

프로젝트 설정에서 영수증 PDF **기본 크기**를 `일반` / `크게` 중에서 고를 수 있게 한다.
개별 영수증 토글은 그대로 유지되며, 기본값보다 항상 우선한다.

## 비목표

- 사용자별 기본값 (개인 설정) — `receiptDisplaySizes`는 신청서 문서에 공유 저장되는 값이라 개인 설정과 개념이 어긋난다.
- 전역(모든 프로젝트) 기본값 — 정산서 양식은 프로젝트마다 다르다.
- 기존 저장 데이터의 마이그레이션.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 설정 범위 | 프로젝트별 (`projects/{id}.defaultReceiptDisplaySize`) |
| 기본값 vs 개별 토글 | 개별 토글이 항상 우선 (3상태: 상속 / 명시적 large / 명시적 normal) |
| 갤러리 토글 버튼 | 2상태 유지. 클릭하면 항상 명시값을 저장하며, "기본값으로 되돌리기"는 제공하지 않는다 |
| 배지 표시 | 해석된 크기가 기본값과 **다를 때만** 배지. 기본이 `normal`이면 large에 "크게" 배지, 기본이 `large`면 normal에 "일반" 배지 |

## 데이터 모델

`src/types/index.ts` — `ReceiptDisplaySize`는 여기서 선언한다.
`lib/receiptDisplaySize.ts`가 타입을 정의하면 `types/index.ts`가 `lib`을 import하게 되어
의존 방향이 뒤집힌다. 타입은 `types`에, 로직은 `lib`에 둔다.

```ts
export type ReceiptDisplaySize = 'normal' | 'large'

/** storagePath → 표시 크기. 키가 없으면 프로젝트 기본값을 상속한다.
 *  receipts 배열과 분리된 top-level 맵이라, 스태프가 영수증 신원 필드
 *  (storagePath/url/fileName)에 쓰기 권한 없이 크기만 바꿀 수 있다. */
export type ReceiptDisplaySizes = Record<string, ReceiptDisplaySize>

export interface Project {
  // ...
  /** 영수증 PDF 기본 표시 크기. undefined = 'normal' (하위 호환) */
  defaultReceiptDisplaySize?: ReceiptDisplaySize
}
```

기존 타입은 `Record<string, 'large'>`였다. `'normal'`을 허용하도록 넓히는 것이 이 기능의 핵심 변경이다.
기본값이 `'large'`가 되면 "키 부재 = 일반"이라는 규약이 성립하지 않으므로, `'normal'`을 명시적으로 저장할 수 있어야 한다.

### 하위 호환

- 기존 문서에는 `'large'` 값만 있고 `defaultReceiptDisplaySize`는 없다.
- 새 해석 규칙에서 `undefined` 기본값은 `'normal'`로 떨어지므로, 결과가 현재 동작과 정확히 일치한다.
- 데이터 마이그레이션 불필요.

### Firestore 규칙

`apps/finance/firestore.rules`의 스태프 쓰기 규칙(약 207행)은 `receiptDisplaySizes` 필드만 변경 대상으로
제한할 뿐 값 자체를 검증하지 않는다. 따라서 규칙 변경 없이 `'normal'` 저장이 허용된다.
프로젝트 문서 갱신은 기존 `useUpdateProject` 경로를 그대로 쓴다.

## 해석 로직 — 단일 소스

현재 `displaySizes?.[path] === 'large'` 판정이 `ReceiptGallery`, `pdfExport`, `useReceiptSizeToggle`
세 곳에 흩어져 있다. 기본값이 개입하면 세 곳이 어긋나는 순간 화면과 PDF가 달라지므로,
판정을 한 함수로 모은다.

`src/lib/receiptDisplaySize.ts` (신규):

```ts
import type { ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'

export const DEFAULT_RECEIPT_DISPLAY_SIZE: ReceiptDisplaySize = 'normal'

/** 명시값 > 프로젝트 기본값 > 'normal' 순으로 해석한다. */
export function resolveReceiptDisplaySize(
  sizes: ReceiptDisplaySizes | undefined,
  storagePath: string,
  projectDefault: ReceiptDisplaySize | undefined
): ReceiptDisplaySize
```

의존성 없는 순수 함수라 단위 테스트가 쉽고, 세 소비자 모두 이 함수만 호출한다.

## 소비자 변경

### `src/components/settings/ProjectGeneralSettings.tsx`

`일반` / `크게` select 필드를 추가한다. 기존 `useState` + `dirty` + `handleSave` 패턴을 그대로 따르며,
저장 시 `updateProject.mutateAsync`의 `data`에 `defaultReceiptDisplaySize`를 포함시킨다.

### `src/hooks/useReceiptSizeToggle.ts`

- 시그니처에 `projectDefault: ReceiptDisplaySize | undefined` 인자를 추가한다.
- `onToggleDisplaySize`가 `'normal'`일 때 키를 지우던 동작을 **명시 저장**으로 바꾼다:
  `map[storagePath] = next` (분기 없음).
- 반환 타입에 `defaultSize`를 실어 갤러리로 그대로 넘길 수 있게 한다.
- `enabled === false` / `ownerByPath.size === 0` 조기 반환 경로는 그대로 유지한다.

### `src/components/ReceiptGallery.tsx`

- `defaultSize?: ReceiptDisplaySize` prop 추가.
- `const size = resolveReceiptDisplaySize(displaySizes, r.storagePath, defaultSize)`
- 토글 버튼: `onToggleDisplaySize(r.storagePath, size === 'large' ? 'normal' : 'large')`.
  아이콘/aria-label은 현재 `isLarge` 대신 `size === 'large'`를 기준으로 그대로 동작한다.
- 배지: `size !== (defaultSize ?? 'normal')`일 때만 표시하고, 텍스트는 `size`에 따라
  `receipts.sizeLargeBadge` 또는 `receipts.sizeNormalBadge`를 쓴다.

### `src/lib/pdfExport.ts`

- `PdfExportOptions`에 `defaultReceiptDisplaySize?: ReceiptDisplaySize` 추가.
- 영수증 수집부(약 435~444행)에서 `sizeMap[receipt.storagePath]` 직접 조회를
  `resolveReceiptDisplaySize(...)` 호출로 교체한다.
- `NumberedReceiptImage['nr']`와 `expandReceiptImages` 인자의 `displaySize?: 'large'`를
  `displaySize?: ReceiptDisplaySize`로 넓힌다. optional은 유지한다 — 기존
  `pdfExport.test.ts`가 `displaySize` 없는 entry를 넘기고 있어, 필수로 바꾸면 무관한
  테스트 4개가 타입 에러를 낸다. 수집부에서는 항상 확정값을 채운다.
- `splitBySize`는 `item.nr.displaySize === 'large'` 판정 그대로 두면 된다.
- 레거시 래퍼 `exportSettlementPdf`는 호출처가 없으므로 손대지 않는다.

### 페이지

- `SettlementReportPage.tsx`: `currentProject?.defaultReceiptDisplaySize`를
  `useReceiptSizeToggle`, `ReceiptGallery`, `exportBatchSettlementPdf` options에 전달한다.
- `RequestDetailPage.tsx`: `useReceiptSizeToggle`와 `ReceiptGallery`에 전달한다.

### i18n (`src/locales/*`)

- `project.defaultReceiptSize` — 설정 라벨
- `project.defaultReceiptSizeHint` — 설명
- `project.receiptSizeNormal` / `project.receiptSizeLarge` — select 옵션
- `receipts.sizeNormalBadge` — "일반" 배지

## 테스트

| 파일 | 내용 |
|---|---|
| `src/lib/receiptDisplaySize.test.ts` (신규) | 명시값 우선 / 기본값 상속 / 둘 다 없을 때 `'normal'` |
| `src/hooks/useReceiptSizeToggle.test.tsx` | `'normal'` 토글 시 키 삭제가 아니라 `'normal'` 저장됨을 검증 (기존 기대값 수정) |
| `src/lib/pdfExport.test.ts` | 기본값 `'large'`일 때 명시값 없는 영수증이 large로 분류되고, 명시적 `'normal'`은 제외됨 |

`apps/finance`에서 `pnpm lint`는 동작하지 않으며 에뮬레이터 없이는 항상 실패하는 테스트 파일이 3개 있다.
검증은 `pnpm test`의 관련 파일 대상 실행과 `tsc`로 한다.

## 리스크

- **`ReceiptDisplaySizes` 타입 확장의 파급** — `Record<string, 'large'>`를 좁게 가정한 코드가 있으면
  타입 에러가 난다. `splitRequestByCurrency.ts`는 이 필드를 의도적으로 다루지 않으므로 영향 없다.
  `tsc`가 나머지를 잡아준다.
- **정산서 스냅샷 없음** — `Settlement.receiptDisplaySizes`는 정산 생성 시점에 신청서에서 복사되지
  않는다(`settlementBuilder.ts`가 이 필드를 쓰지 않으므로 이 앱이 만드는 정산서는 항상
  `undefined`이고, 필드는 원본 신청서를 못 불러올 때의 PDF 폴백 경로에서만 읽힌다). 결과적으로
  기본값은 스냅샷되지 않고 조회 시점의 프로젝트 설정을 따른다. 즉 설정을 바꾸면 과거 정산서의
  PDF 결과도 바뀐다. 이는 의도된 동작이다 — 기본값은 "지금 어떻게 뽑을지"를 정하는 출력 설정이다.
