// RulesService 모듈 — LogModule이 전역이라 별도 import 없이 LogService를 주입받는다
import { Module } from '@nestjs/common';
import { RulesService } from './rules.service.js';

@Module({
	providers: [RulesService],
	exports: [RulesService],
})
export class RulesModule {}
