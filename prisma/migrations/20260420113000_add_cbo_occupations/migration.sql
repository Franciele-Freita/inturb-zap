-- CreateTable
CREATE TABLE "CboOccupation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CboOccupation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CboOccupation_code_key" ON "CboOccupation"("code");

-- CreateIndex
CREATE INDEX "CboOccupation_isActive_title_idx" ON "CboOccupation"("isActive", "title");

-- CreateIndex
CREATE INDEX "CboOccupation_title_idx" ON "CboOccupation"("title");
