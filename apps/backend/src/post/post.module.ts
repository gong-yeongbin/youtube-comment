// 게시 모듈 — PosterService(Playwright), PostService(작업·SSE), PostController, ProfilesController
import { Module } from '@nestjs/common';
import { DraftModule } from '../draft/draft.module.js';
import { RulesModule } from '../rules/rules.module.js';
import { PostController } from './post.controller.js';
import { PostService } from './post.service.js';
import { PosterService } from './poster.service.js';
import { ProfilesController } from './profiles.controller.js';

@Module({
	imports: [RulesModule, DraftModule],
	controllers: [PostController, ProfilesController],
	providers: [PosterService, PostService],
})
export class PostModule {}
