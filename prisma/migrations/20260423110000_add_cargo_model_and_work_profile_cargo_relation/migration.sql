CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "levels" JSONB NOT NULL,
    "cboCode" TEXT,
    "cboTitle" TEXT,
    "unhealthyAllowance" TEXT NOT NULL DEFAULT 'NONE',
    "hazardousAllowance" TEXT NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cargo_name_department_key" ON "Cargo"("name", "department");
CREATE INDEX "Cargo_isActive_name_idx" ON "Cargo"("isActive", "name");

ALTER TABLE "WorkProfileTemplate"
ADD COLUMN "cargoId" TEXT;

CREATE INDEX "WorkProfileTemplate_cargoId_idx" ON "WorkProfileTemplate"("cargoId");

ALTER TABLE "WorkProfileTemplate"
ADD CONSTRAINT "WorkProfileTemplate_cargoId_fkey"
FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
