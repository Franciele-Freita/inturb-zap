-- CreateEnum
CREATE TYPE "TimeEntryKind" AS ENUM ('IN', 'OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('APP', 'WEB', 'ADMIN', 'IMPORT');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('REGISTERED', 'ADJUSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "kind" "TimeEntryKind" NOT NULL,
    "source" "TimeEntrySource" NOT NULL DEFAULT 'APP',
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'REGISTERED',
    "timezone" TEXT,
    "deviceMeta" JSONB,
    "geo" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_driverId_occurredAt_idx" ON "TimeEntry"("driverId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimeEntry_occurredAt_idx" ON "TimeEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "TimeEntry_kind_occurredAt_idx" ON "TimeEntry"("kind", "occurredAt");

-- CreateIndex
CREATE INDEX "TimeEntry_status_occurredAt_idx" ON "TimeEntry"("status", "occurredAt");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
