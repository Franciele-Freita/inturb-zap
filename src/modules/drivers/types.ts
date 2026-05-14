export interface DriverVehicle {
  id: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DriverType = "AGREGADO" | "FROTA";
export type FleetAssignmentMode = "FIXED" | "FLEX";
export type DriverOperationalStatus = "ACTIVE" | "INACTIVE" | "LEAVE" | "SUSPENDED";
export type DriverLeavePeriodType = "VACATION" | "LEAVE" | "SUSPENSION";
export type FleetVehicleAssignmentValidationMethod = "QR_CODE" | "PLATE" | "ADMIN";
export type DriverFleetChecklistRoutine = "START_OF_DAY" | "END_OF_DAY";
export type DriverFleetChecklistInputType = "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";

export interface DriverFleetDefaultVehicleSummary {
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  checkinCode: string;
}

export interface DriverFleetVehicleSummary {
  assignmentId: string;
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  validationMethod: FleetVehicleAssignmentValidationMethod;
  startedAt: string;
}

export interface DriverFleetChecklistItem {
  itemKey: string;
  templateId?: string;
  templateName?: string;
  label: string;
  description?: string;
  category?: string;
  routine: DriverFleetChecklistRoutine;
  inputType: DriverFleetChecklistInputType;
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

export interface DriverFleetVehicleDetails extends DriverFleetVehicleSummary {
  checklist: DriverFleetChecklistItem[];
}

export interface DriverCompensationSettings {
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
}

export type DriverContractProfile = "CLT" | "INTERMITENTE" | "MEI";

export interface DriverEmergencyContact {
  name: string;
  relation: string;
  phone: string;
  isWhatsapp: boolean;
  notes?: string;
}

export type DriverAccessibilityDisabilityType =
  | "PHYSICAL"
  | "HEARING"
  | "VISUAL"
  | "INTELLECTUAL"
  | "MULTIPLE"
  | "OTHER";

export interface DriverAccessibility {
  hasDisability?: boolean;
  disabilityType?: DriverAccessibilityDisabilityType;
  otherDisabilityType?: string;
  hasMobilityLimitation?: boolean;
  mobilityLimitationDescription?: string;
  needsVehicleAdaptation?: boolean;
  vehicleAdaptationDescription?: string;
}

export type DriverAddressType = "OWN" | "RENTED";

export interface DriverAddress {
  cep?: string;
  addressType?: DriverAddressType;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
}

export interface DriverLicense {
  number: string;
  category: string;
  expirationDate: string;
  firstLicenseDate: string;
  issuingState: string;
  documentPhotoUrl?: string;
  expiryAlertLeadDays?: number;
  expiryAlertRepeatDays?: number;
}

export interface DriverToxicology {
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
}

export interface DriverPsychotechnical {
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
}

export interface DriverComplianceHistoryItem {
  id: string;
  title: string;
  meta: string;
  detail: string;
  createdAt: string;
}

export interface DriverJourney {
  dsrPolicy?: {
    id: string;
    name: string;
    summary?: string;
    restMode?: "WEEKDAY" | "CYCLE";
    weeklyRestDay?: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    cycleWorkDays?: number;
    cycleOffDays?: number;
    reflectOvertime: boolean;
    reflectNight: boolean;
    loseOnUnjustifiedAbsence: boolean;
  };
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
}

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

export interface DriverEmploymentContractEndorsement {
  id: string;
  type: DriverEmploymentContractEndorsementType;
  status: DriverEmploymentContractEndorsementStatus;
  effectiveDate: string;
  notes?: string;
  changes: Record<string, unknown>;
  createdAt: string;
  signedAt?: string;
}

export interface DriverEmploymentContract {
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
}

export interface DriverContract {
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
}

export interface DriverOperationalEligibility {
  eligible: boolean;
  blockingIssues: string[];
}

export interface DriverOperationalSummary {
  activeAssignedRides: number;
  completedRides: number;
  cancelledRides: number;
  noShowRides: number;
  emergencyCancellations: number;
  openExecutionAlerts: number;
  lastRideAt?: string;
}

export type DriverGender = "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

export interface DriverProfile {
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
  leavePeriods?: DriverLeavePeriod[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverLeavePeriod {
  id: string;
  driverId: string;
  type: DriverLeavePeriodType;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
