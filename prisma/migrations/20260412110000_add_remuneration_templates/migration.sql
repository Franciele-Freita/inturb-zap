-- CreateEnum
CREATE TYPE "RemunerationTemplateWorkerType" AS ENUM ('DRIVER');

-- CreateTable
CREATE TABLE "RemunerationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workerType" "RemunerationTemplateWorkerType" NOT NULL DEFAULT 'DRIVER',
    "contractProfile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemunerationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemunerationTemplate_workerType_isActive_createdAt_idx" ON "RemunerationTemplate"("workerType", "isActive", "createdAt");
