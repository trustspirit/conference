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

### Storage 경로

```
routemaps/{projectId}/{committee}/{timestamp}_route.png
```

기존 `uploadFileToStorage` Cloud Function을 재사용한다.

## 2. Backend Changes (`functions/src/index.ts`)

### calculateDistance 함수 수정

- Mobility API 응답에서 `routes[0].sections[].roads[].vertexes`를 추출
- 모든 section의 모든 road의 vertexes를 하나의 flat array로 합침
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
return { distanceMeters, routePath }
```

## 3. Frontend — Route Visualization

### MiniMap 변경 (`components/MiniMap.tsx`)

**Props 추가:**
- `routePath?: number[]` — 경로 좌표 배열
- `containerRef`를 외부에서 접근 가능하게 (캡처용) — `forwardRef` 사용

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

## 4. Frontend — Map Capture & Upload

### 제출 시 캡처 (`pages/RequestFormPage.tsx`)

제출 흐름 순서:
```
1. 영수증 업로드
2. 경로맵 캡처 & 업로드 (교통 항목마다)
3. 프로필 업데이트
4. createRequest
```

**캡처 방법:**
- 각 ItemRow의 MiniMap DOM 컨테이너를 `html2canvas`로 캡처 → PNG data URL
- 기존 `uploadFileToStorage` (Cloud Function `uploadReceiptsV2` 경유)로 Storage에 업로드
- 반환된 `{ storagePath, url }`을 해당 item의 `transportDetail.routeMapImage`에 세팅

**견고성:**
- 캡처/업로드 실패 시 제출 중단 + 에러 토스트 (불완전한 신청서 방지)
- 여러 교통 항목 → 순차 처리 (Promise 체이닝)
- 캡처 전 맵 렌더링 완료 대기 (짧은 delay)

**MiniMap ref 접근 방식:**
- 각 ItemRow에서 MiniMap의 container ref를 상위(RequestFormPage)에서 접근할 수 있도록 구조화
- `items` 배열의 index를 key로 한 ref map 사용

## 5. PDF & Settlement Integration

### 정산 웹 페이지 (`pages/SettlementReportPage.tsx`)

- 교통 항목에 `routeMapImage?.url`이 존재하면 교통 정보 아래에 썸네일 이미지 표시
- 클릭 시 원본 크기 확대 (기존 영수증 갤러리 패턴)

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
- **Dependencies:** `html2canvas` 이미 설치됨. 추가 패키지 불필요.

## File Change Summary

| File | Change |
|------|--------|
| `apps/finance/src/types/index.ts` | `RouteMapImage` 인터페이스 추가, `TransportDetail`에 `routeMapImage` 필드 추가 |
| `apps/finance/functions/src/index.ts` | `calculateDistance`가 `routePath` 좌표 배열도 반환 |
| `apps/finance/src/kakao.d.ts` | `Polyline` 클래스 타입 추가 |
| `apps/finance/src/components/MiniMap.tsx` | `routePath` prop, Polyline 렌더링, `forwardRef`, 높이 조정 |
| `apps/finance/src/components/ItemRow.tsx` | `routePath` state 관리, MiniMap에 전달, ref 노출 |
| `apps/finance/src/pages/RequestFormPage.tsx` | 제출 시 경로맵 캡처 → 업로드 → `routeMapImage` 세팅 로직 |
| `apps/finance/src/pages/SettlementReportPage.tsx` | 경로맵 썸네일 표시 |
| `apps/finance/src/lib/pdfExport.ts` | PDF에 경로맵 이미지 삽입 |
