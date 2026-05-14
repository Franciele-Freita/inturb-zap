-- CreateEnum
CREATE TYPE "TimeAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TimeAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "reason" TEXT NOT NULL,
    "requestedKind" "TimeEntryKind",
    "requestedOccurredAt" TIMESTAMP(3),
    "requestedTimezone" TEXT,
    "requestedGeo" JSONB,
    "requestedNotes" TEXT,
    "originalSnapshot" JSONB,
    "requestedSnapshot" JSONB,
    "status" "TimeAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeAdjustmentRequest_driverId_status_createdAt_idx" ON "TimeAdjustmentRequest"("driverId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TimeAdjustmentRequest_timeEntryId_idx" ON "TimeAdjustmentRequest"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeAdjustmentRequest_status_createdAt_idx" ON "TimeAdjustmentRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TimeAdjustmentRequest" ADD CONSTRAINT "TimeAdjustmentRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAdjustmentRequest" ADD CONSTRAINT "TimeAdjustmentRequest_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
