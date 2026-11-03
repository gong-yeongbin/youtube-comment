// 영상 검색(GET /api/videos)과 링크 직접 입력(POST /api/videos/resolve) 컨트롤러
import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extractVideoId } from './video-id.js';
import { YoutubeService } from './youtube.service.js';

@Controller('videos')
export class VideosController {
	constructor(
		private readonly youtube: YoutubeService,
		private readonly config: ConfigService
	) {}

	@Get()
	search(@Query('q') q?: string) {
		const query = q?.trim() || this.config.getOrThrow<string>('search.query');
		return this.youtube.search(query);
	}

	@Post('resolve')
	async resolve(@Body() body: { url?: string }) {
		const videoId = extractVideoId(body?.url ?? '');
		if (!videoId) throw new BadRequestException('유튜브 영상 링크가 아닙니다.');
		const [video] = await this.youtube.videos([videoId]);
		if (!video) throw new NotFoundException('영상을 찾을 수 없습니다. 비공개이거나 삭제된 영상일 수 있습니다.');
		return video;
	}
}
