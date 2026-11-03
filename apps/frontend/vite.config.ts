/// <reference types="vitest/config" />
// Vite 개발 서버(포트 3000, /api → 3001 프록시) + Vitest 설정
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		port: 3000,
		proxy: {
			'/api': 'http://localhost:3001',
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
	},
});
