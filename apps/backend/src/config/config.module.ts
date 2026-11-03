// config.yaml과 .env를 전역 ConfigService로 노출하는 모듈
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { loadAppConfig } from './app-config.js';

@Module({
	imports: [NestConfigModule.forRoot({ isGlobal: true, load: [loadAppConfig] })],
})
export class ConfigModule {}
