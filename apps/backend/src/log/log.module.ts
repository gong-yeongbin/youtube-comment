// LogService를 전역으로 제공하는 모듈 (rules, post, youtube에서 쓴다)
import { Global, Module } from '@nestjs/common';
import { LogController } from './log.controller.js';
import { DEFAULT_LOG_PATH, LOG_PATH, LogService } from './log.service.js';

@Global()
@Module({
	controllers: [LogController],
	providers: [{ provide: LOG_PATH, useValue: DEFAULT_LOG_PATH }, LogService],
	exports: [LogService],
})
export class LogModule {}
