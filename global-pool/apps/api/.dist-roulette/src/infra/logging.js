"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerParams = loggerParams;
const node_crypto_1 = require("node:crypto");
const REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;
/** pino-http config: request ids (X-Request-Id in/out), secret redaction, quiet health checks. */
function loggerParams(config) {
    const pretty = config.env.NODE_ENV === 'development' && process.stdout.isTTY;
    return {
        pinoHttp: {
            level: config.env.LOG_LEVEL,
            genReqId: (req, res) => {
                const incoming = req.headers['x-request-id'];
                const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : (0, node_crypto_1.randomUUID)();
                res.setHeader('X-Request-Id', id);
                return id;
            },
            redact: {
                paths: [
                    'req.headers.authorization',
                    'req.headers.cookie',
                    'req.headers["x-step-up-token"]',
                    'res.headers["set-cookie"]',
                ],
                censor: '[redacted]',
            },
            autoLogging: { ignore: (req) => req.url === '/health' },
            customProps: () => ({ service: '@gp/api' }),
            ...(pretty ? { transport: { target: 'pino-pretty', options: { singleLine: true } } } : {}),
        },
    };
}
//# sourceMappingURL=logging.js.map