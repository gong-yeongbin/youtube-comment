// 루트 ESLint 설정 — backend(NestJS, type-checked)와 frontend(React)를 글롭으로 나눠 적용한다
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import onlyWarn from 'eslint-plugin-only-warn';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{ plugins: { onlyWarn } },
	eslintConfigPrettier,
	{ ignores: ['**/dist/**', '**/node_modules/**'] },

	// backend: nest-cli 기본 설정 기반. projectService가 파일별로 가장 가까운 tsconfig를 찾는다.
	{
		files: ['apps/backend/**/*.ts'],
		extends: [...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			globals: { ...globals.node, ...globals.jest },
			sourceType: 'commonjs',
			parserOptions: { projectService: true },
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
		},
	},

	// frontend: react/react-hooks/jsx-a11y. react-jsx 런타임이라 React import 강제 규칙은 끈다.
	{
		files: ['apps/frontend/**/*.{ts,tsx}'],
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
			'jsx-a11y': jsxA11yPlugin,
		},
		languageOptions: {
			globals: { ...globals.browser },
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		settings: {
			// eslint-plugin-react가 아직 ESLint 10을 정식 지원하지 않아 version "detect" 시
			// 내부 getFilename 호출이 깨진다. 버전을 고정해 감지 코드를 우회한다.
			react: { version: '17.0' },
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooksPlugin.configs.recommended.rules,
			...jsxA11yPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
		},
	},

	// 설정 파일(js/mjs/cjs)은 tsconfig에 포함되지 않으므로 type-checked 규칙을 해제한다.
	{
		files: ['**/*.{js,mjs,cjs}'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: { sourceType: 'module' },
	}
);
