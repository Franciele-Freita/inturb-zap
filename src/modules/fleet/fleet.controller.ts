import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { DriversService } from "../drivers/drivers.service";
import { DriverProfile } from "../drivers/types";
import { AssignFleetVehicleDto } from "./dto/assign-fleet-vehicle.dto";
import { CreateFleetChecklistTemplateDto } from "./dto/create-fleet-checklist-template.dto";
import { CreateFleetChecklistTemplateTaskDto } from "./dto/create-fleet-checklist-template-task.dto";
import { CreateFleetMaintenancePlanDto } from "./dto/create-fleet-maintenance-plan.dto";
import { CreateFleetVehicleDto } from "./dto/create-fleet-vehicle.dto";
import { CreateFleetMaintenanceTaskDto } from "./dto/create-fleet-maintenance-task.dto";
import { CreateFleetVehicleOdometerLogDto } from "./dto/create-fleet-vehicle-odometer-log.dto";
import { UpdateFleetChecklistTemplateDto } from "./dto/update-fleet-checklist-template.dto";
import { UpdateFleetChecklistTemplateTaskDto } from "./dto/update-fleet-checklist-template-task.dto";
import { UpdateFleetMaintenancePlanDto } from "./dto/update-fleet-maintenance-plan.dto";
import { UpdateFleetMaintenanceTaskDto } from "./dto/update-fleet-maintenance-task.dto";
import { UpdateFleetVehicleDto } from "./dto/update-fleet-vehicle.dto";
import { UpsertFleetVehicleChecklistItemDto } from "./dto/upsert-fleet-vehicle-checklist-item.dto";
import { FleetService } from "./fleet.service";
import {
  FleetMaintenanceOverview,
  FleetChecklistTemplateSummary,
  FleetOverviewMetrics,
  FleetVehicleDetails,
  FleetVehicleOverviewSummary
} from "./types";

@UseGuards(AdminAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/fleet")
export class FleetController {
  constructor(
    private readonly fleetService: FleetService,
    private readonly driversService: DriversService
  ) {}

  @Get("overview")
  async getFleetOverview(): Promise<FleetOverviewMetrics> {
    return this.fleetService.getFleetOverview();
  }

  @Get("maintenance-overview")
  async getFleetMaintenanceOverview(): Promise<FleetMaintenanceOverview> {
    return this.fleetService.getFleetMaintenanceOverview();
  }

  @Get("checklist-templates")
  async listChecklistTemplates(): Promise<FleetChecklistTemplateSummary[]> {
    return this.fleetService.listChecklistTemplates();
  }

  @Post("checklist-templates")
  async createChecklistTemplate(
    @Body() body: CreateFleetChecklistTemplateDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    return this.fleetService.createChecklistTemplate(body);
  }

  @Patch("checklist-templates/:templateId")
  async updateChecklistTemplate(
    @Param("templateId") templateId: string,
    @Body() body: UpdateFleetChecklistTemplateDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    return this.fleetService.updateChecklistTemplate(templateId, body);
  }

  @Post("checklist-templates/:templateId/tasks")
  async createChecklistTemplateTask(
    @Param("templateId") templateId: string,
    @Body() body: CreateFleetChecklistTemplateTaskDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    return this.fleetService.createChecklistTemplateTask(templateId, body);
  }

  @Patch("checklist-templates/tasks/:taskId")
  async updateChecklistTemplateTask(
    @Param("taskId") taskId: string,
    @Body() body: UpdateFleetChecklistTemplateTaskDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    return this.fleetService.updateChecklistTemplateTask(taskId, body);
  }

  @Get("vehicles")
  async listFleetVehicles(): Promise<FleetVehicleOverviewSummary[]> {
    return this.fleetService.listFleetVehicles();
  }

  @Get("vehicles/:vehicleId")
  async getFleetVehicle(@Param("vehicleId") vehicleId: string): Promise<FleetVehicleDetails> {
    return this.fleetService.getFleetVehicle(vehicleId);
  }

  @Post("vehicles")
  async createFleetVehicle(@Body() body: CreateFleetVehicleDto): Promise<FleetVehicleDetails> {
    return this.fleetService.createFleetVehicle(body);
  }

  @Patch("vehicles/:vehicleId")
  async updateFleetVehicle(
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpdateFleetVehicleDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.updateFleetVehicle(vehicleId, body);
  }

  @Post("vehicles/:vehicleId/assign")
  async assignFleetVehicle(
    @Param("vehicleId") vehicleId: string,
    @Body() body: AssignFleetVehicleDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.assignFleetVehicle(vehicleId, body);
  }

  @Post("vehicles/:vehicleId/unassign")
  async unassignFleetVehicle(@Param("vehicleId") vehicleId: string): Promise<FleetVehicleDetails> {
    return this.fleetService.unassignFleetVehicle(vehicleId);
  }

  @Post("vehicles/:vehicleId/checklist")
  async upsertChecklistItem(
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpsertFleetVehicleChecklistItemDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.upsertChecklistItem(vehicleId, body);
  }

  @Post("vehicles/:vehicleId/maintenance-tasks")
  async createMaintenanceTask(
    @Param("vehicleId") vehicleId: string,
    @Body() body: CreateFleetMaintenanceTaskDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.createMaintenanceTask(vehicleId, body);
  }

  @Post("vehicles/:vehicleId/maintenance-plans")
  async createMaintenancePlan(
    @Param("vehicleId") vehicleId: string,
    @Body() body: CreateFleetMaintenancePlanDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.createMaintenancePlan(vehicleId, body);
  }

  @Patch("vehicles/:vehicleId/maintenance-plans/:planId")
  async updateMaintenancePlan(
    @Param("vehicleId") vehicleId: string,
    @Param("planId") planId: string,
    @Body() body: UpdateFleetMaintenancePlanDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.updateMaintenancePlan(vehicleId, planId, body);
  }

  @Post("vehicles/:vehicleId/maintenance-plans/:planId/generate-task")
  async generateMaintenanceTaskFromPlan(
    @Param("vehicleId") vehicleId: string,
    @Param("planId") planId: string
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.generateMaintenanceTaskFromPlan(vehicleId, planId);
  }

  @Patch("vehicles/:vehicleId/maintenance-tasks/:taskId")
  async updateMaintenanceTask(
    @Param("vehicleId") vehicleId: string,
    @Param("taskId") taskId: string,
    @Body() body: UpdateFleetMaintenanceTaskDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.updateMaintenanceTask(vehicleId, taskId, body);
  }

  @Post("vehicles/:vehicleId/odometer-logs")
  async createOdometerLog(
    @Param("vehicleId") vehicleId: string,
    @Body() body: CreateFleetVehicleOdometerLogDto
  ): Promise<FleetVehicleDetails> {
    return this.fleetService.createOdometerLog(vehicleId, body);
  }

  @Get("drivers")
  async listFleetDrivers(): Promise<DriverProfile[]> {
    const drivers = await this.driversService.listDrivers();
    return drivers.filter((driver) => driver.driverType === "FROTA");
  }
}
