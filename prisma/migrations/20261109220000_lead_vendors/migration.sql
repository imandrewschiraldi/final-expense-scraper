-- CreateTable
CREATE TABLE "lead_vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "logoOnLight" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_vendors_order_idx" ON "lead_vendors"("order");

-- Seed with the vendors that were previously hardcoded in lib/vendors.ts,
-- so switching the Buy Leads page over to the database loses no data.
INSERT INTO "lead_vendors" ("id", "name", "description", "bullets", "url", "logoUrl", "logoOnLight", "order", "updatedAt") VALUES
('leadvendor-seed-proven-leads', 'Proven Lead Solutions', NULL, ARRAY[]::TEXT[], 'https://provenleadsolutions.com/', '/vendor-logos/proven-leads.png', true, 0, CURRENT_TIMESTAMP),
('leadvendor-seed-closr-leads', 'Closr Leads', 'Unlimited lead dialers, plus real-time and aged insurance leads.', ARRAY['Final Expense, Veteran, Trucker, Mortgage Protection & IUL', 'Built-in dialer to work leads the moment they come in', 'Delivered straight to your CRM'], 'https://closrleads.com/go.php?c=TIER1FINANCIAL', '/vendor-logos/closr-leads.png', false, 1, CURRENT_TIMESTAMP),
('leadvendor-seed-goat-leads', 'G.O.A.T Leads', NULL, ARRAY[]::TEXT[], 'https://goatleads.com/', '/vendor-logos/goat-leads.png', false, 2, CURRENT_TIMESTAMP),
('leadvendor-seed-titan-leads', 'Titan Leads', NULL, ARRAY[]::TEXT[], 'https://www.titanleadsolutions.com/', '/vendor-logos/titan-leads.png', false, 3, CURRENT_TIMESTAMP),
('leadvendor-seed-iloveleads', 'ILoveLeads', 'Purchase qualified data leads.', ARRAY['Real-time leads', 'Pre-booked appointments', 'Unlimited inbound lead dialer — blast leads from your own Twilio, Telnyx or SignalHouse numbers (or one they register for you); their AI reads every reply, sorts who''s interested, and books the appointment for $0.01/sms'], 'https://iloveleads.com/outbound-suite?ref=ANDREW-91', '/vendor-logos/ilove-leads.png', true, 4, CURRENT_TIMESTAMP);
