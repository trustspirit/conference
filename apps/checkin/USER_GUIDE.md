# CheckIn 앱 사용 설명서

참가자 체크인 관리를 위한 데스크톱 애플리케이션입니다.

---

## 목차

1. [설치 방법](#1-설치-방법)
2. [초기 설정](#2-초기-설정)
3. [주요 기능](#3-주요-기능)
   - [홈 (검색)](#31-홈-검색)
   - [참가자 관리](#32-참가자-관리)
   - [그룹 관리](#33-그룹-관리)
   - [객실 관리](#34-객실-관리)
   - [버스 관리](#35-버스-관리)
   - [스케줄 관리](#36-스케줄-관리) ⭐ NEW
   - [CSV 가져오기](#37-csv-가져오기)
   - [CSV 내보내기](#38-csv-내보내기)
   - [인쇄 기능](#39-인쇄-기능)
   - [통계](#310-통계)
   - [감사 로그](#311-감사-로그)
   - [설정](#312-설정)
   - [고유 키 시스템](#313-고유-키-시스템)
4. [Key Generator 웹사이트](#4-key-generator-웹사이트)
5. [개발자 가이드](#5-개발자-가이드)

---

## 1. 설치 방법

### 사전 요구사항

- **Node.js**: v18 이상
- **pnpm**: 패키지 매니저 (권장)
- **Firebase 프로젝트**: Firestore 데이터베이스가 활성화된 프로젝트

### 개발 환경 설치

```bash
# 저장소 클론
git clone <repository-url>
cd checkin

# 의존성 설치
pnpm install

# 개발 모드 실행
pnpm dev
```

### 프로덕션 빌드

```bash
# macOS용 빌드
pnpm build:mac

# Windows용 빌드
pnpm build:win

# Linux용 빌드
pnpm build:linux

# 모든 플랫폼 빌드
pnpm build:all
```

빌드된 설치 파일은 `dist/` 폴더에 생성됩니다:

- **macOS**: `CheckIn-1.0.0.dmg`
- **Windows**: `CheckIn Setup 1.0.0.exe`
- **Linux**: `CheckIn-1.0.0.AppImage`

---

## 2. 초기 설정

### 2.1 Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Firestore Database** 활성화
3. **프로젝트 설정 > 일반 > 내 앱**에서 웹 앱 추가
4. Firebase 설정 정보를 JSON 파일로 저장:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

### 2.2 앱에서 Firebase 연결

1. 앱 실행 후 좌측 사이드바에서 **Settings** 클릭
2. **Import Config File** 버튼 클릭
3. 위에서 저장한 JSON 파일 선택
4. 연결 성공 시 초록색 "Connected" 상태 표시

### 2.3 사용자 이름 설정

1. 앱 첫 실행 시 사용자 이름 입력 모달 표시
2. 이름 입력 후 **Save** 클릭
3. 이 이름은 감사 로그에 기록됨
4. Settings에서 언제든 변경 가능

---

## 3. 주요 기능

### 3.1 홈 (검색)

메인 화면에서 참가자를 빠르게 검색하고 체크인/체크아웃할 수 있습니다.

#### 검색 기능

- **이름**, **이메일**, **전화번호**로 검색 가능
- **고유 키** (8자리 대문자+숫자)로 검색 가능 ⭐ NEW
- 실시간 검색 결과 표시
- 검색 결과에서 바로 체크인/체크아웃 가능

#### QR 코드 스캔 ⭐ NEW

- **QR 코드로 체크인** 버튼 클릭
- 참가자의 QR 코드 또는 고유 키 QR 코드 스캔
- 스캔 즉시 참가자 정보 표시 및 체크인/체크아웃 가능

#### 빠른 체크인/체크아웃

- 검색 결과에서 **Check In** 버튼 클릭
- 체크인된 참가자는 **Check Out** 버튼 표시
- 상태 배지로 현재 체크인 상태 확인

---

### 3.2 참가자 관리

#### 참가자 목록 (Participants)

좌측 사이드바의 **Participants**를 클릭하여 전체 참가자 목록을 확인합니다.

**기능:**

- **필터링**: 전체 / 체크인됨 / 체크인 안됨
- **검색**: 이름, 이메일, 전화번호, 와드, 스테이크로 검색
- **정렬**: 이름, 와드, 그룹, 객실, 상태, 결제 상태별 정렬
- **보기 모드**: 리스트 / 그리드 뷰 전환
- **일괄 작업**: 여러 참가자 선택 후 그룹/객실 일괄 배정

#### 참가자 상세 페이지

참가자를 클릭하면 상세 정보 페이지로 이동합니다.

**개인 정보 섹션:**

- 이름, 이메일, 전화번호
- 성별, 나이, 생년월일
- 와드, 스테이크
- 결제 상태 (클릭하여 바로 변경 가능)
- 메모 (인라인 편집 가능)

**QR 코드 및 고유 키 섹션:** ⭐ NEW

- 참가자별 고유 QR 코드 표시
- 생년월일이 등록된 경우 8자리 고유 키 표시
- QR 코드 다운로드 및 인쇄 가능
- 고유 키로 홈 화면에서 빠르게 검색 가능

**결제 상태 변경:**

1. **Paid/Unpaid** 버튼 클릭
2. 확인 다이얼로그에서 **확인** 클릭
3. 변경 사항이 즉시 반영됨

**메모 편집:**

1. 메모 섹션의 **Edit** 또는 **Add memo** 클릭
2. 내용 입력 후 **Save** 클릭
3. Edit 모드 진입 없이 바로 수정 가능

**그룹/객실 배정:**

1. **Group** 또는 **Room** 섹션에서 **Assign/Change** 클릭
2. 기존 그룹/객실 선택 또는 새로 생성
3. 배정 완료 시 자동 저장

**체크인/체크아웃 히스토리:**

- 모든 체크인/체크아웃 기록을 타임라인 형태로 표시
- 각 세션별 체류 시간 표시
- 현재 활성 세션 표시

#### 참가자 추가

1. 참가자 목록에서 **Add Participant** 버튼 클릭
2. 필수 정보 입력: 이름, 이메일
3. 선택 정보 입력: 전화번호, 성별, 나이, 와드, 스테이크
4. 그룹/객실 선택 (선택사항)
5. **Add Participant** 클릭

---

### 3.3 그룹 관리

좌측 사이드바의 **Groups**를 클릭합니다.

#### 그룹 목록

- 모든 그룹과 참가자 수 표시
- 예상 인원 대비 현재 인원 표시
- 그룹 클릭 시 상세 페이지로 이동

#### 그룹 상세 페이지

- 그룹에 속한 참가자 목록
- 그룹 이름 및 예상 인원 수정
- 참가자 그룹에서 제거
- 그룹 삭제 (소속 참가자는 미배정 상태로 변경)

#### 그룹 리더 설정 ⭐ NEW

그룹에 리더를 지정할 수 있습니다.

**리더 설정 방법:**

1. 그룹 상세 페이지에서 참가자 목록 확인
2. 리더로 지정할 참가자의 **리더 지정** 버튼 클릭
3. 확인 다이얼로그에서 **확인** 클릭
4. 리더에게 ⭐ 아이콘이 표시됩니다

**리더 변경/해제:**

- 다른 참가자를 리더로 지정하면 자동으로 변경
- 현재 리더의 **리더 해제** 버튼으로 리더 해제

**리더 정보 표시:**

- 그룹 목록에서 호버 시 리더 정보 표시
- 홈 검색 결과에서 그룹 리더인 참가자 표시
- 참가자 상세 페이지에서 리더 배지 표시

#### 그룹 생성

- 그룹 목록에서 **Create Group** 클릭
- 그룹 이름과 예상 인원 입력
- 참가자 배정 시 자동 생성도 가능

---

### 3.4 객실 관리

좌측 사이드바의 **Rooms**를 클릭합니다.

#### 객실 목록

- 모든 객실과 수용 현황 표시
- 상태별 색상 구분:
  - 🟢 **여유**: 빈 자리 있음
  - 🟡 **거의 참**: 1자리 남음
  - 🔴 **만실**: 수용 인원 초과 불가

#### 객실 상세 페이지

- 객실에 배정된 참가자 목록
- 객실 번호 및 최대 수용 인원 수정
- 참가자 객실에서 제거
- 객실 삭제 (배정된 참가자는 미배정 상태로 변경)

#### 방장 설정 ⭐ NEW

객실에 방장을 지정할 수 있습니다.

**방장 설정 방법:**

1. 객실 상세 페이지에서 참가자 목록 확인
2. 방장으로 지정할 참가자의 **방장 지정** 버튼 클릭
3. 확인 다이얼로그에서 **확인** 클릭
4. 방장에게 👑 아이콘이 표시됩니다

**방장 변경/해제:**

- 다른 참가자를 방장으로 지정하면 자동으로 변경
- 현재 방장의 **방장 해제** 버튼으로 방장 해제

**방장 정보 표시:**

- 객실 목록에서 호버 시 방장 정보 표시
- 홈 검색 결과에서 방장인 참가자 표시
- 참가자 상세 페이지에서 방장 배지 표시

#### 객실 생성

- 객실 목록에서 **Create Room** 클릭
- 객실 번호와 최대 수용 인원 입력
- 참가자 배정 시 자동 생성도 가능

---

### 3.5 버스 관리 ⭐ NEW

좌측 사이드바의 **Buses**를 클릭합니다.

#### 버스 목록

버스 관리 페이지에서 두 가지 보기 모드를 지원합니다:

**타임라인 뷰 (기본):**

- 도착 시간 순으로 버스 정렬
- 시간대별 버스 현황 한눈에 파악
- 도착 예정 시간과 실제 도착 상태 표시

**지역별 뷰:**

- 출발 지역별로 버스 그룹화
- 각 지역의 버스 수와 총 승객 수 표시
- 카드 형식으로 버스 정보 표시

#### 요약 카드

페이지 상단에 3개의 요약 카드가 표시됩니다:

- 🚌 **총 버스 수**: 등록된 버스 수와 도착 완료 수
- 👥 **총 승객 수**: 모든 버스의 승객 합계
- 📍 **지역 수**: 출발 지역 개수

#### 버스 추가

1. **버스 추가** 버튼 클릭
2. 필수 정보 입력:
   - **버스 이름** (예: 1호차, 서울버스)
   - **지역** (예: 서울, 부산)
3. 선택 정보 입력:
   - **출발 장소** (예: 강남역 3번 출구)
   - **도착 예정 시간** (예: 14:00)
   - **인솔자 이름**
   - **인솔자 연락처** (자동 포맷팅)
   - **메모**
4. **추가** 버튼 클릭

#### 버스 상세 페이지

버스를 클릭하면 상세 페이지로 이동합니다:

**버스 정보:**

- 버스 이름, 지역, 출발 장소
- 도착 예정 시간, 인솔자 정보
- 현재 승객 수
- 도착 상태 (도착 시간 표시)

**승객 관리:**

- 버스에 배정된 참가자 목록
- 체크박스로 여러 승객 선택
- **다른 버스로 이동** 기능
- 개별 승객 버스에서 제거

**정보 수정:**

- **Edit** 버튼으로 버스 정보 수정
- 연락처는 자동 포맷팅 (010-0000-0000)

#### 버스 도착 표시 ⭐ NEW

버스가 도착하면 도착 상태를 표시할 수 있습니다.

**도착 표시 방법:**

1. 버스 목록 또는 상세 페이지에서 **도착 표시** 버튼 클릭
2. 확인 다이얼로그에서 **확인** 클릭
3. 버스가 초록색으로 표시되고 도착 시간 기록

**도착 취소:**

- 도착 표시된 버스의 **도착 취소** 버튼 클릭
- 다시 미도착 상태로 변경

**도착한 버스 필터링:**

- **도착한 버스 표시/숨기기** 토글 버튼
- 숨기면 아직 도착하지 않은 버스만 표시

#### 지역 필터

- 상단의 지역 필터 버튼으로 특정 지역 버스만 표시
- **전체** 버튼으로 모든 버스 표시

---

### 3.6 스케줄 관리 ⭐ NEW

좌측 사이드바의 **Schedule**을 클릭합니다.

이벤트 기간 동안의 세션, 프로그램, 일정을 시각적으로 관리할 수 있는 스케줄 기능입니다.

#### 보기 모드

스케줄은 세 가지 보기 모드를 지원합니다:

**일간 보기 (Day):**

- 선택한 날짜의 스케줄만 표시
- 세로 타임라인 형식 (위에서 아래로 시간 흐름)

**주간 보기 (Week):**

- 7일간의 스케줄을 한눈에 표시
- 세로 타임라인 형식으로 일별 컬럼 표시

**기간 설정 (Custom):**

- 사용자가 직접 시작일과 종료일 지정
- 대회/행사 기간에 맞춰 원하는 기간만 표시

#### 뷰 방향 전환

상단의 방향 토글로 타임라인 방향을 변경할 수 있습니다:

- **세로 (Vertical)**: 위에서 아래로 시간이 흐르는 형태 (기본)
- **가로 (Horizontal)**: 왼쪽에서 오른쪽으로 시간이 흐르는 형태

#### 스케줄 추가

**방법 1 - 추가 버튼:**

1. 우측 상단의 **스케줄 추가** 버튼 클릭
2. 제목, 날짜, 시작/종료 시간 입력
3. 색상 선택 (자동 또는 수동)
4. 메모 입력 (선택)
5. **추가** 버튼 클릭

**방법 2 - Quick Add (빠른 추가):**

1. 스케줄 그리드에서 원하는 시간대를 **클릭** 또는 **드래그**
2. 팝업에서 제목 입력
3. 시간 조정 (시/분 단위로 미세 조정 가능)
4. **추가** 버튼 클릭

> 💡 **팁**: 드래그로 시간 범위를 선택하면 해당 시간대가 자동으로 설정됩니다.

#### 스케줄 수정

**스케줄 클릭:**

- 스케줄 카드를 클릭하면 수정 모달이 열립니다
- 제목, 시간, 색상, 메모 등 모든 정보 수정 가능

**드래그 앤 드롭:**

- 기존 스케줄을 드래그하여 다른 시간대나 날짜로 이동
- 드래그 중 드롭 위치에 미리보기 표시

#### 스케줄 삭제

1. 스케줄 카드 클릭하여 수정 모달 열기
2. **삭제** 버튼 클릭
3. 확인 다이얼로그에서 **확인** 클릭

#### 스케줄 색상

스케줄마다 고유한 색상을 지정하여 구분할 수 있습니다:

- **자동 색상**: 스케줄 생성 시 자동으로 색상 배정
- **수동 선택**: 색상 팔레트에서 원하는 색상 선택

#### 대회 기간 설정

설정에서 대회/행사 기간을 미리 지정해두면 스케줄 보기에 바로 적용할 수 있습니다.

**설정 방법:**

1. **Settings** 페이지로 이동
2. **대회 기간 설정** 섹션에서 시작일/종료일 입력
3. **저장** 버튼 클릭

**적용 방법:**

- 스케줄 페이지 상단의 **대회 기간** 버튼 클릭
- 설정된 대회 기간이 자동으로 표시됨

#### 네비게이션

- **← / →**: 이전/다음 기간으로 이동
- **오늘**: 오늘 날짜로 이동
- **대회 기간**: 설정된 대회 기간 전체 표시

#### 스케줄 내보내기

스케줄 데이터를 다양한 형식으로 내보낼 수 있습니다:

**PDF 내보내기:**

- **인쇄용 스케줄 PDF**: 깔끔한 인쇄용 레이아웃
- **전체 스케줄 PDF**: 현재 보기 화면 그대로 PDF로 저장

**기타 형식:**

- **CSV**: 스프레드시트에서 편집 가능한 형식
- **ICS**: 캘린더 앱으로 가져오기 가능 (Google Calendar, Apple Calendar 등)
- **클립보드 복사**: 텍스트 형식으로 복사

#### 호버 프리뷰

스케줄 카드에 마우스를 올리면 상세 정보가 툴팁으로 표시됩니다:

- 제목
- 시작/종료 시간
- 메모 (있는 경우)

#### 키보드 단축키

- **ESC**: Quick Add 팝업 또는 수정 모달 닫기
- **↑/↓**: Quick Add에서 시간 조정 (시/분 스피너 포커스 시)

---

### 3.7 CSV 가져오기

대량의 참가자 데이터를 CSV 파일로 가져올 수 있습니다.

#### 지원 필드

| 필드명        | 설명                         | 필수 |
| ------------- | ---------------------------- | ---- |
| `name`        | 이름                         | ✅   |
| `email`       | 이메일                       | ✅   |
| `gender`      | 성별 (male/female)           |      |
| `age`         | 나이                         |      |
| `birthDate`   | 생년월일 (YYYY-MM-DD) ⭐ NEW |      |
| `stake`       | 스테이크                     |      |
| `ward`        | 와드                         |      |
| `phoneNumber` | 전화번호                     |      |
| `groupName`   | 그룹명 (없으면 자동 생성)    |      |
| `roomNumber`  | 객실 번호 (없으면 자동 생성) |      |

> 💡 **팁**: `birthDate`를 입력하면 참가자별 고유 키가 자동 생성됩니다.

#### 가져오기 방법

1. 좌측 사이드바에서 **Import** 클릭
2. **Select CSV File** 버튼 클릭
3. CSV 파일 선택
4. 미리보기에서 데이터 확인
5. 필드 매핑 확인 및 수정
6. **Import** 버튼 클릭
7. 결과 확인 (생성/업데이트 건수)

#### CSV 예시

```csv
name,email,gender,age,stake,ward,phoneNumber,groupName,roomNumber
홍길동,hong@example.com,male,25,서울 스테이크,강남 와드,010-1234-5678,1조,101
김철수,kim@example.com,male,30,서울 스테이크,서초 와드,010-2345-6789,1조,101
이영희,lee@example.com,female,28,부산 스테이크,해운대 와드,010-3456-7890,2조,102
```

---

### 3.8 CSV 내보내기

참가자 및 관련 데이터를 CSV 파일로 내보낼 수 있습니다.

#### 내보내기 방법

1. 좌측 사이드바에서 **Participants** 클릭
2. **Export** 버튼 클릭
3. 원하는 내보내기 옵션 선택

#### 내보내기 옵션

| 옵션                            | 설명                                       |
| ------------------------------- | ------------------------------------------ |
| **Participants (Current View)** | 현재 필터링/검색된 참가자만 내보내기       |
| **All Participants**            | 전체 참가자 데이터 내보내기                |
| **With Check-in History**       | 모든 체크인/체크아웃 이력 포함             |
| **Check-in Summary**            | 체크인 현황 요약 (세션 수, 총 체류시간 등) |
| **Groups**                      | 전체 그룹 데이터 내보내기                  |
| **Rooms**                       | 전체 객실 데이터 내보내기                  |

#### 내보내기 필드

**참가자 기본 필드:**

- name, email, gender, age, stake, ward, phoneNumber
- isPaid, memo, groupName, roomNumber, checkInStatus
- createdAt, updatedAt

**체크인 이력 포함 시 추가 필드:**

- sessionNumber, checkInTime, checkOutTime, durationMinutes

---

### 3.9 인쇄 기능

그룹 명단, 객실 배정표, 버스 배치표를 인쇄할 수 있습니다.

#### 그룹 명단 인쇄

그룹 멤버 목록을 인쇄용 형식으로 출력합니다.

1. **Groups** 페이지로 이동
2. **명단 인쇄** 버튼 클릭
3. 인쇄 미리보기가 새 창에서 열림
4. 브라우저 인쇄 기능으로 인쇄 또는 PDF 저장

**인쇄 내용:**

- 그룹별 참가자 목록
- 참가자 이름, 와드, 연락처
- 그룹 리더 표시 (⭐)
- 인쇄 날짜 및 시간

#### 객실 배정표 인쇄

객실별 배정 현황을 인쇄용 형식으로 출력합니다.

1. **Rooms** 페이지로 이동
2. **배정표 인쇄** 버튼 클릭
3. 인쇄 미리보기가 새 창에서 열림
4. 브라우저 인쇄 기능으로 인쇄 또는 PDF 저장

**인쇄 내용:**

- 객실별 배정 참가자 목록
- 객실 번호, 성별 유형, 수용 현황
- 참가자 이름, 와드, 연락처
- 방장 표시 (👑)
- 인쇄 날짜 및 시간

#### 버스 배치표 인쇄

버스별 승객 명단을 인쇄용 형식으로 출력합니다.

1. **Buses** 페이지로 이동
2. **배치표 인쇄** 버튼 클릭
3. 인쇄 미리보기가 새 창에서 열림
4. 브라우저 인쇄 기능으로 인쇄 또는 PDF 저장

**인쇄 내용:**

- 버스별 승객 목록
- 버스 이름, 지역, 출발 장소
- 도착 예정 시간, 인솔자 정보
- 승객 이름, 와드, 연락처
- 인쇄 날짜 및 시간

**단일 버스 인쇄:**

- 버스 상세 페이지에서 **인쇄** 버튼 클릭
- 해당 버스의 승객 명단만 인쇄

---

### 3.10 통계

통계 페이지에서 등록 및 체크인 현황을 시각화된 차트로 확인할 수 있습니다.

#### 통계 페이지 접근

- 상단 네비게이션 바에서 **Statistics** 클릭

#### 요약 카드

| 카드                     | 설명                            |
| ------------------------ | ------------------------------- |
| **Total Registered**     | 전체 등록 참가자 수             |
| **Currently Checked In** | 현재 체크인된 참가자 수 및 비율 |
| **Room Occupancy**       | 객실 수용 현황 (현재/최대)      |
| **Payment Status**       | 결제/미결제 현황                |

#### 차트 종류

**도넛 차트:**

- **Check-in Status**: 체크인/미체크인 비율
- **Gender Distribution**: 성별 분포 (남/여/기타/미지정)
- **Payment Status**: 결제/미결제 비율

**막대 차트:**

- **Registration vs Check-in by Gender**: 성별 등록 대비 체크인 비교
- **Top 5 Groups**: 상위 5개 그룹 (참가자 수 기준)

**라인 차트:**

- **Daily Check-in/Check-out**: 최근 7일간 일일 체크인/체크아웃 추이

#### 상세 통계 테이블

- 전체/남성/여성별 등록 수, 체크인 수, 체크인율
- 그룹 및 객실 현황 요약

#### PDF 내보내기

통계 데이터를 PDF 파일로 내보낼 수 있습니다.

1. 통계 페이지 우측 상단의 **Export PDF** 버튼 클릭
2. PDF 생성 완료 후 자동 다운로드
3. 파일명: `CheckIn_Statistics_YYYY-MM-DD.pdf`

**PDF 내용:**

- 요약 카드 (등록 인원, 체크인 현황, 객실 현황, 결제 현황)
- 모든 차트 (도넛, 막대, 라인)
- 상세 통계 테이블

---

### 3.11 감사 로그

모든 데이터 변경 사항이 자동으로 기록됩니다.

#### 기록되는 항목

- **생성**: 참가자, 그룹, 객실 생성
- **수정**: 정보 변경 (변경 전/후 값 기록)
- **삭제**: 참가자, 그룹, 객실 삭제
- **체크인/체크아웃**: 체크인 및 체크아웃 시간
- **배정**: 그룹/객실 배정 변경
- **가져오기**: CSV 가져오기

#### 감사 로그 보기

1. 좌측 사이드바에서 **Audit Log** 클릭
2. 최근 변경 사항 확인
3. 타입별 필터링 (참가자/그룹/객실)
4. 실시간 업데이트 (다른 사용자 변경 사항도 반영)

#### 로그 정보

- **시간**: 변경 발생 시간
- **사용자**: 변경을 수행한 사용자
- **작업**: 수행된 작업 유형
- **대상**: 변경된 항목
- **상세**: 변경 전/후 값 (수정의 경우)

#### 로그 삭제

- **Clear All** 버튼으로 전체 로그 삭제 가능
- 삭제 전 확인 다이얼로그 표시

---

### 3.12 설정

좌측 사이드바에서 **Settings**를 클릭합니다.

#### 사용자 설정

- **사용자 이름**: 감사 로그에 기록될 이름 변경

#### 데이터베이스 설정

- **연결 상태**: 현재 Firebase 연결 상태 표시
- **Import Config File**: 새 Firebase 설정 파일 가져오기
- **Clear Config**: 현재 설정 삭제 (앱 재시작 필요)

#### 앱 정보

- 현재 앱 버전 정보

---

### 3.13 고유 키 시스템

참가자별로 고유한 8자리 키를 생성하여 빠른 검색과 체크인에 활용할 수 있습니다.

#### 고유 키란?

- **형식**: 8자리 대문자 + 숫자 조합 (예: `A7K2X9BM`)
- **생성 조건**: 이름과 생년월일이 등록된 참가자
- **특징**: 동일한 정보로 항상 같은 키 생성 (결정론적)

#### 고유 키 활용

**검색:**

- 홈 화면 검색창에 8자리 키 입력
- 해당 참가자 즉시 검색

**QR 코드 스캔:**

- Key Generator 웹사이트에서 생성한 QR 코드 스캔
- `KEY:XXXXXXXX` 형식의 QR 코드 인식
- 스캔 즉시 참가자 검색 및 체크인 가능

#### 고유 키 확인

참가자 상세 페이지의 **QR 코드 섹션**에서 확인:

- 생년월일이 등록된 경우 고유 키 표시
- 생년월일 미등록 시 "생년월일을 입력하세요" 안내

#### 생년월일 등록 방법

1. 참가자 상세 페이지에서 **Edit** 클릭
2. **생년월일** 필드에 날짜 선택
3. **Save** 클릭
4. 고유 키가 자동 생성됨

또는 CSV 가져오기 시 `birthDate` 필드 포함:

```csv
name,email,birthDate
홍길동,hong@email.com,1990-05-15
```

---

## 4. Key Generator 웹사이트 ⭐ NEW

별도의 정적 웹사이트에서 참가자의 고유 키와 QR 코드를 생성할 수 있습니다.

### 4.1 개요

Key Generator는 참가자가 직접 자신의 정보를 입력하여 고유 키와 QR 코드를 발급받을 수 있는 웹사이트입니다.

**용도:**

- 사전 등록 시 참가자에게 개별 QR 코드 발급
- 명찰이나 참가증에 QR 코드 부착
- 현장에서 빠른 체크인 지원

### 4.2 사용 방법

1. Key Generator 웹사이트 접속
2. 정보 입력:
   - **성 (Last Name)**: 예) 홍
   - **이름 (First Name)**: 예) 길동
   - **생년월일**: 날짜 선택
3. **키 생성하기** 버튼 클릭
4. 팝업으로 QR 코드 표시

### 4.3 QR 코드 활용

**팝업에서 제공하는 기능:**

- 📋 **키 복사**: 8자리 고유 키를 클립보드에 복사
- 📥 **QR 다운로드**: QR 코드 이미지(PNG) 다운로드

**QR 코드 데이터 형식:**

```
KEY:XXXXXXXX
```

### 4.4 CheckIn 앱과 연동

1. 참가자가 Key Generator에서 QR 코드 발급
2. CheckIn 앱에서 동일 정보(이름, 생년월일)로 참가자 등록
3. 참가자의 QR 코드를 스캔하면 자동으로 검색됨

> ⚠️ **중요**: Key Generator와 CheckIn 앱의 Secret Key가 동일해야 같은 키가 생성됩니다.

### 4.5 개발 및 배포

Key Generator는 `key-generator/` 폴더에 별도 프로젝트로 구성되어 있습니다.

```bash
# 개발 서버 실행
cd key-generator
pnpm install
pnpm dev

# 프로덕션 빌드
pnpm build
# dist/ 폴더의 파일을 웹 서버에 배포
```

**기술 스택:**

- React 18 + TypeScript
- Vite (빌드 도구)
- qrcode.react (QR 코드 생성)

---

## 5. 개발자 가이드

### 5.1 기술 스택

- **프레임워크**: Electron + React 19
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **상태 관리**: Jotai
- **데이터베이스**: Firebase Firestore
- **라우팅**: React Router DOM 7
- **차트**: Chart.js + react-chartjs-2
- **다국어 지원**: i18next + react-i18next
- **빌드 도구**: Vite + electron-vite

### 5.2 프로젝트 구조

```
checkin/
├── src/
│   ├── main/              # Electron 메인 프로세스
│   │   └── index.ts
│   ├── preload/           # Preload 스크립트
│   │   └── index.ts
│   └── renderer/          # React 앱
│       └── src/
│           ├── components/    # 재사용 컴포넌트
│           ├── pages/         # 페이지 컴포넌트
│           ├── services/      # API 서비스
│           │   ├── firebase/  # Firebase 서비스 (분리됨)
│           │   └── auditLog.ts
│           ├── stores/        # Jotai 스토어
│           ├── types/         # TypeScript 타입
│           ├── utils/         # 유틸리티 함수
│           │   ├── phoneFormat.ts
│           │   └── generateParticipantKey.ts  # ⭐ NEW
│           └── styles/        # 전역 스타일
├── key-generator/         # ⭐ NEW - 고유 키 생성 웹사이트
│   ├── src/
│   │   ├── components/
│   │   │   └── KeyGenerator.tsx
│   │   ├── utils/
│   │   │   └── generateKey.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── resources/             # 앱 아이콘
├── dist/                  # 빌드 출력
└── package.json
```

### 5.3 Firebase 서비스 구조

```
services/
├── firebase/
│   ├── config.ts          # Firebase 초기화 및 설정
│   ├── participants.ts    # 참가자 CRUD
│   ├── groups.ts          # 그룹 CRUD (리더 기능 포함)
│   ├── rooms.ts           # 객실 CRUD (방장 기능 포함)
│   ├── buses.ts           # 버스 CRUD ⭐ NEW
│   ├── subscriptions.ts   # 실시간 구독
│   ├── csvImport.ts       # CSV 가져오기
│   └── index.ts           # 모듈 재export
├── auditLog.ts            # 감사 로그
└── csvExport.ts           # CSV 내보내기

hooks/
├── useStatistics.ts       # 통계 계산 로직
├── useExportPDF.ts        # PDF 내보내기 로직
├── useExportFullPDF.ts    # 전체 스케줄 PDF 내보내기 ⭐ NEW
├── useBusManagement.ts    # 버스 관리 로직
├── useGroupFilter.ts      # 그룹 필터링/정렬
├── useRoomFilter.ts       # 객실 필터링/정렬
└── index.ts               # 모듈 재export

components/schedule/       # ⭐ NEW - 스케줄 관련 컴포넌트
├── ScheduleWeekView.tsx   # 주간/기간 보기 (세로)
├── ScheduleDayView.tsx    # 일간 보기 (세로)
├── ScheduleTimelineView.tsx # 타임라인 보기 (가로)
├── ScheduleHeader.tsx     # 스케줄 헤더 (네비게이션, 내보내기)
├── ScheduleEventCard.tsx  # 스케줄 이벤트 카드
├── QuickAddPopover.tsx    # 빠른 추가 팝오버
├── AddScheduleModal.tsx   # 스케줄 추가/수정 모달
├── PrintableSchedule.tsx  # 인쇄용 스케줄 레이아웃
├── scheduleUtils.ts       # 스케줄 유틸리티 함수
├── useScheduleGrid.ts     # 그리드 인터랙션 훅
└── index.ts               # 모듈 재export

i18n/
├── index.ts               # i18n 초기화
└── locales/
    ├── en.json            # 영어 번역
    └── ko.json            # 한국어 번역
```

### 5.4 Firestore 컬렉션 구조

```
participants/
├── {participantId}/
│   ├── name: string
│   ├── email: string
│   ├── gender: string
│   ├── age: number
│   ├── birthDate: string | null      # 생년월일 (YYYY-MM-DD) ⭐ NEW
│   ├── stake: string
│   ├── ward: string
│   ├── phoneNumber: string
│   ├── isPaid: boolean
│   ├── memo: string
│   ├── groupId: string | null
│   ├── groupName: string | null
│   ├── roomId: string | null
│   ├── roomNumber: string | null
│   ├── checkIns: Array<{id, checkInTime, checkOutTime?}>
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp

groups/
├── {groupId}/
│   ├── name: string
│   ├── participantCount: number
│   ├── expectedCapacity: number
│   ├── leaderId: string | null      # 그룹 리더 ID ⭐ NEW
│   ├── leaderName: string | null    # 그룹 리더 이름 ⭐ NEW
│   ├── tags: string[]
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp

rooms/
├── {roomId}/
│   ├── roomNumber: string
│   ├── maxCapacity: number
│   ├── currentOccupancy: number
│   ├── genderType: string           # male/female/mixed
│   ├── roomType: string             # general/guest/leadership
│   ├── leaderId: string | null      # 방장 ID ⭐ NEW
│   ├── leaderName: string | null    # 방장 이름 ⭐ NEW
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp

buses/
├── {busId}/
│   ├── name: string
│   ├── region: string
│   ├── departureLocation: string
│   ├── estimatedArrivalTime: string
│   ├── contactName: string
│   ├── contactPhone: string
│   ├── notes: string
│   ├── participantCount: number
│   ├── arrivedAt: Timestamp | null  # 도착 시간
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp

schedules/                           # ⭐ NEW - 스케줄 이벤트
├── {scheduleId}/
│   ├── title: string                # 스케줄 제목
│   ├── startTime: Timestamp         # 시작 시간
│   ├── endTime: Timestamp           # 종료 시간
│   ├── color: string                # 색상 (hex)
│   ├── memo: string                 # 메모
│   ├── createdAt: Timestamp
│   └── updatedAt: Timestamp

audit_logs/
├── {logId}/
│   ├── timestamp: Timestamp
│   ├── userName: string
│   ├── action: string
│   ├── targetType: string
│   ├── targetId: string
│   ├── targetName: string
│   └── changes: object | null
```

### 5.5 스크립트 명령어

```bash
# 개발 모드
pnpm dev

# 타입 체크
pnpm typecheck

# 린트
pnpm lint
pnpm lint:fix

# 포맷팅
pnpm format
pnpm format:check

# 빌드
pnpm build
pnpm build:mac
pnpm build:win
pnpm build:linux
```
