# Conference Monorepo

대회 운영을 위한 모노레포입니다.

## 구조

```
conference/
├── apps/
│   ├── registration/   # 참가 등록 웹앱
│   ├── checkin/        # 참가자 체크인 앱
│   └── finance/        # 지불/환불 신청서 웹 서비스
├── packages/
│   ├── config/         # 공유 설정 (ESLint, TypeScript, Prettier)
│   └── firebase/       # 공유 Firebase 유틸리티
├── turbo.json          # Turborepo 설정
└── pnpm-workspace.yaml # pnpm 워크스페이스
```

## 기술 스택

- **패키지 매니저:** pnpm
- **빌드 오케스트레이션:** Turborepo
- **런타임:** Node.js 22
- **프레임워크:** React + Vite + TypeScript
- **백엔드:** Firebase (Hosting, Firestore, Functions, Storage, Auth)

## 시작하기

```bash
# 의존성 설치
pnpm install

# 전체 앱 개발 서버
pnpm dev

# 특정 앱만 실행
pnpm turbo dev --filter=@conference/registration
pnpm turbo dev --filter=@conference/checkin
pnpm turbo dev --filter=@conference/finance

# 전체 빌드
pnpm build

# 특정 앱만 빌드
pnpm turbo build --filter=@conference/finance
```

## 앱별 문서

| 앱 | 문서 |
|----|------|
| Checkin | [README](apps/checkin/README.md), [사용자 가이드](apps/checkin/USER_GUIDE.md) |
| Finance | [README](apps/finance/README.md), [설정 가이드](apps/finance/SETUP.md) |

## CI/CD

`main` 브랜치에 push하면 GitHub Actions가 변경된 앱만 선별적으로 Firebase에 배포합니다.

- 워크플로우: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- 시크릿 설정: [`SETUP.md`](SETUP.md)
