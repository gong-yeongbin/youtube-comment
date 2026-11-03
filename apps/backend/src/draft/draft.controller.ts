// POST /api/draft — 영상 정보·자막·인기 댓글을 모아 Gemini 초안을 만든다
import { BadRequestException, Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { extractVideoId } from '../youtube/video-id.js';
import { YoutubeService } from '../youtube/youtube.service.js';
import { GeminiService } from './gemini.service.js';
import { TranscriptService } from './transcript.service.js';

@Controller('draft')
export class DraftController {
	constructor(
		private readonly youtube: YoutubeService,
		private readonly transcript: TranscriptService,
		private readonly gemini: GeminiService
	) {}

	@Post()
	async create(@Body() body: { videoId?: string }) {
		const videoId = extractVideoId(body?.videoId ?? '');
		if (!videoId) throw new BadRequestException('videoId가 필요합니다.');

		const [video] = await this.youtube.videos([videoId]);
		if (!video) throw new NotFoundException('영상을 찾을 수 없습니다.');

		const [transcript, comments] = await Promise.all([this.transcript.fetch(videoId), this.youtube.comments(videoId)]);
		const result = await this.gemini.draft({ title: video.title, description: video.description, transcript: transcript?.text ?? null, comments });

		return { videoId, ...result, hasTranscript: transcript !== null, transcriptLang: transcript?.lang ?? null, rules: this.gemini.rules() };
	}
}
