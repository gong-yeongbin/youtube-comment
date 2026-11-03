// GET /api/profiles (프로필 목록 + 오늘 게시 수) + POST /api/profiles/:name/login (크롬을 열어 수동 로그인)
import { BadRequestException, Controller, Get, Param, Post } from '@nestjs/common';
import { RulesService } from '../rules/rules.service.js';
import { PosterService } from './poster.service.js';

@Controller('profiles')
export class ProfilesController {
	constructor(
		private readonly rules: RulesService,
		private readonly poster: PosterService
	) {}

	@Get()
	list() {
		return this.rules.profiles().map((name) => ({ name, todayCount: this.rules.todayCount(name), hasProfileDir: this.poster.hasProfile(name) }));
	}

	@Post(':name/login')
	async login(@Param('name') name: string) {
		if (!this.rules.profiles().includes(name)) throw new BadRequestException(`알 수 없는 프로필입니다: ${name}`);
		await this.poster.openForLogin(name);
		return { opened: true, message: '크롬 창에서 구글 계정으로 로그인한 뒤 창을 닫으세요.' };
	}
}
