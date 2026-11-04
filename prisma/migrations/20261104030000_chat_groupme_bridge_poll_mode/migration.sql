-- CreateEnum
CREATE TYPE "ChatGroupMeBridgeMode" AS ENUM ('WEBHOOK', 'POLL');

-- AlterTable
ALTER TABLE "chat_groupme_bridges" ADD COLUMN     "mode" "ChatGroupMeBridgeMode" NOT NULL DEFAULT 'WEBHOOK',
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "lastSyncedMessageId" TEXT,
ADD COLUMN     "lastPolledAt" TIMESTAMP(3);
