# 유튜브 댓글 에이전트

연애 고민 유튜브 영상을 찾아 AI가 댓글 초안을 쓰고, 로컬 크롬에서 한 글자씩 타이핑해 게시한 뒤 확인하는 대시보드. 설계는 [PLAN.md](PLAN.md), 만든 이유는 [docs/제작 의도.md](docs/제작%20의도.md)에 있다.

## 요구 사항

- Node.js 24 이상, pnpm 10
- macOS 또는 Windows에 설치된 Google Chrome
- YouTube Data API v3 키 (Google Cloud 콘솔에서 API 사용 설정 후 발급. 무료, 하루 10,000 유닛)
- Gemini API 키 (Google AI Studio에서 발급. 무료 등급으로 충분)
- 유튜브에 로그인할 구글 계정 1~3개

## 설치와 설정

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
```

`apps/backend/.env`에 키 두 개를 넣는다.

```
YOUTUBE_API_KEY=발급받은_키
GEMINI_API_KEY=발급받은_키
```

운영 값은 루트 `config.yaml`에서 바꾼다.

```yaml
profiles: [youtube1, youtube2, youtube3]   # 크롬 프로필 이름 (profiles/<이름> 폴더)
comment: { min_chars: 40, max_chars: 120, brand: 운명원 }
limits: { daily_max_comments: 10 }          # 하루 게시 상한 (KST 기준)
search: { query: "연애 고민", max_results: 20 }
gemini: { model: gemini-3.8-flash }
```

## 실행

```bash
pnpm dev
```

백엔드는 3001, 대시보드는 http://localhost:3000 에서 뜬다.

### 처음 한 번, 프로필 로그인

③ 칸의 "프로필 로그인"을 누르면 그 프로필 전용 크롬 창이 열린다. 구글 계정으로 로그인하고 창을 닫으면 세션이 `profiles/<이름>/`에 남는다. 프로필마다 한 번씩 한다.

### 시연 흐름

1. ① "연애 고민 영상 불러오기" 또는 링크 붙여넣기 → 영상 클릭
2. ② "댓글 초안 생성" → 고민 한 줄과 초안 확인, 필요하면 수정. 글자 수와 규칙 위반이 실시간으로 표시된다
3. ③ 프로필 선택(비우면 자동 배정) → "댓글 게시" → 크롬이 열리고 타이핑·게시·확인 단계가 진행된다
4. 하단 기록 테이블에 결과가 남는다. 실패하면 사유와 그 순간 캡처가 붙는다

테스트 댓글은 본인 채널 영상에 달고 확인 후 지운다.

## 동작 규칙

- 같은 영상에는 댓글을 한 번만 단다 (성공 기록 기준, 409)
- 하루 상한을 넘으면 거부한다 (429)
- 프로필을 지정하지 않으면 성공 기록이 가장 적은 프로필을 쓴다
- 댓글은 40~120자, 링크·해시태그 금지, 브랜드 언급 필수, "써봤는데" 류 후기 표현 금지. 초안 생성과 게시 직전에 서버가 검사한다
- 게시는 한 번에 하나만 진행된다

## 테스트

```bash
pnpm test          # backend Jest + frontend Vitest
pnpm check-types
pnpm lint
```

## 구조

```
config.yaml                 운영 설정
profiles/<이름>/            크롬 user-data-dir (gitignore)
data/log.json               게시 기록 (gitignore)
data/screenshots/           실패 캡처 (gitignore)
docs/                       제작 의도, 체크리스트, 맥락 메모
apps/backend/src/
  config/    config.yaml + .env 로드
  youtube/   검색·영상 조회·인기 댓글, URL → videoId
  draft/     자막, Gemini 초안, 댓글 규칙
  log/       log.json 읽기·쓰기
  rules/     영상당 1개, 하루 상한, 프로필 배정
  post/      Playwright 게시, SSE 진행 이벤트, 프로필 로그인
apps/frontend/src/
  features/fetch, select, post, log   세 칸과 기록 테이블
  shared/api.ts, comment-rules.ts
```

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET | `/api/videos?q=` | 키워드 최신순 검색 (`alreadyCommented` 포함) |
| POST | `/api/videos/resolve` | 링크 → 영상 정보 |
| POST | `/api/draft` | 초안 생성 `{concern, comment, violations, hasTranscript}` |
| POST | `/api/post` | 게시 작업 시작, `jobId` 반환 |
| GET | `/api/post/:jobId/events` | SSE: `opening → typing → posted → verified` 또는 `failed` |
| GET | `/api/log` | 게시 기록 |
| GET | `/api/profiles` | 프로필과 오늘 게시 수 |
| POST | `/api/profiles/:name/login` | 로그인용 크롬 열기 |

## 문제 해결

| 증상 | 원인과 조치 |
|---|---|
| "YOUTUBE_API_KEY가 설정되지 않았습니다" | `apps/backend/.env` 확인 후 서버 재시작 |
| "오늘 YouTube API 할당량을 다 썼습니다" | 하루 10,000 유닛 소진. 한국 시간 오후 4~5시에 초기화 |
| "Gemini 한도를 넘었습니다" | 무료 등급 분당·일일 한도. 잠시 후 재시도 |
| "Gemini 모델을 찾을 수 없습니다" | `config.yaml`의 `gemini.model`을 AI Studio에 있는 모델명으로 변경 |
| 실패 사유 `not_logged_in` | 해당 프로필로 "프로필 로그인" 먼저 |
| 실패 사유 `not_visible` | 게시는 눌렀지만 목록에 안 보임. 스팸 필터 가능성. 캡처 확인 |
| 크롬이 안 열림 | Google Chrome 설치 확인. 같은 프로필 폴더를 다른 크롬이 쓰고 있으면 닫기 |
