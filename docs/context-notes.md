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
