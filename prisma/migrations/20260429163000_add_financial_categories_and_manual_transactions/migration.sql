-- CreateEnum
CREATE TYPE "FinancialTransactionCategoryType" AS ENUM ('REVENUE', 'EXPENSE', 'BOTH');

-- CreateEnum
CREATE TYPE "FinancialManualTransactionType" AS ENUM ('EARNING', 'EXPENSE', 'PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinancialManualTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "FinancialTransactionCategory" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialTransactionCategoryType" NOT NULL DEFAULT 'EXPENSE',
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialManualTransaction" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "driverId" TEXT,
    "type" "FinancialManualTransactionType" NOT NULL,
    "status" "FinancialManualTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "categoryCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "referenceId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfManualTransactionId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialManualTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransactionCategory_companyProfileId_code_key" ON "FinancialTransactionCategory"("companyProfileId", "code");

-- CreateIndex
CREATE INDEX "FinancialTransactionCategory_companyProfileId_isActive_sortOrder_name_idx" ON "FinancialTransactionCategory"("companyProfileId", "isActive", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "FinancialManualTransaction_companyProfileId_occurredAt_idx" ON "FinancialManualTransaction"("companyProfileId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialManualTransaction_companyProfileId_driverId_occurredAt_idx" ON "FinancialManualTransaction"("companyProfileId", "driverId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinancialManualTransaction_companyProfileId_categoryCode_occurredAt_idx" ON "FinancialManualTransaction"("companyProfileId", "categoryCode", "occurredAt");

-- AddForeignKey
ALTER TABLE "FinancialTransactionCategory" ADD CONSTRAINT "FinancialTransactionCategory_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfileConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialManualTransaction" ADD CONSTRAINT "FinancialManualTransaction_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfileConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialManualTransaction" ADD CONSTRAINT "FinancialManualTransaction_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialManualTransaction" ADD CONSTRAINT "FinancialManualTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialManualTransaction" ADD CONSTRAINT "FinancialManualTransaction_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
