import { Ride, RideCustomerProfile, RideEvent } from "../rides/types";

export interface CustomerFavoriteAddressSummary {
  id: string;
  label: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  phone: string;
  name: string;
  hasReducedMobility?: boolean;
  customerProfile: RideCustomerProfile;
  totalRides: number;
  lastRideId?: string;
  lastRideStatus?: string;
  lastOrigin?: string;
  lastDestination?: string;
  firstRideAt?: string;
  lastRideAt?: string;
  favorites: CustomerFavoriteAddressSummary[];
}

export interface CustomerConversationLogMessage {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
}

export interface CustomerConversationLog {
  id: string;
  channel: string;
  currentStep: string;
  latestRideId?: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  messages: CustomerConversationLogMessage[];
}

export interface CustomerRideHistoryItem extends Ride {
  events: RideEvent[];
}

export interface CustomerProfile extends CustomerSummary {
  rides: CustomerRideHistoryItem[];
  conversationLogs: CustomerConversationLog[];
}

export interface TripTypeSummary {
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
}

export interface PricingConfigSummary {
  id: string;
  currency: string;
  baseFare: number;
  distanceRatePerKm: number;
  timeRatePerMinute: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyEmploymentLinkageSummary {
  key: "CLT" | "CLT_INTERMITENTE" | "MEI" | "PJ" | "AUTONOMO";
  label: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CompanyEmploymentLinkageRuleSummary {
  id: string;
  linkageKey: CompanyEmploymentLinkageSummary["key"];
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfileSummary {
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
  geofenceEnabled: boolean;
  geofenceBaseLatitude?: number;
  geofenceBaseLongitude?: number;
  geofenceRadiusMeters: number;
  toleranceMarkingMinutes: number;
  toleranceDailyMaxMinutes: number;
  employmentLinkages: CompanyEmploymentLinkageSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface RemunerationTemplateSummary {
  id: string;
  name: string;
  description?: string;
  workerType: "DRIVER";
  contractProfile?: "CLT" | "INTERMITENTE" | "MEI";
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeTemplateSummary {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  workProfiles: string[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CargoCboSummary {
  codigo: string;
  titulo: string;
}

export interface CargoSummary {
  id: string;
  name: string;
  description?: string;
  department: string;
  level: string;
  levels: string[];
  cbo?: CargoCboSummary;
  unhealthyAllowance: "NONE" | "10" | "20" | "40";
  hazardousAllowance: "NONE" | "30";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CargoPageSummary {
  items: CargoSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CargoOptionSummary {
  id: string;
  name: string;
  level: string;
  levels: string[];
}

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

export interface BenefitValueConfig {
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
}

export interface BenefitSummary {
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
}

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

export interface WorkProfileRemunerationSettings {
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
}

export interface WorkProfileBenefitRef {
  id: string;
  name: string;
  summary?: string;
}

export type HolidayScopeType = "NATIONAL" | "STATE" | "CITY";
export type DsrWeeklyRestDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export interface HolidaySummary {
  id: string;
  date: string;
  name: string;
  scopeType: HolidayScopeType;
  stateCode?: string;
  cityCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkJourneyType = "FIXED" | "FLEXIBLE" | "INTERMITTENT";
export type WorkJourneyBreakType = "NONE" | "FIXED" | "FLEXIBLE";
export type WorkJourneyDay = DsrWeeklyRestDay;

export interface WorkJourneyDsrPolicySnapshot {
  enabled: boolean;
  restMode: "WEEKDAY" | "CYCLE";
  description?: string;
  summary: string;
  weeklyRestDay?: DsrWeeklyRestDay;
  cycleWorkDays?: number;
  cycleOffDays?: number;
  reflectOvertime: boolean;
  reflectNight: boolean;
  loseOnUnjustifiedAbsence: boolean;
}

export interface WorkJourneyFixedConfig {
  scaleType: "FIVE_TWO" | "SIX_ONE" | "TWELVE_THIRTY_SIX" | "CUSTOM";
  activeDays: WorkJourneyDay[];
  cycleWorkDays?: number;
  cycleOffDays?: number;
  startTime: string;
  endTime: string;
  dailyHours: number;
  weeklyHours: number;
}

export interface WorkJourneyFlexibleConfig {
  expectedDailyHours: number;
  expectedWeeklyHours: number;
  entryWindowStart: string;
  entryWindowEnd: string;
  exitWindowStart: string;
  exitWindowEnd: string;
  minimumBreakMinutes: number;
  breakMandatory: boolean;
  allowSameDayCompensation: boolean;
  allowSameWeekCompensation: boolean;
}

export interface WorkJourneyIntermittentConfig {
  minHoursPerCall: number;
  maxHoursPerCall: number;
  callDays: WorkJourneyDay[];
  allowedStartTime: string;
  allowedEndTime: string;
  allowMultipleCallsPerDay: boolean;
  remunerationType: "HOUR" | "SHIFT" | "DAILY";
  remunerationValue?: number;
  requireCallAcceptance: boolean;
  requirePriorSchedule: boolean;
}

export interface WorkJourneySummary {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  type: WorkJourneyType;
  allowedDays: WorkJourneyDay[];
  breakType: WorkJourneyBreakType;
  breakDurationMinutes?: number;
  maxHoursPerDay: number;
  notes?: string;
  dsrPolicy?: WorkJourneyDsrPolicySnapshot;
  fixedConfig?: WorkJourneyFixedConfig;
  flexibleConfig?: WorkJourneyFlexibleConfig;
  intermittentConfig?: WorkJourneyIntermittentConfig;
  createdAt: string;
  updatedAt: string;
}

export type TimeEntryKind = "IN" | "OUT" | "BREAK_START" | "BREAK_END";
export type TimeEntrySource = "APP" | "WEB" | "ADMIN" | "IMPORT";
export type TimeEntryStatus = "REGISTERED" | "ADJUSTED" | "CANCELLED";
export type TimeAdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TimeEntrySummary {
  id: string;
  driverId: string;
  createdByUserId?: string;
  updatedByUserId?: string;
  occurredAt: string;
  kind: TimeEntryKind;
  source: TimeEntrySource;
  status: TimeEntryStatus;
  timezone?: string;
  deviceMeta?: Record<string, unknown>;
  geo?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeEntryIssueCode =
  | "UNEXPECTED_FIRST_ENTRY"
  | "INVALID_SEQUENCE"
  | "MISSING_BREAK_END"
  | "MISSING_OUT";

export type TimeEntryIssueSeverity = "WARNING" | "ERROR";
export type TimeEntryIssueStatus = "OPEN" | "RESOLVED" | "AUTO_RESOLVED";

export interface TimeEntryIssueSummary {
  id: string;
  externalKey: string;
  driverId: string;
  date: string;
  code: TimeEntryIssueCode;
  severity: TimeEntryIssueSeverity;
  status: TimeEntryIssueStatus;
  message: string;
  entryIds: string[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeAdjustmentSummary {
  id: string;
  driverId: string;
  timeEntryId?: string;
  requestedByUserId?: string;
  updatedByUserId?: string;
  reviewedByUserId?: string;
  reason: string;
  requestedKind?: TimeEntryKind;
  requestedOccurredAt?: string;
  requestedTimezone?: string;
  requestedGeo?: Record<string, unknown>;
  requestedNotes?: string;
  originalSnapshot?: Record<string, unknown>;
  requestedSnapshot?: Record<string, unknown>;
  status: TimeAdjustmentStatus;
  reviewerNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetDaySummary {
  id: string;
  driverId: string;
  date: string;
  workProfileTemplateId?: string;
  journeyTemplateId?: string;
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  latenessMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  hasOpenIssues: boolean;
  openIssueCount: number;
  calculationMeta?: Record<string, unknown>;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetPeriodSummary {
  id: string;
  driverId: string;
  period: string;
  expectedMinutes: number;
  workedMinutes: number;
  normalMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  breakMinutes: number;
  latenessMinutes: number;
  earlyLeaveMinutes: number;
  absenceDays: number;
  workedDays: number;
  openIssueDays: number;
  openIssueCount: number;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
  reopenedAt?: string;
  closedByUserId?: string;
  reopenedByUserId?: string;
  lockNote?: string;
  rulesSnapshot?: Record<string, unknown>;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type TimekeepingDashboardDriverState =
  | "NOT_STARTED"
  | "IN_JOURNEY"
  | "ON_BREAK"
  | "FINISHED";

export interface TimekeepingDashboardDriverSummary {
  driverId: string;
  driverName: string;
  state: TimekeepingDashboardDriverState;
  delayed: boolean;
  firstEntryAt?: string;
  lastEntryAt?: string;
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  overtimeAlertMinutes?: number;
  overtimeAlertActive: boolean;
  openIssueCount: number;
}

export interface TimekeepingDashboardSummary {
  date: string;
  generatedAt: string;
  totalDrivers: number;
  inJourneyCount: number;
  onBreakCount: number;
  delayedCount: number;
  overtimeAlertCount: number;
  pendingIssueDriversCount: number;
  notStartedCount: number;
  finishedCount: number;
  drivers: TimekeepingDashboardDriverSummary[];
}

export interface TimekeepingCostProjectionDriverSummary {
  driverId: string;
  driverName: string;
  workProfileTemplateId?: string;
  hourlyRate: number;
  expectedMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  overtimePercent: number;
  nightPercent: number;
  baseCost: number;
  overtimeCost: number;
  nightCost: number;
  totalCost: number;
  auditMemory: string[];
}

export interface TimekeepingCostProjectionSummary {
  date: string;
  generatedAt: string;
  totalBaseCost: number;
  totalOvertimeCost: number;
  totalNightCost: number;
  totalProjectedCost: number;
  drivers: TimekeepingCostProjectionDriverSummary[];
}

export type FinancialEntryType = "REVENUE" | "COST";

export type FinancialTransactionType = "EARNING" | "EXPENSE" | "PAYMENT" | "ADJUSTMENT";
export type FinancialTransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type FinancialTransactionSource =
  | "RIDE"
  | "PAYROLL"
  | "FLEET_MAINTENANCE"
  | "FLEET_REFUEL"
  | "MANUAL";
export type FinancialTransactionCategoryType = "REVENUE" | "EXPENSE" | "BOTH";

export interface FinancialTransactionCategorySummary {
  id: string;
  code: string;
  name: string;
  type: FinancialTransactionCategoryType;
  color?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransactionSummary {
  id: string;
  occurredAt: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  source: FinancialTransactionSource;
  category: string;
  categoryLabel?: string;
  description: string;
  amount: number;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  rideId?: string;
  referenceId?: string;
  referencePath?: string;
  isEditable?: boolean;
  isReversible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FinancialEntrySummary {
  id: string;
  date: string;
  type: FinancialEntryType;
  source: "RIDE" | "PAYROLL" | "FLEET" | "MANUAL";
  category: string;
  categoryLabel?: string;
  description: string;
  amount: number;
  transactionId?: string;
  referenceId?: string;
  referencePath?: string;
  sourceEntityLabel?: string;
}

export interface FinancialCashflowDaySummary {
  date: string;
  revenueAmount: number;
  payrollCostAmount: number;
  fleetCostAmount: number;
  totalCostAmount: number;
  netAmount: number;
}

export interface FinancialCashflowSummary {
  period: string;
  generatedAt: string;
  totals: {
    revenueAmount: number;
    payrollCostAmount: number;
    fleetCostAmount: number;
    totalCostAmount: number;
    netAmount: number;
  };
  days: FinancialCashflowDaySummary[];
}

export interface FinancialOverviewSummary {
  period: string;
  generatedAt: string;
  totals: {
    revenueAmount: number;
    payrollCostAmount: number;
    fleetCostAmount: number;
    totalCostAmount: number;
    netAmount: number;
  };
  indicators: {
    completedRides: number;
    pendingTimekeepingIssues: number;
    openTimesheetPeriods: number;
    closedTimesheetPeriods: number;
  };
  topRevenueEntries: FinancialEntrySummary[];
  topCostEntries: FinancialEntrySummary[];
}

export interface FinancialEntriesSummary {
  period: string;
  generatedAt: string;
  totalRevenueAmount: number;
  totalCostAmount: number;
  entries: FinancialEntrySummary[];
}

export interface WorkProfileSummary {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  cargoId?: string;
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
  usesNightPolicy: boolean;
  nightTemplateId?: string;
  nightTemplateName?: string;
  nightSummary?: string;
  holidayScopeType?: HolidayScopeType;
  holidayStateCode?: string;
  holidayCityCode?: string;
  holidaySummary?: string;
  benefits: WorkProfileBenefitRef[];
  allowContractEditing: boolean;
  allowJourneyCustomization: boolean;
  allowBenefitsCustomization: boolean;
  toleranceMarkingMinutes?: number;
  toleranceDailyMaxMinutes?: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRuleSummary {
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
}

export interface CboOccupationSummary {
  id: string;
  code: string;
  title: string;
  description?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CboOccupationPageSummary {
  items: CboOccupationSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CboImportSummary {
  processed: number;
  created: number;
  updated: number;
  source: string;
  filename: string;
}
