// 서버 생존 확인용 GET /api 컨트롤러
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
	@Get()
	health() {
		return { ok: true };
	}
}
