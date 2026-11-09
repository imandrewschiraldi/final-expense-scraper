-- CreateTable
CREATE TABLE "kpi_entries" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "deposits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "leadSpend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "hoursWorked" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "apptsScheduled" INTEGER NOT NULL DEFAULT 0,
    "dials" INTEGER NOT NULL DEFAULT 0,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "apptsShown" INTEGER NOT NULL DEFAULT 0,
    "presentations" INTEGER NOT NULL DEFAULT 0,
    "dealsClosed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_entries_agentId_date_idx" ON "kpi_entries"("agentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_entries_agentId_date_key" ON "kpi_entries"("agentId", "date");

-- AddForeignKey
ALTER TABLE "kpi_entries" ADD CONSTRAINT "kpi_entries_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

