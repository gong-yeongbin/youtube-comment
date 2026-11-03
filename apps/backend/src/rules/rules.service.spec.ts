// RulesService 유닛 테스트 — 중복 영상 거부, 하루 상한 거부(KST 경계), 프로필 순환·지정·오류
import { ConfigService } from '@nestjs/config';
import type { LogEntry } from '../log/log.service.js';
import { LogService } from '../log/log.service.js';
import { kstDate, RulesService } from './rules.service.js';

const settings: Record<string, unknown> = { profiles: ['youtube1', 'youtube2', 'youtube3'], 'limits.daily_max_comments': 3 };
const httpStatus = (status: number) => expect.objectContaining({ status }) as Error;
const config = { getOrThrow: (k: string) => settings[k] } as unknown as ConfigService;

function makeService(entries: Partial<LogEntry>[]) {
	const log = { readAll: () => entries.map((e, i) => ({ id: String(i), at: new Date().toISOString(), videoId: `v${i}`, videoTitle: '', profile: 'youtube1', comment: '', status: 'success', ...e })) } as LogService;
	return new RulesService(config, log);
}

describe('RulesService.assertCanPost', () => {
	it('기록이 없으면 통과', () => {
		expect(() => makeService([]).assertCanPost('new')).not.toThrow();
	});

	it('성공 기록이 있는 영상은 409', () => {
		expect(() => makeService([{ videoId: 'dup' }]).assertCanPost('dup')).toThrow(httpStatus(409));
	});

	it('실패 기록만 있는 영상은 다시 시도할 수 있다', () => {
		expect(() => makeService([{ videoId: 'dup', status: 'failed' }]).assertCanPost('dup')).not.toThrow();
	});

	it('오늘(KST) 성공 수가 상한이면 429', () => {
		expect(() => makeService([{}, {}, {}]).assertCanPost('new')).toThrow(httpStatus(429));
	});

	it('어제(KST) 기록은 상한에 세지 않는다', () => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		expect(() => makeService([{ at: yesterday }, { at: yesterday }, { at: yesterday }]).assertCanPost('new')).not.toThrow();
	});
});

describe('RulesService.pickProfile', () => {
	it('기록이 없으면 첫 프로필', () => {
		expect(makeService([]).pickProfile()).toBe('youtube1');
	});

	it('성공 기록이 가장 적은 프로필을 고른다 (연속 3회면 돌아간다)', () => {
		expect(makeService([{ profile: 'youtube1' }]).pickProfile()).toBe('youtube2');
		expect(makeService([{ profile: 'youtube1' }, { profile: 'youtube2' }]).pickProfile()).toBe('youtube3');
		expect(makeService([{ profile: 'youtube1' }, { profile: 'youtube2' }, { profile: 'youtube3' }]).pickProfile()).toBe('youtube1');
	});

	it('실패 기록은 세지 않는다', () => {
		expect(makeService([{ profile: 'youtube1', status: 'failed' }]).pickProfile()).toBe('youtube1');
	});

	it('지정한 프로필은 그대로, 모르는 프로필은 400', () => {
		expect(makeService([{ profile: 'youtube3' }]).pickProfile('youtube3')).toBe('youtube3');
		expect(() => makeService([]).pickProfile('nope')).toThrow(httpStatus(400));
	});
});

describe('kstDate', () => {
	it('UTC 자정 직전은 KST로 다음 날', () => {
		expect(kstDate('2026-11-02T15:30:00.000Z')).toBe('2026-11-03');
		expect(kstDate('2026-11-02T14:30:00.000Z')).toBe('2026-11-02');
	});
});
