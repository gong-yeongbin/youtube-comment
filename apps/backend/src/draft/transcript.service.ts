// 유튜브 자막을 비공식 라이브러리로 가져온다 — ko → en 순으로 시도하고 실패하면 null
import { Injectable, Logger } from '@nestjs/common';
import { fetchTranscript } from 'youtube-transcript-plus';

export const TRANSCRIPT_MAX_CHARS = 4000;

// 라이브러리 d.ts가 type:module인데 확장자 없는 './types' import를 써서 반환 타입이 any로 풀린다. 필요한 형태만 직접 지정한다.
const fetchSegments = fetchTranscript as unknown as (videoId: string, config: { lang: string }) => Promise<{ text: string }[]>;

@Injectable()
export class TranscriptService {
	private readonly logger = new Logger(TranscriptService.name);

	async fetch(videoId: string): Promise<{ lang: string; text: string } | null> {
		for (const lang of ['ko', 'en']) {
			try {
				const segments = await fetchSegments(videoId, { lang });
				const text = segments
					.map((s) => s.text)
					.join(' ')
					.replace(/\s+/g, ' ')
					.trim();
				if (text) return { lang, text: text.slice(0, TRANSCRIPT_MAX_CHARS) };
			} catch (error) {
				this.logger.debug(`transcript ${videoId} ${lang}: ${(error as Error).message}`);
			}
		}
		return null;
	}
}
