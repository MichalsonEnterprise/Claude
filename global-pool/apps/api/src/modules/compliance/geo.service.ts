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

export interface RegionCheck {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
  source: 'header' | 'dev_override' | 'declared' | 'unknown';
}

/**
 * Geo-restriction from `geo_rules` (DB, explicit allow/block per country) + RESTRICTED_COUNTRIES (env placeholder
 * list — the real list is a legal decision). Request country comes from the CDN header (GEO_COUNTRY_HEADER, only
 * trusted with TRUST_PROXY=true) or DEV_COUNTRY_OVERRIDE outside production.
 */
@Injectable()
export class GeoService {
  private cache: { at: number; rules: Map<string, 'blocked' | 'allowed'> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  countryName(code: string | null): string | null {
    return code ? (COUNTRY_NAMES[code] ?? code) : null;
  }

  requestCountry(req: Request): { country: string | null; source: RegionCheck['source'] } {
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
