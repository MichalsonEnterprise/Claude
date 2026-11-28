-- rg-history: RG session tracking, session-length limit, quiet hours, reality-check toggles, pending limit
-- removal, and favourite games. Additive only (new nullable / defaulted columns + one new table).

ALTER TABLE "responsible_gaming_limits" ADD COLUMN "pending_removal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "responsible_gaming_settings"
  ADD COLUMN "reality_check_pause" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reality_check_push" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_activity_at" TIMESTAMP(3),
  ADD COLUMN "played_day" DATE,
  ADD COLUMN "played_today_seconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sessions_today" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "session_limit_minutes" INTEGER,
  ADD COLUMN "pending_session_limit_minutes" INTEGER,
  ADD COLUMN "pending_session_limit_removal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pending_session_limit_at" TIMESTAMP(3),
  ADD COLUMN "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "quiet_start_minute" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "quiet_end_minute" INTEGER NOT NULL DEFAULT 420,
  ADD COLUMN "pending_quiet_off_at" TIMESTAMP(3);

ALTER TABLE "responsible_gaming_settings"
  ADD CONSTRAINT "rg_settings_quiet_minutes_range"
  CHECK ("quiet_start_minute" BETWEEN 0 AND 1439 AND "quiet_end_minute" BETWEEN 0 AND 1439);

CREATE TABLE "user_favourite_games" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favourite_games_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_favourite_games_user_id_game_id_key" ON "user_favourite_games"("user_id", "game_id");
CREATE INDEX "user_favourite_games_user_id_created_at_idx" ON "user_favourite_games"("user_id", "created_at");
ALTER TABLE "user_favourite_games" ADD CONSTRAINT "user_favourite_games_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_favourite_games" ADD CONSTRAINT "user_favourite_games_game_id_fkey"
  FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
