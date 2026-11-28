/**
 * Compliance gate API (PUB-21 / PUB-22 / ERR-05): `GET /compliance/geo` — the geo decision for the current request
 * (CDN country header behind a trusted proxy, against geo_rules + RESTRICTED_COUNTRIES). The API enforces the same
 * answer on every gaming / deposit route, so the web gate is a courtesy screen, never the control.
 */
import { apiRequest } from './client';

export type GeoSource = 'header' | 'dev_override' | 'declared' | 'unknown';

export interface GeoDecision {
  decision: 'permitted' | 'restricted';
  permitted: boolean;
  country: string | null;
  countryName: string | null;
  source: GeoSource;
  declared: { code: string; name: string | null; permitted: boolean } | null;
  minAge: number;
  checkedAt: string;
  /** The location came from a DEV override (DEMO), not a real CDN header. */
  isDemo: boolean;
  stillAvailable: (
    'sign_in' | 'withdraw' | 'history' | 'responsible_gaming' | 'support' | 'licence_info'
  )[];
  paused: ('games' | 'pool_entries' | 'deposits' | 'promotions')[];
}

export interface GeoQuery {
  /** Declared country of residence to check as well (ISO alpha-2). */
  declared?: string | null;
  /**
   * DEV QA only: forwarded as `?devCountry=` — the API honours it only with NODE_ENV=development and ignores it
   * everywhere else. The web sends it only in state-preview builds (see components/compliance/use-geo.ts).
   */
  devCountry?: string | null;
}

export const complianceKeys = {
  all: ['compliance'] as const,
  /** Location decision (gate). */
  location: (devCountry: string | null) => ['compliance', 'location', devCountry] as const,
  /** Declared-country check (age gate jurisdiction select). */
  geo: (q: GeoQuery = {}) =>
    ['compliance', 'geo', q.devCountry ?? null, q.declared ?? null] as const,
};

/** `GET /compliance/region` (served by every API build): the location check the gate decides on. */
export interface RegionCheck {
  country: string | null;
  countryName: string | null;
  permitted: boolean;
  source: GeoSource;
  minAge: number;
}

/** Decision view of a region check (same rules as the API's `GET /compliance/geo`, without a declared country). */
export function toGeoDecision(region: RegionCheck, checkedAt = new Date().toISOString()): GeoDecision {
  return {
    decision: region.permitted ? 'permitted' : 'restricted',
    permitted: region.permitted,
    country: region.country,
    countryName: region.countryName,
    source: region.source,
    declared: null,
    minAge: region.minAge,
    checkedAt,
    isDemo: region.source === 'dev_override',
    stillAvailable: region.permitted
      ? []
      : ['sign_in', 'withdraw', 'history', 'responsible_gaming', 'support', 'licence_info'],
    paused: region.permitted ? [] : ['games', 'pool_entries', 'deposits', 'promotions'],
  };
}

export const complianceApi = {
  /** Full decision incl. an optional declared-country check (`GET /compliance/geo`). */
  geo: (q: GeoQuery = {}, signal?: AbortSignal) =>
    apiRequest<GeoDecision>('/compliance/geo', {
      auth: 'none',
      query: { declared: q.declared, devCountry: q.devCountry },
      signal,
    }),
  /** Location decision only (`GET /compliance/region`, available on every API build). */
  region: (q: Pick<GeoQuery, 'devCountry'> = {}, signal?: AbortSignal) =>
    apiRequest<RegionCheck>('/compliance/region', {
      auth: 'none',
      query: { devCountry: q.devCountry },
      signal,
    }).then((r) => toGeoDecision(r)),
};
