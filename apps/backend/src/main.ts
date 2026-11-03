// NestJS 백엔드 진입점 — /api 프리픽스로 3001 포트에서 대기한다
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api');
	await app.listen(3001);
	console.log('backend: http://localhost:3001/api');
}

void bootstrap();
