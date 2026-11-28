'use client';

import * as React from 'react';

import { AgeGateForm } from './age-gate';
import { RegionUnavailablePage } from './geo-block';
import { REGULATORY_KINDS, type RegulatoryContext, type RegulatoryKind } from './regulatory-copy';
import { HelpOrganisations, RegulatoryNotice, RegulatoryState } from './regulatory-state';
import { mockGeoDecision, useGeoDecision } from './use-geo';

/** `/region-unavailable` (PUB-21 page): the request's geo decision from the API. */
export function RegionUnavailableRoute() {
  const geo = useGeoDecision();
  return (
    <RegionUnavailablePage
      decision={geo.data}
      loading={!geo.data && !geo.isError}
      error={geo.isError}
      onRetry={() => void geo.refetch()}
      retrying={geo.isFetching}
    />
  );
}

/** DEMO contexts for the ERR-05 preview (absolute UTC dates, DEMO values). */
const PREVIEW_CTX: Record<RegulatoryKind, RegulatoryContext> = {
  region: { countryName: 'United States' },
  licence: { product: 'Real-money play' },
  kyc_required: { action: 'Withdrawals', requiredLevel: 'level_1', currentLevel: 'none' },
  self_excluded: { endsAt: '2027-11-27T16:45:00.000Z' },
  cooling_off: { endsAt: '2026-12-05T16:45:00.000Z' },
  age: {},
};

/**
 * `/compliance-preview?kind=<kind>&layout=page|card|notice` — dev / state-preview builds only (the page 404s otherwise):
 * every ERR-05 regulatory state with DEMO context, plus `kind=age-gate` (the PUB-22 form inline) for QA
 * screenshots. Rendered in the casino shell, like a module guard.
 */
export function CompliancePreview({
  kind: kindParam,
  layout,
}: {
  kind: string;
  layout: 'page' | 'card' | 'notice';
}) {
  if (kindParam === 'age-gate') {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 rounded-xl border border-border-subtle bg-surface-overlay p-6">
        <h1 className="text-h3 text-text-primary">Are you 18 or older?</h1>
        <AgeGateForm
          detected={mockGeoDecision('PT')}
          onEnter={() => undefined}
          onUnderAge={() => undefined}
          onSignIn={() => undefined}
          renderFooter={(footer) => <div className="flex justify-end gap-3">{footer}</div>}
        />
      </div>
    );
  }
  const kind = (REGULATORY_KINDS as readonly string[]).includes(kindParam)
    ? (kindParam as RegulatoryKind)
    : 'region';
  const ctx = PREVIEW_CTX[kind];
  if (layout === 'notice') return <RegulatoryNotice kind={kind} ctx={ctx} />;
  return (
    <RegulatoryState kind={kind} ctx={ctx} layout={layout} isDemo>
      {(kind === 'self_excluded' || kind === 'age') && layout === 'page' && <HelpOrganisations />}
    </RegulatoryState>
  );
}
