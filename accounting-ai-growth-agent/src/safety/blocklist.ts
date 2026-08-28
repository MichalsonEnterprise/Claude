/**
 * Hard blocklist (brief #20). These are regex/keyword rules checked
 * deterministically — never bypassable by an LLM verdict. Anything matched
 * here forces BLOCK regardless of what the safety-gate LLM call says.
 */
export interface BlocklistHit {
  rule: string;
  match: string;
}

interface BlocklistRule {
  name: string;
  pattern: RegExp;
}

const RULES: BlocklistRule[] = [
  { name: 'individual-tax-advice', pattern: /\b(zrób|zróbcie|zastosuj|użyj)\s+\w+.{0,20}(żeby|aby)\s+unikn/i },
  { name: 'individual-tax-advice-en', pattern: /\bhow to (avoid|dodge|reduce) (your\s+)?tax(es)?\b/i },
  { name: 'guaranteed-savings', pattern: /(gwarantuj\w*|na pewno).{0,20}(oszczędnoś|zapłacisz mniej)/i },
  { name: 'guaranteed-compliance', pattern: /gwarantuj\w*.{0,20}(zgodność|zgodności|zgodne z prawem)/i },
  { name: 'replaces-advisor', pattern: /(zastępuje|zastąpi|w pełni zastępuje).{0,20}(księgow|doradc[eę] podatkow)/i },
  { name: 'invented-accuracy-stat', pattern: /\b(99[.,]?\d*\s?%|100\s?%)\s*(dokładnoś|accuracy|skutecznoś)/i },
  { name: 'unsourced-competitor-attack', pattern: /\b(gorszy|gorsza|gorsze|słabszy|beznadziejny)\s+(niż|od)\s+(konkurenc|inne systemy)/i },
  { name: 'personal-data-pesel', pattern: /\bPESEL\b.{0,5}\d{11}\b/i },
  { name: 'secret-leak', pattern: /(api[_-]?key|secret|password)\s*[:=]\s*\S{6,}/i },
  { name: 'absolute-language', pattern: /\b(zawsze|nigdy|w 100%|całkowicie automatycznie|bez wysiłku)\b/i },
];

export function checkBlocklist(text: string): BlocklistHit[] {
  const hits: BlocklistHit[] = [];
  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) hits.push({ rule: rule.name, match: match[0] });
  }
  return hits;
}
