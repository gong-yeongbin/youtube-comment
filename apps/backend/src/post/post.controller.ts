// POST /api/post (작업 생성) + GET /api/post/:jobId/events (SSE 진행 이벤트) + GET /api/screenshots/:file (실패 캡처)
import { BadRequestException, Controller, Get, NotFoundException, Param, Post, Body, Sse, StreamableFile, type MessageEvent } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { map, type Observable } from 'rxjs';
import { extractVideoId } from '../youtube/video-id.js';
import { type PostRequest, PostService } from './post.service.js';
import { SCREENSHOT_DIR } from './poster.service.js';

@Controller()
export class PostController {
	constructor(private readonly posts: PostService) {}

	@Post('post')
	start(@Body() body: PostRequest) {
		const videoId = extractVideoId(body?.videoId ?? '');
		if (!videoId) throw new BadRequestException('videoId가 필요합니다.');
		if (!body.comment?.trim()) throw new BadRequestException('댓글 내용이 비어 있습니다.');
		return this.posts.start({ ...body, videoId });
	}

	@Sse('post/:jobId/events')
	events(@Param('jobId') jobId: string): Observable<MessageEvent> {
		const stream = this.posts.events(jobId);
		if (!stream) throw new NotFoundException('작업을 찾을 수 없습니다.');
		return stream.pipe(map((event) => ({ data: event })));
	}

	@Get('screenshots/:file')
	screenshot(@Param('file') file: string) {
		const path = join(SCREENSHOT_DIR, basename(file));
		if (!path.endsWith('.png') || !existsSync(path)) throw new NotFoundException('캡처 파일이 없습니다.');
		return new StreamableFile(createReadStream(path), { type: 'image/png' });
	}
}
