-- AlterTable
ALTER TABLE "WorkJourneyTemplate"
ADD COLUMN "dsrEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dsrWeeklyRestDay" "DsrWeeklyRestDay",
ADD COLUMN "dsrReflectOvertime" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dsrReflectNight" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dsrLoseOnUnjustifiedAbsence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dsrDescription" TEXT;

-- Backfill from old DSR policy relation when available
UPDATE "WorkJourneyTemplate" AS journey
SET
  "dsrEnabled" = true,
  "dsrWeeklyRestDay" = policy."weeklyRestDay",
  "dsrReflectOvertime" = policy."reflectOvertime",
  "dsrReflectNight" = policy."reflectNight",
  "dsrLoseOnUnjustifiedAbsence" = policy."loseOnUnjustifiedAbsence",
  "dsrDescription" = policy."description"
FROM "DsrPolicy" AS policy
WHERE journey."dsrPolicyId" = policy."id";

-- DropForeignKey
ALTER TABLE "WorkJourneyTemplate" DROP CONSTRAINT "WorkJourneyTemplate_dsrPolicyId_fkey";

-- DropIndex
DROP INDEX "WorkJourneyTemplate_dsrPolicyId_idx";

-- AlterTable
ALTER TABLE "WorkJourneyTemplate" DROP COLUMN "dsrPolicyId";

-- DropTable
DROP TABLE "DsrPolicy";
