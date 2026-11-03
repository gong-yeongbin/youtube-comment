# 유튜브 댓글 에이전트 대시보드 설계

## 실행 안내 (새 세션용)

이 문서는 별도 세션에서 구현을 시작하기 위한 설계서다. 이 디렉토리가 프로젝트 루트가 된다.

1. 코딩 전에 `docs/checklist.md`(아래 "작업 순서"를 체크박스로)와 `docs/context-notes.md`(결정 사항과 이유)를 먼저 만든다.
2. "작업 순서"를 1번부터 진행하고, 각 단계의 verify를 통과한 뒤 한글 커밋 메시지로 커밋한다.
3. 게시 단계(5번)는 실제 유튜브에 댓글이 달리므로 테스트는 본인 채널 영상으로만 한다.
4. 셀렉터·모델명 등 문서와 실제가 다르면 문서를 고치지 말고 `context-notes.md`에 기록한다.

필요한 외부 준비물.
- Google Cloud 프로젝트에서 YouTube Data API v3 사용 설정 + API 키
- Gemini API 키 (Google AI Studio)
- 로컬 Chrome 설치, 유튜브 로그인용 구글 계정 1~3개

## Context

(주)제이지그룹 AI PM 선발 과제 Track 2. 본인 컴퓨터에서 실행하는 대시보드로, 세 칸(영상 불러오기 → 영상 선택 → 댓글 달기)을 차례로 쓰면 크롬 프로필이 열리고 한 글자씩 타이핑해 댓글이 게시·확인되는 모습을 시연 영상으로 제출한다. 댓글은 영상 속 연애 고민을 짚고 '운명원' 연애 사주를 보고 싶게 유도해야 한다.

사용자가 정한 결정.
- 스택: NestJS(백엔드, Playwright 실행) + React Vite(프론트, react-query). 모노레포와 같은 구조
- AI: Gemini API (`@google/genai`)
- 범위: 필수 + 쉬운 가점 (링크 직접 입력, 프로필 3개 배정). "AI 키로 즉석 생성"·"뜨기 직전 영상 찾기"는 제외
- 1단계 소스: 연애 키워드 검색 최신순 (YouTube Data API v3 `search.list`)

가정 (확인 필요 시 말해 주세요).
- 모노레포와 별개의 새 저장소 `~/IdeaProjects/youtube-comment`에 만든다. Public Git 제출 대상이므로 분리한다.
- 유튜브 자막은 비공식 npm 라이브러리(`youtube-transcript-plus`)로 시도하고 실패하면 제목·설명·인기 댓글만으로 초안을 만든다. 과제가 이 폴백을 허용한다.
- Gemini 모델명은 설정값으로 두고 기본 `gemini-2.5-flash`로 시작한다 (실행 시 사용 가능한 최신 flash로 교체).

## 구조

pnpm 워크스페이스 두 앱. Turborepo는 과제 규모에 과해서 쓰지 않고 루트 `dev`가 `pnpm -r --parallel dev`로 둘을 띄운다.

```
youtube-comment/
├─ package.json / pnpm-workspace.yaml
├─ config.yaml             # 과제 설정 예시 형식 그대로 (profiles, comment, limits, search, gemini)
├─ profiles/               # 크롬 user-data-dir (gitignore). youtube1/ youtube2/ youtube3/
├─ data/                   # log.json, screenshots/ (gitignore)
├─ docs/                   # checklist.md, context-notes.md, 제작 의도.md
├─ apps/backend/           # NestJS 11, 포트 3001. .env에 YOUTUBE_API_KEY, GEMINI_API_KEY
│  └─ src/
│     ├─ main.ts
│     ├─ app.module.ts
│     ├─ config/           # config.yaml + .env 로드 (ConfigModule)
│     ├─ youtube/          # YoutubeService: search / videos / commentThreads, URL → videoId. VideosController
│     ├─ draft/            # TranscriptService(자막 시도+폴백), GeminiService, DraftController
│     ├─ log/              # LogService: data/log.json append/read, LogController
│     ├─ rules/            # RulesService: 영상당 1개, 하루 상한, 프로필 순환
│     └─ post/             # PosterService(Playwright), PostController(@Sse 진행 이벤트), ProfilesController
└─ apps/frontend/          # Vite React 19 + @tanstack/react-query, 포트 3000, /api 프록시
   └─ src/
      ├─ app.tsx           # 세 칸 레이아웃 + 하단 기록 테이블
      ├─ features/fetch/fetch-panel.tsx     # ① 버튼 + 링크 입력 + 목록
      ├─ features/select/select-panel.tsx   # ② 고민 한 줄 + 초안(수정 가능) + 프로필 선택
      ├─ features/post/post-panel.tsx       # ③ 진행 상태 스텝 + 결과/실패 캡처 (EventSource)
      └─ shared/api.ts
```

모노레포와 달리 Prisma·Redis·인증은 두지 않는다. 저장소는 JSON 파일 하나면 충분하다.

## API

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET | `/api/videos?q=` | 연애 키워드 최신순 검색 → `videos.list`로 조회수·게시일 보강. 응답에 `alreadyCommented` 포함 |
| POST | `/api/videos/resolve` `{url}` | 링크 직접 입력. videoId 추출 → `videos.list` |
| POST | `/api/draft` `{videoId}` | 자막/설명 + 인기 댓글 → Gemini → `{concern, comment}` |
| POST | `/api/post` `{videoId, comment, profile?}` | 규칙 검사(영상당 1개, 하루 상한) 통과 시 작업 생성, `jobId` 반환 |
| GET | `/api/post/:jobId/events` | NestJS `@Sse()`. `opening` → `typing` → `posted` → `verified` / `failed{reason, screenshot}` |
| GET | `/api/log` | 시간순 기록 (영상·프로필·댓글·성공/실패·시각) |
| GET | `/api/profiles` | 설정된 프로필 + 오늘 게시 수 |
| POST | `/api/profiles/:name/login` | 해당 user-data-dir로 크롬을 열어 사용자가 직접 로그인 (최초 1회) |

## 핵심 로직

### 댓글 생성 (GeminiService)
- 입력: 제목, 설명, 자막(있으면 앞 4,000자), 인기 댓글 10개.
- 시스템 프롬프트: "이 영상을 본 시청자 페르소나. 영상 속 구체적 장면·말을 하나 이상 인용. 40~120자. 링크·해시태그 금지. 운명원을 직접 써본 후기처럼 쓰지 말 것. '운명원 연애사주가 잘 본다던데 나도 보고 싶다' 식의 간접 유도."
- 과제의 예시 댓글을 few-shot으로 넣는다.
- 출력은 JSON `{concern, comment}`. 후처리로 길이·링크·해시태그·"써봤는데/봤더니" 류 후기 패턴을 검사하고 위반 시 1회 재생성.
- UI에서 초안을 수정할 수 있게 하되 같은 검증을 클라이언트에서도 표시한다.

### 운영 규칙 (RulesService)
- `log.json`에서 성공 기록을 읽어 `videoId` 중복이면 거부, 오늘(KST) 성공 수 ≥ `daily_max_comments`면 거부. 서버에서 강제하고 UI는 사유만 표시.
- 프로필 배정: 요청에 `profile`이 있으면 그대로, 없으면 성공 기록 수가 가장 적은 프로필(라운드로빈).

### 게시 (PosterService)
1. `chromium.launchPersistentContext('profiles/<name>', { channel: 'chrome', headless: false, locale: 'ko-KR' })`. 기본 프로필은 Chrome 136+에서 자동 제어가 막혀 별도 폴더를 쓴다.
2. `youtube.com/watch?v=<id>` 이동, 로그인 여부 확인(상단 로그인 버튼 노출 시 `failed: not_logged_in`).
3. 댓글 영역까지 스크롤해 `ytd-comment-simplebox-renderer` 로드 대기. 로그인 안 된 경우 입력창 대신 안내가 떠서 여기서도 잡힌다.
4. `#placeholder-area` 클릭 → `#contenteditable-root`에 `page.keyboard.type(text, { delay: 50~80ms })`로 한 글자씩 입력.
5. `#submit-button` 클릭 → `posted` 이벤트.
6. 확인: 댓글 목록 최상단 `ytd-comment-thread-renderer`에 입력 텍스트가 나타나는지 대기(최대 15초). 안 보이면 새로고침 후 한 번 더 탐색. 성공 시 `verified`, 아니면 `failed: not_visible`.
7. 모든 실패는 `data/screenshots/<jobId>.png` 저장 후 `failed{reason, screenshot}`. 성공·실패 모두 `log.json`에 기록.
8. 시연을 위해 브라우저는 성공 후 몇 초 유지하고 닫는다.

셀렉터는 유튜브 한국어 화면 기준으로 실제 DOM을 확인하며 맞춘다 (구현 중 Playwright로 확인).

### 자막 (TranscriptService)
`youtube-transcript-plus`로 `ko` → `en` 순 시도. 예외나 빈 결과면 `null` 반환하고 draft 단계가 제목·설명·댓글만 사용. 자막 유무를 UI에 표시한다.

## 설정 예시 (config.yaml)

```yaml
profiles: [youtube1, youtube2, youtube3]
comment: { min_chars: 40, max_chars: 120, brand: 운명원 }
limits: { daily_max_comments: 10 }
search: { query: "연애 고민", max_results: 20 }
gemini: { model: gemini-2.5-flash }
```

## 작업 순서

1. 워크스페이스 골격(NestJS·Vite 초기화, ESLint/Prettier는 모노레포 설정 복사) + `docs/checklist.md`·`context-notes.md` 작성 → verify: `pnpm dev`로 서버·웹 둘 다 뜸
2. `youtube` 모듈 + ① 패널(검색 목록, 링크 입력) → verify: 버튼 한 번에 썸네일·제목·채널·날짜 목록
3. `draft` 모듈(TranscriptService, GeminiService) + ② 패널 → verify: 영상 3개로 서로 다른 초안, 길이·금지어 검증 통과
4. `log`·`rules` 모듈 + 기록 테이블 → verify: 같은 영상 2회 요청 거부, 상한 도달 시 거부 (Jest 유닛 테스트)
5. `post` 모듈(PosterService, @Sse) + 프로필 로그인 + ③ 패널 → verify: youtube1로 실제 영상에 게시·확인까지, 실패 시 캡처 생성
6. 프로필 3개 순환 배정 → verify: 연속 3회 게시 시 프로필이 돌아감
7. 제작 의도 문서, README(설정·실행법), `.gitignore`에 키·프로필·데이터 제외 확인 → verify: `git status`에 비밀값 없음

## 검증

- 유닛: RulesService(중복·상한·순환), GeminiService 후처리 검증, URL 파서 — backend Jest. frontend는 Vitest로 패널 렌더·상태 표시만.
- E2E 수동: 시연 시나리오 그대로 ①→②→③ 실행해 댓글이 유튜브에 보이는지 확인. 테스트용 댓글은 본인 채널 영상에 달아 확인 후 삭제.
- 실패 경로: 로그아웃된 프로필로 ③ 실행 → `not_logged_in` 사유와 캡처가 기록 테이블에 남는지.
