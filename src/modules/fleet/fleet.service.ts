import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AssignFleetVehicleDto } from "./dto/assign-fleet-vehicle.dto";
import { CreateFleetChecklistTemplateDto } from "./dto/create-fleet-checklist-template.dto";
import { CreateFleetChecklistTemplateTaskDto } from "./dto/create-fleet-checklist-template-task.dto";
import { CreateFleetMaintenancePlanDto } from "./dto/create-fleet-maintenance-plan.dto";
import { CreateFleetMaintenanceTaskDto } from "./dto/create-fleet-maintenance-task.dto";
import { CreateFleetVehicleDto } from "./dto/create-fleet-vehicle.dto";
import { CreateFleetVehicleOdometerLogDto } from "./dto/create-fleet-vehicle-odometer-log.dto";
import { UpdateFleetChecklistTemplateDto } from "./dto/update-fleet-checklist-template.dto";
import { UpdateFleetChecklistTemplateTaskDto } from "./dto/update-fleet-checklist-template-task.dto";
import { UpdateFleetMaintenancePlanDto } from "./dto/update-fleet-maintenance-plan.dto";
import { UpdateFleetMaintenanceTaskDto } from "./dto/update-fleet-maintenance-task.dto";
import { UpdateFleetVehicleDto } from "./dto/update-fleet-vehicle.dto";
import { UpsertFleetVehicleChecklistItemDto } from "./dto/upsert-fleet-vehicle-checklist-item.dto";
import {
  DEFAULT_FLEET_CHECKLIST_TEMPLATES,
  FleetChecklistInputType,
  FleetChecklistTaskActionType,
  FleetChecklistTaskBuilderConfig,
  FleetChecklistTemplateSummary,
  FleetMaintenanceOverview,
  FleetMaintenanceOverviewPlanEntry,
  FleetMaintenanceOverviewTaskEntry,
  FleetOverviewMetrics,
  FleetVehicleAlertSummary,
  FleetVehicleAssignmentHistoryEntry,
  FleetVehicleChecklistProgressSummary,
  FleetVehicleDetails,
  FleetVehicleChecklistItemSummary,
  FleetVehicleMaintenanceTaskSummary,
  FleetVehicleMaintenancePlanSummary,
  FleetVehicleOverviewSummary,
  FleetVehicleSummary,
  FleetVehicleTimelineEntry
} from "./types";

const CHECKLIST_REQUIRED_STATUSES = new Set<string>(["ALLOCATED"]);
const OPEN_MAINTENANCE_STATUSES = new Set<string>(["OPEN", "IN_PROGRESS"]);
const OPEN_MAINTENANCE_STATUS_VALUES: Array<"OPEN" | "IN_PROGRESS"> = ["OPEN", "IN_PROGRESS"];
const MAINTENANCE_DUE_SOON_DAYS = 7;
const MAINTENANCE_DUE_SOON_KM = 500;

const fleetVehicleInclude = {
  assignments: {
    where: { endedAt: null },
    orderBy: { startedAt: "desc" },
    take: 1,
    include: {
      driver: {
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    }
  }
} as const;

type FleetVehicleRecord = {
  id: string;
  label: string;
  plate: string;
  checkinCode: string;
  color: string | null;
  year: number | null;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{
    id: string;
    startedAt: Date;
    endedAt: Date | null;
    notes: string | null;
    validationMethod: "QR_CODE" | "PLATE" | "ADMIN";
    driver: {
      id: string;
      driverType: "AGREGADO" | "FROTA";
      user: {
        name: string;
      };
    };
  }>;
};

type FleetOperationalSnapshot = {
  checklistProgress: FleetVehicleChecklistProgressSummary;
  latestOdometerKm?: number;
  openMaintenanceCount: number;
  overdueMaintenanceCount: number;
  dueSoonMaintenanceCount: number;
  alerts: FleetVehicleAlertSummary[];
};

type FleetChecklistTemplateRecord = {
  id: string;
  name: string;
  category: string;
  routine: "START_OF_DAY" | "END_OF_DAY";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: FleetChecklistTemplateTaskRecord[];
};

type FleetChecklistTemplateTaskRecord = {
  id: string;
  templateId: string;
  itemKey: string;
  label: string;
  description: string | null;
  inputType: FleetChecklistInputType;
  actionType: FleetChecklistTaskActionType;
  selectOptions: unknown;
  builderConfig: unknown;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async getFleetOverview(): Promise<FleetOverviewMetrics> {
    const vehicles = await this.listFleetVehicles();

    return {
      total: vehicles.length,
      available: vehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length,
      allocated: vehicles.filter((vehicle) => vehicle.status === "ALLOCATED").length,
      maintenance: vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE").length,
      inactive: vehicles.filter((vehicle) => vehicle.status === "INACTIVE").length,
      withAlerts: vehicles.filter((vehicle) => vehicle.alerts.length > 0).length,
      overdueMaintenance: vehicles.reduce((total, vehicle) => total + vehicle.overdueMaintenanceCount, 0),
      dueSoonMaintenance: vehicles.reduce((total, vehicle) => total + vehicle.dueSoonMaintenanceCount, 0),
      checklistPendingToday: vehicles.filter(
        (vehicle) => vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete
      ).length,
      checklistCompletedToday: vehicles.filter(
        (vehicle) => vehicle.checklistProgress.required && vehicle.checklistProgress.isComplete
      ).length
    };
  }

  async getFleetMaintenanceOverview(): Promise<FleetMaintenanceOverview> {
    const [plans, tasks, odometerLogs] = await Promise.all([
      this.prisma.fleetVehicleMaintenancePlan.findMany({
        include: {
          fleetVehicle: {
            select: {
              id: true,
              label: true,
              plate: true
            }
          }
        },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
      }),
      this.prisma.fleetVehicleMaintenanceTask.findMany({
        where: {
          status: { in: OPEN_MAINTENANCE_STATUS_VALUES }
        },
        include: {
          fleetVehicle: {
            select: {
              id: true,
              label: true,
              plate: true
            }
          },
          maintenancePlan: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      }),
      this.prisma.fleetVehicleOdometerLog.findMany({
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }]
      })
    ]);

    const latestOdometerByVehicle = new Map<string, number>();
    for (const log of odometerLogs) {
      if (!latestOdometerByVehicle.has(log.fleetVehicleId)) {
        latestOdometerByVehicle.set(log.fleetVehicleId, log.odometerKm);
      }
    }

    const openTasks = tasks
      .map((task) => this.toMaintenanceOverviewTaskEntry(task, latestOdometerByVehicle.get(task.fleetVehicleId)))
      .sort((left, right) => Number(right.isOverdue) - Number(left.isOverdue) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    const overdueTasks = openTasks.filter((task) => task.isOverdue);
    const plansOverview = plans.map((plan) => {
      const nextTask = openTasks.find((task) => task.maintenancePlanId === plan.id);
      return this.toMaintenanceOverviewPlanEntry(plan, nextTask);
    });

    return {
      plans: plansOverview,
      openTasks,
      overdueTasks
    };
  }

  async listChecklistTemplates(): Promise<FleetChecklistTemplateSummary[]> {
    const templates = await this.getChecklistTemplates();
    return templates.map((item) => this.toChecklistTemplateSummary(item));
  }

  async createChecklistTemplate(
    input: CreateFleetChecklistTemplateDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    await this.prisma.fleetChecklistTemplate.create({
      data: {
        name: input.name.trim(),
        category: input.category.trim(),
        routine: input.routine,
        isActive: input.isActive ?? true
      }
    });

    return this.listChecklistTemplates();
  }

  async updateChecklistTemplate(
    templateId: string,
    input: UpdateFleetChecklistTemplateDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    await this.ensureChecklistTemplateExists(templateId);

    await this.prisma.fleetChecklistTemplate.update({
      where: { id: templateId },
      data: {
        name: input.name?.trim(),
        category: input.category?.trim(),
        routine: input.routine,
        isActive: input.isActive
      }
    });

    return this.listChecklistTemplates();
  }

  async createChecklistTemplateTask(
    templateId: string,
    input: CreateFleetChecklistTemplateTaskDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    await this.ensureChecklistTemplateExists(templateId);
    const builderConfig = this.normalizeChecklistBuilderConfig(input.builderConfig);
    const selectOptions = this.resolveChecklistSelectOptions(input.selectOptions, builderConfig);
    const actionType = this.resolvePrimaryChecklistActionType(input.actionType, builderConfig);

    await this.prisma.fleetChecklistTemplateItem.create({
      data: {
        templateId,
        itemKey: randomUUID(),
        label: input.label.trim(),
        description: this.normalizeOptional(input.description),
        inputType: input.inputType,
        actionType,
        selectOptions: selectOptions.length ? selectOptions : Prisma.JsonNull,
        builderConfig: builderConfig ? (builderConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        sortOrder: input.sortOrder ?? 0,
        isRequired: input.isRequired ?? true,
        isActive: input.isActive ?? true
      }
    });

    return this.listChecklistTemplates();
  }

  async updateChecklistTemplateTask(
    taskId: string,
    input: UpdateFleetChecklistTemplateTaskDto
  ): Promise<FleetChecklistTemplateSummary[]> {
    const existingTask = await this.ensureChecklistTemplateTaskExists(taskId);
    const builderConfig = input.builderConfig === undefined
      ? this.parseChecklistBuilderConfig(existingTask.builderConfig)
      : this.normalizeChecklistBuilderConfig(input.builderConfig);
    const selectOptions = input.selectOptions === undefined
      ? this.resolveChecklistSelectOptions(undefined, builderConfig)
      : this.resolveChecklistSelectOptions(input.selectOptions, builderConfig);
    const actionType = this.resolvePrimaryChecklistActionType(input.actionType ?? existingTask.actionType, builderConfig);

    await this.prisma.fleetChecklistTemplateItem.update({
      where: { id: taskId },
      data: {
        label: input.label?.trim(),
        description: input.description === undefined ? undefined : this.normalizeOptional(input.description),
        inputType: input.inputType,
        actionType,
        selectOptions:
          input.selectOptions === undefined && input.builderConfig === undefined
            ? undefined
            : selectOptions.length
              ? selectOptions
              : Prisma.JsonNull,
        builderConfig: input.builderConfig === undefined
          ? undefined
          : builderConfig
            ? (builderConfig as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        sortOrder: input.sortOrder,
        isRequired: input.isRequired,
        isActive: input.isActive
      }
    });

    return this.listChecklistTemplates();
  }

  async listFleetVehicles(): Promise<FleetVehicleOverviewSummary[]> {
    const vehicles = await this.prisma.fleetVehicle.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: fleetVehicleInclude
    });

    const snapshots = await this.buildOperationalSnapshots(vehicles);

    return vehicles.map((vehicle) => this.toFleetVehicleOverviewSummary(vehicle, snapshots.get(vehicle.id)));
  }

  async getFleetVehicle(vehicleId: string): Promise<FleetVehicleDetails> {
    const vehicle = await this.prisma.fleetVehicle.findUnique({
      where: { id: vehicleId },
      include: fleetVehicleInclude
    });

    if (!vehicle) {
      throw new NotFoundException(`Fleet vehicle ${vehicleId} not found.`);
    }

    return this.buildFleetVehicleDetails(vehicle);
  }

  async createFleetVehicle(input: CreateFleetVehicleDto): Promise<FleetVehicleDetails> {
    const vehicle = await this.prisma.fleetVehicle.create({
      data: {
        label: input.label.trim(),
        plate: input.plate.trim().toUpperCase(),
        color: this.normalizeOptional(input.color),
        year: input.year,
        status: input.status ?? "AVAILABLE",
        notes: this.normalizeOptional(input.notes)
      },
      include: fleetVehicleInclude
    });

    return this.buildFleetVehicleDetails(vehicle);
  }

  async updateFleetVehicle(vehicleId: string, input: UpdateFleetVehicleDto): Promise<FleetVehicleDetails> {
    const current = await this.prisma.fleetVehicle.findUnique({
      where: { id: vehicleId },
      include: fleetVehicleInclude
    });

    if (!current) {
      throw new NotFoundException(`Fleet vehicle ${vehicleId} not found.`);
    }

    const hasActiveAssignment = current.assignments.length > 0;
    if (hasActiveAssignment && input.status && input.status !== "ALLOCATED") {
      throw new BadRequestException("Desaloque o veiculo antes de mudar o status operacional.");
    }

    const vehicle = await this.prisma.fleetVehicle.update({
      where: { id: vehicleId },
      data: {
        label: input.label?.trim(),
        plate: input.plate?.trim().toUpperCase(),
        color: input.color === undefined ? undefined : this.normalizeOptional(input.color),
        year: input.year,
        status: input.status,
        notes: input.notes === undefined ? undefined : this.normalizeOptional(input.notes)
      },
      include: fleetVehicleInclude
    });

    return this.buildFleetVehicleDetails(vehicle);
  }

  async assignFleetVehicle(vehicleId: string, input: AssignFleetVehicleDto): Promise<FleetVehicleDetails> {
    const [vehicle, driver] = await Promise.all([
      this.prisma.fleetVehicle.findUnique({
        where: { id: vehicleId },
        include: fleetVehicleInclude
      }),
      this.prisma.driver.findUnique({
        where: { id: input.driverId },
        include: {
          user: {
            select: {
              name: true
            }
          },
          defaultFleetVehicle: {
            select: {
              id: true
            }
          }
        }
      })
    ]);

    if (!vehicle) {
      throw new NotFoundException(`Fleet vehicle ${vehicleId} not found.`);
    }

    if (!driver) {
      throw new NotFoundException(`Driver ${input.driverId} not found.`);
    }

    if (driver.driverType !== "FROTA") {
      throw new BadRequestException("Somente motoristas da frota podem receber carro da operacao.");
    }

    if (!driver.isActive) {
      throw new BadRequestException("Motorista inativo nao pode receber alocacao de frota.");
    }

    if (driver.fleetAssignmentMode === "FIXED") {
      if (!driver.defaultFleetVehicleId) {
        throw new BadRequestException("Defina o veiculo fixo desse motorista antes de alocar o carro.");
      }

      if (driver.defaultFleetVehicleId !== vehicleId) {
        throw new BadRequestException("Esse motorista so pode receber o veiculo fixo definido no cadastro.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fleetVehicleAssignment.updateMany({
        where: {
          OR: [{ fleetVehicleId: vehicleId }, { driverId: input.driverId }],
          endedAt: null
        },
        data: {
          endedAt: new Date()
        }
      });

      await tx.fleetVehicleAssignment.create({
        data: {
          fleetVehicleId: vehicleId,
          driverId: input.driverId,
          validationMethod: "ADMIN",
          notes: this.normalizeOptional(input.notes)
        }
      });

      await tx.fleetVehicle.update({
        where: { id: vehicleId },
        data: {
          status: "ALLOCATED"
        }
      });
    });

    const updated = await this.prisma.fleetVehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      include: fleetVehicleInclude
    });

    return this.buildFleetVehicleDetails(updated);
  }

  async unassignFleetVehicle(vehicleId: string): Promise<FleetVehicleDetails> {
    const vehicle = await this.prisma.fleetVehicle.findUnique({
      where: { id: vehicleId },
      include: fleetVehicleInclude
    });

    if (!vehicle) {
      throw new NotFoundException(`Fleet vehicle ${vehicleId} not found.`);
    }

    if (vehicle.assignments.length === 0) {
      throw new BadRequestException("Este veiculo ja esta sem alocacao ativa.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fleetVehicleAssignment.updateMany({
        where: {
          fleetVehicleId: vehicleId,
          endedAt: null
        },
        data: {
          endedAt: new Date()
        }
      });

      await tx.fleetVehicle.update({
        where: { id: vehicleId },
        data: {
          status: "AVAILABLE"
        }
      });
    });

    const updated = await this.prisma.fleetVehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      include: fleetVehicleInclude
    });

    return this.buildFleetVehicleDetails(updated);
  }

  async upsertChecklistItem(
    vehicleId: string,
    input: UpsertFleetVehicleChecklistItemDto
  ): Promise<FleetVehicleDetails> {
    await this.ensureFleetVehicleExists(vehicleId);
    const template = await this.prisma.fleetChecklistTemplateItem.findFirst({
      where: { itemKey: input.itemKey },
      include: { template: true }
    });
    const inputType = input.inputType ?? template?.inputType ?? "BOOLEAN";
    const actionType = input.actionType ?? template?.actionType ?? "NONE";
    const isChecked = this.resolveChecklistEntryCompletedState(
      inputType,
      input.isChecked,
      input.numericValue,
      input.textValue,
      input.selectedOption
    );

    await this.prisma.fleetVehicleChecklistEntry.upsert({
      where: {
        fleetVehicleId_dateKey_itemKey: {
          fleetVehicleId: vehicleId,
          dateKey: input.dateKey,
          itemKey: input.itemKey
        }
      },
      create: {
        fleetVehicleId: vehicleId,
        dateKey: input.dateKey,
        itemKey: input.itemKey,
        templateId: input.templateId ?? template?.templateId ?? null,
        templateName: input.templateName?.trim() ?? template?.template.name ?? null,
        label: input.label.trim(),
        description: input.description ? input.description.trim() : template?.description ?? null,
        category: input.category?.trim() ?? template?.template.category ?? null,
        routine: input.routine ?? template?.template.routine ?? "START_OF_DAY",
        inputType,
        actionType,
        sortOrder: input.sortOrder ?? template?.sortOrder ?? 0,
        isRequired: input.isRequired ?? template?.isRequired ?? true,
        isChecked,
        numericValue: input.numericValue,
        textValue: this.normalizeOptional(input.textValue),
        selectedOption: this.normalizeOptional(input.selectedOption),
        checkedAt: isChecked ? new Date() : null,
        notes: this.normalizeOptional(input.notes)
      },
      update: {
        templateId: input.templateId,
        templateName: input.templateName === undefined ? undefined : this.normalizeOptional(input.templateName),
        label: input.label.trim(),
        description: input.description === undefined ? undefined : this.normalizeOptional(input.description),
        category: input.category === undefined ? undefined : this.normalizeOptional(input.category),
        routine: input.routine,
        inputType: input.inputType,
        actionType: input.actionType,
        sortOrder: input.sortOrder,
        isRequired: input.isRequired,
        isChecked,
        numericValue: input.numericValue,
        textValue: input.textValue === undefined ? undefined : this.normalizeOptional(input.textValue),
        selectedOption: input.selectedOption === undefined ? undefined : this.normalizeOptional(input.selectedOption),
        checkedAt: isChecked ? new Date() : null,
        notes: this.normalizeOptional(input.notes)
      }
    });

    return this.getFleetVehicle(vehicleId);
  }

  async createMaintenanceTask(
    vehicleId: string,
    input: CreateFleetMaintenanceTaskDto
  ): Promise<FleetVehicleDetails> {
    await this.ensureFleetVehicleExists(vehicleId);
    const latestOdometerKm = await this.getLatestOdometerKm(vehicleId);

    await this.prisma.fleetVehicleMaintenanceTask.create({
      data: {
        fleetVehicleId: vehicleId,
        title: input.title.trim(),
        description: this.normalizeOptional(input.description),
        serviceType: input.serviceType ?? "GENERAL",
        priority: input.priority ?? "MEDIUM",
        workshop: this.normalizeOptional(input.workshop),
        dueAt: input.dueDate ? this.toDateOnlyValue(input.dueDate) : null,
        dueKm: input.dueKm,
        recurrenceMonths: input.recurrenceMonths,
        recurrenceKm: input.recurrenceKm,
        currentOdometerKm: input.currentOdometerKm ?? latestOdometerKm ?? null,
        estimatedCost: input.estimatedCost,
        actualCost: input.actualCost,
        openedAt: new Date(),
        startedAt: input.status === "IN_PROGRESS" ? new Date() : null,
        status: input.status ?? "OPEN",
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        notes: this.normalizeOptional(input.notes)
      }
    });

    return this.getFleetVehicle(vehicleId);
  }

  async createMaintenancePlan(
    vehicleId: string,
    input: CreateFleetMaintenancePlanDto
  ): Promise<FleetVehicleDetails> {
    await this.ensureFleetVehicleExists(vehicleId);

    if (!input.intervalMonths && !input.intervalKm && !input.firstDueDate && input.firstDueKm === undefined) {
      throw new BadRequestException("Defina a recorrencia ou o primeiro vencimento do plano de manutencao.");
    }

    const plan = await this.prisma.fleetVehicleMaintenancePlan.create({
      data: {
        fleetVehicleId: vehicleId,
        title: input.title.trim(),
        description: this.normalizeOptional(input.description),
        serviceType: input.serviceType ?? "PREVENTIVE",
        priority: input.priority ?? "MEDIUM",
        workshop: this.normalizeOptional(input.workshop),
        intervalMonths: input.intervalMonths,
        intervalKm: input.intervalKm,
        firstDueAt: input.firstDueDate ? this.toDateOnlyValue(input.firstDueDate) : null,
        firstDueKm: input.firstDueKm,
        defaultEstimatedCost: input.defaultEstimatedCost,
        notes: this.normalizeOptional(input.notes),
        isActive: input.isActive ?? true
      }
    });

    if (plan.isActive) {
      await this.createTaskFromPlan(plan, {
        dueAt: plan.firstDueAt,
        dueKm: plan.firstDueKm
      });
    }

    return this.getFleetVehicle(vehicleId);
  }

  async updateMaintenancePlan(
    vehicleId: string,
    planId: string,
    input: UpdateFleetMaintenancePlanDto
  ): Promise<FleetVehicleDetails> {
    const currentPlan = await this.ensureMaintenancePlanExists(vehicleId, planId);

    await this.prisma.fleetVehicleMaintenancePlan.update({
      where: { id: planId },
      data: {
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : this.normalizeOptional(input.description),
        serviceType: input.serviceType,
        priority: input.priority,
        workshop: input.workshop === undefined ? undefined : this.normalizeOptional(input.workshop),
        intervalMonths: input.intervalMonths,
        intervalKm: input.intervalKm,
        firstDueAt:
          input.firstDueDate === undefined ? undefined : input.firstDueDate ? this.toDateOnlyValue(input.firstDueDate) : null,
        firstDueKm: input.firstDueKm,
        defaultEstimatedCost: input.defaultEstimatedCost,
        notes: input.notes === undefined ? undefined : this.normalizeOptional(input.notes),
        isActive: input.isActive
      }
    });

    const nextIsActive = input.isActive ?? currentPlan.isActive;
    if (!nextIsActive) {
      return this.getFleetVehicle(vehicleId);
    }

    return this.getFleetVehicle(vehicleId);
  }

  async generateMaintenanceTaskFromPlan(vehicleId: string, planId: string): Promise<FleetVehicleDetails> {
    const plan = await this.ensureMaintenancePlanExists(vehicleId, planId);

    if (!plan.isActive) {
      throw new BadRequestException("Ative o plano antes de gerar uma ordem de servico manual.");
    }

    const existingOpenTask = await this.prisma.fleetVehicleMaintenanceTask.findFirst({
      where: {
        maintenancePlanId: plan.id,
        status: { in: OPEN_MAINTENANCE_STATUS_VALUES }
      },
      select: { id: true }
    });

    if (existingOpenTask) {
      throw new BadRequestException("Ja existe uma ordem de servico aberta para esse plano.");
    }

    const latestPlanTask = await this.prisma.fleetVehicleMaintenanceTask.findFirst({
      where: { maintenancePlanId: plan.id },
      orderBy: [{ createdAt: "desc" }]
    });

    await this.createTaskFromPlan(plan, this.resolvePlanNextDue(plan, latestPlanTask));

    return this.getFleetVehicle(vehicleId);
  }

  async updateMaintenanceTask(
    vehicleId: string,
    taskId: string,
    input: UpdateFleetMaintenanceTaskDto
  ): Promise<FleetVehicleDetails> {
    const currentTask = await this.ensureMaintenanceTaskExists(vehicleId, taskId);
    const nextStatus = input.status;
    const shouldStartTask =
      nextStatus === "IN_PROGRESS" && currentTask.status !== "IN_PROGRESS" && !currentTask.startedAt;
    const shouldCompleteTask = nextStatus === "COMPLETED" && currentTask.status !== "COMPLETED";

    const updatedTask = await this.prisma.fleetVehicleMaintenanceTask.update({
      where: { id: taskId },
      data: {
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : this.normalizeOptional(input.description),
        serviceType: input.serviceType,
        priority: input.priority,
        workshop: input.workshop === undefined ? undefined : this.normalizeOptional(input.workshop),
        dueAt: input.dueDate === undefined ? undefined : input.dueDate ? this.toDateOnlyValue(input.dueDate) : null,
        dueKm: input.dueKm,
        recurrenceMonths: input.recurrenceMonths,
        recurrenceKm: input.recurrenceKm,
        currentOdometerKm: input.currentOdometerKm,
        estimatedCost: input.estimatedCost,
        actualCost: input.actualCost,
        startedAt: nextStatus === undefined ? undefined : shouldStartTask ? new Date() : nextStatus === "OPEN" ? null : undefined,
        status: nextStatus,
        completedAt:
          nextStatus === undefined ? undefined : nextStatus === "COMPLETED" ? new Date() : null,
        notes: input.notes === undefined ? undefined : this.normalizeOptional(input.notes)
      }
    });

    if (shouldCompleteTask && updatedTask.maintenancePlanId) {
      const plan = await this.prisma.fleetVehicleMaintenancePlan.findUnique({
        where: { id: updatedTask.maintenancePlanId }
      });

      if (plan?.isActive) {
        await this.createTaskFromPlan(plan, this.resolvePlanNextDue(plan, updatedTask));
      }
    } else if (shouldCompleteTask) {
      await this.createRecurringFollowUpTask(vehicleId, {
        title: input.title?.trim() ?? updatedTask.title,
        description:
          input.description === undefined
            ? updatedTask.description
            : this.normalizeOptional(input.description),
        serviceType: input.serviceType ?? updatedTask.serviceType,
        priority: input.priority ?? updatedTask.priority,
        workshop:
          input.workshop === undefined ? updatedTask.workshop : this.normalizeOptional(input.workshop),
        recurrenceMonths:
          input.recurrenceMonths === undefined ? updatedTask.recurrenceMonths : input.recurrenceMonths,
        recurrenceKm: input.recurrenceKm === undefined ? updatedTask.recurrenceKm : input.recurrenceKm,
        notes: input.notes === undefined ? updatedTask.notes : this.normalizeOptional(input.notes),
        dueAt: input.dueDate === undefined ? updatedTask.dueAt : input.dueDate ? this.toDateOnlyValue(input.dueDate) : null,
        dueKm: input.dueKm === undefined ? updatedTask.dueKm : input.dueKm
      });
    }

    return this.getFleetVehicle(vehicleId);
  }

  async createOdometerLog(
    vehicleId: string,
    input: CreateFleetVehicleOdometerLogDto
  ): Promise<FleetVehicleDetails> {
    await this.ensureFleetVehicleExists(vehicleId);

    const latestLog = await this.prisma.fleetVehicleOdometerLog.findFirst({
      where: { fleetVehicleId: vehicleId },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }]
    });

    if (latestLog && input.odometerKm < latestLog.odometerKm) {
      throw new BadRequestException("A kilometragem nao pode ser menor que o ultimo registro do carro.");
    }

    await this.prisma.fleetVehicleOdometerLog.create({
      data: {
        fleetVehicleId: vehicleId,
        odometerKm: input.odometerKm,
        notes: this.normalizeOptional(input.notes)
      }
    });

    return this.getFleetVehicle(vehicleId);
  }

  private async ensureChecklistTemplatesSeeded(): Promise<void> {
    const total = await this.prisma.fleetChecklistTemplate.count();

    if (total > 0) {
      return;
    }

    for (const template of DEFAULT_FLEET_CHECKLIST_TEMPLATES) {
      await this.prisma.fleetChecklistTemplate.create({
        data: {
          name: template.name,
          category: template.category,
          routine: template.routine,
          isActive: true,
          items: {
            create: template.items.map((item) => ({
              itemKey: item.itemKey,
              label: item.label,
              description: item.description ?? null,
              inputType: item.inputType,
              actionType: item.actionType,
              selectOptions: item.selectOptions?.length ? item.selectOptions : Prisma.JsonNull,
              sortOrder: item.sortOrder,
              isRequired: item.isRequired,
              isActive: true
            }))
          }
        }
      });
    }
  }

  private async getChecklistTemplates(): Promise<FleetChecklistTemplateRecord[]> {
    await this.ensureChecklistTemplatesSeeded();

    return this.prisma.fleetChecklistTemplate.findMany({
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ routine: "asc" }, { createdAt: "asc" }]
    });
  }

  private async getActiveChecklistTemplates(): Promise<FleetChecklistTemplateRecord[]> {
    await this.ensureChecklistTemplatesSeeded();

    return this.prisma.fleetChecklistTemplate.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ routine: "asc" }, { createdAt: "asc" }]
    });
  }

  private async ensureChecklistTemplateExists(templateId: string): Promise<FleetChecklistTemplateRecord> {
    await this.ensureChecklistTemplatesSeeded();

    const template = await this.prisma.fleetChecklistTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!template) {
      throw new NotFoundException(`Checklist template ${templateId} not found.`);
    }

    return template;
  }

  private async ensureChecklistTemplateTaskExists(taskId: string): Promise<FleetChecklistTemplateTaskRecord> {
    await this.ensureChecklistTemplatesSeeded();

    const task = await this.prisma.fleetChecklistTemplateItem.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new NotFoundException(`Checklist template task ${taskId} not found.`);
    }

    return task as FleetChecklistTemplateTaskRecord;
  }

  private toChecklistTemplateSummary(template: FleetChecklistTemplateRecord): FleetChecklistTemplateSummary {
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      routine: template.routine,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      items: template.items.map((item) => ({
        id: item.id,
        itemKey: item.itemKey,
        label: item.label,
        description: item.description ?? undefined,
        inputType: item.inputType,
        actionType: item.actionType,
        selectOptions: Array.isArray(item.selectOptions) ? (item.selectOptions as string[]) : undefined,
        builderConfig: this.parseChecklistBuilderConfig(item.builderConfig),
        sortOrder: item.sortOrder,
        isRequired: item.isRequired,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }))
    };
  }

  private buildChecklistItemsForDate(
    templates: FleetChecklistTemplateRecord[],
    checklistEntries: Array<{
      itemKey: string;
      templateId: string | null;
      templateName: string | null;
      label: string;
      description: string | null;
      category: string | null;
      routine: "START_OF_DAY" | "END_OF_DAY";
      inputType: FleetChecklistInputType;
      actionType: FleetChecklistTaskActionType;
      sortOrder: number;
      isRequired: boolean;
      isChecked: boolean;
      numericValue: number | null;
      textValue: string | null;
      selectedOption: string | null;
      checkedAt: Date | null;
      notes: string | null;
    }>,
    dateKey: string
  ): FleetVehicleChecklistItemSummary[] {
    return templates.flatMap((template) =>
      template.items.map((task) => {
        const existing = checklistEntries.find((entry) => entry.itemKey === task.itemKey);

        return {
          itemKey: task.itemKey,
          templateId: existing?.templateId ?? template.id,
          templateName: existing?.templateName ?? template.name,
          label: existing?.label ?? task.label,
          description: existing?.description ?? task.description ?? undefined,
          category: existing?.category ?? template.category,
          routine: existing?.routine ?? template.routine,
          inputType: existing?.inputType ?? task.inputType,
          actionType: existing?.actionType ?? task.actionType,
          selectOptions: Array.isArray(task.selectOptions) ? (task.selectOptions as string[]) : undefined,
          builderConfig: this.parseChecklistBuilderConfig(task.builderConfig),
          sortOrder: existing?.sortOrder ?? task.sortOrder,
          isRequired: existing?.isRequired ?? task.isRequired,
          dateKey,
          isChecked: existing?.isChecked ?? false,
          numericValue: existing?.numericValue ?? undefined,
          textValue: existing?.textValue ?? undefined,
          selectedOption: existing?.selectedOption ?? undefined,
          checkedAt: existing?.checkedAt?.toISOString(),
          notes: existing?.notes ?? undefined
        };
      })
    );
  }

  private resolveChecklistEntryCompletedState(
    inputType: FleetChecklistInputType,
    isChecked?: boolean,
    numericValue?: number,
    textValue?: string,
    selectedOption?: string
  ) {
    if (inputType === "ODOMETER" || inputType === "NUMBER") {
      return numericValue !== undefined;
    }

    if (inputType === "TEXT") {
      return Boolean(textValue?.trim());
    }

    if (inputType === "SELECT") {
      return Boolean(selectedOption?.trim());
    }

    return Boolean(isChecked);
  }

  private async buildOperationalSnapshots(
    vehicles: FleetVehicleRecord[]
  ): Promise<Map<string, FleetOperationalSnapshot>> {
    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const snapshots = new Map<string, FleetOperationalSnapshot>();

    if (vehicleIds.length === 0) {
      return snapshots;
    }

    const dateKey = this.toDateKey(new Date());
    const [templates, todayChecklistEntries, openMaintenanceTasks, odometerLogs] = await Promise.all([
      this.getActiveChecklistTemplates(),
      this.prisma.fleetVehicleChecklistEntry.findMany({
        where: {
          fleetVehicleId: { in: vehicleIds },
          dateKey
        },
        orderBy: [{ createdAt: "asc" }]
      }),
      this.prisma.fleetVehicleMaintenanceTask.findMany({
        where: {
          fleetVehicleId: { in: vehicleIds },
          status: { in: OPEN_MAINTENANCE_STATUS_VALUES }
        },
        orderBy: [{ createdAt: "desc" }]
      }),
      this.prisma.fleetVehicleOdometerLog.findMany({
        where: {
          fleetVehicleId: { in: vehicleIds }
        },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }]
      })
    ]);

    const checklistByVehicle = new Map<string, typeof todayChecklistEntries>();
    for (const entry of todayChecklistEntries) {
      const bucket = checklistByVehicle.get(entry.fleetVehicleId) ?? [];
      bucket.push(entry);
      checklistByVehicle.set(entry.fleetVehicleId, bucket);
    }

    const tasksByVehicle = new Map<string, typeof openMaintenanceTasks>();
    for (const task of openMaintenanceTasks) {
      const bucket = tasksByVehicle.get(task.fleetVehicleId) ?? [];
      bucket.push(task);
      tasksByVehicle.set(task.fleetVehicleId, bucket);
    }

    const latestOdometerByVehicle = new Map<string, number>();
    for (const log of odometerLogs) {
      if (!latestOdometerByVehicle.has(log.fleetVehicleId)) {
        latestOdometerByVehicle.set(log.fleetVehicleId, log.odometerKm);
      }
    }

    for (const vehicle of vehicles) {
      const latestOdometerKm = latestOdometerByVehicle.get(vehicle.id);
      const tasks = tasksByVehicle.get(vehicle.id) ?? [];
      const checklistEntries = checklistByVehicle.get(vehicle.id) ?? [];
      const checklistProgress = this.buildChecklistProgress(vehicle.status, templates, checklistEntries, dateKey);
      const maintenanceSummary = this.summarizeMaintenanceTasks(tasks, latestOdometerKm);
      const alerts = this.buildAlerts(vehicle, maintenanceSummary.tasks, latestOdometerKm, checklistProgress);

      snapshots.set(vehicle.id, {
        checklistProgress,
        latestOdometerKm,
        openMaintenanceCount: maintenanceSummary.tasks.length,
        overdueMaintenanceCount: maintenanceSummary.overdueCount,
        dueSoonMaintenanceCount: maintenanceSummary.dueSoonCount,
        alerts
      });
    }

    return snapshots;
  }

  private toFleetVehicleSummary(vehicle: FleetVehicleRecord): FleetVehicleSummary {
    const currentAssignment = vehicle.assignments[0];

    return {
      id: vehicle.id,
      label: vehicle.label,
      plate: vehicle.plate,
      checkinCode: vehicle.checkinCode,
      color: vehicle.color ?? undefined,
      year: vehicle.year ?? undefined,
      status: vehicle.status,
      notes: vehicle.notes ?? undefined,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
      currentAssignment: currentAssignment
        ? {
            id: currentAssignment.id,
            driverId: currentAssignment.driver.id,
            driverName: currentAssignment.driver.user.name,
            driverType: currentAssignment.driver.driverType,
            validationMethod: currentAssignment.validationMethod,
            startedAt: currentAssignment.startedAt.toISOString(),
            endedAt: currentAssignment.endedAt?.toISOString(),
            notes: currentAssignment.notes ?? undefined
          }
        : undefined
    };
  }

  private toFleetVehicleOverviewSummary(
    vehicle: FleetVehicleRecord,
    snapshot?: FleetOperationalSnapshot
  ): FleetVehicleOverviewSummary {
    return {
      ...this.toFleetVehicleSummary(vehicle),
      latestOdometerKm: snapshot?.latestOdometerKm,
      openMaintenanceCount: snapshot?.openMaintenanceCount ?? 0,
      overdueMaintenanceCount: snapshot?.overdueMaintenanceCount ?? 0,
      dueSoonMaintenanceCount: snapshot?.dueSoonMaintenanceCount ?? 0,
      checklistProgress:
        snapshot?.checklistProgress ??
        this.buildChecklistProgress(vehicle.status, [], [], this.toDateKey(new Date())),
      alerts: snapshot?.alerts ?? []
    };
  }

  private async buildFleetVehicleDetails(vehicle: FleetVehicleRecord): Promise<FleetVehicleDetails> {
    const dateKey = this.toDateKey(new Date());
    const [templates, checklistEntries, maintenancePlans, maintenanceTasks, odometerLogs, assignmentHistory] = await Promise.all([
      this.getActiveChecklistTemplates(),
      this.prisma.fleetVehicleChecklistEntry.findMany({
        where: { fleetVehicleId: vehicle.id },
        orderBy: [{ dateKey: "desc" }, { createdAt: "asc" }]
      }),
      this.prisma.fleetVehicleMaintenancePlan.findMany({
        where: { fleetVehicleId: vehicle.id },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
      }),
      this.prisma.fleetVehicleMaintenanceTask.findMany({
        where: { fleetVehicleId: vehicle.id },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }]
      }),
      this.prisma.fleetVehicleOdometerLog.findMany({
        where: { fleetVehicleId: vehicle.id },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: 10
      }),
      this.prisma.fleetVehicleAssignment.findMany({
        where: { fleetVehicleId: vehicle.id },
        orderBy: [{ startedAt: "desc" }],
        take: 12,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })
    ]);

    const latestOdometerKm = odometerLogs[0]?.odometerKm;
    const todayChecklistEntries = checklistEntries.filter((entry) => entry.dateKey === dateKey);
    const todayChecklist = this.buildChecklistItemsForDate(templates, todayChecklistEntries, dateKey);
    const checklistProgress = this.buildChecklistProgress(vehicle.status, templates, todayChecklistEntries, dateKey);
    const maintenanceSummary = this.summarizeMaintenanceTasks(maintenanceTasks, latestOdometerKm);
    const alerts = this.buildAlerts(vehicle, maintenanceSummary.tasks, latestOdometerKm, checklistProgress);
    const normalizedAssignmentHistory = assignmentHistory.map((entry) =>
      this.toAssignmentHistoryEntry({
        id: entry.id,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        notes: entry.notes,
        validationMethod: entry.validationMethod,
        driver: {
          id: entry.driver.id,
          driverType: entry.driver.driverType,
          user: {
            name: entry.driver.user.name
          }
        }
      })
    );

    return {
      ...this.toFleetVehicleSummary(vehicle),
      checklist: todayChecklist,
      checklistTemplates: templates.map((item) => this.toChecklistTemplateSummary(item)),
      checklistProgress,
      maintenancePlans: maintenancePlans.map((plan) => this.toMaintenancePlanSummary(plan, maintenanceTasks)),
      maintenanceTasks: maintenanceTasks.map((task) => this.toMaintenanceTaskSummary(task)),
      odometerLogs: odometerLogs.map((log) => ({
        id: log.id,
        odometerKm: log.odometerKm,
        recordedAt: log.recordedAt.toISOString(),
        notes: log.notes ?? undefined,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString()
      })),
      latestOdometerKm,
      openMaintenanceCount: maintenanceSummary.tasks.filter((task) => OPEN_MAINTENANCE_STATUSES.has(task.status)).length,
      overdueMaintenanceCount: maintenanceSummary.overdueCount,
      dueSoonMaintenanceCount: maintenanceSummary.dueSoonCount,
      alerts,
      assignmentHistory: normalizedAssignmentHistory,
      timeline: this.buildTimeline({
        vehicle,
        assignmentHistory: normalizedAssignmentHistory,
        maintenanceTasks: maintenanceTasks.map((task) => this.toMaintenanceTaskSummary(task)),
        odometerLogs: odometerLogs.map((log) => ({
          id: log.id,
          odometerKm: log.odometerKm,
          recordedAt: log.recordedAt.toISOString(),
          notes: log.notes ?? undefined,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString()
        })),
        checklistEntries
      })
    };
  }

  private toAssignmentHistoryEntry(entry: FleetVehicleRecord["assignments"][number]): FleetVehicleAssignmentHistoryEntry {
    return {
      id: entry.id,
      driverId: entry.driver.id,
      driverName: entry.driver.user.name,
      driverType: entry.driver.driverType,
      validationMethod: entry.validationMethod,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt?.toISOString(),
      notes: entry.notes ?? undefined
    };
  }

  private buildChecklistProgress(
    vehicleStatus: FleetVehicleRecord["status"],
    templates: FleetChecklistTemplateRecord[],
    checklistEntries: Array<{
      itemKey: string;
      isChecked: boolean;
      numericValue?: number | null;
      textValue?: string | null;
      selectedOption?: string | null;
    }>,
    dateKey: string
  ): FleetVehicleChecklistProgressSummary {
    const requiredTemplates = templates
      .filter((template) => template.routine === "START_OF_DAY" && template.isActive)
      .flatMap((template) =>
        template.items
          .filter((item) => item.isActive && item.isRequired)
          .map((item) => ({
            itemKey: item.itemKey,
            inputType: item.inputType
          }))
      );
    const totalItems = requiredTemplates.length;
    const uniqueChecked = new Set(
      checklistEntries
        .filter((entry) => {
          const template = requiredTemplates.find((item) => item.itemKey === entry.itemKey);
          if (!template) {
            return false;
          }

          if (template.inputType === "ODOMETER" || template.inputType === "NUMBER") {
            return entry.numericValue !== null && entry.numericValue !== undefined;
          }

          if (template.inputType === "TEXT") {
            return Boolean(entry.textValue?.trim());
          }

          if (template.inputType === "SELECT") {
            return Boolean(entry.selectedOption?.trim());
          }

          return entry.isChecked;
        })
        .map((entry) => entry.itemKey)
    );
    const completedItems = uniqueChecked.size;
    const required = CHECKLIST_REQUIRED_STATUSES.has(vehicleStatus);

    return {
      dateKey,
      totalItems,
      completedItems,
      pendingItems: Math.max(totalItems - completedItems, 0),
      isComplete: required ? completedItems >= totalItems : false,
      required
    };
  }

  private summarizeMaintenanceTasks(
    tasks: Array<{
      id: string;
      title: string;
      dueAt: Date | null;
      dueKm: number | null;
      status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    }>,
    latestOdometerKm?: number
  ) {
    const now = new Date();
    let overdueCount = 0;
    let dueSoonCount = 0;

    for (const task of tasks) {
      if (!OPEN_MAINTENANCE_STATUSES.has(task.status)) {
        continue;
      }

      const overdueByDate = Boolean(task.dueAt && task.dueAt.getTime() < now.getTime());
      const overdueByKm =
        latestOdometerKm !== undefined && task.dueKm !== null && latestOdometerKm >= task.dueKm;

      if (overdueByDate || overdueByKm) {
        overdueCount += 1;
        continue;
      }

      const dueSoonByDate =
        Boolean(task.dueAt) &&
        (task.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= MAINTENANCE_DUE_SOON_DAYS;
      const dueSoonByKm =
        latestOdometerKm !== undefined &&
        task.dueKm !== null &&
        task.dueKm > latestOdometerKm &&
        task.dueKm - latestOdometerKm <= MAINTENANCE_DUE_SOON_KM;

      if (dueSoonByDate || dueSoonByKm) {
        dueSoonCount += 1;
      }
    }

    return {
      tasks,
      overdueCount,
      dueSoonCount
    };
  }

  private buildAlerts(
    vehicle: FleetVehicleRecord,
    maintenanceTasks: Array<{
      title: string;
      dueAt: Date | null;
      dueKm: number | null;
      status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    }>,
    latestOdometerKm: number | undefined,
    checklistProgress: FleetVehicleChecklistProgressSummary
  ): FleetVehicleAlertSummary[] {
    const alerts: FleetVehicleAlertSummary[] = [];
    const now = new Date();

    for (const task of maintenanceTasks) {
      if (!OPEN_MAINTENANCE_STATUSES.has(task.status)) {
        continue;
      }

      const isOverdue = this.isMaintenanceTaskOverdue(task.dueAt, task.dueKm, latestOdometerKm);

      if (isOverdue) {
        alerts.push({
          code: `maintenance-overdue-${task.title}`,
          level: "danger",
          label: "Manutencao vencida",
          detail: task.title
        });
        continue;
      }

      const dueSoonByDate =
        Boolean(task.dueAt) &&
        (task.dueAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= MAINTENANCE_DUE_SOON_DAYS;
      const dueSoonByKm =
        latestOdometerKm !== undefined &&
        task.dueKm !== null &&
        task.dueKm > latestOdometerKm &&
        task.dueKm - latestOdometerKm <= MAINTENANCE_DUE_SOON_KM;

      if (dueSoonByDate || dueSoonByKm) {
        alerts.push({
          code: `maintenance-due-soon-${task.title}`,
          level: "warning",
          label: "Manutencao proxima",
          detail: task.title
        });
      }
    }

    if (vehicle.status === "ALLOCATED" && checklistProgress.required && !checklistProgress.isComplete) {
      alerts.push({
        code: "checklist-pending",
        level: "warning",
        label: "Checklist pendente",
        detail: `${checklistProgress.pendingItems} item(ns) pendente(s) hoje`
      });
    }

    if (vehicle.status !== "INACTIVE" && latestOdometerKm === undefined) {
      alerts.push({
        code: "odometer-missing",
        level: "info",
        label: "Sem KM registrado",
        detail: "Registre o primeiro hodometro do veiculo"
      });
    }

    return alerts.slice(0, 4);
  }

  private toMaintenanceTaskSummary(task: {
    id: string;
    maintenancePlanId: string | null;
    title: string;
    description: string | null;
    serviceType:
      | "GENERAL"
      | "PREVENTIVE"
      | "CORRECTIVE"
      | "ALIGNMENT"
      | "BALANCING"
      | "OIL_CHANGE"
      | "TIRE"
      | "INSPECTION"
      | "CLEANING"
      | "BODYWORK";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    workshop: string | null;
    dueAt: Date | null;
    dueKm: number | null;
    recurrenceMonths: number | null;
    recurrenceKm: number | null;
    currentOdometerKm: number | null;
    estimatedCost: { toString(): string } | null;
    actualCost: { toString(): string } | null;
    openedAt: Date;
    startedAt: Date | null;
    status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    completedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FleetVehicleMaintenanceTaskSummary {
    return {
      id: task.id,
      maintenancePlanId: task.maintenancePlanId ?? undefined,
      title: task.title,
      description: task.description ?? undefined,
      serviceType: task.serviceType,
      priority: task.priority,
      workshop: task.workshop ?? undefined,
      dueAt: task.dueAt?.toISOString(),
      dueKm: task.dueKm ?? undefined,
      recurrenceMonths: task.recurrenceMonths ?? undefined,
      recurrenceKm: task.recurrenceKm ?? undefined,
      currentOdometerKm: task.currentOdometerKm ?? undefined,
      estimatedCost: task.estimatedCost ? Number(task.estimatedCost.toString()) : undefined,
      actualCost: task.actualCost ? Number(task.actualCost.toString()) : undefined,
      openedAt: task.openedAt.toISOString(),
      startedAt: task.startedAt?.toISOString(),
      status: task.status,
      completedAt: task.completedAt?.toISOString(),
      notes: task.notes ?? undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  }

  private toMaintenancePlanSummary(
    plan: {
      id: string;
      title: string;
      description: string | null;
      serviceType:
        | "GENERAL"
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "ALIGNMENT"
        | "BALANCING"
        | "OIL_CHANGE"
        | "TIRE"
        | "INSPECTION"
        | "CLEANING"
        | "BODYWORK";
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      workshop: string | null;
      intervalMonths: number | null;
      intervalKm: number | null;
      firstDueAt: Date | null;
      firstDueKm: number | null;
      defaultEstimatedCost: { toString(): string } | null;
      notes: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    tasks: Array<{
      id: string;
      maintenancePlanId: string | null;
      dueAt: Date | null;
      dueKm: number | null;
      status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      createdAt: Date;
    }>
  ): FleetVehicleMaintenancePlanSummary {
    const nextTask = tasks
      .filter((task) => task.maintenancePlanId === plan.id && OPEN_MAINTENANCE_STATUSES.has(task.status))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    return {
      id: plan.id,
      title: plan.title,
      description: plan.description ?? undefined,
      serviceType: plan.serviceType,
      priority: plan.priority,
      workshop: plan.workshop ?? undefined,
      intervalMonths: plan.intervalMonths ?? undefined,
      intervalKm: plan.intervalKm ?? undefined,
      firstDueAt: plan.firstDueAt?.toISOString(),
      firstDueKm: plan.firstDueKm ?? undefined,
      defaultEstimatedCost: plan.defaultEstimatedCost ? Number(plan.defaultEstimatedCost.toString()) : undefined,
      notes: plan.notes ?? undefined,
      isActive: plan.isActive,
      nextTask: nextTask
        ? {
            id: nextTask.id,
            dueAt: nextTask.dueAt?.toISOString(),
            dueKm: nextTask.dueKm ?? undefined,
            status: nextTask.status
          }
        : undefined,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    };
  }

  private toMaintenanceOverviewPlanEntry(
    plan: {
      id: string;
      title: string;
      serviceType:
        | "GENERAL"
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "ALIGNMENT"
        | "BALANCING"
        | "OIL_CHANGE"
        | "TIRE"
        | "INSPECTION"
        | "CLEANING"
        | "BODYWORK";
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      workshop: string | null;
      intervalMonths: number | null;
      intervalKm: number | null;
      defaultEstimatedCost: { toString(): string } | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      fleetVehicle: {
        id: string;
        label: string;
        plate: string;
      };
    },
    nextTask?: FleetMaintenanceOverviewTaskEntry
  ): FleetMaintenanceOverviewPlanEntry {
    return {
      id: plan.id,
      vehicleId: plan.fleetVehicle.id,
      vehicleLabel: plan.fleetVehicle.label,
      plate: plan.fleetVehicle.plate,
      title: plan.title,
      serviceType: plan.serviceType,
      priority: plan.priority,
      workshop: plan.workshop ?? undefined,
      intervalMonths: plan.intervalMonths ?? undefined,
      intervalKm: plan.intervalKm ?? undefined,
      defaultEstimatedCost: plan.defaultEstimatedCost ? Number(plan.defaultEstimatedCost.toString()) : undefined,
      isActive: plan.isActive,
      nextTask: nextTask
        ? {
            id: nextTask.id,
            dueAt: nextTask.dueAt,
            dueKm: nextTask.dueKm,
            status: nextTask.status
          }
        : undefined,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    };
  }

  private toMaintenanceOverviewTaskEntry(
    task: {
      id: string;
      fleetVehicleId: string;
      maintenancePlanId: string | null;
      title: string;
      serviceType:
        | "GENERAL"
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "ALIGNMENT"
        | "BALANCING"
        | "OIL_CHANGE"
        | "TIRE"
        | "INSPECTION"
        | "CLEANING"
        | "BODYWORK";
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      workshop: string | null;
      dueAt: Date | null;
      dueKm: number | null;
      estimatedCost: { toString(): string } | null;
      actualCost: { toString(): string } | null;
      status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      createdAt: Date;
      updatedAt: Date;
      fleetVehicle: {
        id: string;
        label: string;
        plate: string;
      };
      maintenancePlan: {
        id: string;
        title: string;
      } | null;
    },
    latestOdometerKm?: number
  ): FleetMaintenanceOverviewTaskEntry {
    return {
      id: task.id,
      vehicleId: task.fleetVehicle.id,
      vehicleLabel: task.fleetVehicle.label,
      plate: task.fleetVehicle.plate,
      serviceType: task.serviceType,
      priority: task.priority,
      title: task.title,
      workshop: task.workshop ?? undefined,
      dueAt: task.dueAt?.toISOString(),
      dueKm: task.dueKm ?? undefined,
      latestOdometerKm,
      estimatedCost: task.estimatedCost ? Number(task.estimatedCost.toString()) : undefined,
      actualCost: task.actualCost ? Number(task.actualCost.toString()) : undefined,
      status: task.status,
      maintenancePlanId: task.maintenancePlanId ?? undefined,
      maintenancePlanTitle: task.maintenancePlan?.title ?? undefined,
      isOverdue: this.isMaintenanceTaskOverdue(task.dueAt, task.dueKm, latestOdometerKm),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  }

  private async createRecurringFollowUpTask(
    vehicleId: string,
    task: {
      title: string;
      description: string | null;
      serviceType:
        | "GENERAL"
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "ALIGNMENT"
        | "BALANCING"
        | "OIL_CHANGE"
        | "TIRE"
        | "INSPECTION"
        | "CLEANING"
        | "BODYWORK";
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      workshop: string | null;
      dueAt: Date | null;
      dueKm: number | null;
      recurrenceMonths: number | null;
      recurrenceKm: number | null;
      notes: string | null;
    }
  ): Promise<void> {
    if (!task.recurrenceMonths && !task.recurrenceKm) {
      return;
    }

    const latestOdometerKm = await this.getLatestOdometerKm(vehicleId);
    const baseDate = task.dueAt ?? new Date();
    const nextDueAt = task.recurrenceMonths ? this.addMonths(baseDate, task.recurrenceMonths) : null;
    const kmBase = task.dueKm ?? latestOdometerKm ?? null;
    const nextDueKm = task.recurrenceKm && kmBase !== null ? kmBase + task.recurrenceKm : null;

    await this.prisma.fleetVehicleMaintenanceTask.create({
      data: {
        fleetVehicleId: vehicleId,
        title: task.title,
        description: task.description,
        serviceType: task.serviceType,
        priority: task.priority,
        workshop: task.workshop,
        dueAt: nextDueAt,
        dueKm: nextDueKm,
        recurrenceMonths: task.recurrenceMonths,
        recurrenceKm: task.recurrenceKm,
        currentOdometerKm: latestOdometerKm ?? null,
        openedAt: new Date(),
        status: "OPEN",
        notes: task.notes
      }
    });
  }

  private async createTaskFromPlan(
    plan: {
      id: string;
      fleetVehicleId: string;
      title: string;
      description: string | null;
      serviceType:
        | "GENERAL"
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "ALIGNMENT"
        | "BALANCING"
        | "OIL_CHANGE"
        | "TIRE"
        | "INSPECTION"
        | "CLEANING"
        | "BODYWORK";
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      workshop: string | null;
      intervalMonths: number | null;
      intervalKm: number | null;
      defaultEstimatedCost: { toString(): string } | null;
      notes: string | null;
    },
    due: {
      dueAt: Date | null;
      dueKm: number | null;
    }
  ): Promise<void> {
    const existingOpenTask = await this.prisma.fleetVehicleMaintenanceTask.findFirst({
      where: {
        maintenancePlanId: plan.id,
        status: { in: OPEN_MAINTENANCE_STATUS_VALUES }
      },
      select: { id: true }
    });

    if (existingOpenTask) {
      return;
    }

    const latestOdometerKm = await this.getLatestOdometerKm(plan.fleetVehicleId);

    await this.prisma.fleetVehicleMaintenanceTask.create({
      data: {
        fleetVehicleId: plan.fleetVehicleId,
        maintenancePlanId: plan.id,
        title: plan.title,
        description: plan.description,
        serviceType: plan.serviceType,
        priority: plan.priority,
        workshop: plan.workshop,
        dueAt: due.dueAt,
        dueKm: due.dueKm,
        currentOdometerKm: latestOdometerKm ?? null,
        estimatedCost: plan.defaultEstimatedCost ? Number(plan.defaultEstimatedCost.toString()) : null,
        openedAt: new Date(),
        status: "OPEN",
        notes: plan.notes
      }
    });
  }

  private buildTimeline(input: {
    vehicle: FleetVehicleRecord;
    assignmentHistory: FleetVehicleAssignmentHistoryEntry[];
    maintenanceTasks: FleetVehicleMaintenanceTaskSummary[];
    odometerLogs: FleetVehicleDetails["odometerLogs"];
    checklistEntries: Array<{
      id: string;
      label: string;
      dateKey: string;
      isChecked: boolean;
      checkedAt: Date | null;
    }>;
  }): FleetVehicleTimelineEntry[] {
    const entries: FleetVehicleTimelineEntry[] = [
      {
        id: `vehicle-created-${input.vehicle.id}`,
        occurredAt: input.vehicle.createdAt.toISOString(),
        tone: "neutral",
        title: "Veiculo cadastrado",
        description: `${input.vehicle.label} entrou na operacao com placa ${input.vehicle.plate}.`
      }
    ];

    for (const assignment of input.assignmentHistory) {
      entries.push({
        id: `assignment-start-${assignment.id}`,
        occurredAt: assignment.startedAt,
        tone: "positive",
        title: "Carro alocado",
        description: `Alocado para ${assignment.driverName} via ${this.resolveValidationMethodLabel(
          assignment.validationMethod
        )}.`
      });

      if (assignment.endedAt) {
        entries.push({
          id: `assignment-end-${assignment.id}`,
          occurredAt: assignment.endedAt,
          tone: "warning",
          title: "Carro devolvido",
          description: `Alocacao de ${assignment.driverName} encerrada.`
        });
      }
    }

    for (const task of input.maintenanceTasks) {
      entries.push({
        id: `maintenance-open-${task.id}`,
        occurredAt: task.createdAt,
        tone: task.status === "COMPLETED" ? "positive" : task.status === "IN_PROGRESS" ? "warning" : "neutral",
        title: `Manutencao ${this.resolveTaskStatusAction(task.status)}`,
        description: `${this.resolveServiceTypeLabel(task.serviceType)} - ${task.title}`
      });

      if (task.completedAt) {
        entries.push({
          id: `maintenance-complete-${task.id}`,
          occurredAt: task.completedAt,
          tone: "positive",
          title: "Manutencao concluida",
          description: `${this.resolveServiceTypeLabel(task.serviceType)} - ${task.title}`
        });
      }
    }

    for (const log of input.odometerLogs) {
      entries.push({
        id: `odometer-${log.id}`,
        occurredAt: log.recordedAt,
        tone: "neutral",
        title: "KM registrado",
        description: `${log.odometerKm} km${log.notes ? ` - ${log.notes}` : ""}`
      });
    }

    for (const checklistEntry of input.checklistEntries) {
      if (!checklistEntry.isChecked || !checklistEntry.checkedAt) {
        continue;
      }

      entries.push({
        id: `checklist-${checklistEntry.id}`,
        occurredAt: checklistEntry.checkedAt.toISOString(),
        tone: "positive",
        title: "Checklist concluido",
        description: `${checklistEntry.label} marcado no checklist de ${checklistEntry.dateKey}.`
      });
    }

    return entries
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 12);
  }

  private resolveTaskStatusAction(
    status: FleetVehicleMaintenanceTaskSummary["status"]
  ): string {
    switch (status) {
      case "IN_PROGRESS":
        return "iniciada";
      case "COMPLETED":
        return "encerrada";
      case "CANCELLED":
        return "cancelada";
      default:
        return "aberta";
    }
  }

  private resolveServiceTypeLabel(
    serviceType: FleetVehicleMaintenanceTaskSummary["serviceType"]
  ): string {
    switch (serviceType) {
      case "PREVENTIVE":
        return "Preventiva";
      case "CORRECTIVE":
        return "Corretiva";
      case "ALIGNMENT":
        return "Alinhamento";
      case "BALANCING":
        return "Balanceamento";
      case "OIL_CHANGE":
        return "Troca de oleo";
      case "TIRE":
        return "Pneu";
      case "INSPECTION":
        return "Inspecao";
      case "CLEANING":
        return "Limpeza";
      case "BODYWORK":
        return "Funilaria";
      default:
        return "Geral";
    }
  }

  private resolveNextDueAt(currentDueAt: Date | null, intervalMonths: number | null): Date | null {
    if (!intervalMonths) {
      return currentDueAt;
    }

    return this.addMonths(currentDueAt ?? new Date(), intervalMonths);
  }

  private resolveNextDueKm(
    currentDueKm: number | null,
    firstDueKm: number | null,
    intervalKm: number | null
  ): number | null {
    if (!intervalKm) {
      return currentDueKm ?? firstDueKm;
    }

    const baseKm = currentDueKm ?? firstDueKm;
    return baseKm !== null ? baseKm + intervalKm : null;
  }

  private isMaintenanceTaskOverdue(
    dueAt: Date | null,
    dueKm: number | null,
    latestOdometerKm?: number
  ): boolean {
    const overdueByDate = Boolean(dueAt && dueAt.getTime() < Date.now());
    const overdueByKm = latestOdometerKm !== undefined && dueKm !== null && latestOdometerKm >= dueKm;
    return overdueByDate || overdueByKm;
  }

  private resolvePlanNextDue(
    plan: {
      firstDueAt: Date | null;
      firstDueKm: number | null;
      intervalMonths: number | null;
      intervalKm: number | null;
    },
    lastTask?: {
      dueAt: Date | null;
      dueKm: number | null;
    } | null
  ): { dueAt: Date | null; dueKm: number | null } {
    const dueAt = lastTask
      ? this.resolveNextDueAt(lastTask.dueAt, plan.intervalMonths)
      : plan.firstDueAt;
    const dueKm = lastTask
      ? this.resolveNextDueKm(lastTask.dueKm, plan.firstDueKm, plan.intervalKm)
      : plan.firstDueKm;

    return { dueAt, dueKm };
  }

  private resolveValidationMethodLabel(
    method?: FleetVehicleAssignmentHistoryEntry["validationMethod"]
  ): string {
    switch (method) {
      case "QR_CODE":
        return "QR";
      case "PLATE":
        return "placa";
      default:
        return "admin";
    }
  }

  private async ensureFleetVehicleExists(vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.fleetVehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true }
    });

    if (!vehicle) {
      throw new NotFoundException(`Fleet vehicle ${vehicleId} not found.`);
    }
  }

  private async ensureMaintenanceTaskExists(vehicleId: string, taskId: string) {
    const task = await this.prisma.fleetVehicleMaintenanceTask.findFirst({
      where: {
        id: taskId,
        fleetVehicleId: vehicleId
      }
    });

    if (!task) {
      throw new NotFoundException(`Maintenance task ${taskId} not found for fleet vehicle ${vehicleId}.`);
    }

    return task;
  }

  private async ensureMaintenancePlanExists(vehicleId: string, planId: string) {
    const plan = await this.prisma.fleetVehicleMaintenancePlan.findFirst({
      where: {
        id: planId,
        fleetVehicleId: vehicleId
      }
    });

    if (!plan) {
      throw new NotFoundException(`Maintenance plan ${planId} not found for fleet vehicle ${vehicleId}.`);
    }

    return plan;
  }

  private async getLatestOdometerKm(vehicleId: string): Promise<number | undefined> {
    const latestLog = await this.prisma.fleetVehicleOdometerLog.findFirst({
      where: { fleetVehicleId: vehicleId },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      select: { odometerKm: true }
    });

    return latestLog?.odometerKm;
  }

  private addMonths(baseDate: Date, months: number): Date {
    const next = new Date(baseDate);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }

  private toDateOnlyValue(dateKey: string): Date {
    const parsed = new Date(`${dateKey}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Data invalida para a tarefa de manutencao.");
    }

    return parsed;
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private normalizeChecklistBuilderConfig(input: unknown): FleetChecklistTaskBuilderConfig | null {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return null;
    }

    const candidate = input as {
      numberMode?: unknown;
      options?: unknown;
      rules?: unknown;
      completionActions?: unknown;
    };

    const options = Array.isArray(candidate.options)
      ? candidate.options
          .map((option) => {
            if (!option || typeof option !== "object" || Array.isArray(option)) {
              return null;
            }

            const next = option as { id?: unknown; label?: unknown };
            const label = typeof next.label === "string" ? next.label.trim() : "";
            if (!label) {
              return null;
            }

            return {
              id: typeof next.id === "string" && next.id.trim() ? next.id.trim() : randomUUID(),
              label
            };
          })
          .filter((option): option is NonNullable<typeof option> => option !== null)
      : undefined;

    const rules = Array.isArray(candidate.rules)
      ? candidate.rules
          .map((rule) => {
            if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
              return null;
            }

            const next = rule as {
              id?: unknown;
              condition?: unknown;
              value?: unknown;
              label?: unknown;
              actions?: unknown;
            };

            if (
              next.condition !== "BOOLEAN_IS_FALSE" &&
              next.condition !== "OPTION_EQUALS"
            ) {
              return null;
            }

            const label = typeof next.label === "string" ? next.label.trim() : "";
            const value = typeof next.value === "string" ? next.value.trim() : "";
            const actions = Array.isArray(next.actions)
              ? next.actions.filter((action): action is FleetChecklistTaskActionType => this.isChecklistActionType(action))
              : [];

            if (!label || !value || actions.length === 0) {
              return null;
            }

            return {
              id: typeof next.id === "string" && next.id.trim() ? next.id.trim() : randomUUID(),
              condition: next.condition as "BOOLEAN_IS_FALSE" | "OPTION_EQUALS",
              value,
              label,
              actions
            };
          })
          .filter((rule): rule is NonNullable<typeof rule> => rule !== null)
      : undefined;

    const config: FleetChecklistTaskBuilderConfig = {};

    if (candidate.numberMode === "ODOMETER" || candidate.numberMode === "FREE") {
      config.numberMode = candidate.numberMode;
    }

    if (options?.length) {
      config.options = options;
    }

    if (rules?.length) {
      config.rules = rules;
    }

    const completionActions = Array.isArray(candidate.completionActions)
      ? candidate.completionActions.filter((action): action is FleetChecklistTaskActionType => this.isChecklistActionType(action))
      : undefined;

    if (completionActions?.length) {
      config.completionActions = completionActions;
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  private parseChecklistBuilderConfig(input: unknown): FleetChecklistTaskBuilderConfig | undefined {
    return this.normalizeChecklistBuilderConfig(input) ?? undefined;
  }

  private resolveChecklistSelectOptions(
    input: string[] | undefined,
    builderConfig: FleetChecklistTaskBuilderConfig | null | undefined
  ): string[] {
    if (builderConfig?.options?.length) {
      return builderConfig.options.map((option) => option.label);
    }

    return (input ?? []).map((option) => option.trim()).filter(Boolean);
  }

  private resolvePrimaryChecklistActionType(
    fallback: FleetChecklistTaskActionType | undefined,
    builderConfig: FleetChecklistTaskBuilderConfig | null | undefined
  ): FleetChecklistTaskActionType {
    const derived =
      builderConfig?.rules?.flatMap((rule) => rule.actions).find((action) => action !== "NONE") ??
      builderConfig?.completionActions?.find((action) => action !== "NONE");
    return derived ?? fallback ?? "NONE";
  }

  private isChecklistActionType(value: unknown): value is FleetChecklistTaskActionType {
    return (
      value === "NONE" ||
      value === "REQUIRE_PHOTO" ||
      value === "OPEN_MAINTENANCE" ||
      value === "OPEN_SUPPORT_TICKET" ||
      value === "REQUIRE_NOTE" ||
      value === "REQUIRE_NUMBER"
    );
  }

  private normalizeOptional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
