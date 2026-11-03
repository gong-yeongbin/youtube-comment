// 게시 작업 관리 — 규칙·검증 통과 시 작업을 만들고, PosterService 진행 이벤트를 ReplaySubject로 중계하며 결과를 log.json에 남긴다
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { Observable, ReplaySubject } from 'rxjs';
import { validateComment } from '../draft/comment-rules.js';
import { GeminiService } from '../draft/gemini.service.js';
import { LogService } from '../log/log.service.js';
import { RulesService } from '../rules/rules.service.js';
import { type PostEvent, TERMINAL_TYPES } from './post-events.js';
import { PosterService } from './poster.service.js';

export interface PostRequest {
	videoId: string;
	videoTitle?: string;
	comment: string;
	profile?: string;
}

@Injectable()
export class PostService {
	private readonly logger = new Logger(PostService.name);
	private readonly jobs = new Map<string, ReplaySubject<PostEvent>>();
	private running = false;

	constructor(
		private readonly rules: RulesService,
		private readonly gemini: GeminiService,
		private readonly log: LogService,
		private readonly poster: PosterService
	) {}

	/** 규칙 검사 후 작업을 시작하고 jobId를 돌려준다. 실제 게시는 비동기로 진행된다 */
	start(req: PostRequest): { jobId: string; profile: string } {
		const comment = req.comment?.trim() ?? '';
		const violations = validateComment(comment, this.gemini.rules());
		if (violations.length) throw new BadRequestException(`댓글이 규칙에 어긋납니다: ${violations.join(', ')}`);
		if (this.running) throw new ConflictException('이미 진행 중인 게시 작업이 있습니다. 끝난 뒤 다시 시도하세요.');
		this.rules.assertCanPost(req.videoId);
		const profile = this.rules.pickProfile(req.profile);

		const jobId = crypto.randomUUID();
		const events = new ReplaySubject<PostEvent>();
		this.jobs.set(jobId, events);
		this.running = true;

		void this.run(jobId, { ...req, comment, profile }, events);
		return { jobId, profile };
	}

	events(jobId: string): Observable<PostEvent> | undefined {
		return this.jobs.get(jobId)?.asObservable();
	}

	private async run(jobId: string, req: PostRequest & { profile: string }, events: ReplaySubject<PostEvent>) {
		let last: PostEvent | undefined;
		try {
			for await (const event of this.poster.post({ jobId, videoId: req.videoId, comment: req.comment, profile: req.profile })) {
				last = event;
				events.next(event);
				if (TERMINAL_TYPES.has(event.type)) break;
			}
		} catch (error) {
			this.logger.error(`게시 작업 ${jobId} 예외: ${(error as Error).stack ?? String(error)}`);
			last = { type: 'failed', reason: 'browser_error', message: (error as Error).message };
			events.next(last);
		} finally {
			this.running = false;
		}

		const base = { videoId: req.videoId, videoTitle: req.videoTitle ?? '', profile: req.profile, comment: req.comment };
		if (last?.type === 'verified') this.log.append({ ...base, status: 'success' });
		else if (last?.type === 'failed') this.log.append({ ...base, status: 'failed', reason: last.reason, screenshot: last.screenshot });
		else this.log.append({ ...base, status: 'failed', reason: 'browser_error' });

		events.complete();
		setTimeout(() => this.jobs.delete(jobId), 5 * 60 * 1000).unref();
	}
}
