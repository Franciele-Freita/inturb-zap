-- CreateEnum
CREATE TYPE "TimeEntryIssueCode" AS ENUM ('UNEXPECTED_FIRST_ENTRY', 'INVALID_SEQUENCE', 'MISSING_BREAK_END', 'MISSING_OUT');

-- CreateEnum
CREATE TYPE "TimeEntryIssueSeverity" AS ENUM ('WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "TimeEntryIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'AUTO_RESOLVED');

-- CreateTable
CREATE TABLE "TimeEntryIssue" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "code" "TimeEntryIssueCode" NOT NULL,
    "severity" "TimeEntryIssueSeverity" NOT NULL,
    "status" "TimeEntryIssueStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "entryIds" JSONB NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntryIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryIssue_externalKey_key" ON "TimeEntryIssue"("externalKey");

-- CreateIndex
CREATE INDEX "TimeEntryIssue_driverId_dateKey_idx" ON "TimeEntryIssue"("driverId", "dateKey");

-- CreateIndex
CREATE INDEX "TimeEntryIssue_status_dateKey_idx" ON "TimeEntryIssue"("status", "dateKey");

-- CreateIndex
CREATE INDEX "TimeEntryIssue_code_dateKey_idx" ON "TimeEntryIssue"("code", "dateKey");

-- AddForeignKey
ALTER TABLE "TimeEntryIssue" ADD CONSTRAINT "TimeEntryIssue_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
