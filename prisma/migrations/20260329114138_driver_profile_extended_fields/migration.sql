-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "authorizedCategories" JSONB,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "complianceHistory" JSONB,
ADD COLUMN     "contract" JSONB,
ADD COLUMN     "contractProfile" TEXT,
ADD COLUMN     "driverLicense" JSONB,
ADD COLUMN     "emergencyContacts" JSONB,
ADD COLUMN     "journey" JSONB,
ADD COLUMN     "toxicology" JSONB;
