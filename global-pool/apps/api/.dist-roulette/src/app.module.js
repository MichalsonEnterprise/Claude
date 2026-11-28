"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const nestjs_pino_1 = require("nestjs-pino");
const nestjs_zod_1 = require("nestjs-zod");
const http_exception_filter_1 = require("./common/http-exception.filter");
const app_config_1 = require("./config/app-config");
const config_module_1 = require("./config/config.module");
const logging_1 = require("./infra/logging");
const prisma_module_1 = require("./infra/prisma/prisma.module");
const queues_module_1 = require("./infra/queues/queues.module");
const redis_module_1 = require("./infra/redis/redis.module");
const admin_module_1 = require("./modules/admin/admin.module");
const admin_ops_module_1 = require("./modules/admin-ops/admin-ops.module");
const affiliates_module_1 = require("./modules/affiliates/affiliates.module");
const aml_module_1 = require("./modules/aml/aml.module");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const blockchain_module_1 = require("./modules/blockchain/blockchain.module");
const compliance_module_1 = require("./modules/compliance/compliance.module");
const deposits_module_1 = require("./modules/deposits/deposits.module");
const email_module_1 = require("./modules/email/email.module");
const feature_flags_module_1 = require("./modules/feature-flags/feature-flags.module");
const games_module_1 = require("./modules/games/games.module");
const health_module_1 = require("./modules/health/health.module");
const history_module_1 = require("./modules/history/history.module");
const idempotency_module_1 = require("./modules/idempotency/idempotency.module");
const kyc_module_1 = require("./modules/kyc/kyc.module");
const ledger_module_1 = require("./modules/ledger/ledger.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const onchain_rounds_module_1 = require("./modules/onchain-rounds/onchain-rounds.module");
const platform_module_1 = require("./modules/platform/platform.module");
const pool_module_1 = require("./modules/pool/pool.module");
const randomness_module_1 = require("./modules/randomness/randomness.module");
const reporting_module_1 = require("./modules/reporting/reporting.module");
const security_module_1 = require("./modules/security/security.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const users_module_1 = require("./modules/users/users.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const withdrawals_module_1 = require("./modules/withdrawals/withdrawals.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            // infrastructure
            config_module_1.ConfigModule,
            nestjs_pino_1.LoggerModule.forRootAsync({ inject: [app_config_1.AppConfig], useFactory: logging_1.loggerParams }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [app_config_1.AppConfig],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            name: 'default',
                            ttl: config.env.THROTTLE_TTL_SECONDS * 1000,
                            limit: config.env.THROTTLE_LIMIT,
                        },
                    ],
                }),
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            queues_module_1.QueuesModule,
            // core (global)
            ledger_module_1.LedgerModule,
            audit_module_1.AuditModule,
            idempotency_module_1.IdempotencyModule,
            feature_flags_module_1.FeatureFlagsModule,
            blockchain_module_1.BlockchainModule,
            email_module_1.EmailModule,
            notifications_module_1.NotificationsModule,
            transactions_module_1.TransactionsModule,
            compliance_module_1.ComplianceModule,
            kyc_module_1.KycModule,
            aml_module_1.AmlModule,
            security_module_1.SecurityModule,
            auth_module_1.AuthModule,
            randomness_module_1.RandomnessModule,
            onchain_rounds_module_1.OnchainRoundsModule,
            reporting_module_1.ReportingModule,
            affiliates_module_1.AffiliatesModule,
            // features
            users_module_1.UsersModule,
            wallet_module_1.WalletModule,
            deposits_module_1.DepositsModule,
            withdrawals_module_1.WithdrawalsModule,
            pool_module_1.PoolModule,
            games_module_1.GamesModule,
            history_module_1.HistoryModule,
            admin_module_1.AdminModule,
            admin_ops_module_1.AdminOpsModule,
            platform_module_1.PlatformModule,
            health_module_1.HealthModule,
        ],
        providers: [
            { provide: core_1.APP_PIPE, useClass: nestjs_zod_1.ZodValidationPipe },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.AllExceptionsFilter },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map