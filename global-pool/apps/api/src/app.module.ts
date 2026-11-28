import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';

import { AllExceptionsFilter } from './common/http-exception.filter';
import { AppConfig } from './config/app-config';
import { ConfigModule } from './config/config.module';
import { loggerParams } from './infra/logging';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { HealthModule } from './modules/health/health.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SecurityModule } from './modules/security/security.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({ inject: [AppConfig], useFactory: loggerParams }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: config.env.THROTTLE_TTL_SECONDS * 1000, limit: config.env.THROTTLE_LIMIT }],
      }),
    }),
    PrismaModule,
    RedisModule,
    LedgerModule,
    AuditModule,
    IdempotencyModule,
    ComplianceModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
