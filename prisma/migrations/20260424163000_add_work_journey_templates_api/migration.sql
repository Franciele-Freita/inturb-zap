-- CreateTable
CREATE TABLE "WorkJourneyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL,
    "allowedDays" JSONB NOT NULL,
    "breakType" TEXT NOT NULL,
    "breakDurationMinutes" INTEGER,
    "maxHoursPerDay" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "fixedConfig" JSONB,
    "flexibleConfig" JSONB,
    "intermittentConfig" JSONB,
    "dsrPolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkJourneyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkJourneyTemplate_isActive_updatedAt_idx" ON "WorkJourneyTemplate"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkJourneyTemplate_type_isActive_idx" ON "WorkJourneyTemplate"("type", "isActive");

-- CreateIndex
CREATE INDEX "WorkJourneyTemplate_dsrPolicyId_idx" ON "WorkJourneyTemplate"("dsrPolicyId");

-- AddForeignKey
ALTER TABLE "WorkJourneyTemplate" ADD CONSTRAINT "WorkJourneyTemplate_dsrPolicyId_fkey" FOREIGN KEY ("dsrPolicyId") REFERENCES "DsrPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;