-- CreateTable
CREATE TABLE "agency_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "leaderboardAllTimeEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "agency_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the one row every read/write in the app assumes already exists.
INSERT INTO "agency_settings" ("id", "leaderboardAllTimeEnabled") VALUES ('singleton', false);
