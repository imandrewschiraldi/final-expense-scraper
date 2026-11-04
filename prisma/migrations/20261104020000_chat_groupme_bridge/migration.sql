-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalAvatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_channelId_externalId_key" ON "chat_messages"("channelId", "externalId");

-- CreateTable
CREATE TABLE "chat_groupme_bridges" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "groupMeGroupId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "chat_groupme_bridges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_groupme_bridges_channelId_key" ON "chat_groupme_bridges"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_groupme_bridges_webhookToken_key" ON "chat_groupme_bridges"("webhookToken");

-- AddForeignKey
ALTER TABLE "chat_groupme_bridges" ADD CONSTRAINT "chat_groupme_bridges_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groupme_bridges" ADD CONSTRAINT "chat_groupme_bridges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
