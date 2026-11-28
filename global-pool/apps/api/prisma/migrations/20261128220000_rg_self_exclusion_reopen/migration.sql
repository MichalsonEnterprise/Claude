-- R06: a long self-exclusion (6m / 1y / 5y) no longer reopens by itself at its end date. The player must request
-- reopening, wait a 24 h cool-down, set deposit + loss limits and confirm. Additive and nullable.
ALTER TABLE "responsible_gaming_self_exclusions"
  ADD COLUMN "reopen_requested_at" TIMESTAMP(3),
  ADD COLUMN "reopened_at" TIMESTAMP(3);

-- Self-exclusions that had already ended before this rule existed were reopened under the old behaviour: keep them
-- reopened (DEMO data only) instead of closing those accounts again retroactively.
UPDATE "responsible_gaming_self_exclusions"
   SET "reopened_at" = "ends_at"
 WHERE "ends_at" IS NOT NULL
   AND "ends_at" <= CURRENT_TIMESTAMP
   AND "duration" NOT IN ('24h', '7d', '30d');
