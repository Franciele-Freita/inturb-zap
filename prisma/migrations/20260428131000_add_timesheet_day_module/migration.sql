CREATE TABLE "TimeSheetDay" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "workProfileTemplateId" TEXT,
    "journeyTemplateId" TEXT,
    "expectedMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "latenessMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "hasOpenIssues" BOOLEAN NOT NULL DEFAULT false,
    "openIssueCount" INTEGER NOT NULL DEFAULT 0,
    "calculationMeta" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSheetDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimeSheetDay_driverId_dateKey_key" ON "TimeSheetDay"("driverId", "dateKey");
CREATE INDEX "TimeSheetDay_dateKey_idx" ON "TimeSheetDay"("dateKey");
CREATE INDEX "TimeSheetDay_driverId_calculatedAt_idx" ON "TimeSheetDay"("driverId", "calculatedAt");

ALTER TABLE "TimeSheetDay" ADD CONSTRAINT "TimeSheetDay_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
