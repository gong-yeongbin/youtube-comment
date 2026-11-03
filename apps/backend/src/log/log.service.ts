// data/log.json에 게시 기록을 append/read 하는 서비스 — 저장소는 JSON 파일 하나
import { Inject, Injectable, Optional } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface LogEntry {
	id: string;
	at: string;
	videoId: string;
	videoTitle: string;
	profile: string;
	comment: string;
	status: 'success' | 'failed';
	reason?: string;
	screenshot?: string;
}

export const LOG_PATH = 'LOG_PATH';
// src/log 와 dist/log 모두 저장소 루트까지 4단계 위다
export const DEFAULT_LOG_PATH = resolve(__dirname, '../../../../data/log.json');

@Injectable()
export class LogService {
	constructor(@Optional() @Inject(LOG_PATH) private readonly path: string = DEFAULT_LOG_PATH) {}

	readAll(): LogEntry[] {
		if (!existsSync(this.path)) return [];
		const raw = readFileSync(this.path, 'utf8').trim();
		return raw ? (JSON.parse(raw) as LogEntry[]) : [];
	}

	append(entry: Omit<LogEntry, 'id' | 'at'> & Partial<Pick<LogEntry, 'id' | 'at'>>): LogEntry {
		const full: LogEntry = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
		const entries = [...this.readAll(), full];
		mkdirSync(dirname(this.path), { recursive: true });
		writeFileSync(this.path, JSON.stringify(entries, null, '\t') + '\n');
		return full;
	}
}
