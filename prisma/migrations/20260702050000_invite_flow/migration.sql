-- AlterTable
ALTER TABLE "users"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "inviteTokenHash" TEXT,
  ADD COLUMN "inviteTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "invitedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_inviteTokenHash_key" ON "users"("inviteTokenHash");
