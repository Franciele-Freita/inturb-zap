ALTER TABLE "CompanyProfileConfig"
ADD COLUMN "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "geofenceBaseLatitude" DECIMAL(9,6),
ADD COLUMN "geofenceBaseLongitude" DECIMAL(9,6),
ADD COLUMN "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150;
