import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { DriversService } from "../drivers/drivers.service";
import { CreateBenefitDto } from "./dto/create-benefit.dto";
import { CreateOvertimeTemplateDto } from "./dto/create-overtime-template.dto";
import { CreateRemunerationTemplateDto } from "./dto/create-remuneration-template.dto";
import { CreateWorkProfileDto } from "./dto/create-work-profile.dto";
import { CreateDriverDto } from "../drivers/dto/create-driver.dto";
import { CreateVehicleDto } from "../drivers/dto/create-vehicle.dto";
import { DriverDecisionDto } from "../drivers/dto/driver-decision.dto";
import { DriverStartRideDto } from "../drivers/dto/driver-start-ride.dto";
import { UpdateDriverDto } from "../drivers/dto/update-driver.dto";
import { UpdateVehicleDto } from "../drivers/dto/update-vehicle.dto";
import { DriverProfile } from "../drivers/types";
import { NotificationItem, NotificationsService } from "../notifications/notifications.service";
import { Ride, RideEvent } from "../rides/types";
import { RidesService } from "../rides/rides.service";
import { AdminService } from "./admin.service";
import { CreatePricingRuleDto } from "./dto/create-pricing-rule.dto";
import { CreateTripTypeDto } from "./dto/create-trip-type.dto";
import { SaveCustomerFavoriteAddressDto } from "./dto/save-customer-favorite-address.dto";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { UpdatePricingConfigDto } from "./dto/update-pricing-config.dto";
import { UpdatePricingRuleDto } from "./dto/update-pricing-rule.dto";
import { UpdateBenefitDto } from "./dto/update-benefit.dto";
import { UpdateOvertimeTemplateDto } from "./dto/update-overtime-template.dto";
import { UpdateRemunerationTemplateDto } from "./dto/update-remuneration-template.dto";
import { UpdateTripTypeDto } from "./dto/update-trip-type.dto";
import { UpdateWorkProfileDto } from "./dto/update-work-profile.dto";
import {
  CompanyProfileSummary,
  BenefitSummary,
  CustomerFavoriteAddressSummary,
  CustomerProfile,
  CustomerSummary,
  OvertimeTemplateSummary,
  PricingConfigSummary,
  PricingRuleSummary,
  RemunerationTemplateSummary,
  TripTypeSummary,
  WorkProfileSummary
} from "./types";

@UseGuards(AdminAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly driversService: DriversService,
    private readonly ridesService: RidesService,
    private readonly notificationsService: NotificationsService
  ) {}

  @Get("metrics")
  async metrics() {
    return this.adminService.getMetrics();
  }

  @Get("drivers")
  async drivers(): Promise<DriverProfile[]> {
    return this.driversService.listDrivers();
  }

  @Post("drivers")
  async createDriver(@Body() body: CreateDriverDto): Promise<DriverProfile> {
    return this.driversService.createDriver(body);
  }

  @Get("drivers/:driverId")
  async driver(@Param("driverId") driverId: string): Promise<DriverProfile> {
    return this.driversService.getDriver(driverId);
  }

  @Patch("drivers/:driverId")
  async updateDriver(@Param("driverId") driverId: string, @Body() body: UpdateDriverDto): Promise<DriverProfile> {
    return this.driversService.updateDriver(driverId, body);
  }

  @Post("drivers/:driverId/contracts/generate")
  async generateDriverContract(
    @Param("driverId") driverId: string,
    @Body()
    body?: {
      templateKey?: string;
      templateName?: string;
      templateVersion?: string;
      templateContent?: string;
    }
  ): Promise<DriverProfile> {
    return this.driversService.generateEmploymentContract(driverId, body);
  }

  @Post("drivers/:driverId/contracts/:contractId/renew")
  async renewDriverContract(
    @Param("driverId") driverId: string,
    @Param("contractId") contractId: string,
    @Body()
    body?: {
      templateKey?: string;
      templateName?: string;
      templateVersion?: string;
      templateContent?: string;
      contract?: Record<string, unknown>;
      journey?: Record<string, unknown>;
    }
  ): Promise<DriverProfile> {
    return this.driversService.renewEmploymentContract(driverId, contractId, body as any);
  }

  @Post("drivers/:driverId/contracts/:contractId/activate")
  async activateDriverContract(
    @Param("driverId") driverId: string,
    @Param("contractId") contractId: string
  ): Promise<DriverProfile> {
    return this.driversService.activateEmploymentContract(driverId, contractId);
  }

  @Post("drivers/:driverId/contracts/:contractId/request-signature")
  async requestDriverContractSignature(
    @Param("driverId") driverId: string,
    @Param("contractId") contractId: string,
    @Body()
    body?: {
      signerEmail?: string;
    }
  ): Promise<{
    driver: DriverProfile;
    signerEmail: string;
    signatureUrl: string;
    expiresAt: string;
    emailDeliveryStatus: "SENT" | "SKIPPED" | "FAILED";
    emailDeliveryMessage?: string;
  }> {
    return this.driversService.requestEmploymentContractSignature(driverId, contractId, body);
  }

  @Post("drivers/:driverId/contracts/:contractId/endorse")
  async endorseDriverContract(
    @Param("driverId") driverId: string,
    @Param("contractId") contractId: string,
    @Body()
    body: {
      type?: "SALARY_CHANGE" | "SCHEDULE_CHANGE" | "BENEFITS_CHANGE" | "TERM_EXTENSION" | "OTHER";
      effectiveDate?: string;
      notes?: string;
      changes?: Record<string, unknown>;
      applySettings?: boolean;
      contract?: Record<string, unknown>;
      journey?: Record<string, unknown>;
    }
  ): Promise<DriverProfile> {
    return this.driversService.endorseEmploymentContract(driverId, contractId, body as any);
  }

  @Post("drivers/:driverId/contracts/:contractId/terminate")
  async terminateDriverContract(
    @Param("driverId") driverId: string,
    @Param("contractId") contractId: string,
    @Body()
    body?: {
      mode?: "CANCEL" | "FINALIZE";
      reason?: string;
    }
  ): Promise<DriverProfile> {
    return this.driversService.terminateEmploymentContract(driverId, contractId, body);
  }

  @Post("drivers/:driverId/vehicles")
  async addVehicle(@Param("driverId") driverId: string, @Body() body: CreateVehicleDto): Promise<DriverProfile> {
    return this.driversService.addVehicle(driverId, body);
  }

  @Patch("drivers/:driverId/vehicles/:vehicleId")
  async updateVehicle(
    @Param("driverId") driverId: string,
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpdateVehicleDto
  ): Promise<DriverProfile> {
    return this.driversService.updateVehicle(driverId, vehicleId, body);
  }

  @Post("drivers/:driverId/rides/:rideId/decision")
  async decideRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Body() body: DriverDecisionDto
  ): Promise<Ride> {
    return this.driversService.decideRide(rideId, driverId, body.decision);
  }

  @Post("drivers/:driverId/rides/:rideId/go-to-pickup")
  async goToPickup(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.markDriverEnRoute(rideId, driverId);
  }

  @Post("drivers/:driverId/rides/:rideId/arrived")
  async markArrived(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.markDriverArrived(rideId, driverId);
  }

  @Post("drivers/:driverId/rides/:rideId/start")
  async startRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Body() body: DriverStartRideDto
  ): Promise<Ride> {
    return this.driversService.startRide(rideId, driverId, body.pickupCode);
  }

  @Post("drivers/:driverId/rides/:rideId/complete")
  async completeRide(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.completeRide(rideId, driverId);
  }

  @Get("rides")
  async rides(): Promise<Ride[]> {
    return this.ridesService.listAll();
  }

  @Get("rides/:rideId")
  async ride(@Param("rideId") rideId: string): Promise<Ride> {
    return this.ridesService.getById(rideId);
  }

  @Get("rides/:rideId/events")
  async rideEvents(@Param("rideId") rideId: string): Promise<RideEvent[]> {
    return this.ridesService.listEvents(rideId);
  }

  @Get("notifications")
  notifications(): NotificationItem[] {
    return this.notificationsService.list();
  }

  @Post("notifications/:notificationId/read")
  markNotificationAsRead(@Param("notificationId") notificationId: string): NotificationItem {
    return this.notificationsService.markAsRead(notificationId);
  }

  @Get("customers")
  async customers(@Query("phone") phone?: string): Promise<CustomerSummary[]> {
    return this.adminService.listCustomers(phone);
  }

  @Get("customers/:phone")
  async customerProfile(@Param("phone") phone: string): Promise<CustomerProfile> {
    return this.adminService.getCustomerProfile(phone);
  }

  @Get("trip-types")
  async tripTypes(): Promise<TripTypeSummary[]> {
    return this.adminService.listTripTypes();
  }

  @Get("trip-types/:id")
  async tripType(@Param("id") id: string): Promise<TripTypeSummary> {
    return this.adminService.getTripType(id);
  }

  @Get("pricing")
  async pricing(): Promise<PricingConfigSummary> {
    return this.adminService.getPricingConfig();
  }

  @Get("company-profile")
  async companyProfile(): Promise<CompanyProfileSummary> {
    return this.adminService.getCompanyProfile();
  }

  @Get("pricing-rules")
  async pricingRules(): Promise<PricingRuleSummary[]> {
    return this.adminService.listPricingRules();
  }

  @Get("pricing-rules/:id")
  async pricingRule(@Param("id") id: string): Promise<PricingRuleSummary> {
    return this.adminService.getPricingRule(id);
  }

  @Get("remuneration-templates")
  async remunerationTemplates(): Promise<RemunerationTemplateSummary[]> {
    return this.adminService.listRemunerationTemplates();
  }

  @Get("remuneration-templates/:id")
  async remunerationTemplate(@Param("id") id: string): Promise<RemunerationTemplateSummary> {
    return this.adminService.getRemunerationTemplate(id);
  }

  @Get("overtime-templates")
  async overtimeTemplates(): Promise<OvertimeTemplateSummary[]> {
    return this.adminService.listOvertimeTemplates();
  }

  @Get("overtime-templates/:id")
  async overtimeTemplate(@Param("id") id: string): Promise<OvertimeTemplateSummary> {
    return this.adminService.getOvertimeTemplate(id);
  }

  @Get("benefits")
  async benefits(): Promise<BenefitSummary[]> {
    return this.adminService.listBenefits();
  }

  @Get("work-profiles/options")
  async workProfileOptions(): Promise<string[]> {
    return this.adminService.listWorkProfileOptions();
  }

  @Get("work-profiles")
  async workProfiles(): Promise<WorkProfileSummary[]> {
    return this.adminService.listWorkProfiles();
  }

  @Get("work-profiles/:id")
  async workProfile(@Param("id") id: string): Promise<WorkProfileSummary> {
    return this.adminService.getWorkProfile(id);
  }

  @Get("benefits/:id")
  async benefit(@Param("id") id: string): Promise<BenefitSummary> {
    return this.adminService.getBenefit(id);
  }

  @Post("trip-types")
  async createTripType(@Body() body: CreateTripTypeDto): Promise<TripTypeSummary> {
    return this.adminService.createTripType(body);
  }

  @Patch("trip-types/:id")
  async updateTripType(@Param("id") id: string, @Body() body: UpdateTripTypeDto): Promise<TripTypeSummary> {
    return this.adminService.updateTripType(id, body);
  }

  @Delete("trip-types/:id")
  @HttpCode(204)
  async deleteTripType(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteTripType(id);
  }

  @Patch("pricing")
  async updatePricing(@Body() body: UpdatePricingConfigDto): Promise<PricingConfigSummary> {
    return this.adminService.updatePricingConfig(body);
  }

  @Patch("company-profile")
  async updateCompanyProfile(@Body() body: UpdateCompanyProfileDto): Promise<CompanyProfileSummary> {
    return this.adminService.updateCompanyProfile(body);
  }

  @Post("pricing-rules")
  async createPricingRule(@Body() body: CreatePricingRuleDto): Promise<PricingRuleSummary> {
    return this.adminService.createPricingRule(body);
  }

  @Patch("pricing-rules/:id")
  async updatePricingRule(@Param("id") id: string, @Body() body: UpdatePricingRuleDto): Promise<PricingRuleSummary> {
    return this.adminService.updatePricingRule(id, body);
  }

  @Delete("pricing-rules/:id")
  @HttpCode(204)
  async deletePricingRule(@Param("id") id: string): Promise<void> {
    await this.adminService.deletePricingRule(id);
  }

  @Post("remuneration-templates")
  async createRemunerationTemplate(
    @Body() body: CreateRemunerationTemplateDto
  ): Promise<RemunerationTemplateSummary> {
    return this.adminService.createRemunerationTemplate(body);
  }

  @Patch("remuneration-templates/:id")
  async updateRemunerationTemplate(
    @Param("id") id: string,
    @Body() body: UpdateRemunerationTemplateDto
  ): Promise<RemunerationTemplateSummary> {
    return this.adminService.updateRemunerationTemplate(id, body);
  }

  @Post("overtime-templates")
  async createOvertimeTemplate(@Body() body: CreateOvertimeTemplateDto): Promise<OvertimeTemplateSummary> {
    return this.adminService.createOvertimeTemplate(body);
  }

  @Patch("overtime-templates/:id")
  async updateOvertimeTemplate(
    @Param("id") id: string,
    @Body() body: UpdateOvertimeTemplateDto
  ): Promise<OvertimeTemplateSummary> {
    return this.adminService.updateOvertimeTemplate(id, body);
  }

  @Post("benefits")
  async createBenefit(@Body() body: CreateBenefitDto): Promise<BenefitSummary> {
    return this.adminService.createBenefit(body);
  }

  @Patch("benefits/:id")
  async updateBenefit(@Param("id") id: string, @Body() body: UpdateBenefitDto): Promise<BenefitSummary> {
    return this.adminService.updateBenefit(id, body);
  }

  @Delete("benefits/:id")
  @HttpCode(204)
  async deleteBenefit(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteBenefit(id);
  }

  @Post("work-profiles")
  async createWorkProfile(@Body() body: CreateWorkProfileDto): Promise<WorkProfileSummary> {
    return this.adminService.createWorkProfile(body);
  }

  @Patch("work-profiles/:id")
  async updateWorkProfile(@Param("id") id: string, @Body() body: UpdateWorkProfileDto): Promise<WorkProfileSummary> {
    return this.adminService.updateWorkProfile(id, body);
  }

  @Delete("remuneration-templates/:id")
  @HttpCode(204)
  async deleteRemunerationTemplate(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteRemunerationTemplate(id);
  }

  @Post("customers/:phone/favorites")
  async saveFavoriteAddress(
    @Param("phone") phone: string,
    @Body() body: SaveCustomerFavoriteAddressDto
  ): Promise<CustomerFavoriteAddressSummary> {
    return this.adminService.saveFavoriteAddress(phone, body);
  }
}
