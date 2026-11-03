# 유튜브 댓글 에이전트 대시보드 체크리스트 (2026-11-03)

PLAN.md "작업 순서"를 단계별 체크박스로 옮긴 것. 각 단계는 verify 통과 후 한글 커밋.

## 1. 워크스페이스 골격

- [x] `git init`, `.gitignore` (node_modules, dist, .env, profiles/, data/)
- [x] 루트 `package.json` (`dev` = `pnpm -r --parallel dev`), `pnpm-workspace.yaml`
- [x] 루트 `eslint.config.mjs` / `prettier.config.mjs` (monorepo-practice 설정 복사, turbo 플러그인 제거)
- [x] `apps/backend` NestJS 11 최소 골격 (`main.ts`, `app.module.ts`, 포트 3001, prefix `/api`)
- [x] `apps/frontend` Vite + React 19 + react-query 최소 골격 (포트 3000, `/api` 프록시)
- [x] `config.yaml`, `apps/backend/.env.example`
- [x] `docs/checklist.md`, `docs/context-notes.md`
- [x] verify: `pnpm dev`로 서버·웹 둘 다 뜸 (3001 `/api` 응답, 3000 HTML 응답)

## 2. youtube 모듈 + ① 패널

- [x] `config/` — config.yaml + .env 로드 (ConfigModule)
- [x] `youtube/youtube.service.ts` — `search.list` 최신순 → `videos.list` 보강, 키 없음·할당량 초과·키 오류를 한국어 메시지로 매핑
- [x] `youtube/video-id.ts` — URL → videoId 파서
- [x] `youtube/videos.controller.ts` — `GET /api/videos?q=`, `POST /api/videos/resolve`
- [x] URL 파서 Jest 유닛 테스트 (16개)
- [x] `features/fetch/fetch-panel.tsx` — 버튼 + 링크 입력 + 목록 (썸네일·제목·채널·날짜·조회수)
- [x] `shared/api.ts`, `styles.css` (세 칸 그리드)
- [x] FetchPanel Vitest 렌더 테스트 (목록 표시, 오류 표시)
- [x] verify (키 없음): `GET /api/videos` 503, 잘못된 링크 400, 프론트 오류 메시지 표시
- [ ] verify (키 있음): 버튼 한 번에 목록 표시 ← `.env`에 YOUTUBE_API_KEY 넣은 뒤
- [x] `alreadyCommented`를 log.json 기준으로 채우기 (4단계에서 완료)

## 3. draft 모듈 + ② 패널

- [x] `draft/comment-rules.ts` — 길이·링크·해시태그·브랜드 언급·후기 말투 검증 (Jest 4개)
- [x] `draft/transcript.service.ts` — `youtube-transcript-plus` ko → en, 실패 시 null, 앞 4,000자
- [x] `draft/gemini.service.ts` — 시스템 프롬프트 + few-shot, JSON 스키마 응답, 위반 시 1회 재생성, 오류 매핑 (Jest 6개)
- [x] `draft/examples.ts` — few-shot 예시 3개 (임시. 과제 원문 예시로 교체 필요)
- [x] `youtube.service.ts` `comments()` — 인기 댓글 10개, 댓글 막힌 영상은 빈 배열
- [x] `draft/draft.controller.ts` — `POST /api/draft`
- [x] `config.yaml` gemini.model → `gemini-3.8-flash`
- [x] `features/select/select-panel.tsx` — 고민 한 줄 + 초안(수정 가능) + 글자 수·검증 표시 + 자막 유무 (Vitest 3개)
- [x] `shared/comment-rules.ts` — 백엔드와 같은 규칙 (클라이언트 즉시 표시용)
- [x] verify (키 없음): 자막 라이브러리 실제 영상으로 수신 확인, `POST /api/draft` 400/503 응답
- [ ] verify (키 있음): 영상 3개로 서로 다른 초안, 길이·금지어 검증 통과, `gemini-3.8-flash` 모델명 유효 확인
- [x] 프로필 선택 — ②가 아니라 ③ 게시 버튼 옆에 둠 (5단계)
- [ ] few-shot을 과제 PDF의 예시 댓글 원문으로 교체

## 4. log·rules 모듈 + 기록 테이블

- [x] `log/log.service.ts` — `data/log.json` append/read, 디렉토리 자동 생성 (Jest 2개)
- [x] `log/log.controller.ts` — `GET /api/log`, `LogModule`은 `@Global()`
- [x] `rules/rules.service.ts` — 영상당 1개(409), 하루(KST) 상한(429), 프로필 라운드로빈, 지정 프로필 검증 (Jest 10개)
- [x] `GET /api/videos`·`resolve`의 `alreadyCommented`를 log 성공 기록으로 채움
- [x] `features/log/log-table.tsx` — 하단 기록 테이블, 최신순, 실패 사유·캡처 링크 (Vitest 2개)
- [x] verify: 같은 영상 2회 거부, 상한 도달 거부, 연속 3회 프로필 순환 (Jest), 시드 `log.json`으로 `GET /api/log` 응답 확인
- [x] verify: `POST /api/post` 진행 중 409 확인. 중복 영상 409·상한 429는 성공 기록이 생긴 뒤 확인

## 5. post 모듈 + 프로필 로그인 + ③ 패널

- [x] `post/poster.service.ts` — Playwright `launchPersistentContext(channel: 'chrome')`, 로그인 확인, 댓글창 스크롤, 글자 단위 타이핑, 제출, 최상단 확인(실패 시 새로고침 1회), 실패 캡처
- [x] `post/post.service.ts` — 규칙·검증 통과 시 작업 생성, ReplaySubject로 이벤트 중계, 동시 1개 제한(409), 결과 log.json 기록 (Jest 7개)
- [x] `post/post.controller.ts` — `POST /api/post`, `GET /api/post/:jobId/events` (@Sse), `GET /api/screenshots/:file`
- [x] `post/profiles.controller.ts` — `GET /api/profiles`(오늘 게시 수·프로필 폴더 유무), `POST /api/profiles/:name/login`
- [x] 셀렉터 실제 DOM 확인 — 로그아웃 상태를 headless 프로브로 확인 (`#avatar-btn` 없음, `a[aria-label="로그인"]` 있음, `#contenteditable-root`·`#submit-button`은 클릭 후 생성)
- [x] `features/post/post-panel.tsx` — 프로필 선택·로그인 버튼, 게시 버튼, 진행 스텝 4개, 실패 사유·캡처 (Vitest 2개)
- [x] verify (로그아웃 프로필): 실제 영상에 게시 시도 → `opening` → `failed not_logged_in` SSE, 캡처 PNG 생성·제공, log.json에 failed 기록, 진행 중 두 번째 요청 409, 규칙 위반 400
- [ ] verify (로그인 프로필): youtube1로 본인 채널 영상에 게시·확인까지 ← 구글 계정 로그인 후
- [ ] 로그인 상태 셀렉터 확인 — `#contenteditable-root` 타이핑, `#submit-button`, 최상단 `#content-text` 비교

## 6. 프로필 3개 순환 배정

- [ ] 요청에 `profile` 없으면 성공 기록 최소 프로필 선택
- [ ] verify: 연속 3회 게시 시 프로필이 돌아감

## 7. 문서·마무리

- [x] `docs/제작 의도.md` — 무엇을·왜·안전장치·기술 선택·한계
- [x] `README.md` — 요구 사항, 키 설정, config.yaml, 실행, 프로필 로그인, 시연 흐름, 규칙, API 표, 문제 해결
- [x] verify: `git ls-files`에 `.env.example`만 있고 `.env`·`profiles/`·`data/`·PNG 없음, 추적 파일에 구글 키 패턴 없음, `git check-ignore`로 다섯 경로 모두 ignore 확인

## 남은 수동 검증 (키·계정 입력 후)

- [ ] ① 버튼 한 번에 실제 영상 목록 표시 (YouTube 키)
- [ ] ② 영상 3개로 서로 다른 초안, `gemini-3.8-flash` 모델명 유효 (Gemini 키)
- [ ] ③ youtube1 로그인 후 본인 채널 영상에 게시·확인까지. 로그인 상태 셀렉터 확인
- [ ] 연속 3회 게시 시 프로필이 1 → 2 → 3으로 돌아감
- [ ] 같은 영상 재게시 409, 상한 429 (성공 기록이 생긴 뒤)
- [ ] few-shot을 과제 PDF의 예시 댓글 원문으로 교체
- [ ] 시연 영상 촬영
