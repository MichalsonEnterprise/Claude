import 'reflect-metadata';

import { loadEnvFiles } from './config/load-env';

loadEnvFiles();

async function bootstrap(): Promise<void> {
  // Imported after the env files are loaded (modules read process.env at import time).
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module');
  const { configureApp } = await import('./app.setup');
  const { AppConfig } = await import('./config/app-config');

  const app = await NestFactory.create<import('@nestjs/platform-express').NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  configureApp(app);
  const config = app.get(AppConfig);
  await app.listen(config.env.API_PORT, '0.0.0.0');
  const url = await app.getUrl();
  console.info(`GLOBAL POOL API (DEMO / testnet) listening on ${url} — docs at ${url}/docs`);
}

bootstrap().catch((err: unknown) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
