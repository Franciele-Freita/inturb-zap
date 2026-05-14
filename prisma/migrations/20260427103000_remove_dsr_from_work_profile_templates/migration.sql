-- DropForeignKey
ALTER TABLE "WorkProfileTemplate" DROP CONSTRAINT "WorkProfileTemplate_dsrPolicyId_fkey";

-- DropIndex
DROP INDEX "WorkProfileTemplate_dsrPolicyId_idx";

-- AlterTable
ALTER TABLE "WorkProfileTemplate"
DROP COLUMN "dsrPolicyId",
DROP COLUMN "dsrPolicyName",
DROP COLUMN "dsrSummary";
