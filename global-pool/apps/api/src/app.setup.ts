import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppConfig } from './config/app-config';
import { GpIoAdapter } from './infra/socket-io.adapter';

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('GLOBAL POOL API — DEMO / testnet')
    .setDescription(
      [
        'Hybrid-custody platform API. **DEMO / testnet only** (Arbitrum Sepolia 421614); real money is disabled.',
        '',
        '- Player auth: Privy access token (or the DEV MOCK token from `POST /auth/dev/token`) as `Authorization: Bearer`.',
        '- Admin auth: `POST /admin/auth/login` (email + password + TOTP) → admin bearer token.',
        '- Errors always use the shared envelope `{ "error": { code, message, statusCode, requestId, issues?, details? } }`.',
        '- Money is a decimal string with up to 6 decimals (USDT). Balances are computed from the append-only ledger.',
        '- There is NO endpoint that sets results, chooses winners, moves funds arbitrarily or edits ledger rows.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Privy / DEV MOCK token',
      },
      'player',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Admin access token' },
      'admin',
    )
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

/** HTTP hardening + docs shared by main.ts and the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfig);
  app.useLogger(app.get(Logger));
  app.set('trust proxy', config.env.TRUST_PROXY ? 1 : false);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // Swagger UI needs inline styles; scripts are served from /docs as files.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...config.env.CORS_ORIGINS],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.enableCors({
    origin: config.env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-Id',
      'X-Step-Up-Token',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });
  app.useBodyParser('json', { limit: '256kb' });
  app.useWebSocketAdapter(new GpIoAdapter(app, config.env.CORS_ORIGINS));
  SwaggerModule.setup('docs', app, () => buildOpenApi(app), {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'GLOBAL POOL API (DEMO)',
  });
  app.enableShutdownHooks();
}
