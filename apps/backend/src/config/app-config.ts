// config.yaml 타입과 로더 — @nestjs/config의 load 옵션으로 등록한다
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export interface AppConfig {
	profiles: string[];
	comment: { min_chars: number; max_chars: number; brand: string };
	limits: { daily_max_comments: number };
	search: { query: string; max_results: number };
	gemini: { model: string };
}

// src/config 와 dist/config 모두 저장소 루트까지 4단계 위다
export const CONFIG_PATH = resolve(__dirname, '../../../../config.yaml');

export function loadAppConfig(): AppConfig {
	return parse(readFileSync(CONFIG_PATH, 'utf8')) as AppConfig;
}
