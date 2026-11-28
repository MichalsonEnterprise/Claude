"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GpIoAdapter = void 0;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = require("ioredis");
const redis_options_1 = require("./redis/redis-options");
/**
 * socket.io adapter with CORS from CORS_ORIGINS (decorator options are evaluated before env files load) and an
 * optional Redis adapter for multi-replica deployments.
 */
class GpIoAdapter extends platform_socket_io_1.IoAdapter {
    origins;
    options;
    redisClients = [];
    constructor(app, origins, options = {}) {
        super(app);
        this.origins = origins;
        this.options = options;
    }
    /** True when broadcasts are shared through Redis. */
    get usesRedis() {
        return Boolean(this.options.redisUrl);
    }
    createIOServer(port, options) {
        const server = super.createIOServer(port, {
            ...options,
            cors: { origin: this.origins, credentials: true },
            serveClient: false,
        });
        if (this.options.redisUrl) {
            const pub = new ioredis_1.Redis({ ...(0, redis_options_1.redisOptionsFromUrl)(this.options.redisUrl), lazyConnect: false });
            const sub = pub.duplicate();
            this.redisClients.push(pub, sub);
            server.adapter((0, redis_adapter_1.createAdapter)(pub, sub, { key: `${this.options.keyPrefix ?? 'gp'}:socket.io` }));
        }
        return server;
    }
    async close(server) {
        await super.close(server);
        await Promise.all(this.redisClients.splice(0).map((c) => c.quit().catch(() => undefined)));
    }
}
exports.GpIoAdapter = GpIoAdapter;
//# sourceMappingURL=socket-io.adapter.js.map