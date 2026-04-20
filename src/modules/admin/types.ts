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

export interface WorkProfileSummary {
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
