ALTER TABLE "TimeEntry"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

ALTER TABLE "TimeAdjustmentRequest"
ADD COLUMN "requestedByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

CREATE INDEX "TimeEntry_createdByUserId_idx" ON "TimeEntry"("createdByUserId");
CREATE INDEX "TimeEntry_updatedByUserId_idx" ON "TimeEntry"("updatedByUserId");
CREATE INDEX "TimeAdjustmentRequest_requestedByUserId_idx" ON "TimeAdjustmentRequest"("requestedByUserId");
CREATE INDEX "TimeAdjustmentRequest_updatedByUserId_idx" ON "TimeAdjustmentRequest"("updatedByUserId");

ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimeAdjustmentRequest"
ADD CONSTRAINT "TimeAdjustmentRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimeAdjustmentRequest"
ADD CONSTRAINT "TimeAdjustmentRequest_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
