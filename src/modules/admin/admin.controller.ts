import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TimekeepingOpsRoles, TimekeepingReviewRoles } from "../auth/timekeeping-roles.decorator";
import { DriversService } from "../drivers/drivers.service";
import { CreateBenefitDto } from "./dto/create-benefit.dto";
import { CreateCargoDto } from "./dto/create-cargo.dto";
import { CreateEmploymentLinkageRuleDto } from "./dto/create-employment-linkage-rule.dto";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { CreateFinancialCategoryDto } from "./dto/create-financial-category.dto";
import { CreateOvertimeTemplateDto } from "./dto/create-overtime-template.dto";
import { CreateRemunerationTemplateDto } from "./dto/create-remuneration-template.dto";
import { CreateTimeAdjustmentDto } from "./dto/create-time-adjustment.dto";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { CreateWorkJourneyDto } from "./dto/create-work-journey.dto";
import { CreateWorkProfileDto } from "./dto/create-work-profile.dto";
import { CancelTimeAdjustmentDto } from "./dto/cancel-time-adjustment.dto";
import { CreateDriverDto } from "../drivers/dto/create-driver.dto";
import { CreateDriverLeavePeriodDto } from "../drivers/dto/create-driver-leave-period.dto";
import { CreateVehicleDto } from "../drivers/dto/create-vehicle.dto";
import { DriverDecisionDto } from "../drivers/dto/driver-decision.dto";
import { DriverStartRideDto } from "../drivers/dto/driver-start-ride.dto";
import { UpdateDriverDto } from "../drivers/dto/update-driver.dto";
import { UpdateDriverLeavePeriodDto } from "../drivers/dto/update-driver-leave-period.dto";
import { UpdateVehicleDto } from "../drivers/dto/update-vehicle.dto";
import { DriverLeavePeriod, DriverProfile } from "../drivers/types";
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
import { UpdateCargoDto } from "./dto/update-cargo.dto";
import { UpdateEmploymentLinkageRuleDto } from "./dto/update-employment-linkage-rule.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { UpdateFinancialCategoryDto } from "./dto/update-financial-category.dto";
import { UpdateOvertimeTemplateDto } from "./dto/update-overtime-template.dto";
import { UpdateRemunerationTemplateDto } from "./dto/update-remuneration-template.dto";
import { UpdateTripTypeDto } from "./dto/update-trip-type.dto";
import { UpdateWorkJourneyDto } from "./dto/update-work-journey.dto";
import { UpdateWorkProfileDto } from "./dto/update-work-profile.dto";
import { ReviewTimeAdjustmentDto } from "./dto/review-time-adjustment.dto";
import { ReviewTimesheetPeriodDto } from "./dto/review-timesheet-period.dto";
import { UpdateTimeAdjustmentDto } from "./dto/update-time-adjustment.dto";
import { UpdateFinancialTransactionDto } from "./dto/update-financial-transaction.dto";
import { ReverseFinancialTransactionDto } from "./dto/reverse-financial-transaction.dto";
import {
  CompanyProfileSummary,
  CompanyEmploymentLinkageRuleSummary,
  BenefitSummary,
  CargoOptionSummary,
  CargoPageSummary,
  CargoSummary,
  CboImportSummary,
  CboOccupationPageSummary,
  CboOccupationSummary,
  HolidaySummary,
  CustomerFavoriteAddressSummary,
  CustomerProfile,
  CustomerSummary,
  FinancialCashflowSummary,
  FinancialTransactionCategorySummary,
  FinancialEntriesSummary,
  FinancialTransactionSummary,
  FinancialOverviewSummary,
  OvertimeTemplateSummary,
  PricingConfigSummary,
  PricingRuleSummary,
  RemunerationTemplateSummary,
  TimeAdjustmentSummary,
  TimeEntryIssueSummary,
  TimeEntrySummary,
  TimekeepingCostProjectionSummary,
  TimekeepingDashboardSummary,
  TimesheetDaySummary,
  TimesheetPeriodSummary,
  TripTypeSummary,
  WorkJourneySummary,
  WorkProfileSummary
} from "./types";

type RequestWithAdminSession = {
  adminSession?: {
    user: {
      id: string;
      role: UserRole;
    };
  };
};

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

  @Get("cbo/search")
  async searchCbo(
    @Query("q") query?: string,
    @Query("limit") limit?: string
  ): Promise<CboOccupationSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.searchCboOccupations(query, parsedLimit);
  }

  @Get("cbo")
  async listCbo(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("q") query?: string
  ): Promise<CboOccupationPageSummary> {
    const parsedPage =
      typeof page === "string" && page.trim().length > 0 ? Number(page) : undefined;
    const parsedPageSize =
      typeof pageSize === "string" && pageSize.trim().length > 0 ? Number(pageSize) : undefined;
    return this.adminService.listCboOccupations({
      page: parsedPage,
      pageSize: parsedPageSize,
      query
    });
  }

  @Post("cbo/import")
  @UseInterceptors(FileInterceptor("file"))
  async importCbo(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          originalname?: string;
        }
      | undefined,
    @Body("delimiter") delimiter?: string,
    @Body("source") source?: string,
    @Body("encoding") encoding?: string
  ): Promise<CboImportSummary> {
    return this.adminService.importCboCsv(file?.buffer ?? "", {
      delimiter,
      source,
      encoding,
      filename: file?.originalname
    });
  }

  @Get("cargos")
  async cargos(): Promise<CargoSummary[]> {
    return this.adminService.listCargos();
  }

  @Get("cargos/paginated")
  async paginatedCargos(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("q") query?: string,
    @Query("status") status?: string
  ): Promise<CargoPageSummary> {
    const parsedPage =
      typeof page === "string" && page.trim().length > 0 ? Number(page) : undefined;
    const parsedPageSize =
      typeof pageSize === "string" && pageSize.trim().length > 0 ? Number(pageSize) : undefined;
    const normalizedStatus = status === "ACTIVE" || status === "INACTIVE" ? status : "ALL";

    return this.adminService.listCargosPage({
      page: parsedPage,
      pageSize: parsedPageSize,
      query,
      status: normalizedStatus
    });
  }

  @Get("cargos/options")
  async cargoOptions(
    @Query("q") query?: string,
    @Query("limit") limit?: string
  ): Promise<CargoOptionSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listCargoOptions(query, parsedLimit);
  }

  @Get("cargos/:id")
  async cargo(@Param("id") id: string): Promise<CargoSummary> {
    return this.adminService.getCargo(id);
  }

  @Post("cargos")
  async createCargo(@Body() body: CreateCargoDto): Promise<CargoSummary> {
    return this.adminService.createCargo(body);
  }

  @Patch("cargos/:id")
  async updateCargo(@Param("id") id: string, @Body() body: UpdateCargoDto): Promise<CargoSummary> {
    return this.adminService.updateCargo(id, body);
  }

  @Delete("cargos/:id")
  @HttpCode(204)
  async deleteCargo(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteCargo(id);
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

  @Get("drivers/:driverId/leave-periods")
  async driverLeavePeriods(@Param("driverId") driverId: string): Promise<DriverLeavePeriod[]> {
    return this.driversService.listDriverLeavePeriods(driverId);
  }

  @Post("drivers/:driverId/leave-periods")
  async createDriverLeavePeriod(
    @Param("driverId") driverId: string,
    @Body() body: CreateDriverLeavePeriodDto
  ): Promise<DriverLeavePeriod> {
    return this.driversService.createDriverLeavePeriod(driverId, body);
  }

  @Patch("drivers/:driverId/leave-periods/:periodId")
  async updateDriverLeavePeriod(
    @Param("driverId") driverId: string,
    @Param("periodId") periodId: string,
    @Body() body: UpdateDriverLeavePeriodDto
  ): Promise<DriverLeavePeriod> {
    return this.driversService.updateDriverLeavePeriod(driverId, periodId, body);
  }

  @Delete("drivers/:driverId/leave-periods/:periodId")
  @HttpCode(204)
  async deleteDriverLeavePeriod(
    @Param("driverId") driverId: string,
    @Param("periodId") periodId: string
  ): Promise<void> {
    await this.driversService.deleteDriverLeavePeriod(driverId, periodId);
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

  @Get("employment-linkages/:linkageKey/rules")
  async employmentLinkageRules(
    @Param("linkageKey") linkageKey: string
  ): Promise<CompanyEmploymentLinkageRuleSummary[]> {
    return this.adminService.listEmploymentLinkageRules(linkageKey);
  }

  @Get("employment-linkages/:linkageKey/rules/:ruleId")
  async employmentLinkageRule(
    @Param("linkageKey") linkageKey: string,
    @Param("ruleId") ruleId: string
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    return this.adminService.getEmploymentLinkageRule(linkageKey, ruleId);
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
  async overtimeTemplates(@Query("category") category?: string): Promise<OvertimeTemplateSummary[]> {
    return this.adminService.listOvertimeTemplates(category);
  }

  @Get("overtime-templates/:id")
  async overtimeTemplate(@Param("id") id: string): Promise<OvertimeTemplateSummary> {
    return this.adminService.getOvertimeTemplate(id);
  }

  @Get("holidays")
  async holidays(
    @Query("year") year?: string,
    @Query("scopeType") scopeType?: string,
    @Query("onlyActive") onlyActive?: string
  ): Promise<HolidaySummary[]> {
    const parsedYear =
      typeof year === "string" && year.trim().length > 0 ? Number(year) : undefined;
    const parsedOnlyActive =
      onlyActive === "true" ? true : onlyActive === "false" ? false : undefined;
    return this.adminService.listHolidays({
      year: parsedYear,
      scopeType,
      onlyActive: parsedOnlyActive
    });
  }

  @Get("holidays/:id")
  async holiday(@Param("id") id: string): Promise<HolidaySummary> {
    return this.adminService.getHoliday(id);
  }

  @Get("benefits")
  async benefits(): Promise<BenefitSummary[]> {
    return this.adminService.listBenefits();
  }

  @Get("work-profiles/options")
  async workProfileOptions(): Promise<string[]> {
    return this.adminService.listWorkProfileOptions();
  }

  @Get("work-journeys")
  async workJourneys(@Query("onlyActive") onlyActive?: string): Promise<WorkJourneySummary[]> {
    const parsedOnlyActive =
      onlyActive === "true" ? true : onlyActive === "false" ? false : undefined;
    return this.adminService.listWorkJourneys(parsedOnlyActive);
  }

  @Get("work-journeys/:id")
  async workJourney(@Param("id") id: string): Promise<WorkJourneySummary> {
    return this.adminService.getWorkJourney(id);
  }

  @Get("time-entries")
  @TimekeepingOpsRoles()
  async timeEntries(
    @Query("driverId") driverId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("kind") kind?: string,
    @Query("source") source?: string,
    @Query("limit") limit?: string
  ): Promise<TimeEntrySummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listTimeEntries({
      driverId,
      from,
      to,
      kind,
      source,
      limit: parsedLimit
    });
  }

  @Post("time-entries")
  @TimekeepingOpsRoles()
  async createTimeEntry(
    @Body() body: CreateTimeEntryDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimeEntrySummary> {
    return this.adminService.createTimeEntry(body, request.adminSession?.user.id);
  }

  @Get("time-entries/issues")
  @TimekeepingOpsRoles()
  async timeEntryIssues(
    @Query("driverId") driverId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string
  ): Promise<TimeEntryIssueSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listTimeEntryIssues({
      driverId,
      from,
      to,
      status,
      limit: parsedLimit
    });
  }

  @Post("time-entries/issues/:issueId/resolve")
  @TimekeepingReviewRoles()
  async resolveTimeEntryIssue(@Param("issueId") issueId: string): Promise<TimeEntryIssueSummary> {
    return this.adminService.resolveTimeEntryIssue(issueId);
  }

  @Get("time-adjustments")
  @TimekeepingOpsRoles()
  async timeAdjustments(
    @Query("driverId") driverId?: string,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string
  ): Promise<TimeAdjustmentSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listTimeAdjustments({
      driverId,
      status,
      from,
      to,
      limit: parsedLimit
    });
  }

  @Post("time-adjustments")
  @TimekeepingOpsRoles()
  async createTimeAdjustment(
    @Body() body: CreateTimeAdjustmentDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimeAdjustmentSummary> {
    return this.adminService.createTimeAdjustment(body, request.adminSession?.user.id);
  }

  @Patch("time-adjustments/:adjustmentId")
  @TimekeepingOpsRoles()
  async updateTimeAdjustment(
    @Param("adjustmentId") adjustmentId: string,
    @Body() body: UpdateTimeAdjustmentDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimeAdjustmentSummary> {
    return this.adminService.updateTimeAdjustment(adjustmentId, body, request.adminSession?.user.id);
  }

  @Post("time-adjustments/:adjustmentId/cancel")
  @TimekeepingOpsRoles()
  async cancelTimeAdjustment(
    @Param("adjustmentId") adjustmentId: string,
    @Body() body: CancelTimeAdjustmentDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimeAdjustmentSummary> {
    return this.adminService.cancelTimeAdjustment(adjustmentId, body, request.adminSession?.user.id);
  }

  @Post("time-adjustments/:adjustmentId/review")
  @TimekeepingReviewRoles()
  async reviewTimeAdjustment(
    @Param("adjustmentId") adjustmentId: string,
    @Body() body: ReviewTimeAdjustmentDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimeAdjustmentSummary> {
    return this.adminService.reviewTimeAdjustment(adjustmentId, body, request.adminSession?.user.id);
  }

  @Get("time-entries/timesheet-days")
  @TimekeepingOpsRoles()
  async timesheetDays(
    @Query("driverId") driverId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string
  ): Promise<TimesheetDaySummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listTimesheetDays({
      driverId,
      from,
      to,
      limit: parsedLimit
    });
  }

  @Post("time-entries/timesheet-days/recalculate")
  @TimekeepingOpsRoles()
  async recalculateTimesheetDays(
    @Query("driverId") driverId?: string,
    @Query("date") date?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ): Promise<TimesheetDaySummary[]> {
    return this.adminService.recalculateTimesheetDays({
      driverId,
      date,
      from,
      to
    });
  }

  @Get("time-entries/timesheet-periods")
  @TimekeepingOpsRoles()
  async timesheetPeriods(
    @Query("driverId") driverId?: string,
    @Query("period") period?: string,
    @Query("limit") limit?: string
  ): Promise<TimesheetPeriodSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.listTimesheetPeriods({
      driverId,
      period,
      limit: parsedLimit
    });
  }

  @Post("time-entries/timesheet-periods/calculate")
  @TimekeepingOpsRoles()
  async calculateTimesheetPeriods(
    @Query("period") period?: string,
    @Query("driverId") driverId?: string
  ): Promise<TimesheetPeriodSummary[]> {
    return this.adminService.calculateTimesheetPeriods({
      period,
      driverId
    });
  }

  @Post("time-entries/timesheet-periods/:periodId/close")
  @TimekeepingReviewRoles()
  async closeTimesheetPeriod(
    @Param("periodId") periodId: string,
    @Body() body: ReviewTimesheetPeriodDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimesheetPeriodSummary> {
    return this.adminService.closeTimesheetPeriod(
      periodId,
      request.adminSession?.user.id,
      body.changeReason ?? body.note
    );
  }

  @Post("time-entries/timesheet-periods/:periodId/reopen")
  @TimekeepingReviewRoles()
  async reopenTimesheetPeriod(
    @Param("periodId") periodId: string,
    @Body() body: ReviewTimesheetPeriodDto,
    @Req() request: RequestWithAdminSession
  ): Promise<TimesheetPeriodSummary> {
    return this.adminService.reopenTimesheetPeriod(
      periodId,
      request.adminSession?.user.id,
      body.changeReason ?? body.note
    );
  }

  @Get("time-entries/timesheet-periods/:periodId/export")
  @TimekeepingOpsRoles()
  async exportTimesheetPeriod(
    @Param("periodId") periodId: string,
    @Query("format") format: string | undefined,
    @Res({ passthrough: true }) response: any
  ): Promise<string | Buffer> {
    const file = await this.adminService.exportTimesheetPeriod(periodId, format);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    response.setHeader("Cache-Control", "no-store");
    return file.content;
  }

  @Get("time-entries/dashboard")
  @TimekeepingOpsRoles()
  async timekeepingDashboard(
    @Query("date") date?: string
  ): Promise<TimekeepingDashboardSummary> {
    return this.adminService.getTimekeepingDashboard({ date });
  }

  @Get("time-entries/cost-projection")
  @TimekeepingOpsRoles()
  async timekeepingCostProjection(
    @Query("date") date?: string,
    @Query("driverId") driverId?: string
  ): Promise<TimekeepingCostProjectionSummary> {
    return this.adminService.getTimekeepingCostProjection({ date, driverId });
  }

  @Get("financial/overview")
  @TimekeepingOpsRoles()
  async financialOverview(
    @Query("period") period?: string
  ): Promise<FinancialOverviewSummary> {
    return this.adminService.getFinancialOverview({ period });
  }

  @Get("financial/cashflow")
  @TimekeepingOpsRoles()
  async financialCashflow(
    @Query("period") period?: string
  ): Promise<FinancialCashflowSummary> {
    return this.adminService.getFinancialCashflow({ period });
  }

  @Get("financial/entries")
  @TimekeepingOpsRoles()
  async financialEntries(
    @Query("period") period?: string,
    @Query("type") type?: string,
    @Query("limit") limit?: string
  ): Promise<FinancialEntriesSummary> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    return this.adminService.getFinancialEntries({ period, type, limit: parsedLimit });
  }

  @Get("financial/transactions")
  @TimekeepingOpsRoles()
  async financialTransactions(
    @Query("period") period?: string,
    @Query("driverId") driverId?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("source") source?: string,
    @Query("search") search?: string,
    @Query("offset") offset?: string,
    @Query("limit") limit?: string
  ): Promise<FinancialTransactionSummary[]> {
    const parsedLimit =
      typeof limit === "string" && limit.trim().length > 0 ? Number(limit) : undefined;
    const parsedOffset =
      typeof offset === "string" && offset.trim().length > 0 ? Number(offset) : undefined;
    return this.adminService.getFinancialTransactions({
      period,
      driverId,
      type,
      status,
      source,
      search,
      offset: parsedOffset,
      limit: parsedLimit
    });
  }

  @Get("financial/categories")
  @TimekeepingOpsRoles()
  async financialCategories(): Promise<FinancialTransactionCategorySummary[]> {
    return this.adminService.listFinancialTransactionCategories();
  }

  @Post("financial/categories")
  @TimekeepingReviewRoles()
  async createFinancialCategory(
    @Body() body: CreateFinancialCategoryDto
  ): Promise<FinancialTransactionCategorySummary> {
    return this.adminService.createFinancialTransactionCategory(body);
  }

  @Patch("financial/categories/:categoryId")
  @TimekeepingReviewRoles()
  async updateFinancialCategory(
    @Param("categoryId") categoryId: string,
    @Body() body: UpdateFinancialCategoryDto
  ): Promise<FinancialTransactionCategorySummary> {
    return this.adminService.updateFinancialTransactionCategory(categoryId, body);
  }

  @Delete("financial/categories/:categoryId")
  @HttpCode(204)
  @TimekeepingReviewRoles()
  async deleteFinancialCategory(@Param("categoryId") categoryId: string): Promise<void> {
    await this.adminService.deleteFinancialTransactionCategory(categoryId);
  }

  @Patch("financial/transactions/:transactionId")
  @TimekeepingReviewRoles()
  async updateFinancialTransaction(
    @Param("transactionId") transactionId: string,
    @Body() body: UpdateFinancialTransactionDto,
    @Req() request: RequestWithAdminSession
  ): Promise<FinancialTransactionSummary> {
    return this.adminService.updateFinancialTransaction(transactionId, body, request.adminSession?.user.id);
  }

  @Post("financial/transactions/:transactionId/reverse")
  @TimekeepingReviewRoles()
  async reverseFinancialTransaction(
    @Param("transactionId") transactionId: string,
    @Body() body: ReverseFinancialTransactionDto,
    @Req() request: RequestWithAdminSession
  ): Promise<FinancialTransactionSummary> {
    return this.adminService.reverseFinancialTransaction(
      transactionId,
      request.adminSession?.user.id,
      body.reason
    );
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

  @Post("employment-linkages/:linkageKey/rules")
  async createEmploymentLinkageRule(
    @Param("linkageKey") linkageKey: string,
    @Body() body: CreateEmploymentLinkageRuleDto
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    return this.adminService.createEmploymentLinkageRule(linkageKey, body);
  }

  @Patch("employment-linkages/:linkageKey/rules/:ruleId")
  async updateEmploymentLinkageRule(
    @Param("linkageKey") linkageKey: string,
    @Param("ruleId") ruleId: string,
    @Body() body: UpdateEmploymentLinkageRuleDto
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    return this.adminService.updateEmploymentLinkageRule(linkageKey, ruleId, body);
  }

  @Delete("employment-linkages/:linkageKey/rules/:ruleId")
  @HttpCode(204)
  async deleteEmploymentLinkageRule(
    @Param("linkageKey") linkageKey: string,
    @Param("ruleId") ruleId: string
  ): Promise<void> {
    await this.adminService.deleteEmploymentLinkageRule(linkageKey, ruleId);
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

  @Post("holidays")
  async createHoliday(@Body() body: CreateHolidayDto): Promise<HolidaySummary> {
    return this.adminService.createHoliday(body);
  }

  @Patch("holidays/:id")
  async updateHoliday(@Param("id") id: string, @Body() body: UpdateHolidayDto): Promise<HolidaySummary> {
    return this.adminService.updateHoliday(id, body);
  }

  @Delete("holidays/:id")
  @HttpCode(204)
  async deleteHoliday(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteHoliday(id);
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

  @Post("work-journeys")
  async createWorkJourney(@Body() body: CreateWorkJourneyDto): Promise<WorkJourneySummary> {
    return this.adminService.createWorkJourney(body);
  }

  @Patch("work-journeys/:id")
  async updateWorkJourney(
    @Param("id") id: string,
    @Body() body: UpdateWorkJourneyDto
  ): Promise<WorkJourneySummary> {
    return this.adminService.updateWorkJourney(id, body);
  }

  @Delete("work-journeys/:id")
  @HttpCode(204)
  async deleteWorkJourney(@Param("id") id: string): Promise<void> {
    await this.adminService.deleteWorkJourney(id);
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
