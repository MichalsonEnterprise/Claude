-- CreateEnum
CREATE TYPE "ChainKey" AS ENUM ('arbitrum', 'bnb', 'polygon', 'ethereum', 'solana');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('none', 'level_1', 'level_2', 'level_3');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'pending', 'in_review', 'verified', 'rejected', 'resubmission_required');

-- CreateEnum
CREATE TYPE "AmlRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "AmlAlertStatus" AS ENUM ('open', 'under_review', 'resolved', 'dismissed', 'escalated');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('user_available', 'user_locked', 'user_pending', 'user_owed', 'pool', 'fees', 'prize_liability', 'refunds', 'operator_revenue', 'chain_clearing');

-- CreateEnum
CREATE TYPE "LedgerPostingKind" AS ENUM ('deposit_detected', 'deposit_credited', 'withdrawal_lock', 'withdrawal_release', 'withdrawal_settle', 'entry_purchase', 'round_settlement', 'prize_award', 'round_refund', 'owed_claim', 'reward', 'demo_opening_balance');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('deposit', 'withdrawal', 'entry_purchase', 'platform_fee', 'prize', 'refund', 'reward', 'rakeback', 'cashback', 'referral_commission');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('pending', 'confirming', 'under_review', 'processing', 'completed', 'failed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('detected', 'confirming', 'credited', 'rejected');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('requested', 'risk_check', 'under_review', 'queued', 'broadcast', 'confirmed', 'failed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('scheduled', 'open', 'closed', 'drawing', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('active', 'won', 'not_won', 'refund_owed', 'refunded');

-- CreateEnum
CREATE TYPE "PrizeTier" AS ENUM ('first', 'second', 'third', 'runner_up');

-- CreateEnum
CREATE TYPE "PrizeClaimStatus" AS ENUM ('owed', 'claimed');

-- CreateEnum
CREATE TYPE "RandomnessProviderKind" AS ENUM ('chainlink_vrf_v2_5', 'mock');

-- CreateEnum
CREATE TYPE "RandomnessStatus" AS ENUM ('requested', 'fulfilled', 'failed', 'timed_out');

-- CreateEnum
CREATE TYPE "RgLimitType" AS ENUM ('deposit', 'participation', 'loss', 'session_time');

-- CreateEnum
CREATE TYPE "RgPeriod" AS ENUM ('day', 'week', 'month');

-- CreateEnum
CREATE TYPE "StepUpPurpose" AS ENUM ('withdrawal', 'whitelist_change', 'security_settings');

-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('jackpot', 'originals', 'table', 'slots', 'live', 'draws', 'bingo');

-- CreateEnum
CREATE TYPE "VipTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "SessionSubject" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('admin', 'user', 'system');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "RestrictionType" AS ENUM ('account_suspended', 'gaming_blocked', 'deposits_blocked', 'withdrawals_frozen');

-- CreateEnum
CREATE TYPE "TotpStatus" AS ENUM ('pending', 'active');

-- CreateEnum
CREATE TYPE "WalletSource" AS ENUM ('privy_linked', 'privy_embedded', 'manual');

-- CreateEnum
CREATE TYPE "GeoRuleStatus" AS ENUM ('blocked', 'allowed');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('active', 'finished');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "privy_user_id" TEXT,
    "public_id" TEXT NOT NULL,
    "handle" TEXT,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "onboarded_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "country" CHAR(2),
    "date_of_birth" DATE,
    "age_confirmed_at" TIMESTAMP(3),
    "jurisdiction_confirmed_at" TIMESTAMP(3),
    "terms_accepted_at" TIMESTAMP(3),
    "terms_version" TEXT,
    "privacy_accepted_at" TIMESTAMP(3),
    "privacy_version" TEXT,
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "marketing_opt_in_at" TIMESTAMP(3),
    "anti_phishing_code" TEXT,
    "kyc_level" "KycLevel" NOT NULL DEFAULT 'none',
    "vip_tier" "VipTier" NOT NULL DEFAULT 'bronze',
    "vip_level" INTEGER NOT NULL DEFAULT 1,
    "vip_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "network" "ChainKey" NOT NULL,
    "address" TEXT NOT NULL,
    "source" "WalletSource" NOT NULL,
    "wallet_client" TEXT,
    "label" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "whitelisted_at" TIMESTAMP(3),
    "whitelist_available_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "network" "ChainKey" NOT NULL,
    "address" TEXT NOT NULL,
    "address_checksum" TEXT NOT NULL,
    "derivation_index" INTEGER NOT NULL,
    "derivation_path" TEXT NOT NULL,
    "xpub_fingerprint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "subject" "SessionSubject" NOT NULL,
    "user_id" UUID,
    "admin_user_id" UUID,
    "privy_session_id" TEXT,
    "family_id" UUID,
    "refresh_token_hash" TEXT,
    "parent_id" UUID,
    "rotated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "device_label" TEXT,
    "user_agent" TEXT,
    "ip" TEXT,
    "location" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagged_reason" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "admin_user_id" UUID,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "totp_secrets" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "admin_user_id" UUID,
    "secret_enc" TEXT NOT NULL,
    "status" "TotpStatus" NOT NULL DEFAULT 'pending',
    "confirmed_at" TIMESTAMP(3),
    "last_used_step" INTEGER,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "totp_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "totp_backup_codes" (
    "id" UUID NOT NULL,
    "totp_secret_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "totp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_restrictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "RestrictionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_by_admin_id" UUID NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lifted_at" TIMESTAMP(3),
    "lifted_by_admin_id" UUID,
    "lift_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level" "KycLevel" NOT NULL,
    "status" "KycStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewer_admin_id" UUID,
    "rejection_reason" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "withdrawal_id" UUID,
    "deposit_id" UUID,
    "risk_level" "AmlRiskLevel" NOT NULL,
    "rule" TEXT NOT NULL,
    "status" "AmlAlertStatus" NOT NULL DEFAULT 'open',
    "details" JSONB NOT NULL DEFAULT '{}',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_admin_id" UUID,
    "resolution" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_rules" (
    "id" UUID NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "status" "GeoRuleStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geo_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_gaming_limits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "RgLimitType" NOT NULL,
    "period" "RgPeriod" NOT NULL,
    "amount" DECIMAL(20,6),
    "minutes" INTEGER,
    "pending_amount" DECIMAL(20,6),
    "pending_minutes" INTEGER,
    "pending_effective_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsible_gaming_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_gaming_self_exclusions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "duration" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsible_gaming_self_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsible_gaming_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reality_check_minutes" INTEGER NOT NULL DEFAULT 60,
    "last_reality_check_at" TIMESTAMP(3),
    "session_started_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsible_gaming_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "network" "ChainKey" NOT NULL,
    "token_address" TEXT,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL DEFAULT 0,
    "block_number" BIGINT,
    "from_address" TEXT,
    "to_address" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "amount_onchain" DECIMAL(38,18) NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "required_confirmations" INTEGER NOT NULL,
    "status" "DepositStatus" NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credited_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "network" "ChainKey" NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "network_fee" DECIMAL(20,6) NOT NULL,
    "platform_fee" DECIMAL(20,6) NOT NULL,
    "net_amount" DECIMAL(20,6) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL,
    "risk_level" "AmlRiskLevel",
    "risk_flags" JSONB NOT NULL DEFAULT '[]',
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "requires_four_eyes" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT NOT NULL,
    "tx_hash" TEXT,
    "broadcast_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_events" (
    "id" UUID NOT NULL,
    "withdrawal_id" UUID NOT NULL,
    "from_status" "WithdrawalStatus",
    "to_status" "WithdrawalStatus" NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "network_fee" DECIMAL(20,6),
    "platform_fee" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(20,6) NOT NULL,
    "direction" TEXT NOT NULL,
    "network" "ChainKey",
    "tx_hash" TEXT,
    "description" TEXT NOT NULL,
    "deposit_id" UUID,
    "withdrawal_id" UUID,
    "round_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "user_id" UUID,
    "round_id" UUID,
    "network" "ChainKey",
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_postings" (
    "id" UUID NOT NULL,
    "kind" "LedgerPostingKind" NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "event_key" TEXT,
    "transaction_id" UUID,
    "round_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "posting_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_ledger" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "posting_id" UUID NOT NULL,
    "user_id" UUID,
    "kind" TEXT NOT NULL,
    "entry_count" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(20,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pool_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_ledger" (
    "id" UUID NOT NULL,
    "posting_id" UUID NOT NULL,
    "user_id" UUID,
    "round_id" UUID,
    "kind" TEXT NOT NULL,
    "entry_count" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(20,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "entry_price" DECIMAL(20,6) NOT NULL,
    "platform_fee_per_entry" DECIMAL(20,6) NOT NULL,
    "min_participants" INTEGER NOT NULL,
    "min_pool" DECIMAL(20,6) NOT NULL,
    "prize_split_bps" INTEGER[],
    "entries_count" INTEGER NOT NULL DEFAULT 0,
    "participants_count" INTEGER NOT NULL DEFAULT 0,
    "pool_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "platform_fees" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "thresholds_met" BOOLEAN,
    "entries_merkle_root" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "settled_at" TIMESTAMP(3),
    "onchain_round_id" BIGINT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'active',
    "transaction_id" UUID,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "winners" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "tier" "PrizeTier" NOT NULL,
    "entry_id" UUID,
    "entry_seq" INTEGER,
    "user_id" UUID,
    "handle_snapshot" TEXT,
    "amount" DECIMAL(20,6) NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_claims" (
    "id" UUID NOT NULL,
    "winner_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "status" "PrizeClaimStatus" NOT NULL DEFAULT 'owed',
    "claimed_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prize_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "randomness_requests" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "provider" "RandomnessProviderKind" NOT NULL,
    "status" "RandomnessStatus" NOT NULL,
    "request_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "network" "ChainKey",
    "request_tx_hash" TEXT,
    "fulfill_tx_hash" TEXT,
    "block_number" BIGINT,
    "confirmations" INTEGER,
    "random_word" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "fulfilled_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "randomness_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "mechanic" TEXT NOT NULL,
    "house_edge_percent" DECIMAL(6,3),
    "edge_label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "players_demo" INTEGER,
    "details" TEXT[],
    "mode" TEXT NOT NULL DEFAULT 'simulation',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'active',
    "server_seed_hash" TEXT NOT NULL,
    "server_seed" TEXT,
    "client_seed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "is_simulation" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_results" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "nonce" INTEGER NOT NULL,
    "outcome" JSONB NOT NULL,
    "stake" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "payout" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_user_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "qualified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_levels" (
    "id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "tier" "VipTier" NOT NULL,
    "label" TEXT NOT NULL,
    "min_points" INTEGER NOT NULL,
    "level_up_reward" DECIMAL(20,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vip_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" "AdminUserStatus" NOT NULL DEFAULT 'active',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "requires_reason" BOOLEAN NOT NULL DEFAULT false,
    "requires_mfa" BOOLEAN NOT NULL DEFAULT false,
    "four_eyes" TEXT NOT NULL DEFAULT 'never',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "admin_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_user_id","role_id")
);

-- CreateTable
CREATE TABLE "admin_approvals" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "requested_by_admin_id" UUID NOT NULL,
    "request_reason" TEXT NOT NULL,
    "decided_by_admin_id" UUID,
    "decision_reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_id" TEXT,
    "actor_label" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "reason" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'success',
    "ip" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER,
    "response" JSONB,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_cursors" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "last_block" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_privy_user_id_key" ON "users"("privy_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_country_idx" ON "user_profiles"("country");

-- CreateIndex
CREATE INDEX "user_wallets_address_idx" ON "user_wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_user_id_network_address_key" ON "user_wallets"("user_id", "network", "address");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_address_key" ON "deposit_addresses"("address");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_user_id_network_key" ON "deposit_addresses"("user_id", "network");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_addresses_network_xpub_fingerprint_derivation_index_key" ON "deposit_addresses"("network", "xpub_fingerprint", "derivation_index");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE INDEX "sessions_admin_user_id_idx" ON "sessions"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_id_privy_session_id_key" ON "sessions"("user_id", "privy_session_id");

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_idx" ON "email_verifications"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "totp_secrets_user_id_key" ON "totp_secrets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "totp_secrets_admin_user_id_key" ON "totp_secrets"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "totp_backup_codes_totp_secret_id_code_hash_key" ON "totp_backup_codes"("totp_secret_id", "code_hash");

-- CreateIndex
CREATE INDEX "user_restrictions_user_id_lifted_at_idx" ON "user_restrictions"("user_id", "lifted_at");

-- CreateIndex
CREATE INDEX "kyc_records_user_id_created_at_idx" ON "kyc_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "kyc_records_status_idx" ON "kyc_records"("status");

-- CreateIndex
CREATE INDEX "aml_alerts_status_risk_level_idx" ON "aml_alerts"("status", "risk_level");

-- CreateIndex
CREATE INDEX "aml_alerts_user_id_idx" ON "aml_alerts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "geo_rules_country_code_key" ON "geo_rules"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "responsible_gaming_limits_user_id_type_period_key" ON "responsible_gaming_limits"("user_id", "type", "period");

-- CreateIndex
CREATE INDEX "responsible_gaming_self_exclusions_user_id_ends_at_idx" ON "responsible_gaming_self_exclusions"("user_id", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "responsible_gaming_settings_user_id_key" ON "responsible_gaming_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_number_key" ON "deposits"("number");

-- CreateIndex
CREATE INDEX "deposits_user_id_created_at_idx" ON "deposits"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "deposits_status_idx" ON "deposits"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_network_tx_hash_log_index_key" ON "deposits"("network", "tx_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_number_key" ON "withdrawals"("number");

-- CreateIndex
CREATE INDEX "withdrawals_status_created_at_idx" ON "withdrawals"("status", "created_at");

-- CreateIndex
CREATE INDEX "withdrawals_user_id_created_at_idx" ON "withdrawals"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_user_id_idempotency_key_key" ON "withdrawals"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "withdrawal_events_withdrawal_id_created_at_idx" ON "withdrawal_events"("withdrawal_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_user_id_type_status_idx" ON "transactions"("user_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");

-- CreateIndex
CREATE INDEX "ledger_accounts_type_idx" ON "ledger_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_type_user_id_key" ON "ledger_accounts"("type", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_type_round_id_key" ON "ledger_accounts"("type", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_postings_event_key_key" ON "ledger_postings"("event_key");

-- CreateIndex
CREATE INDEX "ledger_postings_kind_created_at_idx" ON "ledger_postings"("kind", "created_at");

-- CreateIndex
CREATE INDEX "ledger_postings_reference_idx" ON "ledger_postings"("reference");

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_created_at_idx" ON "ledger_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_posting_id_idx" ON "ledger_entries"("posting_id");

-- CreateIndex
CREATE INDEX "ledger_entries_user_id_idx" ON "ledger_entries"("user_id");

-- CreateIndex
CREATE INDEX "pool_ledger_round_id_created_at_idx" ON "pool_ledger"("round_id", "created_at");

-- CreateIndex
CREATE INDEX "fee_ledger_round_id_idx" ON "fee_ledger"("round_id");

-- CreateIndex
CREATE INDEX "fee_ledger_created_at_idx" ON "fee_ledger"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_number_key" ON "rounds"("number");

-- CreateIndex
CREATE INDEX "rounds_status_closes_at_idx" ON "rounds"("status", "closes_at");

-- CreateIndex
CREATE UNIQUE INDEX "entries_code_key" ON "entries"("code");

-- CreateIndex
CREATE INDEX "entries_round_id_user_id_idx" ON "entries"("round_id", "user_id");

-- CreateIndex
CREATE INDEX "entries_user_id_created_at_idx" ON "entries"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "entries_round_id_seq_key" ON "entries"("round_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "winners_entry_id_key" ON "winners"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "winners_round_id_rank_key" ON "winners"("round_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "prize_claims_winner_id_key" ON "prize_claims"("winner_id");

-- CreateIndex
CREATE INDEX "prize_claims_user_id_status_idx" ON "prize_claims"("user_id", "status");

-- CreateIndex
CREATE INDEX "randomness_requests_round_id_status_idx" ON "randomness_requests"("round_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "randomness_requests_provider_request_id_key" ON "randomness_requests"("provider", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_category_sort_order_idx" ON "games"("category", "sort_order");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_started_at_idx" ON "game_sessions"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_session_id_nonce_key" ON "game_results"("session_id", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_user_id_idx" ON "referrals"("referrer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vip_levels_level_key" ON "vip_levels"("level");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_key_key" ON "admin_roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_key_key" ON "admin_permissions"("key");

-- CreateIndex
CREATE INDEX "admin_approvals_status_created_at_idx" ON "admin_approvals"("status", "created_at");

-- CreateIndex
CREATE INDEX "admin_approvals_target_type_target_id_idx" ON "admin_approvals"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_seq_key" ON "audit_logs"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_hash_key" ON "audit_logs"("hash");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_scope_owner_id_key_key" ON "idempotency_keys"("scope", "owner_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "chain_cursors_key_key" ON "chain_cursors"("key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_addresses" ADD CONSTRAINT "deposit_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "totp_secrets" ADD CONSTRAINT "totp_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "totp_secrets" ADD CONSTRAINT "totp_secrets_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "totp_backup_codes" ADD CONSTRAINT "totp_backup_codes_totp_secret_id_fkey" FOREIGN KEY ("totp_secret_id") REFERENCES "totp_secrets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_applied_by_admin_id_fkey" FOREIGN KEY ("applied_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_restrictions" ADD CONSTRAINT "user_restrictions_lifted_by_admin_id_fkey" FOREIGN KEY ("lifted_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_gaming_limits" ADD CONSTRAINT "responsible_gaming_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_gaming_self_exclusions" ADD CONSTRAINT "responsible_gaming_self_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsible_gaming_settings" ADD CONSTRAINT "responsible_gaming_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_events" ADD CONSTRAINT "withdrawal_events_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "ledger_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_ledger" ADD CONSTRAINT "pool_ledger_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_ledger" ADD CONSTRAINT "pool_ledger_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "ledger_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_posting_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "ledger_postings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "winners" ADD CONSTRAINT "winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_claims" ADD CONSTRAINT "prize_claims_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "winners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_claims" ADD CONSTRAINT "prize_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "randomness_requests" ADD CONSTRAINT "randomness_requests_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "admin_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_approvals" ADD CONSTRAINT "admin_approvals_requested_by_admin_id_fkey" FOREIGN KEY ("requested_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_approvals" ADD CONSTRAINT "admin_approvals_decided_by_admin_id_fkey" FOREIGN KEY ("decided_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- GLOBAL POOL integrity guards (hand-written; keep in every environment)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Ledger lines are never zero.
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_amount_nonzero" CHECK ("amount" <> 0);
ALTER TABLE "pool_ledger" ADD CONSTRAINT "pool_ledger_amount_nonzero" CHECK ("amount" <> 0);
ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_amount_nonzero" CHECK ("amount" <> 0);
-- Money columns that can never be negative.
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_amounts_non_negative"
  CHECK ("amount" > 0 AND "network_fee" >= 0 AND "platform_fee" >= 0 AND "net_amount" >= 0);
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_counters_non_negative"
  CHECK ("entries_count" >= 0 AND "participants_count" >= 0 AND "pool_amount" >= 0 AND "platform_fees" >= 0);

-- Append-only tables: UPDATE / DELETE are rejected; TRUNCATE only when the session explicitly opts in
-- (SET gp.allow_truncate = 'on' — test resets only).
CREATE OR REPLACE FUNCTION gp_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'GP_APPEND_ONLY: % on % is not allowed (append-only table)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END $$;

CREATE OR REPLACE FUNCTION gp_reject_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('gp.allow_truncate', true), '') = 'on' THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'GP_APPEND_ONLY: TRUNCATE on % is not allowed (append-only table)', TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_postings', 'ledger_entries', 'pool_ledger', 'fee_ledger', 'audit_logs', 'withdrawal_events']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION gp_reject_mutation()', t || '_append_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION gp_reject_truncate()', t || '_no_truncate', t);
  END LOOP;
END $$;

-- Double-entry: every posting must have >= 2 lines that sum to exactly zero, checked at COMMIT.
CREATE OR REPLACE FUNCTION gp_check_posting_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  total numeric;
  n integer;
BEGIN
  SELECT coalesce(sum("amount"), 0), count(*) INTO total, n FROM "ledger_entries" WHERE "posting_id" = NEW."posting_id";
  IF n < 2 THEN
    RAISE EXCEPTION 'GP_LEDGER_UNBALANCED: posting % has % line(s), at least 2 required', NEW."posting_id", n
      USING ERRCODE = 'check_violation';
  END IF;
  IF total <> 0 THEN
    RAISE EXCEPTION 'GP_LEDGER_UNBALANCED: posting % sums to % (must be 0)', NEW."posting_id", total
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER "ledger_entries_balanced"
  AFTER INSERT ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION gp_check_posting_balanced();
