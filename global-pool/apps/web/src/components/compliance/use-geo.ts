'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { complianceApi, complianceKeys, type GeoDecision } from '@/lib/api/compliance';
import { DATA_SOURCE } from '@/lib/data/source';
import { statePreviewEnabled } from '@/lib/home-preview';

import { resolveDevCountry } from './storage';

/** Placeholder restricted list of the mock data source (the API's RESTRICTED_COUNTRIES default). */
const MOCK_RESTRICTED = ['US', 'CU', 'IR', 'KP', 'SY'];
const MOCK_NAMES: Record<string, string> = {
  PT: 'Portugal',
  US: 'United States',
  CU: 'Cuba',
  IR: 'Iran',
  KP: 'North Korea',
  SY: 'Syria',
};

/** Mock data source (no API): Portugal permitted unless a DEV country is previewed. Always DEMO. */
export function mockGeoDecision(devCountry: string | null, declared?: string | null): GeoDecision {
  const country = devCountry ?? 'PT';
  const permitted = !MOCK_RESTRICTED.includes(country);
  return {
    decision: permitted ? 'permitted' : 'restricted',
    permitted,
    country,
    countryName: MOCK_NAMES[country] ?? country,
    source: 'dev_override',
    declared: declared
      ? {
          code: declared,
          name: MOCK_NAMES[declared] ?? declared,
          permitted: !MOCK_RESTRICTED.includes(declared),
        }
      : null,
    minAge: 18,
    checkedAt: new Date().toISOString(),
    isDemo: true,
    stillAvailable: permitted
      ? []
      : ['sign_in', 'withdraw', 'history', 'responsible_gaming', 'support', 'licence_info'],
    paused: permitted ? [] : ['games', 'pool_entries', 'deposits', 'promotions'],
  };
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/**
 * DEV QA country for this tab (`?devCountry=US`), only in state-preview builds (`next dev` /
 * NEXT_PUBLIC_STATE_PREVIEW=true). `ready` turns true after the first client pass, so the geo query never fires
 * twice (once without, once with the override).
 */
export function useDevCountry(): { devCountry: string | null; ready: boolean } {
  const pathname = usePathname();
  const [state, setState] = React.useState<{ devCountry: string | null; ready: boolean }>({
    devCountry: null,
    ready: false,
  });
  useIsomorphicLayoutEffect(() => {
    const devCountry = statePreviewEnabled ? resolveDevCountry(window.location.search) : null;
    setState((s) => (s.ready && s.devCountry === devCountry ? s : { devCountry, ready: true }));
  }, [pathname]);
  return state;
}

/**
 * The request's geo decision — what the API enforces on gaming / deposit routes. Read from `GET /compliance/region`
 * (served by every API build) and shaped like `GET /compliance/geo`. Cached for a minute; the server re-checks
 * every request anyway.
 */
export function useGeoDecision(options: { enabled?: boolean } = {}) {
  const { devCountry, ready } = useDevCountry();
  const query = useQuery({
    queryKey: complianceKeys.location(devCountry),
    queryFn: ({ signal }) =>
      DATA_SOURCE === 'api'
        ? complianceApi.region({ devCountry }, signal)
        : Promise.resolve(mockGeoDecision(devCountry)),
    enabled: ready && (options.enabled ?? true),
    staleTime: 60_000,
    retry: 1,
  });
  return { ...query, ready, devCountry };
}

/** Is a declared country of residence permitted? (`GET /compliance/geo?declared=`; null code → no request). */
export function useDeclaredCountry(code: string | null) {
  const { devCountry, ready } = useDevCountry();
  return useQuery({
    queryKey: complianceKeys.geo({ devCountry, declared: code }),
    queryFn: ({ signal }) =>
      DATA_SOURCE === 'api'
        ? complianceApi.geo({ devCountry, declared: code }, signal)
        : Promise.resolve(mockGeoDecision(devCountry, code)),
    enabled: ready && Boolean(code),
    staleTime: 5 * 60_000,
    retry: 1,
    select: (d) => d.declared,
  });
}
