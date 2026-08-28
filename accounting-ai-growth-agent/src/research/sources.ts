export type SourceTier = 'TIER1_PRIMARY' | 'TIER2_TRUSTED' | 'TIER3_MEDIA';
export type SourceKind = 'RSS' | 'HTML' | 'API';

export interface SourceDefinition {
  name: string;
  url: string;
  kind: SourceKind;
  tier: SourceTier;
}

/**
 * Source Registry (#7 in the task brief). Kept small and curated rather than
 * a general web crawler, per the brief: "Potrzebujemy skutecznego researchu,
 * nie Google."
 *
 * RSS feed URLs are the primary discovery mechanism (best signal-to-noise).
 * HTML sources are simple public pages scraped for headline text, used only
 * where no RSS/API exists. Verify/update these URLs periodically — official
 * sites occasionally restructure their feeds.
 */
export const SOURCE_REGISTRY: SourceDefinition[] = [
  // --- TIER 1: official / primary ---------------------------------------
  { name: 'Ministerstwo Finansów — Aktualności', url: 'https://www.gov.pl/web/finanse/rss.xml', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'Podatki.gov.pl — Aktualności', url: 'https://www.podatki.gov.pl/rss.xml', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'ZUS — Aktualności', url: 'https://www.zus.pl/rss/aktualnosci', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'GUS — Komunikaty', url: 'https://stat.gov.pl/rss/', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'Sejm RP — Proces legislacyjny', url: 'https://www.sejm.gov.pl/RSS/rss_glosowania.xml', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'Rządowe Centrum Legislacji', url: 'https://legislacja.rcl.gov.pl/rss', kind: 'RSS', tier: 'TIER1_PRIMARY' },
  { name: 'EUR-Lex — Recent legal acts', url: 'https://eur-lex.europa.eu/EN/display-feed.rss?myRssId=Recently+adopted+documents', kind: 'RSS', tier: 'TIER1_PRIMARY' },

  // --- TIER 2: trusted secondary --------------------------------------
  { name: 'Infor.pl — Podatki', url: 'https://www.infor.pl/rss/podatki.xml', kind: 'RSS', tier: 'TIER2_TRUSTED' },
  { name: 'Gazeta Prawna — Podatki', url: 'https://podatki.gazetaprawna.pl/rss.xml', kind: 'RSS', tier: 'TIER2_TRUSTED' },
  { name: 'Rachunkowość.com.pl', url: 'https://www.rachunkowosc.com.pl/rss', kind: 'RSS', tier: 'TIER2_TRUSTED' },

  // --- TIER 3: industry media -------------------------------------------
  { name: 'Money.pl — Podatki', url: 'https://www.money.pl/rss/podatki.xml', kind: 'RSS', tier: 'TIER3_MEDIA' },
];
