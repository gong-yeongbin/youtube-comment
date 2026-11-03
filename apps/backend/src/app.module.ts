// 루트 모듈 — 기능 모듈(youtube, draft, log, rules, post)을 여기에 등록한다
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ConfigModule } from './config/config.module.js';
import { DraftModule } from './draft/draft.module.js';
import { LogModule } from './log/log.module.js';
import { RulesModule } from './rules/rules.module.js';
import { YoutubeModule } from './youtube/youtube.module.js';

@Module({
	imports: [ConfigModule, LogModule, RulesModule, YoutubeModule, DraftModule],
	controllers: [AppController],
})
export class AppModule {}
