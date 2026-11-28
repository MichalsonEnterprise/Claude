"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReqMeta = exports.CurrentAdmin = exports.CurrentUser = void 0;
exports.requestIdOf = requestIdOf;
exports.paramOf = paramOf;
exports.deviceLabel = deviceLabel;
const common_1 = require("@nestjs/common");
/** pino-http request id (string). */
function requestIdOf(req) {
    const id = req.id;
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}
/** First value of a route param (Express 5 types allow string[]). */
function paramOf(req, name) {
    const v = req.params?.[name];
    return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : null;
}
exports.CurrentUser = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user)
        throw new Error('CurrentUser used on a route without PrivyAuthGuard');
    return req.user;
});
exports.CurrentAdmin = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.admin)
        throw new Error('CurrentAdmin used on a route without AdminAuthGuard');
    return req.admin;
});
exports.ReqMeta = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
        requestId: requestIdOf(req),
    };
});
/** Short device label from a user agent ("Chrome · macOS"). */
function deviceLabel(userAgent) {
    if (!userAgent)
        return 'Unknown device';
    const ua = userAgent;
    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Firefox\//.test(ua)
                ? 'Firefox'
                : /Safari\//.test(ua)
                    ? 'Safari'
                    : /curl|node|undici|supertest|axios/i.test(ua)
                        ? 'API client'
                        : 'Browser';
    const os = /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Android/.test(ua)
            ? 'Android'
            : /Mac OS X|Macintosh/.test(ua)
                ? 'macOS'
                : /Windows/.test(ua)
                    ? 'Windows'
                    : /Linux/.test(ua)
                        ? 'Linux'
                        : null;
    return os ? `${browser} · ${os}` : browser;
}
//# sourceMappingURL=request.js.map