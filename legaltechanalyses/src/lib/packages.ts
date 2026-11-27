/**
 * Single source of truth for what can be bought and for how much.
 * The checkout API reads prices from here — never from the browser.
 */

export const PACKAGE_IDS = ["analysis", "opinion", "full"] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

export type Package = {
  id: PackageId;
  /** Short code used in NOWPayments order ids. */
  code: string;
  name: string;
  priceEur: number;
  summary: string;
  features: string[];
  badge?: string;
};

export const DELIVERY_HOURS = 72;

export const PACKAGES: Record<PackageId, Package> = {
  analysis: {
    id: "analysis",
    code: "ANL",
    name: "Analysis",
    priceEur: 500,
    summary: "A written regulatory analysis of your crypto project, token or web3 app.",
    features: [
      "Regulatory mapping: MiCA, AMLR, TFR, DORA, GDPR",
      "Preliminary token classification",
      "RiskScore with a clear action list",
      `Delivered by email within ${DELIVERY_HOURS}h`,
    ],
  },
  opinion: {
    id: "opinion",
    code: "OPN",
    name: "Legal Opinion",
    priceEur: 1000,
    summary: "A signed legal opinion for exchanges, banks, launchpads and investors.",
    features: [
      "Signed, independent legal opinion",
      "Token classification under MiCA and MiFID II",
      "Ready to submit to third parties",
      `Delivered by email within ${DELIVERY_HOURS}h`,
    ],
  },
  full: {
    id: "full",
    code: "FULL",
    name: "Full",
    priceEur: 1500,
    badge: "Includes revision",
    summary: "Analysis and legal opinion — plus a revision if a reviewing entity rejects it.",
    features: [
      "Regulatory analysis + signed legal opinion",
      "Revision if an exchange, bank or regulator rejects the opinion",
      "Amendments addressing the reviewer's comments",
      `Delivered by email within ${DELIVERY_HOURS}h`,
    ],
  },
};

export const PACKAGE_LIST: Package[] = PACKAGE_IDS.map((id) => PACKAGES[id]);

export function isPackageId(value: unknown): value is PackageId {
  return typeof value === "string" && (PACKAGE_IDS as readonly string[]).includes(value);
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
