# Loom Docs

팀 워크스페이스에서 리치텍스트 문서를 작성하고 공동 편집하는 문서 앱입니다.

## 주요 기능

- Tiptap 기반 리치텍스트 편집
- Yjs 및 Hocuspocus 실시간 공동 편집
- IndexedDB 오프라인 저장
- 문서별 댓글과 사용자 멘션
- Markdown 및 HTML 임베드
- 문서 아이콘 선택
- 데스크톱 및 모바일 반응형 UI

## 실행

모노레포 루트에서 의존성을 설치한 뒤 실행합니다.

```bash
pnpm --filter @conference/docs dev
```

Hocuspocus 서버를 연결하려면 `NEXT_PUBLIC_HOCUSPOCUS_URL`을 설정하고, 서버용 `COLLAB_TOKEN`을 같은 공유 키로 설정합니다. Oracle Cloud용 Docker Compose 구성은 `infra/hocuspocus`에 있습니다.
