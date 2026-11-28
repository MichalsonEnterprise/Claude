"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOpenApi = buildOpenApi;
exports.configureApp = configureApp;
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const nestjs_pino_1 = require("nestjs-pino");
const nestjs_zod_1 = require("nestjs-zod");
const app_config_1 = require("./config/app-config");
const response_schemas_1 = require("./infra/openapi/response-schemas");
const socket_io_adapter_1 = require("./infra/socket-io.adapter");
function buildOpenApi(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('GLOBAL POOL API — DEMO / testnet')
        .setDescription([
        'Hybrid-custody platform API. **DEMO / testnet only** (Arbitrum Sepolia 421614); real money is disabled.',
        '',
        '- Player auth: Privy access token (or the DEV MOCK token from `POST /auth/dev/token`) as `Authorization: Bearer`.',
        '- Admin auth: `POST /admin/auth/login` (email + password + TOTP) → admin bearer token.',
        '- Errors always use the shared envelope `{ "error": { code, message, statusCode, requestId, issues?, details? } }`.',
        '- Money is a decimal string with up to 6 decimals (USDT). Balances are computed from the append-only ledger.',
        '- There is NO endpoint that sets results, chooses winners, moves funds arbitrarily or edits ledger rows.',
    ].join('\n'))
        .setVersion('0.1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Privy / DEV MOCK token',
    }, 'player')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Admin access token' }, 'admin')
        .build();
    return (0, response_schemas_1.applyResponseSchemas)((0, nestjs_zod_1.cleanupOpenApiDoc)(swagger_1.SwaggerModule.createDocument(app, config)));
}
/** HTTP hardening + docs shared by main.ts and the e2e tests. */
function configureApp(app) {
    const config = app.get(app_config_1.AppConfig);
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.set('trust proxy', config.env.TRUST_PROXY ? 1 : false);
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)({
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
    }));
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
    app.useWebSocketAdapter(new socket_io_adapter_1.GpIoAdapter(app, config.env.CORS_ORIGINS, {
        redisUrl: config.env.SOCKET_IO_REDIS_ADAPTER ? config.env.REDIS_URL : null,
        keyPrefix: config.env.BULLMQ_PREFIX,
    }));
    swagger_1.SwaggerModule.setup('docs', app, () => buildOpenApi(app), {
        jsonDocumentUrl: 'docs-json',
        customSiteTitle: 'GLOBAL POOL API (DEMO)',
    });
    app.enableShutdownHooks();
}
//# sourceMappingURL=app.setup.js.map