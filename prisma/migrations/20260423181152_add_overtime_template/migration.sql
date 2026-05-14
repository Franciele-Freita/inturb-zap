-- CreateTable
CREATE TABLE "OvertimeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workProfiles" JSONB,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OvertimeTemplate_isActive_updatedAt_idx" ON "OvertimeTemplate"("isActive", "updatedAt");

-- RenameIndex
ALTER INDEX "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_code_ke" RENAME TO "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_cod_key";

-- RenameIndex
ALTER INDEX "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_isActiv" RENAME TO "CompanyEmploymentLinkageRule_companyEmploymentLinkageId_isA_idx";
