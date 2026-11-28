"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomToken = exports.sha256Hex = void 0;
exports.safeEqual = safeEqual;
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.canonicalJson = canonicalJson;
const node_crypto_1 = require("node:crypto");
const sha256Hex = (data) => (0, node_crypto_1.createHash)('sha256').update(data).digest('hex');
exports.sha256Hex = sha256Hex;
/** URL-safe random token (refresh tokens, mock session ids). */
const randomToken = (bytes = 32) => (0, node_crypto_1.randomBytes)(bytes).toString('base64url');
exports.randomToken = randomToken;
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && (0, node_crypto_1.timingSafeEqual)(ab, bb);
}
/** AES-256-GCM encryption for secrets at rest (TOTP seeds). Format: v1.<iv>.<tag>.<ciphertext> (base64url). */
function encryptSecret(plain, key) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}
function decryptSecret(payload, key) {
    const [v, iv, tag, ct] = payload.split('.');
    if (v !== 'v1' || !iv || !tag || !ct)
        throw new Error('Unsupported secret format');
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}
/**
 * Deterministic JSON (sorted keys, Dates as ISO strings, bigints as strings, undefined dropped). Used for audit
 * hashes and idempotency request fingerprints, so it must never change shape.
 */
function canonicalJson(value) {
    return JSON.stringify(normalize(value));
}
function normalize(value) {
    if (value === null || value === undefined)
        return null;
    if (value instanceof Date)
        return value.toISOString();
    if (typeof value === 'bigint')
        return value.toString();
    if (Array.isArray(value))
        return value.map(normalize);
    if (typeof value === 'object') {
        if (typeof value.toFixed === 'function' && 'd' in value) {
            return value.toFixed(); // Prisma.Decimal
        }
        const out = {};
        for (const key of Object.keys(value).sort()) {
            const v = value[key];
            if (v !== undefined)
                out[key] = normalize(v);
        }
        return out;
    }
    return value;
}
//# sourceMappingURL=crypto.js.map