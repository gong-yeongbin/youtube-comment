// GET /api/today — 오늘(KST) 게시 성공 수와 상한. 상단 배지용
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RulesService } from './rules.service.js';

@Controller('today')
export class RulesController {
	constructor(
		private readonly rules: RulesService,
		private readonly config: ConfigService
	) {}

	@Get()
	today() {
		return { count: this.rules.todayCount(), max: this.config.getOrThrow<number>('limits.daily_max_comments') };
	}
}
