-- AlterTable
ALTER TABLE "chat_channels" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "chat_channel_members" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_channel_members_userId_idx" ON "chat_channel_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channel_members_channelId_userId_key" ON "chat_channel_members"("channelId", "userId");

-- AddForeignKey
ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
