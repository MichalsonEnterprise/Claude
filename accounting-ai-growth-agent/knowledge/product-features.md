# Accounting AI — Product Features

> Edit this table to match reality. `Status` controls what the agent is
> allowed to claim: `shipped` = can describe as working today, `beta` = must
> be described as "w testach / early access", `planned` = can only be
> described as "pracujemy nad" (we're working on), never as available now.

| Module | Description | Status |
|---|---|---|
| Invoice/document ingestion | Uploads and parses incoming accounting documents (faktury, paragony) into structured data | beta |
| Document error detection | Flags formatting/consistency issues in ingested documents for human review | beta |
| VAT register assistance | Helps assemble VAT register entries from ingested documents | beta |
| JPK export helper | Prepares JPK-formatted exports for accountant review before submission | planned |
| KSeF integration | Structured-invoice exchange via KSeF | planned |
| Month-end close checklist | Guided checklist that tracks which month-end reconciliation steps are done | beta |
| Contractor/vendor data checks | Cross-checks contractor data against public registries | planned |
| Anomaly flagging | Statistical flags on unusual transactions for accountant review | beta |

## Explicitly NOT true today (do not imply otherwise)

- Accounting AI does not autonomously file tax declarations.
- Accounting AI does not replace a licensed accountant or tax advisor.
- Accounting AI has no published accuracy/error-rate benchmark yet — do not
  quote a percentage.
- Accounting AI does not currently have live KSeF or JPK submission — only
  preparation/helper tooling, and that is still `planned`.

## How to talk about beta/planned features

- beta: "Testujemy moduł, który..." / "W becie mamy funkcję, która..."
- planned: "Pracujemy nad modułem, który ma..." — always frame as future.
