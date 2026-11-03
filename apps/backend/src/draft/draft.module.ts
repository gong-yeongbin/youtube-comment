// 초안 생성 모듈 — TranscriptService, GeminiService, DraftController
import { Module } from '@nestjs/common';
import { YoutubeModule } from '../youtube/youtube.module.js';
import { DraftController } from './draft.controller.js';
import { GeminiService } from './gemini.service.js';
import { TranscriptService } from './transcript.service.js';

@Module({
	imports: [YoutubeModule],
	controllers: [DraftController],
	providers: [TranscriptService, GeminiService],
	exports: [GeminiService],
})
export class DraftModule {}
