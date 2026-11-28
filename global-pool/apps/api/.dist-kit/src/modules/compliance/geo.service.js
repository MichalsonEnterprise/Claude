"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoService = void 0;
const common_1 = require("@nestjs/common");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** Display names for the most common codes (UI copy; unknown codes fall back to the code). */
const COUNTRY_NAMES = {
    PT: 'Portugal',
    US: 'United States',
    ES: 'Spain',
    DE: 'Germany',
    FR: 'France',
    GB: 'United Kingdom',
    CU: 'Cuba',
    IR: 'Iran',
    KP: 'North Korea',
    SY: 'Syria',
};
/**
 * Geo-restriction from `geo_rules` (DB, explicit allow/block per country) + RESTRICTED_COUNTRIES (env placeholder
 * list — the real list is a legal decision). Request country comes from the CDN header (GEO_COUNTRY_HEADER, only
 * trusted with TRUST_PROXY=true) or DEV_COUNTRY_OVERRIDE outside production.
 */
let GeoService = class GeoService {
    prisma;
    config;
    cache = null;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    countryName(code) {
        return code ? (COUNTRY_NAMES[code] ?? code) : null;
    }
    requestCountry(req) {
        const { TRUST_PROXY, GEO_COUNTRY_HEADER, DEV_COUNTRY_OVERRIDE } = this.config.env;
        if (TRUST_PROXY) {
            const raw = req.get(GEO_COUNTRY_HEADER);
            if (raw && /^[A-Za-z]{2}$/.test(raw.trim()) && raw.trim().toUpperCase() !== 'XX') {
                return { country: raw.trim().toUpperCase(), source: 'header' };
            }
        }
        if (!this.config.isProduction && DEV_COUNTRY_OVERRIDE) {
            return { country: DEV_COUNTRY_OVERRIDE, source: 'dev_override' };
        }
        return { country: null, source: 'unknown' };
    }
    async isPermitted(country) {
        const rules = await this.rules();
        const rule = rules.get(country.toUpperCase());
        if (rule)
            return rule === 'allowed';
        return !this.config.env.RESTRICTED_COUNTRIES.includes(country.toUpperCase());
    }
    async checkRequest(req) {
        const { country, source } = this.requestCountry(req);
        if (!country) {
            return { country: null, countryName: null, permitted: !this.config.isProduction, source };
        }
        return {
            country,
            countryName: this.countryName(country),
            permitted: await this.isPermitted(country),
            source,
        };
    }
    /**
     * Gaming / financial actions: both the request location and the declared country must be permitted.
     * Fails closed in production when the location cannot be determined.
     */
    async assertPermitted(req, declaredCountry) {
        const check = await this.checkRequest(req);
        if (!check.permitted) {
            throw new errors_1.AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your region', {
                country: check.country,
            });
        }
        if (declaredCountry && !(await this.isPermitted(declaredCountry))) {
            throw new errors_1.AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your country of residence', {
                country: declaredCountry,
            });
        }
    }
    invalidate() {
        this.cache = null;
    }
    async rules() {
        if (this.cache && Date.now() - this.cache.at < 60_000)
            return this.cache.rules;
        const rows = await this.prisma.geoRule.findMany({
            select: { countryCode: true, status: true },
        });
        const rules = new Map(rows.map((r) => [r.countryCode.toUpperCase(), r.status]));
        this.cache = { at: Date.now(), rules };
        return rules;
    }
};
exports.GeoService = GeoService;
exports.GeoService = GeoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], GeoService);
//# sourceMappingURL=geo.service.js.map