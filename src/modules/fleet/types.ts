export type FleetVehicleStatus = "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
export type FleetMaintenanceTaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type FleetChecklistRoutine = "START_OF_DAY" | "END_OF_DAY";
export type FleetChecklistInputType = "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";
export type FleetChecklistTaskActionType =
  | "NONE"
  | "REQUIRE_PHOTO"
  | "OPEN_MAINTENANCE"
  | "OPEN_SUPPORT_TICKET"
  | "REQUIRE_NOTE"
  | "REQUIRE_NUMBER";
export type FleetChecklistBuilderCondition = "BOOLEAN_IS_FALSE" | "OPTION_EQUALS";
export type FleetChecklistNumberMode = "ODOMETER" | "FREE";
export type FleetChecklistBuilderRule = {
  id: string;
  condition: FleetChecklistBuilderCondition;
  value: string;
  label: string;
  actions: FleetChecklistTaskActionType[];
};
export type FleetChecklistBuilderOption = {
  id: string;
  label: string;
};
export type FleetChecklistTaskBuilderConfig = {
  numberMode?: FleetChecklistNumberMode;
  options?: FleetChecklistBuilderOption[];
  rules?: FleetChecklistBuilderRule[];
  completionActions?: FleetChecklistTaskActionType[];
};
export type FleetMaintenanceTaskType =
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
export type FleetMaintenanceTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FleetAlertLevel = "info" | "warning" | "danger";
export type FleetTimelineTone = "neutral" | "positive" | "warning" | "danger";
export type FleetChecklistTemplateTaskDefinition = {
  itemKey: string;
  label: string;
  description?: string;
  inputType: FleetChecklistInputType;
  actionType: FleetChecklistTaskActionType;
  selectOptions?: string[];
  builderConfig?: FleetChecklistTaskBuilderConfig;
  sortOrder: number;
  isRequired: boolean;
};

export type FleetChecklistTemplateDefinition = {
  name: string;
  category: string;
  routine: FleetChecklistRoutine;
  items: FleetChecklistTemplateTaskDefinition[];
};

export const DEFAULT_FLEET_CHECKLIST_TEMPLATES: FleetChecklistTemplateDefinition[] = [
  {
    name: "Rotina de saida do veiculo",
    category: "Verificacao do carro",
    routine: "START_OF_DAY",
    items: [
      {
        itemKey: "BODY_CHECK",
        label: "Verificar pneus, arranhoes e limpeza externa",
        inputType: "BOOLEAN",
        actionType: "REQUIRE_PHOTO",
        sortOrder: 10,
        isRequired: true
      },
      {
        itemKey: "INTERIOR_STATE",
        label: "Estado interno do veiculo",
        inputType: "BOOLEAN",
        actionType: "REQUIRE_PHOTO",
        sortOrder: 20,
        isRequired: true
      },
      {
        itemKey: "FULL_TANK",
        label: "Confirmar tanque cheio",
        inputType: "BOOLEAN",
        actionType: "NONE",
        sortOrder: 30,
        isRequired: true
      },
      {
        itemKey: "START_ODOMETER",
        label: "Informar KM de saida",
        inputType: "ODOMETER",
        actionType: "NONE",
        sortOrder: 40,
        isRequired: true
      }
    ]
  },
  {
    name: "Checklist tecnico de abertura",
    category: "Checklist tecnico",
    routine: "START_OF_DAY",
    items: [
      {
        itemKey: "ENGINE_LEVELS",
        label: "Motor: agua do parabrisa e nivel do oleo",
        inputType: "BOOLEAN",
        actionType: "OPEN_MAINTENANCE",
        sortOrder: 10,
        isRequired: true
      },
      {
        itemKey: "TRUNK_ACCESSORIES",
        label: "Porta-malas: conferir step e acessorios",
        inputType: "BOOLEAN",
        actionType: "OPEN_SUPPORT_TICKET",
        sortOrder: 20,
        isRequired: true
      },
      {
        itemKey: "TOW_AND_BIKE_SUPPORT",
        label: "Conferir reboque e suporte de bike",
        inputType: "BOOLEAN",
        actionType: "OPEN_SUPPORT_TICKET",
        sortOrder: 30,
        isRequired: true
      },
      {
        itemKey: "DASHBOARD_LIGHTS",
        label: "Painel e luzes em ordem",
        inputType: "BOOLEAN",
        actionType: "OPEN_MAINTENANCE",
        sortOrder: 40,
        isRequired: true
      }
    ]
  },
  {
    name: "Preparacao operacional",
    category: "Operacao",
    routine: "START_OF_DAY",
    items: [
      {
        itemKey: "COOLER_CHECK",
        label: "Conferir geladeira ligada e funcionando",
        inputType: "BOOLEAN",
        actionType: "OPEN_SUPPORT_TICKET",
        sortOrder: 10,
        isRequired: true
      },
      {
        itemKey: "WATER_STOCK",
        label: "Conferir agua de cortesia para os agendamentos do dia",
        inputType: "BOOLEAN",
        actionType: "OPEN_SUPPORT_TICKET",
        sortOrder: 20,
        isRequired: true
      },
      {
        itemKey: "PET_SEAT_COVER",
        label: "Conferir capa dos bancos para pet",
        inputType: "BOOLEAN",
        actionType: "NONE",
        sortOrder: 30,
        isRequired: false
      }
    ]
  },
  {
    name: "Fechamento e ocorrencias",
    category: "Final do dia",
    routine: "END_OF_DAY",
    items: [
      {
        itemKey: "END_ODOMETER",
        label: "Informar KM de encerramento",
        inputType: "ODOMETER",
        actionType: "NONE",
        sortOrder: 10,
        isRequired: true
      },
      {
        itemKey: "END_OCCURRENCES",
        label: "Registrar avarias, ocorrencias e necessidades do dia seguinte",
        inputType: "TEXT",
        actionType: "OPEN_SUPPORT_TICKET",
        sortOrder: 20,
        isRequired: false
      }
    ]
  }
];

export interface FleetVehicleAssignmentSummary {
  id: string;
  driverId: string;
  driverName: string;
  driverType: "AGREGADO" | "FROTA";
  validationMethod?: "QR_CODE" | "PLATE" | "ADMIN";
  startedAt: string;
  endedAt?: string;
  notes?: string;
}

export interface FleetVehicleSummary {
  id: string;
  label: string;
  plate: string;
  checkinCode: string;
  color?: string;
  year?: number;
  status: FleetVehicleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  currentAssignment?: FleetVehicleAssignmentSummary;
}

export interface FleetVehicleChecklistItemSummary {
  itemKey: string;
  templateId?: string;
  templateName?: string;
  label: string;
  description?: string;
  category?: string;
  routine: FleetChecklistRoutine;
  inputType: FleetChecklistInputType;
  actionType: FleetChecklistTaskActionType;
  selectOptions?: string[];
  builderConfig?: FleetChecklistTaskBuilderConfig;
  sortOrder: number;
  isRequired: boolean;
  dateKey: string;
  isChecked: boolean;
  numericValue?: number;
  textValue?: string;
  selectedOption?: string;
  checkedAt?: string;
  notes?: string;
}

export interface FleetChecklistTemplateTaskSummary {
  id: string;
  itemKey: string;
  label: string;
  description?: string;
  inputType: FleetChecklistInputType;
  actionType: FleetChecklistTaskActionType;
  selectOptions?: string[];
  builderConfig?: FleetChecklistTaskBuilderConfig;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FleetChecklistTemplateSummary {
  id: string;
  name: string;
  category: string;
  routine: FleetChecklistRoutine;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: FleetChecklistTemplateTaskSummary[];
}

export interface FleetVehicleMaintenanceTaskSummary {
  id: string;
  maintenancePlanId?: string;
  title: string;
  description?: string;
  serviceType: FleetMaintenanceTaskType;
  priority: FleetMaintenanceTaskPriority;
  workshop?: string;
  dueAt?: string;
  dueKm?: number;
  recurrenceMonths?: number;
  recurrenceKm?: number;
  currentOdometerKm?: number;
  estimatedCost?: number;
  actualCost?: number;
  openedAt: string;
  startedAt?: string;
  status: FleetMaintenanceTaskStatus;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetVehicleMaintenancePlanSummary {
  id: string;
  title: string;
  description?: string;
  serviceType: FleetMaintenanceTaskType;
  priority: FleetMaintenanceTaskPriority;
  workshop?: string;
  intervalMonths?: number;
  intervalKm?: number;
  firstDueAt?: string;
  firstDueKm?: number;
  defaultEstimatedCost?: number;
  notes?: string;
  isActive: boolean;
  nextTask?: {
    id: string;
    dueAt?: string;
    dueKm?: number;
    status: FleetMaintenanceTaskStatus;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FleetVehicleChecklistProgressSummary {
  dateKey: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  isComplete: boolean;
  required: boolean;
}

export interface FleetVehicleAlertSummary {
  code: string;
  level: FleetAlertLevel;
  label: string;
  detail?: string;
}

export interface FleetVehicleAssignmentHistoryEntry extends FleetVehicleAssignmentSummary {}

export interface FleetVehicleTimelineEntry {
  id: string;
  occurredAt: string;
  tone: FleetTimelineTone;
  title: string;
  description: string;
}

export interface FleetVehicleOdometerLogSummary {
  id: string;
  odometerKm: number;
  recordedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetVehicleDetails extends FleetVehicleSummary {
  checklist: FleetVehicleChecklistItemSummary[];
  checklistTemplates: FleetChecklistTemplateSummary[];
  checklistProgress: FleetVehicleChecklistProgressSummary;
  maintenancePlans: FleetVehicleMaintenancePlanSummary[];
  maintenanceTasks: FleetVehicleMaintenanceTaskSummary[];
  odometerLogs: FleetVehicleOdometerLogSummary[];
  latestOdometerKm?: number;
  openMaintenanceCount: number;
  overdueMaintenanceCount: number;
  dueSoonMaintenanceCount: number;
  alerts: FleetVehicleAlertSummary[];
  assignmentHistory: FleetVehicleAssignmentHistoryEntry[];
  timeline: FleetVehicleTimelineEntry[];
}

export interface FleetVehicleOverviewSummary extends FleetVehicleSummary {
  latestOdometerKm?: number;
  openMaintenanceCount: number;
  overdueMaintenanceCount: number;
  dueSoonMaintenanceCount: number;
  checklistProgress: FleetVehicleChecklistProgressSummary;
  alerts: FleetVehicleAlertSummary[];
}

export interface FleetOverviewMetrics {
  total: number;
  available: number;
  allocated: number;
  maintenance: number;
  inactive: number;
  withAlerts: number;
  overdueMaintenance: number;
  dueSoonMaintenance: number;
  checklistPendingToday: number;
  checklistCompletedToday: number;
}

export interface FleetMaintenanceOverviewTaskEntry {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
  serviceType: FleetMaintenanceTaskType;
  priority: FleetMaintenanceTaskPriority;
  title: string;
  workshop?: string;
  dueAt?: string;
  dueKm?: number;
  latestOdometerKm?: number;
  estimatedCost?: number;
  actualCost?: number;
  status: FleetMaintenanceTaskStatus;
  maintenancePlanId?: string;
  maintenancePlanTitle?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FleetMaintenanceOverviewPlanEntry {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
  title: string;
  serviceType: FleetMaintenanceTaskType;
  priority: FleetMaintenanceTaskPriority;
  workshop?: string;
  intervalMonths?: number;
  intervalKm?: number;
  defaultEstimatedCost?: number;
  isActive: boolean;
  nextTask?: {
    id: string;
    dueAt?: string;
    dueKm?: number;
    status: FleetMaintenanceTaskStatus;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FleetMaintenanceOverview {
  plans: FleetMaintenanceOverviewPlanEntry[];
  openTasks: FleetMaintenanceOverviewTaskEntry[];
  overdueTasks: FleetMaintenanceOverviewTaskEntry[];
}
