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
