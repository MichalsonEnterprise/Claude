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
import { QueuesModule } from './infra/queues/queues.module';
import { RedisModule } from './infra/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdminOpsModule } from './modules/admin-ops/admin-ops.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';
import { AmlModule } from './modules/aml/aml.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { GamesModule } from './modules/games/games.module';
import { HealthModule } from './modules/health/health.module';
import { HistoryModule } from './modules/history/history.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { KycModule } from './modules/kyc/kyc.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnchainRoundsModule } from './modules/onchain-rounds/onchain-rounds.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PoolModule } from './modules/pool/pool.module';
import { RandomnessModule } from './modules/randomness/randomness.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SecurityModule } from './modules/security/security.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';

@Module({
  imports: [
    // infrastructure
    ConfigModule,
    LoggerModule.forRootAsync({ inject: [AppConfig], useFactory: loggerParams }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.env.THROTTLE_TTL_SECONDS * 1000,
            limit: config.env.THROTTLE_LIMIT,
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    QueuesModule,
    // core (global)
    LedgerModule,
    AuditModule,
    IdempotencyModule,
    FeatureFlagsModule,
    BlockchainModule,
    NotificationsModule,
    TransactionsModule,
    ComplianceModule,
    KycModule,
    AmlModule,
    SecurityModule,
    AuthModule,
    RandomnessModule,
    OnchainRoundsModule,
    ReportingModule,
    AffiliatesModule,
    // features
    UsersModule,
    WalletModule,
    DepositsModule,
    WithdrawalsModule,
    PoolModule,
    GamesModule,
    HistoryModule,
    AdminModule,
    AdminOpsModule,
    PlatformModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
