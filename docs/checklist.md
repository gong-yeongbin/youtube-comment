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

- [ ] `draft/transcript.service.ts` — `youtube-transcript-plus` ko → en, 실패 시 null
- [ ] `draft/gemini.service.ts` — 프롬프트 + few-shot, JSON `{concern, comment}`, 후처리 검증 + 1회 재생성
- [ ] `draft/draft.controller.ts` — `POST /api/draft`
- [ ] GeminiService 후처리 검증 Jest 유닛 테스트
- [ ] `features/select/select-panel.tsx` — 고민 한 줄 + 초안(수정 가능) + 프로필 선택 + 자막 유무 표시 + 클라이언트 검증 표시
- [ ] verify: 영상 3개로 서로 다른 초안, 길이·금지어 검증 통과

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
