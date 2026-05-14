CREATE TABLE "TimeSheetPeriod" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "expectedMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "normalMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "latenessMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceDays" INTEGER NOT NULL DEFAULT 0,
    "workedDays" INTEGER NOT NULL DEFAULT 0,
    "openIssueDays" INTEGER NOT NULL DEFAULT 0,
    "openIssueCount" INTEGER NOT NULL DEFAULT 0,
    "rulesSnapshot" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSheetPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimeSheetPeriod_driverId_periodKey_key" ON "TimeSheetPeriod"("driverId", "periodKey");
CREATE INDEX "TimeSheetPeriod_periodKey_idx" ON "TimeSheetPeriod"("periodKey");
CREATE INDEX "TimeSheetPeriod_driverId_calculatedAt_idx" ON "TimeSheetPeriod"("driverId", "calculatedAt");

ALTER TABLE "TimeSheetPeriod" ADD CONSTRAINT "TimeSheetPeriod_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
