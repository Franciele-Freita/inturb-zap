-- CreateEnum
CREATE TYPE "HolidayScopeType" AS ENUM ('NATIONAL', 'STATE', 'CITY');

-- CreateEnum
CREATE TYPE "DsrWeeklyRestDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "DriverLeavePeriodType" AS ENUM ('VACATION', 'LEAVE', 'SUSPENSION');

-- AlterTable
ALTER TABLE "WorkProfileTemplate"
ADD COLUMN "usesNightPolicy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nightTemplateId" TEXT,
ADD COLUMN "nightTemplateName" TEXT,
ADD COLUMN "nightSummary" TEXT,
ADD COLUMN "dsrPolicyId" TEXT,
ADD COLUMN "dsrPolicyName" TEXT,
ADD COLUMN "dsrSummary" TEXT,
ADD COLUMN "holidayScopeType" "HolidayScopeType",
ADD COLUMN "holidayStateCode" TEXT,
ADD COLUMN "holidayCityCode" TEXT,
ADD COLUMN "holidaySummary" TEXT;

-- CreateTable
CREATE TABLE "Holiday" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "scopeType" "HolidayScopeType" NOT NULL DEFAULT 'NATIONAL',
  "stateCode" TEXT,
  "cityCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DsrPolicy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "weeklyRestDay" "DsrWeeklyRestDay" NOT NULL DEFAULT 'SUN',
  "reflectOvertime" BOOLEAN NOT NULL DEFAULT true,
  "reflectNight" BOOLEAN NOT NULL DEFAULT true,
  "loseOnUnjustifiedAbsence" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DsrPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLeavePeriod" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "type" "DriverLeavePeriodType" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DriverLeavePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkProfileTemplate_dsrPolicyId_idx" ON "WorkProfileTemplate"("dsrPolicyId");

-- CreateIndex
CREATE INDEX "Holiday_date_isActive_idx" ON "Holiday"("date", "isActive");

-- CreateIndex
CREATE INDEX "Holiday_scopeType_stateCode_cityCode_isActive_idx" ON "Holiday"("scopeType", "stateCode", "cityCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_scopeType_stateCode_cityCode_name_key" ON "Holiday"("date", "scopeType", "stateCode", "cityCode", "name");

-- CreateIndex
CREATE INDEX "DsrPolicy_isActive_updatedAt_idx" ON "DsrPolicy"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "DriverLeavePeriod_driverId_startDate_endDate_idx" ON "DriverLeavePeriod"("driverId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "DriverLeavePeriod_type_startDate_endDate_idx" ON "DriverLeavePeriod"("type", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "WorkProfileTemplate"
ADD CONSTRAINT "WorkProfileTemplate_dsrPolicyId_fkey"
FOREIGN KEY ("dsrPolicyId") REFERENCES "DsrPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLeavePeriod"
ADD CONSTRAINT "DriverLeavePeriod_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
