import { clearAdminSession, type AdminSessionUser } from "./admin-auth";

export type DriverVehicle = {
  id: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DriverType = "AGREGADO" | "FROTA";
export type FleetAssignmentMode = "FIXED" | "FLEX";
export type DriverOperationalStatus = "ACTIVE" | "INACTIVE" | "LEAVE" | "SUSPENDED";
export type DriverContractProfile = "CLT" | "INTERMITENTE" | "MEI";

export type DriverFleetDefaultVehicleSummary = {
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  checkinCode: string;
};

export type DriverFleetVehicleSummary = {
  assignmentId: string;
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  validationMethod: "QR_CODE" | "PLATE" | "ADMIN";
  startedAt: string;
};

export type DriverCompensationSettings = {
  useGlobalConfig: boolean;
  customModel?: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
  customValue?: number;
  customNotes?: string;
  globalModel: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
  globalValue: number;
  globalIsActive: boolean;
  globalNotes?: string;
  effectiveSource: "GLOBAL" | "CUSTOM";
  effectiveModel: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
  effectiveValue: number;
  effectiveIsActive: boolean;
};

export type DriverOperationalEligibility = {
  eligible: boolean;
  blockingIssues: string[];
};

export type DriverOperationalSummary = {
  activeAssignedRides: number;
  completedRides: number;
  cancelledRides: number;
  noShowRides: number;
  emergencyCancellations: number;
  openExecutionAlerts: number;
  lastRideAt?: string;
};

export type DriverGender = "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

export type DriverEmergencyContact = {
  name: string;
  relation: string;
  phone: string;
  isWhatsapp: boolean;
  notes?: string;
};

export type DriverAccessibilityDisabilityType =
  | "PHYSICAL"
  | "HEARING"
  | "VISUAL"
  | "INTELLECTUAL"
  | "MULTIPLE"
  | "OTHER";

export type DriverAccessibility = {
  hasDisability?: boolean;
  disabilityType?: DriverAccessibilityDisabilityType;
  otherDisabilityType?: string;
  hasMobilityLimitation?: boolean;
  mobilityLimitationDescription?: string;
  needsVehicleAdaptation?: boolean;
  vehicleAdaptationDescription?: string;
};

export type DriverAddressType = "OWN" | "RENTED";

export type DriverAddress = {
  cep?: string;
  addressType?: DriverAddressType;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
};

export type DriverLicense = {
  number: string;
  category: string;
  expirationDate: string;
  firstLicenseDate: string;
  issuingState: string;
  documentPhotoUrl?: string;
  expiryAlertLeadDays?: number;
  expiryAlertRepeatDays?: number;
};

export type DriverToxicology = {
  required: boolean;
  examNumber?: string;
  examDate?: string;
  expirationDate?: string;
  expiryAlertLeadDays?: number;
  expiryAlertRepeatDays?: number;
  clinicName?: string;
  clinicCnpj?: string;
  reportAttachmentName?: string;
  reportAttachmentDataUrl?: string;
  reportAttachmentMimeType?: string;
  notes?: string;
  psychotechnical?: DriverPsychotechnical;
};

export type DriverPsychotechnical = {
  required: boolean;
  examNumber?: string;
  examDate?: string;
  expirationDate?: string;
  situation?: "APTO" | "INAPTO" | "APTO_COM_RESTRICOES";
  restrictionsDescription?: string;
  examType?: "INICIAL" | "RENOVACAO";
  expiryAlertLeadDays?: number;
  expiryAlertRepeatDays?: number;
  clinicName?: string;
  clinicCnpj?: string;
  psychologistName?: string;
  psychologistCrp?: string;
  detailedResult?: string;
  reportAttachmentName?: string;
  reportAttachmentDataUrl?: string;
  reportAttachmentMimeType?: string;
  notes?: string;
};

export type DriverComplianceHistoryItem = {
  id: string;
  title: string;
  meta: string;
  detail: string;
  createdAt: string;
};

export type DriverJourney = {
  fixedScheduleMode?: "UNIFORM" | "PER_DAY";
  daySchedules?: Array<{
    day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  }>;
  shift?: string;
  scale?: string;
  scaleType?: "FIVE_TWO" | "SIX_ONE" | "TWELVE_THIRTY_SIX" | "CUSTOM";
  customScaleWorkDays?: number;
  customScaleOffDays?: number;
  fixedSchedule?: boolean;
  startTime?: string;
  endTime?: string;
  availabilityStartTime?: string;
  availabilityEndTime?: string;
  availableDays?: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
  acceptsOutsideSchedule?: boolean;
  availabilityNotes?: string;
  accessibility?: DriverAccessibility;
};

export type DriverEmploymentContractStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "TERMINATED";

export type DriverEmploymentContractKind = "NEW" | "RENEWAL";

export type DriverEmploymentContractEndorsementType =
  | "SALARY_CHANGE"
  | "SCHEDULE_CHANGE"
  | "BENEFITS_CHANGE"
  | "TERM_EXTENSION"
  | "OTHER";

export type DriverEmploymentContractEndorsementStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "ACTIVE"
  | "CANCELLED";

export type DriverEmploymentContractEndorsement = {
  id: string;
  type: DriverEmploymentContractEndorsementType;
  status: DriverEmploymentContractEndorsementStatus;
  effectiveDate: string;
  notes?: string;
  changes: Record<string, unknown>;
  createdAt: string;
  signedAt?: string;
};

export type DriverEmploymentContract = {
  id: string;
  profile: "CLT" | "INTERMITENTE" | "MEI";
  kind: DriverEmploymentContractKind;
  parentContractId?: string;
  title: string;
  status: DriverEmploymentContractStatus;
  templateKey: string;
  templateName?: string;
  templateVersion: string;
  generatedAt: string;
  generatedBy: "SYSTEM";
  validFrom?: string;
  validTo?: string;
  signedAt?: string;
  terminatedAt?: string;
  content: string;
  snapshot: Record<string, unknown>;
  endorsements?: DriverEmploymentContractEndorsement[];
};

export type DriverContractSignatureRequestResult = {
  driver: DriverProfile;
  signerEmail: string;
  signatureUrl: string;
  expiresAt: string;
  emailDeliveryStatus: "SENT" | "SKIPPED" | "FAILED";
  emailDeliveryMessage?: string;
};

export type DriverContractPublicSignatureSession = {
  contractId: string;
  driverId: string;
  driverName: string;
  documentCode: string;
  contentHash: string;
  signerEmail: string;
  signerName?: string;
  signerDocument?: string;
  status: DriverEmploymentContractStatus;
  title: string;
  templateName?: string;
  templateVersion: string;
  generatedAt: string;
  validFrom?: string;
  validTo?: string;
  content: string;
  requestedAt?: string;
  expiresAt?: string;
  signedAt?: string;
  auditLogs: Array<{
    createdAt: string;
    event: string;
    source?: string;
    summary: string;
  }>;
  canSign: boolean;
  message?: string;
};

export type DriverContract = {
  workProfileTemplateId?: string;
  workProfileTemplateName?: string;
  workProfileSummary?: string;
  workProfileContractType?: "CLT" | "CLT_INTERMITENTE" | "MEI" | "PJ" | "AUTONOMO";
  employmentTemplateKey?: string;
  employmentTemplateName?: string;
  employmentTemplateVersion?: string;
  startDate?: string;
  endDate?: string;
  hasFixedTermContract?: boolean;
  notifyContractEnd?: boolean;
  contractEndNotifyLeadDays?: number;
  experienceEnabled?: boolean;
  experienceStartDate?: string;
  experienceEndDate?: string;
  autoRenewAfterExperience?: boolean;
  notifyExperienceEnd?: boolean;
  experienceNotifyLeadDays?: number;
  experienceNotifyRepeatDays?: number;
  benefitsList?: string[];
  otherBenefits?: string;
  salaryModel?: "FIXED" | "FIXED_PLUS_COMMISSION" | "COMMISSION";
  fixedSalary?: number;
  commissionType?: "PERCENT" | "PER_RIDE";
  commissionApplyOn?: "RIDE" | "RATING";
  commissionPercent?: number;
  commissionPerRide?: number;
  benefits?: string;
  intermittentStatus?: "ATIVO" | "PAUSADO";
  intermittentConvocationMode?: "ON_DEMAND" | "ADVANCE_NOTICE" | "FIXED_WINDOW";
  intermittentNoticeHours?: number;
  intermittentConvocationNotes?: string;
  intermittentPaymentMode?: "DAILY" | "PER_RIDE" | "DAILY_PLUS_RIDE";
  intermittentDailyRate?: number;
  intermittentRideCompensationType?: "AMOUNT" | "PERCENT";
  intermittentRideAmount?: number;
  intermittentRidePercent?: number;
  intermittentPreferredWeekDays?: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
  meiRemunerationModel?: "COMMISSION_PERCENT" | "PER_RIDE_FIXED" | "RIDE_REVENUE_SHARE" | "FIXED_PLUS_VARIABLE";
  meiCommissionBase?: "RIDE" | "GROSS_REVENUE" | "RATING";
  meiCommissionPercent?: number;
  meiPerRideAmount?: number;
  meiRevenueSharePercent?: number;
  meiRevenueShareBase?: "RIDE_GROSS" | "RIDE_NET";
  meiFixedBaseAmount?: number;
  meiVariableType?: "PERCENT" | "AMOUNT";
  meiVariablePercent?: number;
  meiVariableAmount?: number;
  meiVariableBase?: "RIDE" | "GROSS_REVENUE" | "RATING";
  meiWorkMode?: "ON_DEMAND" | "SCHEDULED" | "MIXED";
  meiOperationVehicleMode?: "OWN_VEHICLE" | "COMPANY_VEHICLE" | "BOTH";
  meiFuelResponsibility?: "DRIVER" | "COMPANY" | "SHARED";
  meiMaintenanceResponsibility?: "DRIVER" | "COMPANY" | "SHARED";
  meiPreferredWeekDays?: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
  meiCnpj?: string;
  meiLegalName?: string;
  meiTradeName?: string;
  meiMunicipalRegistration?: string;
  workedPeriods?: string;
  intermittentPreferredDays?: string;
  paymentMethod?: string;
  paymentFrequency?: string;
  fiscalNotes?: string;
  notes?: string;
  overtimeUseGlobalPolicy?: boolean;
  overtimeEnabled?: boolean;
  overtimePolicyMode?: "PAID" | "BANK_HOURS";
  overtimeDailyLimitHours?: number;
  overtimeWeeklyLimitHours?: number;
  overtimeAfterDailyHours?: number;
  overtimeAfterWeeklyHours?: number;
  overtimeMultiplier50?: number;
  overtimeMultiplier100?: number;
  overtimeNightMultiplier?: number;
  overtimeRoundingMinutes?: number;
  employmentContracts?: DriverEmploymentContract[];
};

export type DriverProfile = {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  hasPassword: boolean;
  photoUrl?: string;
  birthDate?: string;
  gender?: DriverGender;
  bloodType?: string;
  emergencyContacts?: DriverEmergencyContact[];
  address?: DriverAddress;
  driverLicense?: DriverLicense;
  toxicology?: DriverToxicology;
  complianceHistory?: DriverComplianceHistoryItem[];
  contractProfile?: DriverContractProfile;
  journey?: DriverJourney;
  contract?: DriverContract;
  driverType: DriverType;
  fleetAssignmentMode?: FleetAssignmentMode;
  defaultFleetVehicle?: DriverFleetDefaultVehicleSummary;
  operationalStatus: DriverOperationalStatus;
  operationalNotes?: string;
  vehicle?: string;
  vehicles: DriverVehicle[];
  currentFleetVehicle?: DriverFleetVehicleSummary;
  isActive: boolean;
  operationEligibility: DriverOperationalEligibility;
  operationSummary: DriverOperationalSummary;
  compensation: DriverCompensationSettings;
  createdAt: string;
  updatedAt: string;
};

export type FleetVehicle = {
  id: string;
  label: string;
  plate: string;
  checkinCode: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  currentAssignment?: {
    id: string;
    driverId: string;
    driverName: string;
    driverType: DriverType;
    validationMethod?: "QR_CODE" | "PLATE" | "ADMIN";
    startedAt: string;
    endedAt?: string;
    notes?: string;
  };
};

export type FleetVehicleChecklistProgress = {
  dateKey: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  isComplete: boolean;
  required: boolean;
};

export type FleetVehicleAlert = {
  code: string;
  level: "info" | "warning" | "danger";
  label: string;
  detail?: string;
};

export type FleetVehicleChecklistItem = {
  itemKey: string;
  templateId?: string;
  templateName?: string;
  label: string;
  description?: string;
  category?: string;
  routine: "START_OF_DAY" | "END_OF_DAY";
  inputType: "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";
  actionType:
    | "NONE"
    | "REQUIRE_PHOTO"
    | "OPEN_MAINTENANCE"
    | "OPEN_SUPPORT_TICKET"
    | "REQUIRE_NOTE"
    | "REQUIRE_NUMBER";
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
};

export type FleetChecklistBuilderRule = {
  id: string;
  condition: "BOOLEAN_IS_FALSE" | "OPTION_EQUALS";
  value: string;
  label: string;
  actions: FleetChecklistTemplateTask["actionType"][];
};

export type FleetChecklistTaskBuilderConfig = {
  numberMode?: "ODOMETER" | "FREE";
  options?: Array<{
    id: string;
    label: string;
  }>;
  rules?: FleetChecklistBuilderRule[];
  completionActions?: FleetChecklistTemplateTask["actionType"][];
};

export type FleetChecklistTemplateTask = {
  id: string;
  itemKey: string;
  label: string;
  description?: string;
  inputType: "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";
  actionType:
    | "NONE"
    | "REQUIRE_PHOTO"
    | "OPEN_MAINTENANCE"
    | "OPEN_SUPPORT_TICKET"
    | "REQUIRE_NOTE"
    | "REQUIRE_NUMBER";
  selectOptions?: string[];
  builderConfig?: FleetChecklistTaskBuilderConfig;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FleetChecklistTemplate = {
  id: string;
  name: string;
  category: string;
  routine: "START_OF_DAY" | "END_OF_DAY";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: FleetChecklistTemplateTask[];
};

export type FleetVehicleMaintenanceTask = {
  id: string;
  maintenancePlanId?: string;
  title: string;
  description?: string;
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
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FleetVehicleMaintenancePlan = {
  id: string;
  title: string;
  description?: string;
  serviceType: FleetVehicleMaintenanceTask["serviceType"];
  priority: FleetVehicleMaintenanceTask["priority"];
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
    status: FleetVehicleMaintenanceTask["status"];
  };
  createdAt: string;
  updatedAt: string;
};

export type FleetVehicleOdometerLog = {
  id: string;
  odometerKm: number;
  recordedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FleetVehicleAssignmentHistoryEntry = {
  id: string;
  driverId: string;
  driverName: string;
  driverType: DriverType;
  validationMethod?: "QR_CODE" | "PLATE" | "ADMIN";
  startedAt: string;
  endedAt?: string;
  notes?: string;
};

export type FleetVehicleTimelineEntry = {
  id: string;
  occurredAt: string;
  tone: "neutral" | "positive" | "warning" | "danger";
  title: string;
  description: string;
};

export type FleetVehicleOverview = FleetVehicle & {
  latestOdometerKm?: number;
  openMaintenanceCount: number;
  overdueMaintenanceCount: number;
  dueSoonMaintenanceCount: number;
  checklistProgress: FleetVehicleChecklistProgress;
  alerts: FleetVehicleAlert[];
};

export type FleetVehicleDetails = FleetVehicle & {
  checklist: FleetVehicleChecklistItem[];
  checklistTemplates: FleetChecklistTemplate[];
  checklistProgress: FleetVehicleChecklistProgress;
  maintenancePlans: FleetVehicleMaintenancePlan[];
  maintenanceTasks: FleetVehicleMaintenanceTask[];
  odometerLogs: FleetVehicleOdometerLog[];
  latestOdometerKm?: number;
  openMaintenanceCount: number;
  overdueMaintenanceCount: number;
  dueSoonMaintenanceCount: number;
  alerts: FleetVehicleAlert[];
  assignmentHistory: FleetVehicleAssignmentHistoryEntry[];
  timeline: FleetVehicleTimelineEntry[];
};

export type FleetOverviewMetrics = {
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
};

export type FleetMaintenanceOverviewTask = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
  serviceType: FleetVehicleMaintenanceTask["serviceType"];
  priority: FleetVehicleMaintenanceTask["priority"];
  title: string;
  workshop?: string;
  dueAt?: string;
  dueKm?: number;
  latestOdometerKm?: number;
  estimatedCost?: number;
  actualCost?: number;
  status: FleetVehicleMaintenanceTask["status"];
  maintenancePlanId?: string;
  maintenancePlanTitle?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FleetMaintenanceOverviewPlan = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  plate: string;
  title: string;
  serviceType: FleetVehicleMaintenanceTask["serviceType"];
  priority: FleetVehicleMaintenanceTask["priority"];
  workshop?: string;
  intervalMonths?: number;
  intervalKm?: number;
  defaultEstimatedCost?: number;
  isActive: boolean;
  nextTask?: {
    id: string;
    dueAt?: string;
    dueKm?: number;
    status: FleetVehicleMaintenanceTask["status"];
  };
  createdAt: string;
  updatedAt: string;
};

export type FleetMaintenanceOverview = {
  plans: FleetMaintenanceOverviewPlan[];
  openTasks: FleetMaintenanceOverviewTask[];
  overdueTasks: FleetMaintenanceOverviewTask[];
};

export type Ride = {
  id: string;
  customerName: string;
  tripTypeSlug?: string;
  tripTypeName?: string;
  tripTypeSurchargeAmount?: number;
  baggageCount?: number;
  baggageSize?: string;
  petType?: string;
  petSize?: string;
  customerHasReducedMobility?: boolean;
  passengerCount?: number;
  companionNeedsSpecialAttention?: boolean;
  companionSpecialAttentionDetails?: string;
  hasIntermediateStops?: boolean;
  intermediateStopsSummary?: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  status: string;
  customerPhone?: string;
  assignedDriverId?: string;
  driverStage?: "SCHEDULED" | "EN_ROUTE_PICKUP" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";
  navigationStartedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  decisionWindow?: {
    startedAt: string;
    expiresAt: string;
    expiresInSeconds: number;
    totalSeconds: number;
  };
  quote?: {
    amount: number;
    currency: string;
    routeDistanceKm: number;
    routeDurationMinutes: number;
    quotedAt: string;
  };
};

export type NotificationItem = {
  id: string;
  type: string;
  rideId: string;
  driverId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type CustomerSummary = {
  phone: string;
  name: string;
  hasReducedMobility?: boolean;
  customerProfile: {
    score: number;
    tier: "NEW" | "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
    tierLabel: string;
    tierEmoji: string;
    totalRides: number;
  };
  totalRides: number;
  lastRideId?: string;
  lastRideStatus?: string;
  lastOrigin?: string;
  lastDestination?: string;
  firstRideAt?: string;
  lastRideAt?: string;
  favorites: CustomerFavoriteAddress[];
};

export type CustomerConversationLogMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
};

export type CustomerConversationLog = {
  id: string;
  channel: string;
  currentStep: string;
  latestRideId?: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  messages: CustomerConversationLogMessage[];
};

export type CustomerRideHistoryItem = Ride & {
  events: RideEvent[];
};

export type CustomerProfile = CustomerSummary & {
  rides: CustomerRideHistoryItem[];
  conversationLogs: CustomerConversationLog[];
};

export type CustomerFavoriteAddress = {
  id: string;
  label: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type TripType = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  surchargeAmount: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PricingConfig = {
  id: string;
  currency: string;
  baseFare: number;
  distanceRatePerKm: number;
  timeRatePerMinute: number;
  createdAt: string;
  updatedAt: string;
};

export type DriverCompensationConfig = {
  id: string;
  model: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
  defaultValue: number;
  isActive: boolean;
  notes?: string;
  overtimeEnabled: boolean;
  overtimePolicyMode: "PAID" | "BANK_HOURS";
  overtimeDailyLimitHours?: number;
  overtimeWeeklyLimitHours?: number;
  overtimeAfterDailyHours: number;
  overtimeAfterWeeklyHours: number;
  overtimeMultiplier50: number;
  overtimeMultiplier100: number;
  overtimeNightMultiplier: number;
  overtimeRoundingMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type RemunerationTemplate = {
  id: string;
  name: string;
  description?: string;
  workerType: "DRIVER";
  contractProfile?: DriverContractProfile;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OvertimeTemplate = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  workProfiles: string[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BenefitType = "FIXED" | "PERCENTAGE" | "VARIABLE" | "INFORMATIVE";
export type BenefitFrequency = "MONTHLY" | "DAILY" | "PER_USE" | "PER_TRIP" | "ONE_TIME";
export type BenefitApplicationMode = "PER_EMPLOYEE" | "PER_DAY_WORKED" | "PER_TRIP";
export type BenefitPercentageBase = "SALARY" | "REVENUE" | "OTHER";
export type BenefitDiscountMode = "AMOUNT" | "PERCENT";
export type BenefitDiscountBase = "SALARY" | "BENEFIT";
export type BenefitContractProfile =
  | "CLT"
  | "CLT_INTERMITENTE"
  | "MEI"
  | "PJ"
  | "AUTONOMO";

export type BenefitValueConfig = {
  fixedAmount?: number;
  percentageValue?: number;
  percentageBase?: BenefitPercentageBase;
  percentageBaseOther?: string;
  variableRuleDescription?: string;
  discountMode?: BenefitDiscountMode;
  discountValue?: number;
  discountBase?: BenefitDiscountBase;
  discountLimit?: number;
  informativeDescription?: string;
};

export type Benefit = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  type: BenefitType;
  valueConfig: BenefitValueConfig;
  frequency: BenefitFrequency;
  applicationMode: BenefitApplicationMode;
  deductFromSalary: boolean;
  incursCharges: boolean;
  isMandatory: boolean;
  editableInContract: boolean;
  workProfiles: string[];
  contractProfiles: BenefitContractProfile[];
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkProfileContractType =
  | "CLT"
  | "CLT_INTERMITENTE"
  | "MEI"
  | "PJ"
  | "AUTONOMO";

export type WorkProfileRemunerationModel =
  | "FIXED"
  | "FIXED_PLUS_COMMISSION"
  | "COMMISSION_ONLY";

export type WorkProfileCommissionType = "PERCENT" | "PER_RIDE";
export type WorkProfileBaseRemunerationType = "HOUR" | "DAILY" | "EVENT";

export type WorkProfileRemunerationSettings = {
  model: WorkProfileRemunerationModel;
  baseType?: WorkProfileBaseRemunerationType;
  hasVariableCompensation?: boolean;
  fixedSalary?: number;
  commissionType?: WorkProfileCommissionType;
  commissionValue?: number;
  commissionRule?: string;
  contractTemplateKey?: string;
  contractTemplateName?: string;
  contractTemplateVersion?: string;
  contractTemplateContent?: string;
};

export type WorkProfileBenefitRef = {
  id: string;
  name: string;
  summary?: string;
};

export type WorkProfile = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  cargoName: string;
  cargoLevel?: string;
  contractType: WorkProfileContractType;
  journeyTemplateId?: string;
  journeyTemplateName?: string;
  journeySummary?: string;
  remuneration: WorkProfileRemunerationSettings;
  usesOvertime: boolean;
  overtimeTemplateId?: string;
  overtimeTemplateName?: string;
  overtimeSummary?: string;
  benefits: WorkProfileBenefitRef[];
  allowContractEditing: boolean;
  allowJourneyCustomization: boolean;
  allowBenefitsCustomization: boolean;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyProfileConfig = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj?: string;
  phone?: string;
  email: string;
  website?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  legalRepresentativeName?: string;
  legalRepresentativeCpf?: string;
  legalRepresentativeRole?: string;
  contractSignatureCity?: string;
  createdAt: string;
  updatedAt: string;
};

export type PricingRule = {
  id: string;
  name: string;
  description?: string;
  scheduleType: "WEEKLY_WINDOW" | "DATE_RANGE";
  adjustmentType: "FLAT" | "PERCENT";
  adjustmentValue: number;
  isActive: boolean;
  priority: number;
  daysOfWeek?: string;
  startMinutes?: number;
  endMinutes?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type RideEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type SimulateResult = {
  actions: Array<{
    rideId?: string;
    type: string;
    details: string;
  }>;
  outboundMessages: Array<{
    to: string;
    text: string;
  }>;
};

export type ConversationMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
};

export type ConversationStep =
  | "intro"
  | "phone"
  | "existingCustomerConfirm"
  | "customerName"
  | "originFavoriteSelect"
  | "origin"
  | "originFavoriteConfirm"
  | "originFavoriteLabel"
  | "destinationFavoriteSelect"
  | "destination"
  | "destinationFavoriteConfirm"
  | "destinationFavoriteLabel"
  | "scheduledAt"
  | "quoteReady"
  | "confirmed";

export type ConversationSession = {
  id: string;
  currentStep: ConversationStep;
  latestRideId: string;
  messages: ConversationMessage[];
  matchedCustomer: CustomerSummary | null;
  favoriteAddresses: CustomerFavoriteAddress[];
  composerPlaceholder: string;
};

export type AdminAuthResponse = {
  expiresAt: string;
  user: AdminSessionUser;
};

export type AdminProfile = AdminSessionUser;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";
const GET_RESPONSE_CACHE_TTL_MS = 5000;
const getResponseCache = new Map<string, { value: unknown; expiresAt: number }>();
const getResponseInFlight = new Map<string, Promise<unknown>>();

function parseRequestErrorMessage(text: string, status: number): string {
  const fallback = `Falha HTTP ${status}`;
  const normalized = text.trim();

  if (!normalized) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(normalized) as { message?: unknown };
    const message = parsed?.message;

    if (Array.isArray(message)) {
      return message.map((item) => String(item)).join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message === "Internal server error" ? "Falha interna no servidor." : message;
    }
  } catch {
    return normalized === "Internal server error" ? "Falha interna no servidor." : normalized;
  }

  return fallback;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const isGetRequest = method === "GET";
  const hasBody = init?.body !== undefined && init?.body !== null;
  const canUseGetCache = isGetRequest && !hasBody;
  const cacheKey = `${method}:${path}`;

  if (canUseGetCache) {
    const now = Date.now();
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    if (cached) {
      getResponseCache.delete(cacheKey);
    }

    const inFlightRequest = getResponseInFlight.get(cacheKey);
    if (inFlightRequest) {
      return inFlightRequest as Promise<T>;
    }
  }

  const executeRequest = async (): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAdminSession();
        getResponseCache.clear();
      }

      const text = await response.text();
      throw new Error(parseRequestErrorMessage(text, response.status));
    }

    const payload = response.status === 204 ? (undefined as T) : ((await response.json()) as T);

    if (canUseGetCache) {
      getResponseCache.set(cacheKey, {
        value: payload,
        expiresAt: Date.now() + GET_RESPONSE_CACHE_TTL_MS
      });
    } else if (method !== "GET") {
      // Mutation requests can invalidate data used by multiple list/detail pages.
      getResponseCache.clear();
    }

    return payload;
  };

  if (!canUseGetCache) {
    return executeRequest();
  }

  const requestPromise = executeRequest().finally(() => {
    getResponseInFlight.delete(cacheKey);
  });
  getResponseInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

export function formatCurrency(value?: number): string {
  if (value === undefined) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
