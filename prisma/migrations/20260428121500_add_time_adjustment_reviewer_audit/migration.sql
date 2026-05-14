ALTER TABLE "TimeAdjustmentRequest"
ADD COLUMN "reviewedByUserId" TEXT;

CREATE INDEX "TimeAdjustmentRequest_reviewedByUserId_idx"
ON "TimeAdjustmentRequest"("reviewedByUserId");

ALTER TABLE "TimeAdjustmentRequest"
ADD CONSTRAINT "TimeAdjustmentRequest_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
