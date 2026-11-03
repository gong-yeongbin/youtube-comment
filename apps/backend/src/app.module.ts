// 루트 모듈 — 기능 모듈(youtube, draft, log, rules, post)을 여기에 등록한다
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';

@Module({
	controllers: [AppController],
})
export class AppModule {}
