import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfig } from './config/app-config';
import { loadEnvFiles } from './config/load-env';

async function bootstrap(): Promise<void> {
  // Env files are read before Nest builds the DI graph (nothing reads process.env at import time).
  loadEnvFiles();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configureApp(app);
  const config = app.get(AppConfig);
  await app.listen(config.env.API_PORT, '0.0.0.0');
  const url = (await app.getUrl()).replace('[::1]', 'localhost').replace('0.0.0.0', 'localhost');
  console.info(`GLOBAL POOL API (DEMO / testnet) listening on ${url} — docs at ${url}/docs`);
}

bootstrap().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
