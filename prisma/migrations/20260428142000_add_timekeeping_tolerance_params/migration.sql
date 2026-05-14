ALTER TABLE "CompanyProfileConfig"
ADD COLUMN "toleranceMarkingMinutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "toleranceDailyMaxMinutes" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "WorkProfileTemplate"
ADD COLUMN "toleranceMarkingMinutes" INTEGER,
ADD COLUMN "toleranceDailyMaxMinutes" INTEGER;
