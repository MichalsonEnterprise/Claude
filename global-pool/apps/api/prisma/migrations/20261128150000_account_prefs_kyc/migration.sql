-- Account module (USR-A1…A10, AUTH-11…17): account preferences + KYC flow data.
-- Additive only: two JSONB columns with defaults, no data rewrite.

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "kyc_records" ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';
