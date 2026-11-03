// YoutubeService와 VideosController를 묶는 모듈 (draft 단계에서도 YoutubeService를 쓴다)
import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller.js';
import { YoutubeService } from './youtube.service.js';

@Module({
	controllers: [VideosController],
	providers: [YoutubeService],
	exports: [YoutubeService],
})
export class YoutubeModule {}
