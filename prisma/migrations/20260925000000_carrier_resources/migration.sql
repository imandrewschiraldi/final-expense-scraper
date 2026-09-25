-- CreateTable
CREATE TABLE "carrier_contacts" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrier_links" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isAgentPortal" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrier_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carrier_contacts_carrierId_idx" ON "carrier_contacts"("carrierId");

-- CreateIndex
CREATE INDEX "carrier_links_carrierId_idx" ON "carrier_links"("carrierId");

-- AddForeignKey
ALTER TABLE "carrier_contacts" ADD CONSTRAINT "carrier_contacts_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrier_links" ADD CONSTRAINT "carrier_links_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
