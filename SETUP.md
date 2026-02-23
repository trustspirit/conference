# CI/CD Setup

## GitHub Environments

Settings > Environments에서 다음 3개 environment를 생성한다:

- `registration`
- `checkin`
- `finance`

## Secrets

각 environment에 **같은 이름, 다른 값**으로 등록한다:

| Secret | 용도 |
|--------|------|
| `GCP_SA_KEY` | GCP 서비스 계정 키 (JSON) |
| `FIREBASE_PROJECT_ID` | `firebase-tools deploy --project` 대상 |
| `VITE_FIREBASE_API_KEY` | Vite 빌드 환경변수 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Vite 빌드 환경변수 |
| `VITE_FIREBASE_PROJECT_ID` | Vite 빌드 환경변수 |
| `VITE_FIREBASE_STORAGE_BUCKET` | Vite 빌드 환경변수 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Vite 빌드 환경변수 |
| `VITE_FIREBASE_APP_ID` | Vite 빌드 환경변수 |

총 8개 x 3 environment = 24개.

`VITE_FIREBASE_*` 값은 각 앱의 Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 확인할 수 있다.

## GCP 서비스 계정 키 발급

1. GCP Console > IAM & Admin > Service Accounts
2. 서비스 계정 생성 (또는 기존 계정 사용)
3. 필요한 역할 부여: `Firebase Hosting Admin`, `Cloud Functions Admin`, `Cloud Datastore Owner` 등
4. Keys > Add Key > JSON 선택 후 다운로드
5. 다운로드된 JSON 내용 전체를 `GCP_SA_KEY` 시크릿 값으로 등록
