# Accounting AI — Forbidden Claims

The Safety Gate checks generated content against this list. Anything below
must trigger at least `REQUIRE_APPROVAL`, and most trigger `BLOCK`.

## Always BLOCK

- Individual tax/legal advice ("zrób X, żeby uniknąć podatku Y", "w Twoim
  przypadku najlepiej...").
- Guaranteed tax savings ("zagwarantujemy oszczędności", "na pewno
  zapłacisz mniej podatku").
- Guaranteed legal compliance ("gwarantujemy zgodność z prawem").
- Claiming Accounting AI is a licensed tax advisor / replaces a księgowy or
  doradca podatkowy.
- Any invented statistic or benchmark not present in
  `product-features.md` (e.g. "99% dokładności", "10x szybciej") unless that
  exact figure is written in the knowledge base.
- Claims about a competitor without a cited source.
- Presenting a legislative draft/proposal/consultation as being in force.
- Personal data of any real, identifiable third party.
- Secrets: API keys, tokens, credentials, internal URLs, anything from a
  dev/staging environment.

## Always REQUIRE_APPROVAL (never fully autonomous)

- Any claim whose Claim Ledger status is `PARTIALLY_VERIFIED`.
- Any post about a legislative change discovered in the last 24h from a
  single Tier 2/3 source only.
- Any post that names a specific effective date for a legal change.

## Phrasing to avoid even when the underlying fact is true

- "zawsze", "nigdy", "w 100%", "całkowicie automatycznie", "bez wysiłku"
- "rewolucja", "przełom", "genialne"
