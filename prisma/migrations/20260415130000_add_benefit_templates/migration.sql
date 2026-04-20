-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('FIXED', 'PERCENTAGE', 'VARIABLE', 'INFORMATIVE');

-- CreateEnum
CREATE TYPE "BenefitFrequency" AS ENUM ('MONTHLY', 'DAILY', 'PER_USE', 'PER_TRIP', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BenefitApplicationMode" AS ENUM ('PER_EMPLOYEE', 'PER_DAY_WORKED', 'PER_TRIP');

-- CreateTable
CREATE TABLE "BenefitTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" "BenefitType" NOT NULL,
    "frequency" "BenefitFrequency" NOT NULL,
    "applicationMode" "BenefitApplicationMode" NOT NULL,
    "valueConfig" JSONB NOT NULL,
    "deductFromSalary" BOOLEAN NOT NULL DEFAULT false,
    "incursCharges" BOOLEAN NOT NULL DEFAULT false,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "editableInContract" BOOLEAN NOT NULL DEFAULT true,
    "workProfiles" JSONB,
    "contractProfiles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenefitTemplate_isActive_type_updatedAt_idx" ON "BenefitTemplate"("isActive", "type", "updatedAt");
