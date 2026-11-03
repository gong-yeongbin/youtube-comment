// YouTube Data API v3 호출 — 연애 키워드 최신순 검색과 영상 상세 보강
import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Video {
	videoId: string;
	url: string;
	title: string;
	channelTitle: string;
	publishedAt: string;
	thumbnail: string;
	viewCount: number;
	description: string;
	alreadyCommented: boolean;
}

interface SearchItem {
	id: { videoId?: string };
}

interface VideoItem {
	id: string;
	snippet: { title: string; channelTitle: string; publishedAt: string; description: string; thumbnails: Record<string, { url: string }> };
	statistics?: { viewCount?: string };
}

interface ApiError {
	error?: { code?: number; message?: string; errors?: { reason?: string }[] };
}

const BASE = 'https://www.googleapis.com/youtube/v3';

@Injectable()
export class YoutubeService {
	private readonly logger = new Logger(YoutubeService.name);

	constructor(private readonly config: ConfigService) {}

	async search(query: string): Promise<Video[]> {
		const max = this.config.getOrThrow<number>('search.max_results');
		const data = await this.get<{ items: SearchItem[] }>('search', {
			part: 'snippet',
			type: 'video',
			order: 'date',
			regionCode: 'KR',
			relevanceLanguage: 'ko',
			maxResults: String(max),
			q: query,
		});
		const ids = data.items.map((item) => item.id.videoId).filter((id): id is string => !!id);
		return this.videos(ids);
	}

	async videos(ids: string[]): Promise<Video[]> {
		if (ids.length === 0) return [];
		const data = await this.get<{ items: VideoItem[] }>('videos', { part: 'snippet,statistics', id: ids.join(',') });
		return data.items.map((item) => ({
			videoId: item.id,
			url: `https://www.youtube.com/watch?v=${item.id}`,
			title: item.snippet.title,
			channelTitle: item.snippet.channelTitle,
			publishedAt: item.snippet.publishedAt,
			thumbnail: (item.snippet.thumbnails.medium ?? item.snippet.thumbnails.default)?.url ?? '',
			viewCount: Number(item.statistics?.viewCount ?? 0),
			description: item.snippet.description,
			alreadyCommented: false,
		}));
	}

	private async get<T>(resource: string, params: Record<string, string>): Promise<T> {
		const key = this.config.get<string>('YOUTUBE_API_KEY');
		if (!key) throw new ServiceUnavailableException('YOUTUBE_API_KEY가 설정되지 않았습니다. apps/backend/.env를 확인하세요.');

		const url = new URL(`${BASE}/${resource}`);
		for (const [name, value] of Object.entries({ ...params, key })) url.searchParams.set(name, value);

		const res = await fetch(url);
		if (res.ok) return (await res.json()) as T;

		const body = (await res.json().catch(() => ({}))) as ApiError;
		const reason = body.error?.errors?.[0]?.reason ?? '';
		this.logger.warn(`YouTube ${resource} ${res.status} ${reason}: ${body.error?.message ?? ''}`);
		if (reason === 'quotaExceeded') throw new HttpException('오늘 YouTube API 할당량을 다 썼습니다. 내일 다시 시도하세요.', 429);
		if (res.status === 400 || res.status === 403) throw new HttpException(`YouTube API 키 오류 (${reason || res.status}). .env의 YOUTUBE_API_KEY를 확인하세요.`, 502);
		throw new HttpException(`YouTube API 오류 (${res.status})`, 502);
	}
}
