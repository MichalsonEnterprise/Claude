# GLOBAL POOL

Web3 global jackpot + crypto gaming platform: one global pool per round, entries paid in USDT, winners drawn
with verifiable randomness (Chainlink VRF v2.5), plus a casino-style lobby of original games.

> **DEMO / TESTNET ONLY.** Real-money operation is disabled by a server-side flag (`REAL_MONEY_ENABLED=false`)
> and no mainnet RPCs or contract addresses are configured. All seeded data is DEMO and is labelled as such
> in the UI.

## Guardrails (non-negotiable)

- **Money is never a JS float.** Use `@gp/shared/money` (decimal.js) and Prisma `Decimal`. USDT has 6 decimals
  in the ledger and is shown as `1,234.56 USDT` (`formatUSDT`).
- **Fees:** entry price **10.00 USDT**; platform fee **0.05 USDT per qualifying entry**, always its own line
  item, separate from the network fee. Pool balance = Σ entry amounts; platform fees go to the fee ledger,
  never to the pool.
- **Balances** (Available / Locked / Pending / Owed) come from an append-only double-entry ledger. Ledger rows
  are never edited. On-chain state is read from RPC and reconciled.
- **Fairness:** outcomes come only from verifiable randomness. No code path lets an admin edit results, choose
  winners, pay out arbitrarily, edit ledger rows or adjust balances. Sensitive admin actions need an RBAC
  permission, a reason and MFA re-auth (+ four-eyes where flagged), and always write a hash-chained audit row.
- **Compliance:** geo-restriction, 18+, KYC levels and responsible-gaming limits are enforced server-side.
  Consent boxes are never pre-checked. No dark patterns, fake timers, fabricated wins, VPN hints, hidden fees
  or odds, and no obstruction of withdrawals or self-exclusion.
- **Secrets:** never commit them. `.env.example` lists every variable with dev-only placeholders. Tests use
  testnets/Anvil and throwaway keys generated at runtime.

Owner decisions (custody = hybrid, MVP chain = Arbitrum Sepolia 421614, player auth = Privy, admins = email +
password + TOTP) and coding conventions live in [`docs/DEV_CONVENTIONS.md`](docs/DEV_CONVENTIONS.md).

## Layout

```
global-pool/
  apps/web             Next.js 15 player app + admin UI (@gp/web)
  apps/api             NestJS 11 + Prisma 6 API (@gp/api)
  packages/shared      @gp/shared — money/fee helpers, chains, enums, zod schemas, domain types, DEMO data
  packages/tokens      @gp/tokens — Figma variables → CSS variables, Tailwind v4 @theme, text styles, TS export
  packages/contracts   @gp/contracts — Foundry contracts (round registry, Chainlink VRF v2.5)
  scripts/             dev-services.sh (local Postgres 16 + Redis 7), docker/ init SQL
  docs/                conventions, architecture, ADRs
```

Tooling shared by every package: `tsconfig.base.json` (strict), `eslint.config.mjs` (typescript-eslint flat
config; packages call `createConfig({ tsconfigRootDir: import.meta.dirname, typeChecked: true })`),
`prettier.config.mjs`, `.editorconfig`. Every package has `dev`, `build`, `typecheck`, `lint`, `test` scripts.

## Getting started

Requirements: Node ≥ 22, pnpm 10 (`corepack enable`), Postgres 16 and Redis 7 (local script or Docker).
Foundry is needed for `packages/contracts`.

```bash
cd global-pool

# 1. Services: local Postgres (globalpool + globalpool_test) and Redis, no Docker needed
bash scripts/dev-services.sh start        # or: docker compose up -d postgres redis

# 2. Environment
cp .env.example .env

# 3. Install. Always go through the lock so parallel installs cannot corrupt the lockfile.
flock /tmp/gp-pnpm.lock pnpm install

# 4. Build the shared packages (dependents import their dist/)
pnpm build:packages

# 5. Database (scripts provided by apps/api)
pnpm --filter @gp/api db:migrate            # prisma migrate dev
pnpm --filter @gp/api db:seed               # DEMO seed, only when DEMO_MODE=true

# 6. Run
pnpm dev:api                                # http://localhost:4000 (Swagger at /docs, health at /health)
pnpm dev:web                                # http://localhost:3000
```

Quality gates (also run in CI, `.github/workflows/global-pool-ci.yml` at the repo root):

```bash
pnpm typecheck      # builds packages first, then tsc --noEmit everywhere
pnpm lint
pnpm test           # e2e tests use DATABASE_URL_TEST (globalpool_test)
pnpm build
pnpm format:check   # prettier
```

Full stack in Docker (no local Node needed): `docker compose up --build` runs postgres, redis, api (:4000) and
web (:3000) with healthchecks. It uses the root `Dockerfile` (targets `api` / `web`), which expects
`apps/api` to provide `build`, `start:prod` and optionally `db:migrate:deploy`, and `apps/web` to provide
`build` and `start`.

## Shared packages

### `@gp/tokens`

`packages/tokens/tokens.json` mirrors the Figma variables (file `QHF8iRUMFgGMcEn3bD25jl`); do not invent
colours. `pnpm --filter @gp/tokens build` generates `dist/`:

| Export                       | Contents                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@gp/tokens/tokens.css`      | `:root` custom properties for every primitive and semantic token: `--gp-bg-base`, `--gp-text-primary`, `--gp-brand-primary`, `--gp-radius-md`, `--gp-space-4`, shadows, gradients, motion, typography |
| `@gp/tokens/theme.css`       | Tailwind CSS v4 `@theme`. The default palette is removed, so only token colours exist                                                                                                                 |
| `@gp/tokens/text-styles.css` | `.text-display-xl` … `.text-number-s`, `.text-overline` (exact Figma values; numbers use tabular figures)                                                                                             |
| `@gp/tokens`                 | typed token object: `tokens`, `colors` (resolved semantic colours), `primitiveColors`, `cssVar()`                                                                                                     |

```css
/* apps/web/src/app/globals.css */
@import 'tailwindcss';
@import '@gp/tokens/tokens.css';
@import '@gp/tokens/theme.css';
@import '@gp/tokens/text-styles.css';
```

Tailwind classes: `bg-bg-base`, `bg-surface-default`, `text-text-secondary`, `border-border-default`,
`bg-brand text-text-on-primary` (mint carries dark text), `text-gold`, `bg-status-danger-tint`,
`text-balance-available`, `rounded-lg`, `p-4` (spacing = n × 4px), `w-sidebar`, `h-topbar`, `max-w-desktop`,
`shadow-elevation-2`, `text-h1`, `ease-standard`, `bg-gradient-gold-jackpot`, and `tablet:` / `laptop:` /
`desktop:` breakpoints. shadcn/ui slots (`bg-background`, `text-muted-foreground`, `ring-ring`, …) are mapped
to the same tokens. Override fonts with `--gp-font-sans` / `--gp-font-mono` (for example from `next/font`).

### `@gp/shared`

ESM + CJS + type declarations (tsup). Sub-paths: `@gp/shared/money`, `/fees`, `/pool`, `/chains`, `/enums`,
`/limits`, `/format`, `/schemas`, `/types`, `/demo`.

```ts
import {
  formatUSDT,
  sum,
  entryQuote,
  withdrawalQuote,
  CHAINS,
  withdrawalRequestSchema,
  DEMO,
} from '@gp/shared';

formatUSDT('1234.5'); // '1,234.50 USDT'
entryQuote(35); // { entryAmount: '350.00', platformFee: '1.75', networkFee: '0.00', total: '351.75', … }
withdrawalQuote('1500.00', 'arbitrum'); // { networkFee: '0.08', platformFee: '0.00', youReceive: '1499.92', … }
sum(['9215.30', '1850.00', '1000.00', '415.20']).toFixed(2); // '12480.50'
```

- **money:** `parseUSDT` (≤ 6 dp, rejects floats), `toUSDTString`, `formatUSDT`, `add/sub/mul/sum/percentOf`,
  `compare/eq/gt/…`, `roundDown`, `toBaseUnits/fromBaseUnits`.
- **fees / pool:** `ENTRY_PRICE`, `PLATFORM_FEE_PER_ENTRY`, `entryQuote`, `withdrawalQuote`, `prizeBreakdown`
  (50 / 20 / 10 / 10 × 2 %), `ROUND_THRESHOLDS`, `oddsDisclosure`.
- **chains:** Arbitrum Sepolia (421614) enabled; BNB Chain (97), Polygon Amoy (80002), Sepolia (11155111) and
  Solana devnet are configured as "coming soon". Testnet identifiers only.
- **enums:** transaction, withdrawal (with its state machine), round, entry, KYC, AML, RG, admin roles,
  permissions and their policy (reason / MFA / four-eyes).
- **schemas (zod 4):** auth (Privy onboarding consents, admin login + TOTP, step-up), withdrawal request
  (per-chain address validation: EIP-55 via viem, Solana base58 32 bytes), enter round, RG limits, pagination,
  error envelope.
- **demo:** typed DEMO data from `design/figma-build/demo-data.md`. Every record is flagged `isDemo: true`;
  the ids are deterministic UUIDs prefixed `de0000…`, which the API seed reuses.
