'use client';

import { useQuery } from '@tanstack/react-query';
import { CircleCheck, MapPin, TriangleAlert } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getRegion } from '@/lib/api/pool';

/** The visitor's own region check (GET /compliance/region) — the same answer the server enforces. */
export function RegionCheck() {
  // Same key as the pool module's useRegionStatus (poolKeys.region()).
  const region = useQuery({
    queryKey: ['pool', 'region'],
    queryFn: getRegion,
    staleTime: 5 * 60_000,
  });
  return (
    <Card padding="m" className="flex-row items-center gap-3" aria-live="polite">
      <MapPin aria-hidden className="size-5 shrink-0 text-icon-muted" />
      {region.data ? (
        <p className="flex items-center gap-2 text-body-s text-text-primary">
          {region.data.permitted ? (
            <CircleCheck aria-hidden className="size-4 text-text-success" />
          ) : (
            <TriangleAlert aria-hidden className="size-4 text-text-warning" />
          )}
          Your current location{region.data.countryName ? ` (${region.data.countryName})` : ''}:{' '}
          {region.data.permitted
            ? 'GLOBAL POOL is available.'
            : 'GLOBAL POOL is not available here.'}
        </p>
      ) : region.isError ? (
        <p className="text-body-s text-text-secondary">
          We couldn’t check your location right now. The check still runs on every request.
        </p>
      ) : (
        <Skeleton className="h-5 w-64" />
      )}
    </Card>
  );
}
