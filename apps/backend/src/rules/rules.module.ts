// RulesService 모듈 — LogModule이 전역이라 별도 import 없이 LogService를 주입받는다
import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller.js';
import { RulesService } from './rules.service.js';

@Module({
	controllers: [RulesController],
	providers: [RulesService],
	exports: [RulesService],
})
export class RulesModule {}
