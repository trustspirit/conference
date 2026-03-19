# Route Map Visualization & Capture Design

**Date:** 2026-03-19
**App:** finance
**Status:** Approved

## Overview

Kakao Mobility API의 경로 좌표를 활용하여 출발지-도착지 간 자동차 주행 경로를 지도에 시각화하고, 신청서 제출 시 경로맵을 PNG로 캡처하여 Firebase Storage에 저장한다. 저장된 경로맵은 정산 리포트 및 PDF에 포함되어 시각 자료와 거리 정보가 함께 제공된다.

## 1. Data Model Changes

### TransportDetail 타입 확장 (`types/index.ts`)

```typescript
export interface RouteMapImage {
  storagePath: string
  url: string
}

export interface TransportDetail {
  transportType: TransportType
  tripType: TripType
  departure: string
  destination: string
  departureCoord?: PlaceCoord
  destinationCoord?: PlaceCoord
  distanceKm?: number
  routeMapImage?: RouteMapImage   // NEW: 경로맵 캡처 이미지
}
```

### calculateDistance 응답 확장

**현재:** `{ distanceMeters: number }`
**변경:** `{ distanceMeters: number; routePath: number[] }`

`routePath`는 Mobility API 응답의 `routes[0].sections[].roads[].vertexes`를 flat하게 합친 배열 (`[lng, lat, lng, lat, ...]`). 프론트엔드에서 `LatLng[]`로 변환하여 Polyline에 사용한다.

경로 좌표는 Firestore에 저장하지 않는다. 화면 표시와 캡처 용도로만 사용하고, 캡처된 PNG가 영구 기록이 된다.

**경로 좌표 크기 관리:** 장거리 경로(서울-부산 등)의 경우 vertexes가 10,000+ 좌표쌍이 될 수 있다. 서버에서 Douglas-Peucker 간소화를 적용하여 200px 높이 맵에서 시각적으로 충분한 수준으로 좌표를 줄인다 (최대 ~2,000 좌표쌍).

### Storage 경로

```
routemaps/{projectId}/{committee}/{timestamp}_route.png
```

## 2. Backend Changes (`functions/src/index.ts`)

### calculateDistance 함수 수정

- Mobility API 응답에서 `routes[0].sections[].roads[].vertexes`를 추출
- 모든 section의 모든 road의 vertexes를 하나의 flat array로 합침
- 좌표 수가 많을 경우 Douglas-Peucker 간소화 적용
- 거리와 함께 `routePath`로 반환

```typescript
// 응답 파싱 의사 코드
const route = data.routes[0]
const distanceMeters = route.summary.distance
const routePath: number[] = []
for (const section of route.sections) {
  for (const road of section.roads) {
    routePath.push(...road.vertexes)
  }
}
// 필요 시 간소화
return { distanceMeters, routePath: simplifyPath(routePath) }
```

### uploadRouteMap 함수 추가

기존 `uploadReceiptsV2`는 `receipts/` 경로가 하드코딩되어 있으므로, 경로맵 전용 업로드 함수를 추가한다. 내부적으로 기존 `uploadFileToStorage` 헬퍼를 재사용한다.

```typescript
export const uploadRouteMap = onCall(async (request) => {
  // auth 체크
  const { file, committee, projectId } = request.data
  const storagePath = `routemaps/${projectId}/${committee}/${Date.now()}_route.png`
  return await uploadFileToStorage(file, storagePath)
})
```

### cleanupDeletedProjects 수정

기존 `receipts/{projectId}/` 정리 후에 `routemaps/{projectId}/` 폴더도 함께 정리하도록 추가한다.

## 3. Frontend — Route Visualization

### MiniMap 변경 (`components/MiniMap.tsx`)

**Props 추가:**
- `routePath?: number[]` — 경로 좌표 배열
- `ref` — React 19에서는 일반 prop으로 전달 (`forwardRef` deprecated). 캡처 시 DOM 컨테이너 접근용.

**동작:**
- `routePath`가 있으면 `kakao.maps.Polyline`으로 파란색 실선 경로 표시
- 경로가 있을 때 맵 높이를 150px → 200px로 확대
- `routePath`가 변경될 때 기존 Polyline을 제거하고 새로 그림
- bounds를 경로 좌표 기반으로 자동 조정

### ItemRow 흐름 변경 (`components/ItemRow.tsx`)

1. 출발지 선택 → 출발지 마커 MiniMap
2. 도착지 선택 → 도착지 마커 MiniMap + 자동 거리 계산 시작
3. 거리 계산 완료 → `routePath` state 업데이트 → MiniMap에 경로 Polyline 표시
4. 출발지/도착지 변경 시 → `routePath` 초기화 → 새 계산 트리거

`routePath`는 ItemRow의 local state로 관리한다 (`useState<number[]>`).

**MiniMap ref 노출:**
- ItemRow에 `miniMapRef?: React.RefObject<HTMLDivElement>` prop 추가
- ItemRow는 이 ref를 내부 MiniMap의 container `ref`로 전달
- 상위 컴포넌트가 직접 MiniMap DOM에 접근 가능

## 4. Frontend — Map Capture & Upload

### 캡처 전략: html2canvas + CORS 대응

카카오 맵 타일은 외부 도메인(`*.daumcdn.net`)에서 로드되므로, `html2canvas`로 캡처 시 cross-origin 이미지가 tainted canvas를 유발할 수 있다.

**대응 방안:**
1. `html2canvas({ useCORS: true, allowTaint: true })` 옵션 사용
2. 카카오 맵 `tilesloaded` 이벤트 대기 후 캡처 (렌더링 완료 보장)
3. 캡처 결과 검증: canvas가 비어 있거나 단색이면 실패로 간주
4. **Fallback**: 캡처 실패 시 경로 정보 텍스트("출발→도착, 30km")만 포함하고 제출 진행 (캡처 실패가 제출 자체를 막지는 않음)

### 제출 시 캡처 (`pages/RequestFormPage.tsx`, `pages/ResubmitPage.tsx`)

**두 페이지 모두** 동일한 캡처 로직을 적용한다. 공통 로직은 유틸 함수로 추출한다.

제출 흐름 순서:
```
1. 영수증 업로드
2. 경로맵 캡처 & 업로드 (교통 항목마다)
3. 프로필 업데이트
4. createRequest
```

**캡처 유틸 함수 (`lib/captureRouteMap.ts`):**
```typescript
export async function captureAndUploadRouteMaps(
  items: RequestItem[],
  miniMapRefs: Map<number, HTMLDivElement>,
  committee: string,
  projectId: string,
): Promise<RequestItem[]>
```
- 교통 항목(car + 양쪽 좌표 있는 경우)을 순회
- 해당 MiniMap DOM을 `html2canvas`로 캡처
- `uploadRouteMap` Cloud Function으로 업로드
- 성공 시 `routeMapImage` 세팅, 실패 시 해당 항목은 `routeMapImage` 없이 진행
- 수정된 items 배열 반환

**MiniMap ref 관리 (RequestFormPage, ResubmitPage):**
```typescript
const miniMapRefs = useRef(new Map<number, HTMLDivElement>())
// ItemRow에 miniMapRef callback 전달
<ItemRow
  miniMapRef={(el) => {
    if (el) miniMapRefs.current.set(i, el)
    else miniMapRefs.current.delete(i)
  }}
  ...
/>
```

**견고성:**
- 캡처/업로드 실패 시 → 경고 토스트 표시하되 제출은 계속 진행 (경로맵 없는 신청서도 유효)
- `tilesloaded` 이벤트로 맵 렌더링 완료 대기 (고정 delay 대신)
- 여러 교통 항목 → 순차 처리로 안정성 확보

## 5. PDF & Settlement Integration

### 정산 웹 페이지 (`pages/SettlementReportPage.tsx`)

- 교통 항목에 `routeMapImage?.url`이 존재하면 교통 정보 아래에 썸네일 이미지 표시
- 클릭 시 원본 크기 확대 (기존 영수증 갤러리 패턴)

### 신청서 상세 페이지 (`pages/RequestDetailPage.tsx`)

- `ItemsTable` 컴포넌트에서 교통 항목의 `routeMapImage` 표시 지원 추가

### PDF Export (`lib/pdfExport.ts`)

- 교통 항목의 transport cost 아래에 경로맵 이미지 삽입
- `<img src="url" style="max-width:250px; max-height:150px" />`
- 이미지 로드 실패 시 "(경로맵 로드 실패)" 텍스트 fallback

### 기존 데이터 호환성

`routeMapImage`는 optional 필드이므로 기존 데이터에 영향 없음.

## 6. Type Definitions (`kakao.d.ts`)

Polyline 클래스 타입 추가:

```typescript
class Polyline {
  constructor(options: {
    map?: Map
    path: LatLng[]
    strokeWeight?: number
    strokeColor?: string
    strokeOpacity?: number
    strokeStyle?: string
  })
  setMap(map: Map | null): void
  setPath(path: LatLng[]): void
}
```

## 7. CSP & Dependencies

- **CSP:** 변경 없음 (카카오 도메인 이미 허용, html2canvas는 로컬 DOM 캡처)
- **Dependencies:** `html2canvas`를 finance 앱에 추가 설치 필요 (`pnpm add html2canvas -w apps/finance`)

## File Change Summary

| File | Change |
|------|--------|
| `apps/finance/package.json` | `html2canvas` 의존성 추가 |
| `apps/finance/src/types/index.ts` | `RouteMapImage` 인터페이스 추가, `TransportDetail`에 `routeMapImage` 필드 추가 |
| `apps/finance/functions/src/index.ts` | `calculateDistance`가 `routePath` 반환, `uploadRouteMap` 함수 추가, `cleanupDeletedProjects`에 `routemaps/` 정리 추가 |
| `apps/finance/src/kakao.d.ts` | `Polyline` 클래스 타입 추가 |
| `apps/finance/src/components/MiniMap.tsx` | `routePath` prop, Polyline 렌더링, `ref` prop (React 19), 높이 조정 |
| `apps/finance/src/components/ItemRow.tsx` | `routePath` state 관리, MiniMap에 전달, `miniMapRef` prop 노출 |
| `apps/finance/src/components/ItemsTable.tsx` | 교통 항목의 `routeMapImage` 썸네일 표시 |
| `apps/finance/src/lib/captureRouteMap.ts` | NEW: 경로맵 캡처 & 업로드 유틸 함수 |
| `apps/finance/src/pages/RequestFormPage.tsx` | 제출 시 캡처 유틸 호출, miniMapRefs 관리 |
| `apps/finance/src/pages/ResubmitPage.tsx` | 제출 시 캡처 유틸 호출, miniMapRefs 관리 |
| `apps/finance/src/pages/RequestDetailPage.tsx` | 경로맵 썸네일 표시 |
| `apps/finance/src/pages/SettlementReportPage.tsx` | 경로맵 썸네일 표시 |
| `apps/finance/src/lib/pdfExport.ts` | PDF에 경로맵 이미지 삽입 |
