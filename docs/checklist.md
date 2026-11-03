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
- [ ] `alreadyCommented`를 log.json 기준으로 채우기 ← 4단계에서

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
- [ ] ② 패널 프로필 선택 ← 5단계 `GET /api/profiles` 만든 뒤
- [ ] few-shot을 과제 PDF의 예시 댓글 원문으로 교체

## 4. log·rules 모듈 + 기록 테이블

- [ ] `log/log.service.ts` — `data/log.json` append/read, `log.controller.ts` — `GET /api/log`
- [ ] `rules/rules.service.ts` — 영상당 1개, 하루(KST) 상한, 프로필 순환
- [ ] RulesService Jest 유닛 테스트 (중복·상한·순환)
- [ ] 하단 기록 테이블
- [ ] verify: 같은 영상 2회 요청 거부, 상한 도달 시 거부

## 5. post 모듈 + 프로필 로그인 + ③ 패널

- [ ] `post/poster.service.ts` — Playwright `launchPersistentContext`, 로그인 확인, 타이핑, 제출, 확인, 실패 캡처
- [ ] `post/post.controller.ts` — `POST /api/post`, `GET /api/post/:jobId/events` (@Sse)
- [ ] `post/profiles.controller.ts` — `GET /api/profiles`, `POST /api/profiles/:name/login`
- [ ] 셀렉터 실제 DOM 확인 (한국어 화면)
- [ ] `features/post/post-panel.tsx` — 진행 스텝 + 결과/실패 캡처 (EventSource)
- [ ] verify: youtube1로 본인 채널 영상에 게시·확인까지, 로그아웃 프로필로 `not_logged_in` 캡처 생성

## 6. 프로필 3개 순환 배정

- [ ] 요청에 `profile` 없으면 성공 기록 최소 프로필 선택
- [ ] verify: 연속 3회 게시 시 프로필이 돌아감

## 7. 문서·마무리

- [ ] `docs/제작 의도.md`
- [ ] `README.md` (설정·실행법)
- [ ] verify: `git status`에 키·프로필·데이터 없음
