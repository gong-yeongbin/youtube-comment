// 운영 규칙 — 영상당 댓글 1개, 하루(KST) 상한, 프로필 라운드로빈 배정. log.json의 성공 기록이 근거다
import { BadRequestException, ConflictException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type LogEntry, LogService } from '../log/log.service.js';

export function kstDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

@Injectable()
export class RulesService {
	constructor(
		private readonly config: ConfigService,
		private readonly log: LogService
	) {}

	profiles(): string[] {
		return this.config.getOrThrow<string[]>('profiles');
	}

	commentedVideoIds(): Set<string> {
		return new Set(this.successes().map((e) => e.videoId));
	}

	todayCount(profile?: string): number {
		const today = kstDate(new Date().toISOString());
		return this.successes().filter((e) => kstDate(e.at) === today && (!profile || e.profile === profile)).length;
	}

	/** 게시 전 규칙 검사. 위반이면 예외를 던진다 */
	assertCanPost(videoId: string): void {
		if (this.commentedVideoIds().has(videoId)) throw new ConflictException('이미 댓글을 단 영상입니다. 영상당 댓글은 1개만 답니다.');
		const max = this.config.getOrThrow<number>('limits.daily_max_comments');
		const count = this.todayCount();
		if (count >= max) throw new HttpException(`오늘 게시 상한(${max}개)에 도달했습니다. 내일 다시 시도하세요.`, 429);
	}

	/** 요청 프로필이 있으면 그대로, 없으면 성공 기록이 가장 적은 프로필(동률이면 설정 순서) */
	pickProfile(requested?: string): string {
		const profiles = this.profiles();
		if (requested) {
			if (!profiles.includes(requested)) throw new BadRequestException(`알 수 없는 프로필입니다: ${requested}`);
			return requested;
		}
		const counts = new Map(profiles.map((p) => [p, 0]));
		for (const e of this.successes()) if (counts.has(e.profile)) counts.set(e.profile, counts.get(e.profile)! + 1);
		return profiles.reduce((best, p) => (counts.get(p)! < counts.get(best)! ? p : best), profiles[0]!);
	}

	private successes(): LogEntry[] {
		return this.log.readAll().filter((e) => e.status === 'success');
	}
}
