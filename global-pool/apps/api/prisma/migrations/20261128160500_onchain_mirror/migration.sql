-- api-gaps: on-chain mirroring of Global Pool rounds (GlobalPoolRounds on Arbitrum Sepolia / local Anvil), the
-- outbound transaction outbox + DB nonce manager (round ops, withdrawal broadcaster) and re-org-safe deposits.
-- Additive only: new enums / tables, nullable or defaulted columns, one new posting kind. TESTNET ONLY.
-- CreateEnum
CREATE TYPE "ChainTxStatus" AS ENUM ('signed', 'broadcast', 'mined', 'reverted', 'dropped');

-- CreateEnum
CREATE TYPE "RoundChainStep" AS ENUM ('open', 'commit', 'cancel', 'request_draw', 'settle');

-- CreateEnum
CREATE TYPE "RoundChainOpStatus" AS ENUM ('pending', 'sent', 'confirmed', 'failed');

-- AlterEnum
ALTER TYPE "LedgerPostingKind" ADD VALUE 'deposit_reversed';

-- AlterTable
ALTER TABLE "deposits" ADD COLUMN     "block_hash" TEXT,
ADD COLUMN     "reorg_seen_at_block" BIGINT;

-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "chain_id" INTEGER,
ADD COLUMN     "chain_mirror" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contract_address" TEXT,
ADD COLUMN     "onchain_status" TEXT,
ADD COLUMN     "payouts_merkle_root" TEXT,
ADD COLUMN     "rules_hash" TEXT;

-- CreateTable
CREATE TABLE "chain_signer_nonces" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "next_nonce" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_signer_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_transactions" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "from_address" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "to_address" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "ref_id" TEXT,
    "tx_hash" TEXT NOT NULL,
    "raw_tx" TEXT NOT NULL,
    "status" "ChainTxStatus" NOT NULL,
    "gas_limit" TEXT NOT NULL,
    "max_fee_per_gas" TEXT NOT NULL,
    "block_number" BIGINT,
    "block_hash" TEXT,
    "gas_used" TEXT,
    "error" TEXT,
    "broadcast_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_broadcast_at" TIMESTAMP(3),
    "mined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_chain_ops" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "step" "RoundChainStep" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "RoundChainOpStatus" NOT NULL,
    "chain_tx_id" UUID,
    "tx_hash" TEXT,
    "block_number" BIGINT,
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_chain_ops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_commitments" (
    "entry_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "entry_index" INTEGER NOT NULL,
    "entry_id_bytes32" TEXT NOT NULL,
    "user_commitment" TEXT NOT NULL,
    "salt_enc" TEXT NOT NULL,
    "leaf" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_commitments_pkey" PRIMARY KEY ("entry_id")
);

-- CreateTable
CREATE TABLE "round_payouts" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "entry_index" INTEGER NOT NULL,
    "entry_id_bytes32" TEXT NOT NULL,
    "user_commitment" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "amount_units" TEXT NOT NULL,
    "leaf" TEXT NOT NULL,
    "proof" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chain_signer_nonces_chain_id_address_key" ON "chain_signer_nonces"("chain_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "chain_transactions_tx_hash_key" ON "chain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "chain_transactions_purpose_ref_id_idx" ON "chain_transactions"("purpose", "ref_id");

-- CreateIndex
CREATE INDEX "chain_transactions_status_idx" ON "chain_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chain_transactions_chain_id_from_address_nonce_key" ON "chain_transactions"("chain_id", "from_address", "nonce");

-- CreateIndex
CREATE INDEX "round_chain_ops_status_idx" ON "round_chain_ops"("status");

-- CreateIndex
CREATE UNIQUE INDEX "round_chain_ops_round_id_step_attempt_key" ON "round_chain_ops"("round_id", "step", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "entry_commitments_round_id_entry_index_key" ON "entry_commitments"("round_id", "entry_index");

-- CreateIndex
CREATE UNIQUE INDEX "round_payouts_round_id_rank_key" ON "round_payouts"("round_id", "rank");

-- AddForeignKey
ALTER TABLE "round_chain_ops" ADD CONSTRAINT "round_chain_ops_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_chain_ops" ADD CONSTRAINT "round_chain_ops_chain_tx_id_fkey" FOREIGN KEY ("chain_tx_id") REFERENCES "chain_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_commitments" ADD CONSTRAINT "entry_commitments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_commitments" ADD CONSTRAINT "entry_commitments_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_payouts" ADD CONSTRAINT "round_payouts_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Entry commitments and payout leaves are frozen once published on-chain: append-only like the ledger.
CREATE TRIGGER "entry_commitments_append_only" BEFORE UPDATE OR DELETE ON "entry_commitments"
  FOR EACH ROW EXECUTE FUNCTION gp_reject_mutation();
CREATE TRIGGER "entry_commitments_no_truncate" BEFORE TRUNCATE ON "entry_commitments"
  FOR EACH STATEMENT EXECUTE FUNCTION gp_reject_truncate();
CREATE TRIGGER "round_payouts_append_only" BEFORE UPDATE OR DELETE ON "round_payouts"
  FOR EACH ROW EXECUTE FUNCTION gp_reject_mutation();
CREATE TRIGGER "round_payouts_no_truncate" BEFORE TRUNCATE ON "round_payouts"
  FOR EACH STATEMENT EXECUTE FUNCTION gp_reject_truncate();
