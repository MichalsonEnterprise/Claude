"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisOptionsFromUrl = redisOptionsFromUrl;
/** ioredis options from a redis:// or rediss:// URL (BullMQ needs maxRetriesPerRequest: null for workers). */
function redisOptionsFromUrl(url) {
    const u = new URL(url);
    const db = u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : 0;
    return {
        host: u.hostname,
        port: u.port ? Number(u.port) : 6379,
        username: u.username ? decodeURIComponent(u.username) : undefined,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        db: Number.isInteger(db) ? db : 0,
        ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
        maxRetriesPerRequest: null,
    };
}
//# sourceMappingURL=redis-options.js.map