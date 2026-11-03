// PostService 유닛 테스트 — 규칙 위반 400, 중복 409, 성공·실패 로그 기록, 이벤트 중계
import { firstValueFrom, toArray } from 'rxjs';
import type { GeminiService } from '../draft/gemini.service.js';
import type { LogService } from '../log/log.service.js';
import type { RulesService } from '../rules/rules.service.js';
import type { PostEvent } from './post-events.js';
import { PostService } from './post.service.js';
import type { PosterService } from './poster.service.js';

const good = '답장 세 시간 걸리면 하루 망한다는 말 진짜 공감이에요. 운명원 연애사주가 잘 본다던데 나도 보고 싶다';

function setup(events: PostEvent[], opts: { duplicate?: boolean } = {}) {
	const appended: unknown[] = [];
	const rules = {
		assertCanPost: jest.fn(() => {
			if (opts.duplicate) throw Object.assign(new Error('dup'), { status: 409 });
		}),
		pickProfile: jest.fn((p?: string) => p ?? 'youtube1'),
	} as unknown as RulesService;
	const gemini = { rules: () => ({ minChars: 40, maxChars: 120, brand: '운명원' }) } as GeminiService;
	const log = { append: jest.fn((e: unknown) => appended.push(e)) } as unknown as LogService;
	const postMock = jest.fn(function* () {
		for (const e of events) yield e;
	});
	const poster = { post: postMock } as unknown as PosterService;
	return { service: new PostService(rules, gemini, log, poster), appended, postMock };
}

const req = { videoId: 'dQw4w9WgXcQ', videoTitle: '제목', comment: good };

describe('PostService.start', () => {
	it('규칙에 어긋나는 댓글은 400', () => {
		const { service } = setup([]);
		expect(() => service.start({ ...req, comment: '짧음' })).toThrow(expect.objectContaining({ status: 400 }) as Error);
	});

	it('규칙 검사 예외(중복 409)를 그대로 던진다', () => {
		const { service } = setup([], { duplicate: true });
		expect(() => service.start(req)).toThrow(expect.objectContaining({ status: 409 }) as Error);
	});

	it('성공하면 이벤트를 순서대로 중계하고 success 로그를 남긴다', async () => {
		const flow: PostEvent[] = [{ type: 'opening' }, { type: 'typing' }, { type: 'posted' }, { type: 'verified' }];
		const { service, appended, postMock } = setup(flow);
		const { jobId, profile } = service.start({ ...req, profile: 'youtube2' });
		expect(profile).toBe('youtube2');
		const received = await firstValueFrom(service.events(jobId)!.pipe(toArray()));
		expect(received.map((e) => e.type)).toEqual(['opening', 'typing', 'posted', 'verified']);
		expect(appended).toEqual([{ videoId: req.videoId, videoTitle: '제목', profile: 'youtube2', comment: good, status: 'success' }]);
		expect(postMock).toHaveBeenCalledWith(expect.objectContaining({ jobId, videoId: req.videoId, profile: 'youtube2' }));
	});

	it('실패하면 사유·캡처를 failed 로그로 남긴다', async () => {
		const { service, appended } = setup([{ type: 'opening' }, { type: 'failed', reason: 'not_logged_in', message: '로그인 안 됨', screenshot: '/api/screenshots/x.png' }]);
		const { jobId } = service.start(req);
		await firstValueFrom(service.events(jobId)!.pipe(toArray()));
		expect(appended[0]).toMatchObject({ status: 'failed', reason: 'not_logged_in', screenshot: '/api/screenshots/x.png' });
	});

	it('PosterService가 예외를 던지면 browser_error로 끝낸다', async () => {
		const { service, appended } = setup([]);
		(service as unknown as { poster: PosterService }).poster.post = jest.fn(function* (): Generator<PostEvent> {
			yield { type: 'opening' };
			throw new Error('크롬 실행 실패');
		}) as unknown as PosterService['post'];
		const { jobId } = service.start(req);
		const received = await firstValueFrom(service.events(jobId)!.pipe(toArray()));
		expect(received.at(-1)).toMatchObject({ type: 'failed', reason: 'browser_error', message: '크롬 실행 실패' });
		expect(appended[0]).toMatchObject({ status: 'failed', reason: 'browser_error' });
	});

	it('진행 중이면 두 번째 요청은 409', async () => {
		const { service } = setup([{ type: 'opening' }, { type: 'verified' }]);
		const { jobId } = service.start(req);
		expect(() => service.start({ ...req, videoId: 'bbbbbbbbbbb' })).toThrow(expect.objectContaining({ status: 409 }) as Error);
		await firstValueFrom(service.events(jobId)!.pipe(toArray()));
	});

	it('모르는 jobId는 undefined', () => {
		expect(setup([]).service.events('nope')).toBeUndefined();
	});
});
