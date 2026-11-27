/**
 * Editable site copy. Everything a non-developer may want to change lives here.
 */

export const site = {
  name: "LegalTechAnalyses",
  title: "LegalTechAnalyses — Legal clarity for digital assets",
  description:
    "Regulatory analyses and legal opinions for crypto-asset service providers, web3 apps and token issuers. MiCA-ready, paid in crypto, delivered within 72 hours.",
  tagline: ["Legal intelligence for digital assets.", "Built for what's next."],
  /** Set to show "Contact us" links, e.g. "hello@your-domain.com". */
  contactEmail: "",
  /** Set to show social icons in the footer. */
  social: { x: "", linkedin: "" },
};

export const nav = [
  { label: "Services", href: "/#services" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Jurisdictions", href: "/#jurisdictions" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
];

export type ClientLogo = { name: string; style: string; mark?: "tri" | "bars" | "dot" | "circle" | "hex" };

export const clients: ClientLogo[] = [
  { name: "Nordvault", style: "font-display font-bold text-[20px] tracking-[-0.02em]", mark: "tri" },
  { name: "Ledgerline", style: "font-serif text-[21px]", mark: "bars" },
  { name: "kryptos/labs", style: "font-mono font-medium text-[16px]" },
  { name: "ARCADIA", style: "font-sans font-black text-[15px] tracking-[0.18em]", mark: "dot" },
  { name: "polar·pay", style: "font-display font-medium text-[20px] tracking-[-0.02em]", mark: "circle" },
  { name: "Hexa", style: "font-playfair font-bold text-[21px]", mark: "hex" },
  { name: "VaultBridge", style: "font-sans font-bold text-[17px] tracking-[-0.02em]" },
  { name: "meridian", style: "font-instrument italic text-[25px]" },
];

export const services = [
  {
    title: "CASP Licensing",
    body: "End-to-end support for MiCA authorisation: gap analysis, policies, programme of operations and filing with the national competent authority.",
    image: "/images/service-casp.webp",
    alt: "Isometric courthouse on a hexagonal platform surrounded by crypto coins and a licence certificate",
  },
  {
    title: "Legal Opinions",
    body: "Independent, signed legal opinions for exchanges, launchpads, banks and investors — on tokens, protocols and business models.",
    image: "/images/service-opinions.webp",
    alt: "Stack of legal documents with a wax seal and fountain pen connected to blockchain blocks",
  },
  {
    title: "Token Classification",
    body: "Utility token, ART, EMT or financial instrument? We classify your token under MiCA and MiFID II with a clear, defensible rationale.",
    image: "/images/service-classification.webp",
    alt: "Balance scale sorting crypto tokens into three hexagonal trays",
  },
];

export const stats = [
  { value: "27", label: "EU member states covered" },
  { value: "150+", label: "Legal opinions delivered" },
  { value: "40+", label: "CASPs & web3 clients" },
  { value: "72h", label: "Delivery time" },
];

export const regulators: [string, string][] = [
  ["MiCA", "EU"], ["DORA", "EU"], ["AMLR", "EU"], ["TFR", "EU"], ["GDPR", "EU"], ["MiFID", "EU"],
  ["ESMA", "EU"], ["KNF", "PL"], ["BaFin", "DE"], ["AMF", "FR"], ["LB", "LT"], ["MFSA", "MT"],
  ["CySEC", "CY"], ["CBI", "IE"], ["FINMA", "CH"], ["VARA", "AE"], ["MAS", "SG"], ["FCA", "UK"],
  ["CSSF", "LU"], ["AFM", "NL"], ["CNMV", "ES"], ["CONSOB", "IT"], ["FMA", "AT"], ["EBA", "EU"],
  ["SEC", "US"], ["FSA", "JP"], ["SFC", "HK"], ["ASIC", "AU"], ["FIN-FSA", "FI"], ["EFSA", "EE"],
];

export const jurisdictions = {
  outer: [[-58, "PL"], [-39, "DE"], [-20, "LT"], [0, "EU"], [20, "MT"], [39, "CY"], [58, "IE"]] as [number, string][],
  inner: [[-42, "FR"], [-21, "CH"], [0, "AE"], [21, "UK"], [42, "SG"]] as [number, string][],
};

export const regRows = [
  { name: "MiCA · CASP licence", ref: "Art. 59", badge: "Licence required", highlight: true },
  { name: "AMLR · Travel Rule", ref: "TFR Art. 14" },
  { name: "DORA · ICT risk", ref: "Art. 5" },
  { name: "GDPR · Data protection", ref: "Art. 6" },
  { name: "MiFID II · Not in scope", ref: "—", muted: true },
];

export const corridors: [number, number, string][] = [
  [300, 300, "UK"], [470, 170, "EU"], [610, 80, "CH"], [830, 80, "AE"], [970, 170, "SG"], [1140, 300, "US"],
];

export const steps = [
  { n: "01", title: "Choose your package", body: "Analysis, Legal Opinion or Full — fixed prices in EUR." },
  { n: "02", title: "Pay in crypto", body: "Secure checkout by NOWPayments. Leave the email we should deliver to." },
  { n: "03", title: "Receive it in 72h", body: "Our lawyers deliver your document to your inbox within 72 hours." },
];

export const badges = [
  { icon: "shield", title: "Attorney–client privilege", body: "Every engagement is covered by legal privilege and professional secrecy." },
  { icon: "lock", title: "ISO 27001-aligned security", body: "Encrypted EU-hosted data room, MFA and audited access logs for every document." },
  { icon: "scale", title: "Licensed EU lawyers", body: "Opinions signed by advocates and legal counsel admitted to the bar in the EU." },
] as const;

export const faq = [
  {
    q: "How fast will I receive my analysis or opinion?",
    a: "Every package is delivered to the email address you provide within 72 hours of your payment being confirmed by NOWPayments.",
  },
  {
    q: "How do I pay?",
    a: "Choose a package, enter your email and pay in crypto through NOWPayments — BTC, ETH, USDT, USDC and many other coins. Prices are fixed in EUR and converted at checkout.",
  },
  {
    q: "What does the Full package include?",
    a: "The regulatory analysis and a signed legal opinion, plus a revision: if an exchange, bank, launchpad or regulator rejects the opinion, we amend it to address their comments.",
  },
  {
    q: "Do you work with projects outside the EU?",
    a: "Yes. Alongside MiCA we cover the UK, Switzerland, the UAE (VARA) and Singapore through our network of local counsel.",
  },
  {
    q: "What counts as a CASP under MiCA?",
    a: "Any person providing crypto-asset services — custody, exchange, transfers, advice or portfolio management — on a professional basis in the EU.",
  },
];

export const paymentCoins = ["BTC", "ETH", "USDT", "USDC", "SOL", "LTC", "TRX", "BNB"];
