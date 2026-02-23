# Key Generator

CheckIn 앱과 연동되는 참가자 고유 키 및 QR 코드 생성 웹사이트입니다.

## 개요

참가자가 자신의 정보(성, 이름, 생년월일)를 입력하면 고유한 8자리 키와 QR 코드가 생성됩니다. 이 QR 코드를 CheckIn 앱에서 스캔하면 참가자를 빠르게 찾아 체크인할 수 있습니다.

## 기능

- 🔑 **고유 키 생성**: 8자리 대문자 + 숫자 조합 (예: `A7K2X9BM`)
- 📱 **QR 코드 생성**: 고유 키가 포함된 QR 코드
- 📋 **키 복사**: 클립보드에 키 복사
- 📥 **QR 다운로드**: PNG 이미지로 다운로드
- 🔄 **결정론적 생성**: 같은 정보 입력 시 항상 같은 키 생성

## 설치 및 실행

### 개발 환경

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (http://localhost:5173)
pnpm dev
```

### 프로덕션 빌드

```bash
# 빌드
pnpm build

# 빌드 결과 미리보기
pnpm preview
```

빌드된 파일은 `dist/` 폴더에 생성됩니다. 이 폴더의 내용을 정적 웹 서버에 배포하면 됩니다.

## 사용 방법

1. 웹사이트에 접속
2. 정보 입력:
   - **성 (Last Name)**: 예) 홍
   - **이름 (First Name)**: 예) 길동
   - **생년월일**: 날짜 선택
3. **키 생성하기** 버튼 클릭
4. 팝업에서 QR 코드 확인 및 다운로드

## CheckIn 앱과 연동

### 연동 조건

Key Generator와 CheckIn 앱에서 **동일한 Secret Key**를 사용해야 합니다.

- Key Generator: `src/utils/generateKey.ts`
- CheckIn 앱: `src/renderer/src/utils/generateParticipantKey.ts`

두 파일의 `SECRET_KEY` 값이 같아야 동일한 키가 생성됩니다.

### 사용 흐름

1. **참가자 등록**: CheckIn 앱에 참가자 정보(이름, 생년월일) 등록
2. **QR 발급**: 참가자가 Key Generator에서 같은 정보로 QR 코드 발급
3. **체크인**: 현장에서 QR 코드 스캔 → 참가자 자동 검색 → 체크인

### QR 코드 데이터 형식

```
KEY:XXXXXXXX
```

예: `KEY:A7K2X9BM`

## 기술 스택

- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **qrcode.react** (QR 코드 생성)

## 프로젝트 구조

```
key-generator/
├── src/
│   ├── components/
│   │   └── KeyGenerator.tsx   # 메인 컴포넌트
│   ├── utils/
│   │   └── generateKey.ts     # 키 생성 로직
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css              # 스타일
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Secret Key 변경

보안을 위해 기본 Secret Key를 변경하는 것을 권장합니다.

```typescript
// src/utils/generateKey.ts
const SECRET_KEY = 'your-custom-secret-key-here'
```

⚠️ **주의**: CheckIn 앱의 Secret Key도 동일하게 변경해야 합니다.

## 라이선스

이 프로젝트는 CheckIn 앱의 일부입니다.
