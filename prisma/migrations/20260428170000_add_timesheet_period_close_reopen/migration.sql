CREATE TYPE "TimeSheetPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "TimeSheetPeriodEventAction" AS ENUM ('CLOSE', 'REOPEN');

ALTER TABLE "TimeSheetPeriod"
ADD COLUMN "status" "TimeSheetPeriodStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "reopenedAt" TIMESTAMP(3),
ADD COLUMN "closedByUserId" TEXT,
ADD COLUMN "reopenedByUserId" TEXT,
ADD COLUMN "lockNote" TEXT;

CREATE TABLE "TimeSheetPeriodEvent" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "action" "TimeSheetPeriodEventAction" NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeSheetPeriodEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeSheetPeriod_status_periodKey_idx" ON "TimeSheetPeriod"("status", "periodKey");
CREATE INDEX "TimeSheetPeriodEvent_periodId_createdAt_idx" ON "TimeSheetPeriodEvent"("periodId", "createdAt");
CREATE INDEX "TimeSheetPeriodEvent_action_createdAt_idx" ON "TimeSheetPeriodEvent"("action", "createdAt");

ALTER TABLE "TimeSheetPeriodEvent" ADD CONSTRAINT "TimeSheetPeriodEvent_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TimeSheetPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
