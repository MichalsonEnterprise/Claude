import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AppError } from '../../common/errors';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Display names for the most common codes (UI copy; unknown codes fall back to the code). */
const COUNTRY_NAMES: Record<string, string> = {
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

let displayNames: Intl.DisplayNames | null = null;

/** English display name of an ISO 3166-1 alpha-2 code (Intl, full ICU in Node); null when unknown. */
function intlCountryName(code: string): string | null {
  try {
    displayNames ??= new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    return displayNames.of(code) ?? null;
  } catch {
    return null;
  }
}

/**
 * DEV ONLY (NODE_ENV=development, never test or production): per-request country override for QA of the geo gate —
 * header `X-GP-Dev-Country: US` or query `?devCountry=US`. It beats the CDN header and DEV_COUNTRY_OVERRIDE so a
 * developer can preview a restricted visitor; a non-development API ignores both completely.
 */
export const DEV_COUNTRY_HEADER = 'x-gp-dev-country';
export const DEV_COUNTRY_QUERY = 'devCountry';

const COUNTRY_CODE = /^[A-Za-z]{2}$/;

function devRequestCountry(req: Request): string | null {
  const header = typeof req.get === 'function' ? req.get(DEV_COUNTRY_HEADER) : undefined;
  const query: unknown = (req as { query?: Record<string, unknown> }).query?.[DEV_COUNTRY_QUERY];
  const raw = (header ?? (typeof query === 'string' ? query : '')).trim();
  return COUNTRY_CODE.test(raw) && raw.toUpperCase() !== 'XX' ? raw.toUpperCase() : null;
}

/** PUB-21 / ERR-05 geo decision for the web gate (`GET /compliance/geo`). The API enforces the same answer. */
export interface GeoDecision extends RegionCheck {
  decision: 'permitted' | 'restricted';
  /** Optional declared country (`?declared=PT`, e.g. the age gate's jurisdiction select) and whether it's permitted. */
  declared: { code: string; name: string | null; permitted: boolean } | null;
  minAge: number;
  checkedAt: string;
  /** The location came from a DEV override (DEMO data), not from a real CDN header. */
  isDemo: boolean;
  /** What a restricted visitor can still do — never a workaround. */
  stillAvailable: readonly (
    'sign_in' | 'withdraw' | 'history' | 'responsible_gaming' | 'support' | 'licence_info'
  )[];
  /** What is paused for a restricted visitor (server-enforced on every route). */
  paused: readonly ('games' | 'pool_entries' | 'deposits' | 'promotions')[];
}

export interface RegionCheck {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
  source: 'header' | 'dev_override' | 'declared' | 'unknown';
}

/**
 * Geo-restriction from `geo_rules` (DB, explicit allow/block per country) + RESTRICTED_COUNTRIES (env placeholder
 * list — the real list is a legal decision). Request country comes from the CDN header (GEO_COUNTRY_HEADER, only
 * trusted with TRUST_PROXY=true), the DEV per-request override (development only) or DEV_COUNTRY_OVERRIDE outside
 * production.
 */
@Injectable()
export class GeoService {
  private cache: { at: number; rules: Map<string, 'blocked' | 'allowed'> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  countryName(code: string | null): string | null {
    return code ? (COUNTRY_NAMES[code] ?? intlCountryName(code) ?? code) : null;
  }

  requestCountry(req: Request): { country: string | null; source: RegionCheck['source'] } {
    const { TRUST_PROXY, GEO_COUNTRY_HEADER, DEV_COUNTRY_OVERRIDE, NODE_ENV } = this.config.env;
    if (NODE_ENV === 'development') {
      const dev = devRequestCountry(req);
      if (dev) return { country: dev, source: 'dev_override' };
    }
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

  async isPermitted(country: string): Promise<boolean> {
    const rules = await this.rules();
    const rule = rules.get(country.toUpperCase());
    if (rule) return rule === 'allowed';
    return !this.config.env.RESTRICTED_COUNTRIES.includes(country.toUpperCase());
  }

  async checkRequest(req: Request): Promise<RegionCheck> {
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
   * PUB-21 gate decision for the web (public, read-only): the request location against `geo_rules` +
   * RESTRICTED_COUNTRIES — exactly what `assertPermitted()` enforces on gaming / deposit routes — plus an optional
   * declared country. No reason codes or hints about how the location is detected (no bypass hints, by design).
   */
  async decide(req: Request, declaredCountry?: string | null): Promise<GeoDecision> {
    const check = await this.checkRequest(req);
    const code =
      declaredCountry && COUNTRY_CODE.test(declaredCountry) ? declaredCountry.toUpperCase() : null;
    const permitted = check.permitted;
    return {
      ...check,
      decision: permitted ? 'permitted' : 'restricted',
      declared: code
        ? { code, name: this.countryName(code), permitted: await this.isPermitted(code) }
        : null,
      minAge: this.config.env.MIN_AGE,
      checkedAt: new Date().toISOString(),
      isDemo: check.source === 'dev_override',
      stillAvailable: permitted
        ? []
        : ['sign_in', 'withdraw', 'history', 'responsible_gaming', 'support', 'licence_info'],
      paused: permitted ? [] : ['games', 'pool_entries', 'deposits', 'promotions'],
    };
  }

  /**
   * Gaming / financial actions: both the request location and the declared country must be permitted.
   * Fails closed in production when the location cannot be determined.
   */
  async assertPermitted(req: Request, declaredCountry: string | null): Promise<void> {
    const check = await this.checkRequest(req);
    if (!check.permitted) {
      throw new AppError('GEO_RESTRICTED', 'GLOBAL POOL is not available in your region', {
        country: check.country,
      });
    }
    if (declaredCountry && !(await this.isPermitted(declaredCountry))) {
      throw new AppError(
        'GEO_RESTRICTED',
        'GLOBAL POOL is not available in your country of residence',
        {
          country: declaredCountry,
        },
      );
    }
  }

  invalidate(): void {
    this.cache = null;
  }

  private async rules(): Promise<Map<string, 'blocked' | 'allowed'>> {
    if (this.cache && Date.now() - this.cache.at < 60_000) return this.cache.rules;
    const rows = await this.prisma.geoRule.findMany({
      select: { countryCode: true, status: true },
    });
    const rules = new Map(rows.map((r) => [r.countryCode.toUpperCase(), r.status]));
    this.cache = { at: Date.now(), rules };
    return rules;
  }
}
