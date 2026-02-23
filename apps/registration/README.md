# Registration

대회 참가 등록 웹앱입니다. 관리자가 설문(등록 폼)을 생성하고, 참가자가 해당 링크를 통해 등록합니다.

## 기술 스택

- React 19 + Vite 7 + TypeScript
- Tailwind CSS 4
- Jotai (상태 관리)
- Firebase Authentication + Firestore
- Firebase Hosting

## 로컬 개발

```bash
# 모노레포 루트에서 의존성 설치
pnpm install

# 개발 서버 실행
pnpm turbo dev --filter=@conference/registration
```

`.env.local` 파일에 Firebase 설정을 추가합니다:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/register/:surveyId` | 참가 등록 폼 |
| `/register/:surveyId/success` | 등록 완료 페이지 |
| `/admin` | 설문 목록 (관리자) |
| `/admin/survey/:surveyId` | 설문 상세 / 응답 조회 (관리자) |

## 배포

`main` 브랜치에 push하면 모노레포 루트의 GitHub Actions가 자동 배포합니다.

- 워크플로우: [`/.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)
- 시크릿 설정: [`/SETUP.md`](../../SETUP.md)
