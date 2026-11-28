-- CreateEnum
CREATE TYPE "PhoneType" AS ENUM ('MOBILE', 'HOME', 'WORK', 'OTHER');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "dndAll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dndChannels" JSONB;

-- AlterTable
ALTER TABLE "smart_lists" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lead_emails" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_phones" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "PhoneType" NOT NULL DEFAULT 'MOBILE',
    "countryCode" TEXT NOT NULL DEFAULT '+1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_colors" (
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_colors_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "lead_emails_leadId_idx" ON "lead_emails"("leadId");

-- CreateIndex
CREATE INDEX "lead_phones_leadId_idx" ON "lead_phones"("leadId");

-- AddForeignKey
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
