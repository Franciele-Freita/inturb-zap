-- CreateEnum
CREATE TYPE "WorkProfileContractType" AS ENUM ('CLT', 'CLT_INTERMITENTE', 'MEI', 'PJ', 'AUTONOMO');

-- CreateTable
CREATE TABLE "WorkProfileTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cargoName" TEXT NOT NULL,
    "contractType" "WorkProfileContractType" NOT NULL,
    "journeyTemplateId" TEXT,
    "journeyTemplateName" TEXT,
    "journeySummary" TEXT,
    "remuneration" JSONB NOT NULL,
    "usesOvertime" BOOLEAN NOT NULL DEFAULT true,
    "overtimeTemplateId" TEXT,
    "overtimeTemplateName" TEXT,
    "overtimeSummary" TEXT,
    "benefits" JSONB,
    "allowContractEditing" BOOLEAN NOT NULL DEFAULT true,
    "allowJourneyCustomization" BOOLEAN NOT NULL DEFAULT true,
    "allowBenefitsCustomization" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkProfileTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkProfileTemplate_isActive_updatedAt_idx" ON "WorkProfileTemplate"("isActive", "updatedAt");
