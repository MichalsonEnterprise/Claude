-- games engine (P1): DEMO credits (no cash value — never linked to the USDT ledger), commit–reveal seed pairs
-- (game_sessions), bets (game_results, extended), Orbit Rush hash chains / rounds / bets. Additive only.

-- CreateEnum
CREATE TYPE "GameBetStatus" AS ENUM ('active', 'settled');

-- CreateEnum
CREATE TYPE "DemoCreditEntryKind" AS ENUM ('opening', 'reset', 'stake', 'payout');

-- CreateEnum
CREATE TYPE "CrashRoundStatus" AS ENUM ('betting', 'running', 'crashed');

-- CreateEnum
CREATE TYPE "CrashBetStatus" AS ENUM ('active', 'cashed_out', 'lost');

-- AlterTable
ALTER TABLE "game_results" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "game_id" UUID,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "multiplier" DECIMAL(20,6),
ADD COLUMN     "params" JSONB,
ADD COLUMN     "ref_number" SERIAL NOT NULL,
ADD COLUMN     "rules_version" TEXT,
ADD COLUMN     "settled_at" TIMESTAMP(3),
ADD COLUMN     "state" JSONB,
ADD COLUMN     "status" "GameBetStatus" NOT NULL DEFAULT 'settled',
ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "game_sessions" ADD COLUMN     "server_seed_enc" TEXT;

-- CreateTable
CREATE TABLE "demo_credit_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" DECIMAL(20,6) NOT NULL DEFAULT 1000,
    "last_reset_at" TIMESTAMP(3),
    "resets" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_credit_entries" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "DemoCreditEntryKind" NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "balance_after" DECIMAL(20,6) NOT NULL,
    "game_slug" TEXT,
    "bet_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_credit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_chains" (
    "id" UUID NOT NULL,
    "length" INTEGER NOT NULL,
    "terminal_seed_enc" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "next_index" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crash_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_rounds" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "chain_id" UUID NOT NULL,
    "chain_index" INTEGER NOT NULL,
    "status" "CrashRoundStatus" NOT NULL DEFAULT 'betting',
    "commitment" TEXT NOT NULL,
    "seed" TEXT,
    "crash_point" DECIMAL(10,2),
    "betting_opens_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "crashed_at" TIMESTAMP(3),
    "next_round_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crash_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_bets" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ref_number" SERIAL NOT NULL,
    "stake" DECIMAL(20,6) NOT NULL,
    "auto_cash_out" DECIMAL(10,2),
    "status" "CrashBetStatus" NOT NULL DEFAULT 'active',
    "cash_out_multiplier" DECIMAL(10,2),
    "payout" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "cash_out_kind" TEXT,
    "cashed_out_at" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'DEMO',
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crash_bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_credit_accounts_user_id_key" ON "demo_credit_accounts"("user_id");

-- CreateIndex
CREATE INDEX "demo_credit_entries_user_id_created_at_idx" ON "demo_credit_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "demo_credit_entries_bet_id_idx" ON "demo_credit_entries"("bet_id");

-- CreateIndex
CREATE UNIQUE INDEX "crash_chains_commitment_key" ON "crash_chains"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "crash_rounds_number_key" ON "crash_rounds"("number");

-- CreateIndex
CREATE INDEX "crash_rounds_status_idx" ON "crash_rounds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "crash_rounds_chain_id_chain_index_key" ON "crash_rounds"("chain_id", "chain_index");

-- CreateIndex
CREATE INDEX "crash_bets_user_id_created_at_idx" ON "crash_bets"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "crash_bets_round_id_user_id_key" ON "crash_bets"("round_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "crash_bets_user_id_idempotency_key_key" ON "crash_bets"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "game_results_user_id_game_id_created_at_idx" ON "game_results"("user_id", "game_id", "created_at");

-- CreateIndex
CREATE INDEX "game_results_game_id_created_at_idx" ON "game_results"("game_id", "created_at");

-- CreateIndex
CREATE INDEX "game_results_status_idx" ON "game_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_user_id_idempotency_key_key" ON "game_results"("user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "demo_credit_accounts" ADD CONSTRAINT "demo_credit_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_credit_entries" ADD CONSTRAINT "demo_credit_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_credit_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_rounds" ADD CONSTRAINT "crash_rounds_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "crash_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_bets" ADD CONSTRAINT "crash_bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "crash_rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crash_bets" ADD CONSTRAINT "crash_bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Public reference numbers start at 10000 (D-10000 …) and Orbit Rush round numbers at 55000 (CR-55000 …).
SELECT setval(pg_get_serial_sequence('"game_results"', 'ref_number'), GREATEST(10000, (SELECT COALESCE(MAX("ref_number"), 0) FROM "game_results")), true);
SELECT setval(pg_get_serial_sequence('"crash_bets"', 'ref_number'), 20000, false);
SELECT setval(pg_get_serial_sequence('"crash_rounds"', 'number'), 55000, false);

-- Backfill the denormalised owner / game of existing (DEMO history) bets.
UPDATE "game_results" r SET "user_id" = s."user_id", "game_id" = s."game_id"
FROM "game_sessions" s WHERE r."session_id" = s."id" AND r."user_id" IS NULL;

-- One ACTIVE seed pair per player and game; one ACTIVE stateful round per player and game.
CREATE UNIQUE INDEX "game_sessions_one_active_pair" ON "game_sessions"("user_id", "game_id") WHERE "status" = 'active';
CREATE UNIQUE INDEX "game_results_one_active_round" ON "game_results"("user_id", "game_id") WHERE "status" = 'active';
-- Only one Orbit Rush round can be betting / running at a time (safe with several API replicas).
CREATE UNIQUE INDEX "crash_rounds_one_live" ON "crash_rounds"((true)) WHERE "status" <> 'crashed';

-- DEMO credit movements are append-only (rows are never edited; a reset is a new row).
CREATE TRIGGER "demo_credit_entries_no_update" BEFORE UPDATE ON "demo_credit_entries"
  FOR EACH ROW EXECUTE FUNCTION gp_reject_mutation();
