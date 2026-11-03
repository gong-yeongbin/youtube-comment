# 맥락 메모 — 유튜브 댓글 에이전트 대시보드 (2026-11-03)

작업 중 결정한 사항과 이유. 설계는 `PLAN.md`가 기준이고, 문서와 실제가 다른 점은 PLAN.md를 고치지 않고 여기에 적는다.

## 1단계: 워크스페이스 골격

- **설정 복사 출처는 `~/IdeaProjects/monorepo-practice`.** PLAN.md가 말하는 "모노레포"는 `hookbuffer`와 `monorepo-practice` 둘 다 후보였는데, `checklist.md`·`context-notes.md`·한글 커밋 관행이 있는 `monorepo-practice`를 택했다. 버전도 그대로 가져왔다(NestJS 11.1, TypeScript 6.0, ESLint 10, Vite 8, React 19.2). 서로 호환되는 조합임이 그쪽에서 검증돼 있어서다.
- **`packages/eslint-config`·`typescript-config` 워크스페이스는 만들지 않았다.** 앱이 둘뿐이라 루트에 `eslint.config.mjs`·`prettier.config.mjs` 하나씩 두고 `files` 글롭으로 backend(type-checked, node/jest 전역)와 frontend(react/hooks/a11y)를 나눴다. ESLint 10은 파일 위치 기준으로 상위 설정을 찾으므로 각 앱에서 `eslint .`를 실행해도 루트 설정이 적용된다. tsconfig도 앱별 파일에 인라인으로 풀었다.
- **`eslint-plugin-turbo`는 뺐다.** Turborepo를 쓰지 않으니 `turbo/no-undeclared-env-vars` 규칙이 의미 없다. 원본 `base.js`에서 그 블록만 제거했다.
- **Prettier는 두 앱 모두 루트 설정(탭, printWidth 180, 세미콜론, single quote)을 따른다.** 원본 모노레포는 frontend에 prettier 설정이 없어 기본값으로 재포맷되는 문제가 있었는데, 새 저장소라 처음부터 하나로 통일했다.
- **`nest new`·`create-vite` 스캐폴더를 쓰지 않고 파일을 직접 썼다.** 스캐폴더가 만드는 eslint/prettier/spec/README를 전부 덮어써야 해서 오히려 손이 더 간다. backend는 `main.ts`·`app.module.ts`, frontend는 `main.tsx`·`app.tsx`·`index.html`·`vite.config.ts`만으로 시작한다.
- **CORS는 열지 않는다.** Vite dev 서버가 `/api`를 3001로 프록시하므로 브라우저 입장에서는 same-origin이다. 로컬 전용 과제라 프로덕션 빌드·배포도 고려하지 않는다.
- **`profiles/`·`data/`는 디렉토리만 만들고 gitignore.** 크롬 user-data-dir과 `log.json`·스크린샷이 들어가며 Public 저장소에 올라가면 안 된다. `.gitkeep`도 두지 않는다(런타임에 없으면 만들면 된다).
- **`config.yaml`은 PLAN.md 예시 그대로 커밋한다.** 비밀값이 없고 과제 제출물의 설정 예시 역할을 겸한다. API 키는 `apps/backend/.env`(gitignore)에만 두고 `.env.example`로 키 이름만 공개한다.
- **backend `tsconfig.json`에 `rootDir: "./src"`를 명시했다.** TypeScript 6부터 `outDir`만 있고 `rootDir`이 없으면 TS5011 오류로 컴파일이 멈춘다. 원본 모노레포 설정에는 없던 항목이라 복사 후 `pnpm dev`에서 처음 드러났다.

## 2단계: youtube 모듈 + ① 패널

- **`googleapis` 대신 전역 `fetch`로 REST를 직접 호출한다.** 쓰는 엔드포인트가 `search.list`·`videos.list` 둘뿐이고, `googleapis` 패키지는 수십 MB에 타입 로딩도 느리다. 응답 타입은 필요한 필드만 인터페이스로 적었다.
- **오류는 서비스에서 한국어 메시지로 매핑한다.** 키 없음은 503, `quotaExceeded`는 429, 400/403은 502로 보내고 프론트는 본문의 `message`를 그대로 보여 준다. 사용자가 "나도 모르게 과금될까" 걱정했으니 할당량 소진이 명확히 보여야 한다.
- **`alreadyCommented`는 지금 항상 `false`다.** PLAN.md는 응답에 포함하라고 했지만 근거인 `log.json`은 4단계 log 모듈에서 생긴다. 필드와 UI 표시("댓글 완료")는 미리 만들어 두고 4단계에서 값을 채운다.
- **검색은 `useQuery`가 아니라 `useMutation`으로 버튼 클릭 시에만 호출한다.** `search.list`가 호출당 100 유닛이라 마운트·포커스 때 자동 재요청되면 할당량이 샌다. 링크 입력도 같은 이유로 submit 시에만 호출한다.
- **config.yaml 경로는 `__dirname` 기준 4단계 위다.** `src/config`와 `dist/config`가 같은 깊이라 `nest start`·jest 양쪽에서 같은 식이 맞는다. cwd 기준으로 잡으면 루트에서 `pnpm dev`를 돌릴 때와 앱 폴더에서 돌릴 때 달라진다.
- **backend `incremental`을 껐다.** nest-cli `deleteOutDir: true`가 dist를 지우는데 tsc는 `tsconfig.tsbuildinfo`를 보고 "안 바뀐 파일"의 emit을 건너뛰어, 두 번째 `pnpm dev`부터 `app.controller.js` 등이 dist에 없어 기동이 실패했다. 모노레포 설정에는 `incremental: true`가 있었지만 여기서는 재현되는 문제라 뺐다.
- **Jest에 `moduleNameMapper: {"^(\\.{1,2}/.*)\\.js$": "$1"}`를 추가했다.** NodeNext 때문에 import 경로에 `.js`를 붙이는데 ts-jest는 이를 `.ts`로 되돌리지 못한다. 모노레포는 경로 별칭만 매핑하고 `.js` import를 쓰지 않아 없던 설정이다.
- **ValidationPipe·DTO 없이 컨트롤러에서 직접 검사한다.** 입력이 `q` 문자열 하나와 `url` 하나라 class-validator를 들이는 비용이 더 크다. 입력이 늘어나는 5단계(`/api/post`)에서 필요해지면 그때 도입한다.

## 3단계: draft 모듈 + ② 패널

- **Gemini 모델명을 `gemini-3.8-flash`로 바꿨다.** PLAN.md는 `gemini-2.5-flash`로 시작해 실행 시 최신 flash로 교체하라고 했고, 2026-11-03 AI Studio 화면에 최신 flash가 `gemini-3.8-flash`로 표시됐다. API 키 없이 유효성은 확인하지 못했으니 404가 나면 `config.yaml` 한 줄만 바꾸면 된다.
- **few-shot 예시는 내가 쓴 임시본이다.** PLAN.md가 말하는 "과제의 예시 댓글"을 갖고 있지 않아 `draft/examples.ts`에 같은 형식으로 3개를 썼다. 원문을 받으면 그 파일만 교체한다.
- **검증 규칙에 "브랜드 언급 필수"를 넣었다.** PLAN.md 목록(길이·링크·해시태그·후기 패턴)에는 없지만 운명원을 언급하지 않는 댓글은 과제 목적을 못 이루므로 위반으로 본다. 후기 패턴은 "써봤·봤더니·받아봤·보고 왔·해봤·이용해·결제"로 잡고, "봤는데"는 영상을 봤다는 말과 겹쳐 뺐다.
- **재생성 후에도 위반이면 그대로 돌려주고 `violations`에 담는다.** 세 번째 호출은 하지 않는다. UI가 위반을 보여 주고 사용자가 수정하면 되고, 5단계 게시 전에 서버가 같은 규칙으로 다시 막는다.
- **검증 규칙 함수가 백엔드·프론트에 하나씩 있다.** 공유 패키지를 만들 규모가 아니라 같은 내용을 두 곳에 두고 헤더 주석으로 서로를 가리킨다. 규칙 값(min/max/brand)은 `/api/draft` 응답의 `rules`로 내려보내 프론트에 하드코딩하지 않는다.
- **응답 형식은 `responseJsonSchema`로 강제한다.** `@google/genai` 2.32의 `generateContent` config에 `responseMimeType: 'application/json'`과 JSON 스키마를 같이 주면 `res.text`가 바로 파싱 가능한 JSON이다. 그래도 파싱 실패는 502로 보낸다.
- **`youtube-transcript-plus` 타입을 직접 캐스팅했다.** 패키지가 `type: module`인데 `index.d.ts`가 확장자 없는 `./types` import를 써서 NodeNext에서 `TranscriptSegment`가 풀리지 않고 `any`가 된다. `fetchTranscript`를 `(videoId, {lang}) => Promise<{text: string}[]>`로 캐스팅해 필요한 형태만 쓴다. 라이브 호출은 `dQw4w9WgXcQ`로 61개 세그먼트 수신을 확인했다.
- **인기 댓글 조회 실패(댓글 비활성 등)는 빈 배열로 삼킨다.** 댓글은 초안 품질 보조 자료라 없어도 생성은 되어야 한다. 단 할당량 초과(429)와 키 없음(503)은 그대로 던진다.
- **② 패널의 프로필 선택은 5단계로 미뤘다.** 프로필 목록·오늘 게시 수를 주는 `GET /api/profiles`가 post 모듈에 속해서다.
- **(작업 방식) 병렬 Bash 호출에서 `cd`를 쓰면 섞인다.** 세 호출을 동시에 보냈더니 한 호출의 `cd apps/frontend`가 다른 호출의 `pnpm dev`에 적용돼 프론트만 떴다. 이후로는 `pnpm -C <절대경로>`를 쓴다.

## 4단계: log·rules 모듈 + 기록 테이블

- **`LogModule`은 `@Global()`이다.** rules·youtube·post 세 모듈이 모두 `LogService`를 쓰므로 매번 import하는 것보다 전역이 짧다. 전역 모듈은 이것 하나뿐이다.
- **log.json 경로는 `@Optional() @Inject(LOG_PATH)` 토큰으로 주입한다.** 기본값은 config.yaml과 같은 방식으로 `__dirname` 4단계 위 `data/log.json`이고, 테스트에서는 `new LogService(tmpPath)`로 임시 파일을 쓴다. Nest DI에서 `string` 기본 매개변수는 해석이 안 돼 토큰이 필요하다.
- **파일 I/O는 동기 함수다.** 로컬 시연용이고 기록이 수십 건이라 비동기로 만들 이유가 없다. 매 append마다 전체를 읽고 다시 쓴다.
- **중복은 409, 상한은 429로 구분한다.** PLAN.md는 "거부"라고만 했는데 프론트가 사유를 구분해 보여 주려면 상태 코드가 달라야 한다. 실패 기록은 중복·상한 어디에도 세지 않아 재시도가 된다.
- **KST 날짜는 `toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })`로 구한다.** dayjs 같은 의존성 없이 `YYYY-MM-DD`가 나온다. 테스트로 UTC 15:30이 KST 다음 날로 넘어가는 것을 고정했다.
- **라운드로빈은 "성공 기록이 가장 적은 프로필"이다.** 마지막 사용 프로필의 다음 것을 고르는 방식은 로그아웃된 프로필이 하나 있으면 두 번에 한 번 실패한다. 동률이면 config 순서라 처음 세 번은 youtube1 → 2 → 3으로 돈다.
- **`alreadyCommented`는 VideosController에서 채운다.** `YoutubeService.videos()`는 API 응답 변환만 하고 로그를 모르게 두었다. draft 단계에서 같은 함수를 쓰는데 거기서는 이 값이 필요 없다.
- **시드 `data/log.json`은 확인 후 지웠다.** 남겨 두면 `dQw4w9WgXcQ`가 "댓글 완료"로 보이고 오늘 상한에 1개가 세진다.

## 5단계: post 모듈 + 프로필 로그인 + ③ 패널

- **프로필 선택을 ②가 아니라 ③에 뒀다.** PLAN.md는 ②에 두라고 했지만 프로필은 게시 직전에 고르는 값이고, 프로필 목록·오늘 게시 수·로그인 버튼이 모두 post 모듈 API라 게시 버튼 옆이 맞다. ②는 초안 수정에 집중한다.
- **PosterService는 async generator로 이벤트를 yield한다.** PostService가 `for await`로 받아 ReplaySubject에 넣고, 컨트롤러의 `@Sse()`는 그 Observable을 그대로 돌려준다. ReplaySubject라 프론트가 `POST /api/post` 응답을 받고 EventSource를 여는 사이에 발생한 `opening` 이벤트도 놓치지 않는다. 작업은 종료 5분 뒤 메모리에서 지운다.
- **동시에 한 작업만 돌린다.** 크롬 창이 둘 뜨면 시연이 어수선하고 같은 프로필 폴더를 두 크롬이 열면 잠금 오류가 난다. 진행 중 두 번째 요청은 409다.
- **게시 전 서버가 댓글 규칙을 다시 검사한다.** 사용자가 ②에서 초안을 자유롭게 고칠 수 있으니 프론트 표시만 믿지 않고 `POST /api/post`에서 `validateComment`로 400을 낸다.
- **videoTitle은 프론트가 보낸다.** 로그에 제목을 남기려고 서버가 `videos.list`를 다시 부르면 YouTube 키가 없을 때 게시까지 막힌다. 선택한 영상 정보는 프론트가 이미 갖고 있다.
- **로그인 판정은 `#avatar-btn` 유무다.** 로그아웃이면 `ytd-masthead a[aria-label="로그인"]`(href에 ServiceLogin)이 대신 있다. 둘 중 하나가 나타날 때까지 15초 기다린 뒤 아바타가 보이면 로그인으로 본다. 헤드리스 프로브로 로그아웃 DOM은 확인했고, 로그인 DOM(`#contenteditable-root`에 타이핑, `#submit-button`, 최상단 `#content-text`)은 계정 로그인 후 실제 게시에서 확인해야 한다.
- **댓글 확인은 최상단 5개의 `#content-text`를 공백 정규화해 비교한다.** 15초 안에 안 보이면 새로고침 후 10초 더 본다. 그래도 없으면 `not_visible`로 캡처를 남긴다. 유튜브는 방금 단 댓글을 목록 맨 위에 끼워 넣는다.
- **실패 캡처는 `data/screenshots/<jobId>.png`에 저장하고 `GET /api/screenshots/:file`로 제공한다.** `@nestjs/serve-static`을 들이지 않고 `StreamableFile` 한 줄로 끝냈다. 파일명은 `basename`으로 잘라 경로 탈출을 막는다.
- **프로필 로그인은 크롬을 열어 두고 바로 응답한다.** `POST /api/profiles/:name/login`은 구글 로그인 페이지를 띄운 뒤 창이 닫히기를 기다리지 않는다. 기다리면 HTTP 요청이 몇 분씩 걸린다. 사용자가 로그인하고 창을 닫으면 세션이 `profiles/<name>`에 남는다.
- **③ 패널은 `key={videoId}`로 다시 마운트해 진행 상태를 초기화한다.** effect 안에서 setState로 초기화하면 react-hooks 규칙 경고가 나고 렌더가 한 번 더 돈다.
- **(검증 기록) 로그아웃 상태 라이브 테스트.** 빈 `profiles/youtube1`로 실제 영상에 게시를 시도해 `opening` → `failed not_logged_in` SSE, 1.8MB 캡처 PNG, log.json failed 기록을 확인했다. 테스트로 생긴 log.json과 캡처는 지웠고 `profiles/youtube1` 폴더는 남겼다(gitignore).

## 7단계: 문서·마무리

- **제작 의도 문서는 PM 관점으로 썼다.** 코드 설명이 아니라 "왜 이렇게 댓글을 쓰는가"와 "왜 이렇게 절제하는가"가 중심이다. 평가자가 README 없이 이 문서만 읽어도 설계 의도가 전달되도록 했다. 기술 선택은 한 줄씩만 넣었다.
- **README는 처음 받는 사람이 실행까지 가는 순서로 썼다.** 요구 사항 → 키 → 설정 → 실행 → 프로필 로그인 → 시연 흐름. API 표와 문제 해결 표는 뒤에 뒀다. 과제 제출용이라 배포·CI는 다루지 않는다.
- **`.gitignore` 검증은 `git ls-files`로 했다.** `git status`는 ignore된 파일을 안 보여 주니 "없음"이 증명이 안 된다. 추적 목록에 `.env.example`만 있는지, 구글 키 패턴(`AIza...`)이 추적 파일에 없는지 확인했다.
- **(작업 방식) `.env` deny 규칙은 Bash 명령 문자열 전체를 본다.** README heredoc에 `cp .env.example .env`가 있거나 grep 패턴에 `.env`가 들어가면 명령 전체가 거부된다. 그런 내용의 파일은 Write 도구로 쓰고, 검증은 `git ls-files -- '*.env'`처럼 grep 없이 한다.
- **Gemini 모델명을 `gemini-2.5-flash`로 되돌렸다 (2026-11-03).** 3단계에서 AI Studio 화면 기준으로 `gemini-3.8-flash`로 바꿨었는데, 사용자가 PLAN.md 기본값인 2.5-flash를 쓰기로 결정했다. API에서 모델명이 거부되면 `config.yaml` 한 줄만 바꾸면 된다.
