// LogService 유닛 테스트 — 파일 없음, append 후 read, 디렉토리 자동 생성
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LogService } from './log.service.js';

let dir: string;
beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'yc-log-'))));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const base = { videoId: 'abc', videoTitle: '제목', profile: 'youtube1', comment: '댓글', status: 'success' as const };

describe('LogService', () => {
	it('파일이 없으면 빈 배열', () => {
		expect(new LogService(join(dir, 'log.json')).readAll()).toEqual([]);
	});

	it('append 하면 id·at이 채워지고 다시 읽힌다 (없는 디렉토리도 만든다)', () => {
		const service = new LogService(join(dir, 'nested', 'log.json'));
		const saved = service.append(base);
		expect(saved.id).toHaveLength(36);
		expect(new Date(saved.at).getTime()).toBeGreaterThan(0);
		service.append({ ...base, status: 'failed', reason: 'not_logged_in' });
		const all = service.readAll();
		expect(all).toHaveLength(2);
		expect(all[0]).toEqual(saved);
		expect(all[1]?.reason).toBe('not_logged_in');
	});
});
