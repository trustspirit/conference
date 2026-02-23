# Registration Phase 1 Design

**Date:** 2026-02-23
**Status:** Approved

## Summary

별도 웹 앱(`registration`)으로 참가자 등록 폼을 구축한다.
같은 Firebase 프로젝트의 Firestore를 공유하여, 등록된 데이터가 checkin 앱에서 바로 보이게 한다.

## Requirements

- 별도 프로젝트 (`/Users/young/Documents/Workspace/registration`)
- 같은 Firebase 프로젝트 사용 (Firestore 공유)
- 공개 등록 페이지 (로그인 불필요)
- 제출 시 participants 컬렉션에 자동 추가
- 개인 코드 발급 (수정/조회용)
- 관리자 페이지: 설문 생성/관리, 응답 확인

## Tech Stack

- React 19 + TypeScript + Vite + Tailwind CSS
- Firebase (Firestore, Hosting)
- Jotai (state management)
- React Router DOM

## Firestore Collections

### surveys/{surveyId}
```
title: string
description: string
isActive: boolean
createdAt: Timestamp
createdBy: string
```

### survey_responses/{responseId}
```
surveyId: string
personalCode: string (unique, 8자리)
participantId: string
email: string
data: { name, email, phone, gender, age, stake, ward }
createdAt: Timestamp
updatedAt: Timestamp
```

### participants (기존 checkin 컬렉션과 공유)

## Routes

- `/register/:surveyId` — 공개 등록 폼
- `/register/:surveyId/edit?code=XXXX` — 개인코드로 수정
- `/admin` — 관리자 (설문 목록, 생성)
- `/admin/survey/:surveyId` — 설문 상세 + 응답 목록

## Firestore Security Rules (checkin 프로젝트에 추가)

```
match /surveys/{surveyId} {
  allow read: if true;
  allow write: if request.auth != null;
}
match /survey_responses/{responseId} {
  allow create: if true;
  allow read, update: if true;
  allow delete: if request.auth != null;
}
match /participants/{participantId} {
  allow read: if request.auth != null;
  allow create: if true;
  allow update, delete: if request.auth != null;
}
```

## Phase 2 (Future)

- 설문 빌더 (커스텀 필드 타입, 섹션)
- 중복 관리 (merge UI)
- 파일 업로드
