# AGENTS.md

AI 코딩 에이전트(Claude Code, Codex, Cursor, Gemini CLI 등) 공용 진입점. 내용은 아래 파일에 있고, 여기서는 읽는 순서만 정한다.

1. **[CLAUDE.md](CLAUDE.md)** — 프로젝트 규칙의 정본. 스택, 데이터 소스, 페이지 구조, 배포(Vercel)·브랜치 규칙(feature → `develop` squash, `develop` → `main` merge commit), 환경변수, CI.
2. **[CONTEXT.md](CONTEXT.md)** — 도메인 용어집 (시장, 대표 종목, 매수존 …). 코드·문서의 이름은 여기 용어를 따른다.
3. **[.claude/memory/](.claude/memory/MEMORY.md)** — 작업하며 쌓인 메모: 로컬 Node 버전 함정, 배포하면서 겪은 일, 날짜가 걸린 후속 작업(도메인 이전·AdSense). 저장소에 없는 사실만 담는다.
4. **[docs/superpowers/](docs/superpowers/)** — 기능별 설계·계획 문서.

## 꼭 지킬 것

- 테스트·타입체크는 Node 18.18 이상에서 돌린다 (`npm test`, `npx tsc --noEmit`). 이 저장소 주인의 맥은 기본 node가 16이다 — [.claude/memory/local-node-version.md](.claude/memory/local-node-version.md).
- 로컬에서 `npm run build`를 돌리지 않는다. 실행 중인 dev 서버의 `.next`가 깨진다. 빌드는 CI가 한다.
- 외부 API 호출은 서버 라우트(`/api/*`)에서만 한다. 키는 Vercel 환경변수에만 둔다.
- 이미 머지된 PR에 커밋을 더 올리지 않는다. 푸시 전에 `gh pr view <번호> --json state`로 확인한다.
- 화면을 고칠 때는 CLAUDE.md의 "UI·디자인 시스템" 규칙(색 토큰, 등락·온도 색, `ui.tsx` 부품, 이모지 금지)을 따르고 검사기로 FAIL 0을 확인한다.
- `develop` → `main` 릴리스는 merge commit으로만 머지한다. squash로 머지되면 다음 릴리스가 충돌한다(해결법은 `.claude/memory/popol-deploy-habits.md`).

## 메모리 동기화

`.claude/memory/`는 Claude Code의 로컬 메모리(`~/.claude/projects/<프로젝트>/memory/`)를 복사해 둔 것이다. 한쪽을 고치면 다른 쪽에도 반영한다. 파일 하나에 사실 하나, 앞부분(frontmatter)에 `name`·`description`·`type`, 목록은 `MEMORY.md`에 둔다. 저장소가 public이므로 비밀값은 넣지 않는다.
