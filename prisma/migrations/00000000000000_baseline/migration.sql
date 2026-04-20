-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."DriverCompensationModel" AS ENUM ('PERCENT', 'FLAT', 'DAILY', 'SHIFT', 'SALARY', 'INTERMITTENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."DriverDecisionType" AS ENUM ('ACCEPT', 'REJECT');

-- CreateEnum
CREATE TYPE "public"."DriverOperationalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEAVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."DriverRideStage" AS ENUM ('SCHEDULED', 'EN_ROUTE_PICKUP', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."DriverType" AS ENUM ('AGREGADO', 'FROTA');

-- CreateEnum
CREATE TYPE "public"."FleetAssignmentMode" AS ENUM ('FIXED', 'FLEX');

-- CreateEnum
CREATE TYPE "public"."FleetChecklistInputType" AS ENUM ('BOOLEAN', 'ODOMETER', 'TEXT', 'SELECT', 'NUMBER', 'PHOTO');

-- CreateEnum
CREATE TYPE "public"."FleetChecklistRoutine" AS ENUM ('START_OF_DAY', 'END_OF_DAY');

-- CreateEnum
CREATE TYPE "public"."FleetChecklistTaskActionType" AS ENUM ('NONE', 'REQUIRE_PHOTO', 'OPEN_MAINTENANCE', 'OPEN_SUPPORT_TICKET', 'REQUIRE_NOTE', 'REQUIRE_NUMBER');

-- CreateEnum
CREATE TYPE "public"."FleetMaintenanceTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."FleetMaintenanceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."FleetMaintenanceTaskType" AS ENUM ('GENERAL', 'PREVENTIVE', 'CORRECTIVE', 'ALIGNMENT', 'BALANCING', 'OIL_CHANGE', 'TIRE', 'INSPECTION', 'CLEANING', 'BODYWORK');

-- CreateEnum
CREATE TYPE "public"."FleetVehicleAssignmentValidationMethod" AS ENUM ('QR_CODE', 'PLATE', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."FleetVehicleStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'AUDIO', 'IMAGE', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "public"."PricingRuleAdjustmentType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "public"."PricingRuleScheduleType" AS ENUM ('WEEKLY_WINDOW', 'DATE_RANGE');

-- CreateEnum
CREATE TYPE "public"."RideStatus" AS ENUM ('NEW', 'QUOTED', 'PREBOOKED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."UserGender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'DRIVER');

-- CreateTable
CREATE TABLE "public"."ConversationSession" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WEB_SIMULATOR',
    "customerPhone" TEXT,
    "currentStep" TEXT NOT NULL,
    "latestRideId" TEXT,
    "state" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hasReducedMobility" BOOLEAN,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerFavoriteAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelKey" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFavoriteAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "compensationModel" "public"."DriverCompensationModel",
    "compensationNotes" TEXT,
    "compensationValue" DECIMAL(10,2),
    "useGlobalCompensation" BOOLEAN NOT NULL DEFAULT true,
    "driverType" "public"."DriverType" NOT NULL DEFAULT 'AGREGADO',
    "operationalNotes" TEXT,
    "operationalStatus" "public"."DriverOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultFleetVehicleId" TEXT,
    "fleetAssignmentMode" "public"."FleetAssignmentMode",

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriverCompensationConfig" (
    "id" TEXT NOT NULL,
    "model" "public"."DriverCompensationModel" NOT NULL DEFAULT 'PERCENT',
    "defaultValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverCompensationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriverExpoPushToken" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverExpoPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriverPushSubscription" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriverRideDecision" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "decision" "public"."DriverDecisionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverRideDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetChecklistTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "routine" "public"."FleetChecklistRoutine" NOT NULL DEFAULT 'START_OF_DAY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "inputType" "public"."FleetChecklistInputType" NOT NULL DEFAULT 'BOOLEAN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "actionType" "public"."FleetChecklistTaskActionType" NOT NULL DEFAULT 'NONE',
    "selectOptions" JSONB,
    "builderConfig" JSONB,

    CONSTRAINT "FleetChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicle" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "color" TEXT,
    "year" INTEGER,
    "status" "public"."FleetVehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkinCode" TEXT NOT NULL,

    CONSTRAINT "FleetVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicleAssignment" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validationMethod" "public"."FleetVehicleAssignmentValidationMethod" NOT NULL DEFAULT 'ADMIN',

    CONSTRAINT "FleetVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicleChecklistEntry" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "inputType" "public"."FleetChecklistInputType" NOT NULL DEFAULT 'BOOLEAN',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "numericValue" INTEGER,
    "routine" "public"."FleetChecklistRoutine" NOT NULL DEFAULT 'START_OF_DAY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "actionType" "public"."FleetChecklistTaskActionType" NOT NULL DEFAULT 'NONE',
    "selectedOption" TEXT,
    "templateId" TEXT,
    "templateName" TEXT,
    "textValue" TEXT,

    CONSTRAINT "FleetVehicleChecklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicleMaintenancePlan" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "serviceType" "public"."FleetMaintenanceTaskType" NOT NULL DEFAULT 'PREVENTIVE',
    "priority" "public"."FleetMaintenanceTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "workshop" TEXT,
    "intervalMonths" INTEGER,
    "intervalKm" INTEGER,
    "firstDueAt" TIMESTAMP(3),
    "firstDueKm" INTEGER,
    "defaultEstimatedCost" DECIMAL(10,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetVehicleMaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicleMaintenanceTask" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "dueKm" INTEGER,
    "status" "public"."FleetMaintenanceTaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actualCost" DECIMAL(10,2),
    "currentOdometerKm" INTEGER,
    "estimatedCost" DECIMAL(10,2),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" "public"."FleetMaintenanceTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "recurrenceKm" INTEGER,
    "recurrenceMonths" INTEGER,
    "serviceType" "public"."FleetMaintenanceTaskType" NOT NULL DEFAULT 'GENERAL',
    "startedAt" TIMESTAMP(3),
    "workshop" TEXT,
    "maintenancePlanId" TEXT,

    CONSTRAINT "FleetVehicleMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FleetVehicleOdometerLog" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetVehicleOdometerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "rideId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "direction" "public"."MessageDirection" NOT NULL,
    "messageType" "public"."MessageType" NOT NULL,
    "content" TEXT,
    "providerMessageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PricingConfig" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "baseFare" DECIMAL(10,2) NOT NULL DEFAULT 6,
    "distanceRatePerKm" DECIMAL(10,2) NOT NULL DEFAULT 2.1,
    "timeRatePerMinute" DECIMAL(10,2) NOT NULL DEFAULT 0.35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleType" "public"."PricingRuleScheduleType" NOT NULL,
    "adjustmentType" "public"."PricingRuleAdjustmentType" NOT NULL DEFAULT 'FLAT',
    "adjustmentValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "daysOfWeek" TEXT,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Quote" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "routeDistanceKm" DECIMAL(10,2) NOT NULL,
    "routeDurationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ride" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT 'Cliente nao informado',
    "customerPhone" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."RideStatus" NOT NULL,
    "quoteAmount" DECIMAL(10,2),
    "quoteCurrency" TEXT,
    "routeDistanceKm" DECIMAL(10,2),
    "routeDurationMin" INTEGER,
    "assignedDriverId" TEXT,
    "driverStage" "public"."DriverRideStage",
    "navigationStartedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tripTypeName" TEXT,
    "tripTypeSlug" TEXT,
    "tripTypeSurchargeAmount" DECIMAL(10,2),
    "hasIntermediateStops" BOOLEAN,
    "intermediateStopsSummary" TEXT,
    "passengerCount" INTEGER,
    "baggageCount" INTEGER,
    "baggageSize" TEXT,
    "petSize" TEXT,
    "petType" TEXT,
    "companionNeedsSpecialAttention" BOOLEAN,
    "companionSpecialAttentionDetails" TEXT,
    "customerHasReducedMobility" BOOLEAN,
    "pickupCode" TEXT,
    "pickupCodeVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RideEvent" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TripType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "surchargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" "public"."UserGender",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "color" TEXT,
    "year" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSession_customerPhone_updatedAt_idx" ON "public"."ConversationSession"("customerPhone" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "public"."Customer"("phone" ASC);

-- CreateIndex
CREATE INDEX "CustomerFavoriteAddress_customerId_idx" ON "public"."CustomerFavoriteAddress"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFavoriteAddress_customerId_labelKey_key" ON "public"."CustomerFavoriteAddress"("customerId" ASC, "labelKey" ASC);

-- CreateIndex
CREATE INDEX "Driver_defaultFleetVehicleId_idx" ON "public"."Driver"("defaultFleetVehicleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "public"."Driver"("userId" ASC);

-- CreateIndex
CREATE INDEX "DriverExpoPushToken_driverId_idx" ON "public"."DriverExpoPushToken"("driverId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DriverExpoPushToken_token_key" ON "public"."DriverExpoPushToken"("token" ASC);

-- CreateIndex
CREATE INDEX "DriverPushSubscription_driverId_idx" ON "public"."DriverPushSubscription"("driverId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DriverPushSubscription_endpoint_key" ON "public"."DriverPushSubscription"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "DriverRideDecision_rideId_driverId_idx" ON "public"."DriverRideDecision"("rideId" ASC, "driverId" ASC);

-- CreateIndex
CREATE INDEX "FleetChecklistTemplate_routine_isActive_createdAt_idx" ON "public"."FleetChecklistTemplate"("routine" ASC, "isActive" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FleetChecklistTemplateItem_itemKey_key" ON "public"."FleetChecklistTemplateItem"("itemKey" ASC);

-- CreateIndex
CREATE INDEX "FleetChecklistTemplateItem_templateId_isActive_sortOrder_idx" ON "public"."FleetChecklistTemplateItem"("templateId" ASC, "isActive" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicle_checkinCode_key" ON "public"."FleetVehicle"("checkinCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicle_plate_key" ON "public"."FleetVehicle"("plate" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicle_status_createdAt_idx" ON "public"."FleetVehicle"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleAssignment_driverId_endedAt_startedAt_idx" ON "public"."FleetVehicleAssignment"("driverId" ASC, "endedAt" ASC, "startedAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleAssignment_fleetVehicleId_endedAt_startedAt_idx" ON "public"."FleetVehicleAssignment"("fleetVehicleId" ASC, "endedAt" ASC, "startedAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleChecklistEntry_fleetVehicleId_dateKey_idx" ON "public"."FleetVehicleChecklistEntry"("fleetVehicleId" ASC, "dateKey" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicleChecklistEntry_fleetVehicleId_dateKey_itemKey_key" ON "public"."FleetVehicleChecklistEntry"("fleetVehicleId" ASC, "dateKey" ASC, "itemKey" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleMaintenancePlan_fleetVehicleId_isActive_created_idx" ON "public"."FleetVehicleMaintenancePlan"("fleetVehicleId" ASC, "isActive" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleMaintenanceTask_fleetVehicleId_status_createdAt_idx" ON "public"."FleetVehicleMaintenanceTask"("fleetVehicleId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleMaintenanceTask_maintenancePlanId_status_create_idx" ON "public"."FleetVehicleMaintenanceTask"("maintenancePlanId" ASC, "status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "FleetVehicleOdometerLog_fleetVehicleId_recordedAt_idx" ON "public"."FleetVehicleOdometerLog"("fleetVehicleId" ASC, "recordedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Message_providerMessageId_key" ON "public"."Message"("providerMessageId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TripType_slug_key" ON "public"."TripType"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "public"."UserSession"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "public"."UserSession"("userId" ASC);

-- CreateIndex
CREATE INDEX "Vehicle_driverId_isActive_idx" ON "public"."Vehicle"("driverId" ASC, "isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_driverId_plate_key" ON "public"."Vehicle"("driverId" ASC, "plate" ASC);

-- AddForeignKey
ALTER TABLE "public"."CustomerFavoriteAddress" ADD CONSTRAINT "CustomerFavoriteAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_defaultFleetVehicleId_fkey" FOREIGN KEY ("defaultFleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverExpoPushToken" ADD CONSTRAINT "DriverExpoPushToken_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverPushSubscription" ADD CONSTRAINT "DriverPushSubscription_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverRideDecision" ADD CONSTRAINT "DriverRideDecision_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriverRideDecision" ADD CONSTRAINT "DriverRideDecision_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetChecklistTemplateItem" ADD CONSTRAINT "FleetChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."FleetChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleAssignment" ADD CONSTRAINT "FleetVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleAssignment" ADD CONSTRAINT "FleetVehicleAssignment_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleChecklistEntry" ADD CONSTRAINT "FleetVehicleChecklistEntry_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleMaintenancePlan" ADD CONSTRAINT "FleetVehicleMaintenancePlan_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleMaintenanceTask" ADD CONSTRAINT "FleetVehicleMaintenanceTask_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleMaintenanceTask" ADD CONSTRAINT "FleetVehicleMaintenanceTask_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "public"."FleetVehicleMaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FleetVehicleOdometerLog" ADD CONSTRAINT "FleetVehicleOdometerLog_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "public"."FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quote" ADD CONSTRAINT "Quote_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ride" ADD CONSTRAINT "Ride_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "public"."Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideEvent" ADD CONSTRAINT "RideEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

