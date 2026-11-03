// GET /api/log — 게시 기록 전체를 시간순으로 돌려준다
import { Controller, Get } from '@nestjs/common';
import { LogService } from './log.service.js';

@Controller('log')
export class LogController {
	constructor(private readonly log: LogService) {}

	@Get()
	list() {
		return this.log.readAll();
	}
}
