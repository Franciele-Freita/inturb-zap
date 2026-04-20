"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DriverContract,
  DriverContractProfile,
  DriverEmploymentContract,
  DriverJourney,
  WorkProfile,
  request
} from "../lib/api";
import { loadDocumentTemplates } from "../lib/document-templates";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";
import { DriverEditorSection } from "./driver-profile-editor-shell";

type CompensationMode = "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
type JourneyScaleType = "FIVE_TWO" | "SIX_ONE" | "TWELVE_THIRTY_SIX" | "CUSTOM";
type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type FixedScheduleMode = "UNIFORM" | "PER_DAY";
type JourneyDaySchedule = { day: WeekDay; enabled: boolean; startTime?: string; endTime?: string };
type IntermittentConvocationMode = "ON_DEMAND" | "ADVANCE_NOTICE" | "FIXED_WINDOW";
type IntermittentPaymentMode = "DAILY" | "PER_RIDE" | "DAILY_PLUS_RIDE";
type IntermittentRideCompensationType = "AMOUNT" | "PERCENT";
type MeiRemunerationModel = "COMMISSION_PERCENT" | "PER_RIDE_FIXED" | "RIDE_REVENUE_SHARE" | "FIXED_PLUS_VARIABLE";
type MeiCommissionBase = "RIDE" | "GROSS_REVENUE" | "RATING";
type MeiRevenueShareBase = "RIDE_GROSS" | "RIDE_NET";
type MeiVariableType = "PERCENT" | "AMOUNT";
type MeiWorkMode = "ON_DEMAND" | "SCHEDULED" | "MIXED";
type MeiOperationVehicleMode = "OWN_VEHICLE" | "COMPANY_VEHICLE" | "BOTH";
type MeiCostResponsibility = "DRIVER" | "COMPANY" | "SHARED";
type OvertimePolicyMode = "PAID" | "BANK_HOURS";

type DriverProfileEditorOperationSectionProps = {
  activeSection: DriverEditorSection;
  driverType: "AGREGADO" | "FROTA";
  contractProfile: DriverContractProfile;
  journey?: DriverJourney;
  contract?: DriverContract;
  onOpenContractsSection?: () => void;
  isGeneratingContract?: boolean;
  isRequestingSignature?: boolean;
  isActivatingContract?: boolean;
  isTerminatingContract?: boolean;
  canGenerateContract?: boolean;
  onGenerateContract?: (payload?: {
    templateKey?: string;
    templateName?: string;
    templateVersion?: string;
    templateContent?: string;
  }) => Promise<void>;
  onRequestSignature?: (contractId: string) => Promise<void>;
  onActivateContract?: (contractId: string) => Promise<void>;
  onCancelContract?: (contractId: string, mode: "CANCEL" | "FINALIZE") => Promise<void>;
  onContractProfileChange: (value: DriverContractProfile) => void;
  onJourneyChange: (value?: DriverJourney) => void;
  onContractChange: (value?: DriverContract) => void;
  effectiveCompensationLabel: string;
  customModel: CompensationMode;
  customValue: string;
  customNotes: string;
  onCustomModelChange: (value: CompensationMode) => void;
  onCustomValueChange: (value: string) => void;
  onCustomNotesChange: (value: string) => void;
};

const benefitOptions = [
  "Plano de saude",
  "Plano odontologico",
  "Vale transporte",
  "Vale refeicao",
  "Vale alimentacao",
  "Seguro de vida",
  "Bonus por produtividade"
] as const;

const journeyScaleOptions: Array<{ value: JourneyScaleType; label: string }> = [
  { value: "FIVE_TWO", label: "5x2" },
  { value: "SIX_ONE", label: "6x1" },
  { value: "TWELVE_THIRTY_SIX", label: "12x36" },
  { value: "CUSTOM", label: "Personalizada" }
];

const weekDayOptions: Array<{ value: WeekDay; label: string }> = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sab" },
  { value: "SUN", label: "Dom" }
];

function isWeekDay(value: string): value is WeekDay {
  return value === "MON" || value === "TUE" || value === "WED" || value === "THU" || value === "FRI" || value === "SAT" || value === "SUN";
}

const defaultWeekDays: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI"];

function parseTimeToMinutes(value?: string): number | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function calculateDurationMinutes(startTime?: string, endTime?: string): number | undefined {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === undefined || end === undefined) return undefined;
  if (end >= start) return end - start;
  return 24 * 60 - start + end;
}

function formatDurationLabel(totalMinutes?: number): string {
  if (totalMinutes === undefined || totalMinutes <= 0) return "duracao pendente";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes.toString().padStart(2, "0")}min`;
}

function normalizeJourneyDaySchedules(
  journey: DriverJourney | undefined,
  fallbackActiveDays: WeekDay[],
  defaultStartTime: string,
  defaultEndTime: string
): JourneyDaySchedule[] {
  const map = new Map<WeekDay, JourneyDaySchedule>();

  for (const item of journey?.daySchedules ?? []) {
    if (!item || !isWeekDay(item.day)) continue;
    map.set(item.day, {
      day: item.day,
      enabled: Boolean(item.enabled),
      startTime: item.startTime?.trim() || undefined,
      endTime: item.endTime?.trim() || undefined
    });
  }

  return weekDayOptions.map((option) => {
    const existing = map.get(option.value);
    const enabled = existing?.enabled ?? fallbackActiveDays.includes(option.value);
    return {
      day: option.value,
      enabled,
      startTime: enabled ? existing?.startTime || defaultStartTime : undefined,
      endTime: enabled ? existing?.endTime || defaultEndTime : undefined
    };
  });
}

function deriveAvailabilityWindow(daySchedules: JourneyDaySchedule[]): { startTime?: string; endTime?: string } {
  const enabledSchedules = daySchedules.filter(
    (item) => item.enabled && item.startTime && item.endTime
  );
  if (enabledSchedules.length === 0) {
    return {};
  }

  let minStart: number | undefined;
  let maxEnd: number | undefined;

  for (const item of enabledSchedules) {
    const startMinutes = parseTimeToMinutes(item.startTime);
    const endMinutes = parseTimeToMinutes(item.endTime);
    if (startMinutes === undefined || endMinutes === undefined) {
      continue;
    }

    if (minStart === undefined || startMinutes < minStart) {
      minStart = startMinutes;
    }
    if (maxEnd === undefined || endMinutes > maxEnd) {
      maxEnd = endMinutes;
    }
  }

  function toClock(value?: number): string | undefined {
    if (value === undefined) return undefined;
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return {
    startTime: toClock(minStart),
    endTime: toClock(maxEnd)
  };
}

function mapLegacyPaymentMethodToIntermittentMode(value?: string): IntermittentPaymentMode | undefined {
  if (value === "DIARIA") return "DAILY";
  if (value === "CORRIDA") return "PER_RIDE";
  if (value === "DIARIA_CORRIDA") return "DAILY_PLUS_RIDE";
  return undefined;
}

function mapIntermittentModeToLegacyPaymentMethod(value?: IntermittentPaymentMode): string | undefined {
  if (value === "DAILY") return "DIARIA";
  if (value === "PER_RIDE") return "CORRIDA";
  if (value === "DAILY_PLUS_RIDE") return "DIARIA_CORRIDA";
  return undefined;
}

function parseLegacyPreferredWeekDays(value?: string): WeekDay[] {
  if (!value?.trim()) return [];

  const tokens = value
    .toUpperCase()
    .split(/[^A-Z]+/g)
    .filter((token) => token.length > 0);

  const normalized = tokens
    .map((token) => {
      if (token === "MON" || token === "SEG") return "MON";
      if (token === "TUE" || token === "TER") return "TUE";
      if (token === "WED" || token === "QUA") return "WED";
      if (token === "THU" || token === "QUI") return "THU";
      if (token === "FRI" || token === "SEX") return "FRI";
      if (token === "SAT" || token === "SAB") return "SAT";
      if (token === "SUN" || token === "DOM") return "SUN";
      return undefined;
    })
    .filter((day): day is WeekDay => day !== undefined);

  return [...new Set(normalized)];
}

function normalizeIntermittentContractDraft(contract: DriverContract): DriverContract {
  const paymentMode =
    contract.intermittentPaymentMode ?? mapLegacyPaymentMethodToIntermittentMode(contract.paymentMethod);
  const intermittentPreferredWeekDays =
    contract.intermittentPreferredWeekDays && contract.intermittentPreferredWeekDays.length > 0
      ? contract.intermittentPreferredWeekDays
      : parseLegacyPreferredWeekDays(contract.intermittentPreferredDays);
  const meiPreferredWeekDays =
    contract.meiPreferredWeekDays && contract.meiPreferredWeekDays.length > 0
      ? contract.meiPreferredWeekDays
      : parseLegacyPreferredWeekDays(contract.intermittentPreferredDays);

  return {
    ...contract,
    intermittentPaymentMode: paymentMode,
    intermittentPreferredWeekDays:
      intermittentPreferredWeekDays.length > 0 ? intermittentPreferredWeekDays : contract.intermittentPreferredWeekDays,
    meiPreferredWeekDays: meiPreferredWeekDays.length > 0 ? meiPreferredWeekDays : contract.meiPreferredWeekDays,
    meiRemunerationModel: contract.meiRemunerationModel ?? "COMMISSION_PERCENT",
    meiCommissionBase: contract.meiCommissionBase ?? "RIDE",
    meiRevenueShareBase: contract.meiRevenueShareBase ?? "RIDE_GROSS",
    meiVariableType: contract.meiVariableType ?? "PERCENT",
    meiVariableBase: contract.meiVariableBase ?? "RIDE",
    meiWorkMode: contract.meiWorkMode ?? "ON_DEMAND",
    meiOperationVehicleMode: contract.meiOperationVehicleMode ?? "OWN_VEHICLE",
    meiFuelResponsibility: contract.meiFuelResponsibility ?? "DRIVER",
    meiMaintenanceResponsibility: contract.meiMaintenanceResponsibility ?? "DRIVER"
  };
}

const emptyJourney: DriverJourney = {
  fixedScheduleMode: "UNIFORM",
  shift: "",
  scale: "6x1",
  scaleType: "SIX_ONE",
  customScaleWorkDays: undefined,
  customScaleOffDays: undefined,
  fixedSchedule: true,
  startTime: "",
  endTime: "",
  availabilityStartTime: "",
  availabilityEndTime: "",
  availableDays: defaultWeekDays,
  acceptsOutsideSchedule: false,
  availabilityNotes: ""
};
const emptyContract: DriverContract = {
  startDate: "",
  endDate: "",
  hasFixedTermContract: false,
  notifyContractEnd: true,
  contractEndNotifyLeadDays: 30,
  experienceEnabled: false,
  experienceStartDate: "",
  experienceEndDate: "",
  autoRenewAfterExperience: false,
  notifyExperienceEnd: true,
  experienceNotifyLeadDays: 15,
  experienceNotifyRepeatDays: 7,
  benefitsList: [],
  otherBenefits: "",
  salaryModel: "FIXED",
  fixedSalary: 0,
  commissionType: "PERCENT",
  commissionApplyOn: "RIDE",
  commissionPercent: 0,
  commissionPerRide: 0,
  intermittentStatus: "ATIVO",
  intermittentConvocationMode: "ON_DEMAND",
  intermittentNoticeHours: 24,
  intermittentConvocationNotes: "",
  intermittentPaymentMode: "DAILY",
  intermittentDailyRate: undefined,
  intermittentRideCompensationType: "AMOUNT",
  intermittentRideAmount: undefined,
  intermittentRidePercent: undefined,
  intermittentPreferredWeekDays: defaultWeekDays,
  meiRemunerationModel: "COMMISSION_PERCENT",
  meiCommissionBase: "RIDE",
  meiCommissionPercent: undefined,
  meiPerRideAmount: undefined,
  meiRevenueSharePercent: undefined,
  meiRevenueShareBase: "RIDE_GROSS",
  meiFixedBaseAmount: undefined,
  meiVariableType: "PERCENT",
  meiVariablePercent: undefined,
  meiVariableAmount: undefined,
  meiVariableBase: "RIDE",
  meiWorkMode: "ON_DEMAND",
  meiOperationVehicleMode: "OWN_VEHICLE",
  meiFuelResponsibility: "DRIVER",
  meiMaintenanceResponsibility: "DRIVER",
  meiPreferredWeekDays: defaultWeekDays,
  meiCnpj: "",
  meiLegalName: "",
  meiTradeName: "",
  meiMunicipalRegistration: "",
  workedPeriods: "",
  intermittentPreferredDays: "",
  paymentMethod: "",
  paymentFrequency: "",
  fiscalNotes: "",
  notes: "",
  overtimeUseGlobalPolicy: false,
  overtimeEnabled: false,
  overtimePolicyMode: "PAID",
  overtimeDailyLimitHours: undefined,
  overtimeWeeklyLimitHours: undefined,
  overtimeAfterDailyHours: 8,
  overtimeAfterWeeklyHours: 44,
  overtimeMultiplier50: 1.5,
  overtimeMultiplier100: 2,
  overtimeNightMultiplier: 1.2,
  overtimeRoundingMinutes: 15
};

function deriveContractProfile(driverType: "AGREGADO" | "FROTA", customModel: CompensationMode): DriverContractProfile {
  if (customModel === "INTERMITTENT") return "INTERMITENTE";
  return driverType === "FROTA" ? "CLT" : "MEI";
}

function profileCopy(profile: DriverContractProfile) {
  if (profile === "CLT") return { title: "CLT", description: "Vinculo formal e operacao de frota." };
  if (profile === "INTERMITENTE") return { title: "Intermitente", description: "Vinculo sob convocacao." };
  return { title: "MEI", description: "Prestador/agregado com pagamento flexivel." };
}

function resolveJourneyScaleType(journey?: DriverJourney): JourneyScaleType {
  if (
    journey?.scaleType === "FIVE_TWO" ||
    journey?.scaleType === "SIX_ONE" ||
    journey?.scaleType === "TWELVE_THIRTY_SIX" ||
    journey?.scaleType === "CUSTOM"
  ) {
    return journey.scaleType;
  }

  const scale = (journey?.scale ?? "").toLowerCase().replace(/\s/g, "");
  if (scale.includes("5x2")) {
    return "FIVE_TWO";
  }
  if (scale.includes("12x36")) {
    return "TWELVE_THIRTY_SIX";
  }
  if (scale.includes("6x1")) {
    return "SIX_ONE";
  }
  return "SIX_ONE";
}

function resolveScaleLabel(scaleType: JourneyScaleType, workDays?: number, offDays?: number): string {
  if (scaleType === "FIVE_TWO") return "5x2";
  if (scaleType === "SIX_ONE") return "6x1";
  if (scaleType === "TWELVE_THIRTY_SIX") return "12x36";
  if (workDays && offDays) return `${workDays}x${offDays}`;
  return "Personalizada";
}

function resolveScalePreviewTokens(scaleType: JourneyScaleType, workDays?: number, offDays?: number): Array<"T" | "F"> {
  if (scaleType === "FIVE_TWO") return ["T", "T", "T", "T", "T", "F", "F"];
  if (scaleType === "SIX_ONE") return ["T", "T", "T", "T", "T", "T", "F"];
  if (scaleType === "TWELVE_THIRTY_SIX") return ["T", "F"];
  const work = Math.max(0, Math.min(workDays ?? 0, 10));
  const off = Math.max(0, Math.min(offDays ?? 0, 10));
  if (!work && !off) return [];
  return [...Array(work).fill("T"), ...Array(off).fill("F")] as Array<"T" | "F">;
}

function normalizeJourneyDraft(journey?: DriverJourney): DriverJourney {
  const scaleType = resolveJourneyScaleType(journey);
  const fixedSchedule = journey?.fixedSchedule === undefined ? true : Boolean(journey.fixedSchedule);
  const customScaleWorkDays = scaleType === "CUSTOM" ? journey?.customScaleWorkDays : undefined;
  const customScaleOffDays = scaleType === "CUSTOM" ? journey?.customScaleOffDays : undefined;
  const availableDaysFromInput = Array.isArray(journey?.availableDays)
    ? journey?.availableDays.filter((day): day is WeekDay => typeof day === "string" && isWeekDay(day))
    : undefined;
  const activeDaysFromDaySchedule = (journey?.daySchedules ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item) && isWeekDay(item.day) && Boolean(item.enabled))
    .map((item) => item.day);
  const availableDaysCandidate =
    availableDaysFromInput && availableDaysFromInput.length > 0
      ? availableDaysFromInput
      : activeDaysFromDaySchedule.length > 0
        ? [...new Set(activeDaysFromDaySchedule)]
        : defaultWeekDays;
  const fixedScheduleMode: FixedScheduleMode | undefined = fixedSchedule
    ? journey?.fixedScheduleMode === "PER_DAY" || (!journey?.fixedScheduleMode && (journey?.daySchedules?.length ?? 0) > 0)
      ? "PER_DAY"
      : "UNIFORM"
    : undefined;
  const normalizedDaySchedules = normalizeJourneyDaySchedules(
    journey,
    availableDaysCandidate,
    journey?.startTime?.trim() || "08:00",
    journey?.endTime?.trim() || "17:00"
  );
  const normalizedVariableDaySchedules = normalizeJourneyDaySchedules(
    journey,
    availableDaysCandidate,
    journey?.availabilityStartTime?.trim() || "06:00",
    journey?.availabilityEndTime?.trim() || "18:00"
  );
  const variableAvailabilityWindow = deriveAvailabilityWindow(normalizedVariableDaySchedules);
  const normalizedAvailableDays = fixedSchedule
    ? availableDaysCandidate
    : availableDaysCandidate.length > 0
      ? availableDaysCandidate
      : defaultWeekDays;

  return {
    ...emptyJourney,
    ...(journey ?? {}),
    fixedScheduleMode,
    scaleType,
    scale: resolveScaleLabel(scaleType, customScaleWorkDays, customScaleOffDays),
    customScaleWorkDays,
    customScaleOffDays,
    fixedSchedule,
    startTime: fixedSchedule && fixedScheduleMode !== "PER_DAY" ? journey?.startTime ?? "" : "",
    endTime: fixedSchedule && fixedScheduleMode !== "PER_DAY" ? journey?.endTime ?? "" : "",
    availabilityStartTime: fixedSchedule
      ? ""
      : journey?.availabilityStartTime ?? variableAvailabilityWindow.startTime ?? "06:00",
    availabilityEndTime: fixedSchedule
      ? ""
      : journey?.availabilityEndTime ?? variableAvailabilityWindow.endTime ?? "18:00",
    availableDays: normalizedAvailableDays,
    daySchedules: fixedSchedule
      ? fixedScheduleMode === "PER_DAY"
        ? normalizedDaySchedules
        : undefined
      : normalizedVariableDaySchedules,
    acceptsOutsideSchedule: fixedSchedule ? undefined : journey?.acceptsOutsideSchedule ?? false,
    availabilityNotes: journey?.availabilityNotes ?? ""
  };
}

function normalizeIntermittentJourneyDraft(journey: DriverJourney): DriverJourney {
  const activeDays = (journey.availableDays ?? defaultWeekDays).filter(
    (day, index, list): day is WeekDay => isWeekDay(day) && list.indexOf(day) === index
  );
  const normalizedActiveDays = activeDays.length > 0 ? activeDays : defaultWeekDays;
  const normalizedVariableDaySchedules = normalizeJourneyDaySchedules(
    journey,
    normalizedActiveDays,
    journey.availabilityStartTime || "06:00",
    journey.availabilityEndTime || "18:00"
  );
  const variableAvailabilityWindow = deriveAvailabilityWindow(normalizedVariableDaySchedules);

  return {
    ...journey,
    fixedSchedule: false,
    fixedScheduleMode: undefined,
    startTime: "",
    endTime: "",
    daySchedules: normalizedVariableDaySchedules,
    availabilityStartTime: journey.availabilityStartTime || variableAvailabilityWindow.startTime || "06:00",
    availabilityEndTime: journey.availabilityEndTime || variableAvailabilityWindow.endTime || "18:00",
    availableDays: normalizedActiveDays,
    acceptsOutsideSchedule: journey.acceptsOutsideSchedule ?? false
  };
}

function parseNumeric(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : undefined;
}

function formatCurrencyField(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "";
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseCurrencyMasked(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return undefined;
  }
  return Number((Number(digits) / 100).toFixed(2));
}

function formatPercentField(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "";
  }
  const normalized = value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const [integerPart, decimalPart] = normalized.split(",");
  const cleanInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
  return decimalPart !== undefined ? `${cleanInteger},${decimalPart}` : cleanInteger;
}

function parsePercentMasked(value: string): number | undefined {
  const normalized = value
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const clamped = Math.max(0, Math.min(100, parsed));
  return Number(clamped.toFixed(2));
}

function parseIntMin(value: string, min: number): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.trunc(n)) : undefined;
}

const cltExperiencePresetOptions = [30, 60, 90] as const;
type CltExperiencePresetDays = (typeof cltExperiencePresetOptions)[number];
const defaultCltExperiencePresetDays: CltExperiencePresetDays = 90;

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDatePtBr(value?: string): string {
  const parsed = parseDateInput(value);
  if (!parsed) return "data pendente";
  return parsed.toLocaleDateString("pt-BR");
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysIsoDate(startDate: string, days: number): string {
  const start = parseDateInput(startDate) ?? parseDateInput(getTodayIsoDate())!;
  const next = new Date(start);
  next.setDate(next.getDate() + Math.max(1, Math.trunc(days)));
  return toIsoDate(next);
}

function getExperienceDurationDays(startDate?: string, endDate?: string): number | undefined {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) return undefined;
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : undefined;
}

function getExperienceLeadDays(durationDays?: number): number | undefined {
  if (!durationDays || durationDays <= 0) return undefined;
  return Math.max(1, Math.round(durationDays / 3));
}

function resolveCltPresetFromDates(startDate?: string, endDate?: string): CltExperiencePresetDays | undefined {
  const durationDays = getExperienceDurationDays(startDate, endDate);
  if (!durationDays) return undefined;
  return cltExperiencePresetOptions.find((days) => days === durationDays);
}

function normalizeCnpjDigits(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

function formatCnpjInput(value?: string): string {
  const digits = normalizeCnpjDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatWeekDayList(days?: WeekDay[]): string {
  const selected = weekDayOptions.filter((option) => (days ?? []).includes(option.value)).map((option) => option.label.toLowerCase());
  if (selected.length === 0) return "nenhum dia definido";
  if (selected.length === 7) return "todos os dias";
  return selected.join(", ");
}

function formatMoney(value?: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

function getIntermittentRemunerationSummary(contract: DriverContract): string {
  const paymentMode =
    contract.intermittentPaymentMode ?? mapLegacyPaymentMethodToIntermittentMode(contract.paymentMethod);
  if (paymentMode === "DAILY") {
    return `Diaria: ${formatMoney(contract.intermittentDailyRate)}`;
  }

  if (paymentMode === "PER_RIDE") {
    if (contract.intermittentRideCompensationType === "PERCENT") {
      return `Corrida: ${(contract.intermittentRidePercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    }
    return `Corrida: ${formatMoney(contract.intermittentRideAmount)}`;
  }

  if (paymentMode === "DAILY_PLUS_RIDE") {
    const variable =
      contract.intermittentRideCompensationType === "PERCENT"
        ? `${(contract.intermittentRidePercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
        : formatMoney(contract.intermittentRideAmount);
    return `Diaria + corrida: ${formatMoney(contract.intermittentDailyRate)} + ${variable}`;
  }

  return "Pagamento intermitente nao configurado";
}

function getMeiRemunerationSummary(contract: DriverContract): string {
  const model = contract.meiRemunerationModel;
  if (model === "COMMISSION_PERCENT") {
    const base =
      contract.meiCommissionBase === "GROSS_REVENUE"
        ? "sobre faturamento"
        : contract.meiCommissionBase === "RATING"
          ? "por avaliacao"
          : "por corrida";
    return `Comissao ${(contract.meiCommissionPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ${base}`;
  }
  if (model === "PER_RIDE_FIXED") {
    return `Valor por corrida: ${formatMoney(contract.meiPerRideAmount)}`;
  }
  if (model === "RIDE_REVENUE_SHARE") {
    const base = contract.meiRevenueShareBase === "RIDE_NET" ? "valor liquido" : "valor da corrida";
    return `Repasse ${(contract.meiRevenueSharePercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% (${base})`;
  }
  if (model === "FIXED_PLUS_VARIABLE") {
    const variable =
      contract.meiVariableType === "AMOUNT"
        ? formatMoney(contract.meiVariableAmount)
        : `${(contract.meiVariablePercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    return `Fixo + variavel: ${formatMoney(contract.meiFixedBaseAmount)} + ${variable}`;
  }
  return "Remuneracao MEI nao configurada";
}

function getSalarySummary(profile: DriverContractProfile, contract: DriverContract): string {
  if (profile === "INTERMITENTE") {
    return getIntermittentRemunerationSummary(contract);
  }
  if (profile === "MEI") {
    return getMeiRemunerationSummary(contract);
  }

  const model = contract.salaryModel ?? "FIXED";
  const scope = contract.commissionApplyOn === "RATING" ? "por avaliacao" : "por corrida";
  if (model === "FIXED") return `Fixo: ${formatMoney(contract.fixedSalary)}`;
  if (model === "COMMISSION") {
    if (contract.commissionType === "PERCENT") return `Comissao ${(contract.commissionPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ${scope}`;
    return `Comissao ${formatMoney(contract.commissionPerRide)} ${scope}`;
  }
  if (contract.commissionType === "PERCENT") return `Fixo + ${(contract.commissionPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ${scope}`;
  return `Fixo + ${formatMoney(contract.commissionPerRide)} ${scope}`;
}

type CltSalaryModel = "FIXED" | "FIXED_PLUS_COMMISSION";

function resolveCltSalaryModel(contract: DriverContract): CltSalaryModel {
  return contract.salaryModel === "FIXED_PLUS_COMMISSION" || contract.salaryModel === "COMMISSION"
    ? "FIXED_PLUS_COMMISSION"
    : "FIXED";
}

function normalizeCltCompensation(contract: DriverContract): DriverContract {
  const cltSalaryModel = resolveCltSalaryModel(contract);
  if (cltSalaryModel === "FIXED") {
    return {
      ...contract,
      salaryModel: "FIXED",
      commissionType: undefined,
      commissionPercent: undefined,
      commissionPerRide: undefined,
      commissionApplyOn: undefined
    };
  }

  const commissionType = contract.commissionType ?? "PERCENT";
  return {
    ...contract,
    salaryModel: "FIXED_PLUS_COMMISSION",
    commissionType,
    commissionApplyOn: contract.commissionApplyOn ?? "RIDE",
    commissionPercent: commissionType === "PERCENT" ? contract.commissionPercent : undefined,
    commissionPerRide: commissionType === "PER_RIDE" ? contract.commissionPerRide : undefined
  };
}

function normalizeOvertimePolicyForClt(contract: DriverContract): DriverContract {
  const overtimeEnabled = contract.overtimeEnabled ?? true;
  return {
    ...contract,
    overtimeUseGlobalPolicy: false,
    overtimeEnabled,
    overtimePolicyMode: contract.overtimePolicyMode ?? "PAID",
    overtimeDailyLimitHours: contract.overtimeDailyLimitHours,
    overtimeWeeklyLimitHours: contract.overtimeWeeklyLimitHours,
    overtimeAfterDailyHours: contract.overtimeAfterDailyHours ?? 8,
    overtimeAfterWeeklyHours: contract.overtimeAfterWeeklyHours ?? 44,
    overtimeMultiplier50: contract.overtimeMultiplier50 ?? 1.5,
    overtimeMultiplier100: contract.overtimeMultiplier100 ?? 2,
    overtimeNightMultiplier: contract.overtimeNightMultiplier ?? 1.2,
    overtimeRoundingMinutes: contract.overtimeRoundingMinutes ?? 15
  };
}

function toCompensationFromSalary(
  profile: DriverContractProfile,
  contract: DriverContract
): { model: CompensationMode; value: string; notes: string } {
  if (profile === "INTERMITENTE") {
    if (contract.intermittentPaymentMode === "DAILY") {
      return { model: "INTERMITTENT", value: String(contract.intermittentDailyRate ?? 0), notes: contract.notes?.trim() ?? "" };
    }
    if (contract.intermittentPaymentMode === "PER_RIDE") {
      if (contract.intermittentRideCompensationType === "PERCENT") {
        return { model: "PERCENT", value: String(contract.intermittentRidePercent ?? 0), notes: contract.notes?.trim() ?? "" };
      }
      return { model: "FLAT", value: String(contract.intermittentRideAmount ?? 0), notes: contract.notes?.trim() ?? "" };
    }
    if (contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") {
      return { model: "INTERMITTENT", value: String(contract.intermittentDailyRate ?? 0), notes: contract.notes?.trim() ?? "" };
    }
    return { model: "INTERMITTENT", value: "0", notes: contract.notes?.trim() ?? "" };
  }
  if (profile === "MEI") {
    if (contract.meiRemunerationModel === "COMMISSION_PERCENT") {
      return { model: "PERCENT", value: String(contract.meiCommissionPercent ?? 0), notes: contract.fiscalNotes?.trim() ?? "" };
    }
    if (contract.meiRemunerationModel === "PER_RIDE_FIXED") {
      return { model: "FLAT", value: String(contract.meiPerRideAmount ?? 0), notes: contract.fiscalNotes?.trim() ?? "" };
    }
    if (contract.meiRemunerationModel === "RIDE_REVENUE_SHARE") {
      return { model: "PERCENT", value: String(contract.meiRevenueSharePercent ?? 0), notes: contract.fiscalNotes?.trim() ?? "" };
    }
    if (contract.meiRemunerationModel === "FIXED_PLUS_VARIABLE") {
      return { model: "CUSTOM", value: String(contract.meiFixedBaseAmount ?? 0), notes: contract.fiscalNotes?.trim() ?? "" };
    }
    return { model: "CUSTOM", value: "0", notes: contract.fiscalNotes?.trim() ?? "" };
  }

  const salaryModel = contract.salaryModel ?? "FIXED";
  const commissionType = contract.commissionType ?? "PERCENT";
  if (salaryModel === "COMMISSION") {
    if (commissionType === "PERCENT") return { model: "PERCENT", value: String(contract.commissionPercent ?? 0), notes: contract.notes?.trim() ?? "" };
    return { model: "FLAT", value: String(contract.commissionPerRide ?? 0), notes: contract.notes?.trim() ?? "" };
  }
  return { model: "SALARY", value: String(contract.fixedSalary ?? 0), notes: contract.notes?.trim() ?? "" };
}

function hasPositiveNumber(value?: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

type ContractValidationField =
  | "work_profile_template"
  | "contract_start_date"
  | "contract_end_date"
  | "experience_start_date"
  | "experience_end_date"
  | "profile_required"
  | "clt_fixed_salary"
  | "clt_commission_percent"
  | "clt_commission_per_ride"
  | "clt_experience_period"
  | "intermittent_payment_mode"
  | "intermittent_convocation_mode"
  | "intermittent_notice_hours"
  | "intermittent_daily_rate"
  | "intermittent_ride_percent"
  | "intermittent_ride_amount"
  | "mei_remuneration_model"
  | "mei_payment_method"
  | "mei_payment_frequency"
  | "mei_work_mode"
  | "mei_cnpj"
  | "mei_legal_name"
  | "mei_operation_vehicle_mode"
  | "mei_fuel_responsibility"
  | "mei_maintenance_responsibility"
  | "mei_commission_percent"
  | "mei_commission_base"
  | "mei_per_ride_amount"
  | "mei_revenue_share_percent"
  | "mei_revenue_share_base"
  | "mei_fixed_base_amount"
  | "mei_variable_percent"
  | "mei_variable_amount"
  | "overtime_policy_mode"
  | "overtime_after_daily"
  | "overtime_multiplier_50"
  | "overtime_multiplier_100"
  | "overtime_rounding_minutes";

type ContractValidationResult = { field: ContractValidationField; message: string } | null;

function validateTemplateDrivenContract(contract: DriverContract): ContractValidationResult {
  if (!contract.workProfileTemplateId?.trim()) {
    return {
      field: "work_profile_template",
      message: "Selecione um perfil de trabalho para criar o vinculo."
    };
  }

  if (!contract.startDate?.trim()) {
    return {
      field: "contract_start_date",
      message: "Informe a data de inicio da vigencia."
    };
  }

  if (contract.hasFixedTermContract && !contract.endDate?.trim()) {
    return {
      field: "contract_end_date",
      message: "Informe a data de termino para contrato com prazo definido."
    };
  }

  if (contract.startDate?.trim() && contract.endDate?.trim() && contract.endDate < contract.startDate) {
    return {
      field: "contract_end_date",
      message: "Data de termino deve ser maior ou igual a data de inicio."
    };
  }

  if (contract.experienceEnabled) {
    if (!contract.experienceStartDate?.trim()) {
      return {
        field: "experience_start_date",
        message: "Informe o inicio do periodo de experiencia."
      };
    }
    if (!contract.experienceEndDate?.trim()) {
      return {
        field: "experience_end_date",
        message: "Informe o fim do periodo de experiencia."
      };
    }
    if (
      contract.experienceStartDate?.trim() &&
      contract.experienceEndDate?.trim() &&
      contract.experienceEndDate < contract.experienceStartDate
    ) {
      return {
        field: "experience_end_date",
        message: "Fim da experiencia deve ser maior ou igual ao inicio."
      };
    }
  }

  return null;
}

function hasConfiguredEmploymentSettings(contract?: DriverContract): boolean {
  if (!contract) return false;

  return Boolean(
    contract.startDate?.trim() ||
      contract.endDate?.trim() ||
      contract.hasFixedTermContract === true ||
      contract.experienceEnabled === true ||
      (contract.benefitsList?.length ?? 0) > 0 ||
      contract.otherBenefits?.trim() ||
      (contract.fixedSalary ?? 0) > 0 ||
      (contract.commissionPercent ?? 0) > 0 ||
      (contract.commissionPerRide ?? 0) > 0 ||
      contract.intermittentPaymentMode ||
      contract.intermittentConvocationMode ||
      (contract.intermittentDailyRate ?? 0) > 0 ||
      (contract.intermittentRideAmount ?? 0) > 0 ||
      (contract.intermittentRidePercent ?? 0) > 0 ||
      contract.meiRemunerationModel ||
      (contract.meiPerRideAmount ?? 0) > 0 ||
      (contract.meiCommissionPercent ?? 0) > 0 ||
      (contract.meiRevenueSharePercent ?? 0) > 0 ||
      (contract.meiFixedBaseAmount ?? 0) > 0 ||
      (contract.meiVariablePercent ?? 0) > 0 ||
      (contract.meiVariableAmount ?? 0) > 0 ||
      contract.paymentMethod?.trim() ||
      contract.paymentFrequency?.trim() ||
      contract.meiCnpj?.trim() ||
      contract.meiLegalName?.trim() ||
      contract.fiscalNotes?.trim() ||
      contract.notes?.trim() ||
      contract.workProfileTemplateId?.trim() ||
      contract.workProfileTemplateName?.trim() ||
      contract.workProfileSummary?.trim() ||
      contract.overtimeUseGlobalPolicy === false ||
      contract.overtimeEnabled === true
  );
}

function mapWorkProfileContractTypeToDriverProfile(
  value?: WorkProfile["contractType"]
): DriverContractProfile {
  if (value === "CLT_INTERMITENTE") return "INTERMITENTE";
  if (value === "CLT") return "CLT";
  return "MEI";
}

function resolveEmploymentContractStatusLabel(status?: DriverEmploymentContract["status"]): string {
  if (status === "ACTIVE") return "Vigente";
  if (status === "EXPIRING_SOON") return "Expirando";
  if (status === "DRAFT") return "Contrato Gerado";
  if (status === "PENDING_SIGNATURE") return "Aguardando assinatura";
  if (status === "EXPIRED") return "Expirado";
  if (status === "TERMINATED") return "Cancelado";
  return "Sem contrato";
}

function resolveSignatureStatusLabel(contract?: DriverEmploymentContract): string {
  if (!contract) return "Nao assinado";
  if (contract.signedAt) return "Assinado";
  if (contract.status === "PENDING_SIGNATURE") return "Enviado para assinatura";
  return "Nao assinado";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeHtml(value: string): boolean {
  return /<([a-z][^>\s]*)(?:\s[^>]*)?>/i.test(value);
}

function buildContractViewerHtml(contract: DriverEmploymentContract): string {
  const content = contract.content?.trim() || "";
  const contentHtml = looksLikeHtml(content)
    ? content
    : `<pre>${escapeHtml(content || "Contrato sem conteudo.")}</pre>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(contract.title || "Contrato")}</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        margin: 0;
        color: #1f2937;
        background: #f3f4f6;
      }
      .page {
        max-width: 920px;
        margin: 0 auto;
        padding: 24px;
      }
      .meta {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .meta h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      .meta p {
        margin: 4px 0;
        font-size: 14px;
      }
      .doc {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 24px;
      }
      .doc pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "Segoe UI", Arial, sans-serif;
        line-height: 1.5;
      }
      @media print {
        body {
          background: #ffffff;
        }
        .page {
          max-width: none;
          padding: 0;
        }
        .meta, .doc {
          border: none;
          border-radius: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="meta">
        <h1>${escapeHtml(contract.title || "Contrato")}</h1>
        <p><strong>Status:</strong> ${escapeHtml(resolveEmploymentContractStatusLabel(contract.status))}</p>
        <p><strong>Gerado em:</strong> ${escapeHtml(new Date(contract.generatedAt).toLocaleString("pt-BR"))}</p>
        ${
          contract.signedAt
            ? `<p><strong>Assinado em:</strong> ${escapeHtml(new Date(contract.signedAt).toLocaleString("pt-BR"))}</p>`
            : ""
        }
      </section>
      <section class="doc">
        ${contentHtml}
      </section>
    </main>
  </body>
</html>`;
}

function buildContractWindowSummary(contract: DriverContract): string {
  const start = contract.startDate?.trim() || "--";
  const end = contract.hasFixedTermContract ? contract.endDate?.trim() || "--" : "Sem termino";
  const experience = contract.experienceEnabled
    ? `Experiencia ${contract.experienceStartDate?.trim() || "--"} a ${contract.experienceEndDate?.trim() || "--"}`
    : "Sem experiencia";
  return `${start} ate ${end} | ${experience}`;
}

function validateContractDraft(profile: DriverContractProfile, contract: DriverContract): ContractValidationResult {
  if (profile === "CLT") {
    const cltSalaryModel = resolveCltSalaryModel(contract);

    if (!contract.experienceEnabled || !contract.experienceStartDate?.trim() || !contract.experienceEndDate?.trim()) {
      return {
        field: "clt_experience_period",
        message: "Para CLT, o periodo de experiencia e obrigatorio. Defina inicio e fim da experiencia."
      };
    }
    if (!hasPositiveNumber(contract.fixedSalary)) {
      return { field: "clt_fixed_salary", message: "Informe o valor fixo mensal para CLT." };
    }

    if (cltSalaryModel === "FIXED_PLUS_COMMISSION") {
      if ((contract.commissionType ?? "PERCENT") === "PERCENT" && !hasPositiveNumber(contract.commissionPercent)) {
        return { field: "clt_commission_percent", message: "Informe o percentual de comissao do CLT." };
      }
      if ((contract.commissionType ?? "PERCENT") === "PER_RIDE" && !hasPositiveNumber(contract.commissionPerRide)) {
        return { field: "clt_commission_per_ride", message: "Informe o valor de comissao por corrida do CLT." };
      }
    }

    if ((contract.overtimeUseGlobalPolicy ?? false) === false && contract.overtimeEnabled !== false) {
      if (!contract.overtimePolicyMode) {
        return { field: "overtime_policy_mode", message: "Defina o destino da hora extra (pagamento ou banco)." };
      }
      if (!hasPositiveNumber(contract.overtimeAfterDailyHours)) {
        return { field: "overtime_after_daily", message: "Informe o gatilho diario de hora extra." };
      }
      if (!hasPositiveNumber(contract.overtimeMultiplier50)) {
        return { field: "overtime_multiplier_50", message: "Informe o multiplicador de HE 50%." };
      }
      if (!hasPositiveNumber(contract.overtimeMultiplier100)) {
        return { field: "overtime_multiplier_100", message: "Informe o multiplicador de HE 100%." };
      }
      if (!hasPositiveNumber(contract.overtimeRoundingMinutes)) {
        return { field: "overtime_rounding_minutes", message: "Informe o arredondamento de hora extra em minutos." };
      }
    }

    return null;
  }

  if (profile === "INTERMITENTE") {
    if (!contract.intermittentPaymentMode) {
      return {
        field: "intermittent_payment_mode",
        message: "Defina a forma de pagamento principal do Intermitente."
      };
    }
    if (!contract.intermittentConvocationMode) {
      return { field: "intermittent_convocation_mode", message: "Defina o modelo de convocacao do Intermitente." };
    }
    if (contract.intermittentConvocationMode === "ADVANCE_NOTICE" && contract.intermittentNoticeHours === undefined) {
      return {
        field: "intermittent_notice_hours",
        message: "Informe o aviso minimo (horas) para convocacao com antecedencia."
      };
    }
    if (
      (contract.intermittentPaymentMode === "DAILY" || contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
      !hasPositiveNumber(contract.intermittentDailyRate)
    ) {
      return { field: "intermittent_daily_rate", message: "Informe o valor da diaria do Intermitente." };
    }
    if (contract.intermittentPaymentMode === "PER_RIDE" || contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") {
      if (contract.intermittentRideCompensationType === "PERCENT" && !hasPositiveNumber(contract.intermittentRidePercent)) {
        return {
          field: "intermittent_ride_percent",
          message: "Informe o percentual por corrida do Intermitente."
        };
      }
      if (
        (contract.intermittentRideCompensationType ?? "AMOUNT") === "AMOUNT" &&
        !hasPositiveNumber(contract.intermittentRideAmount)
      ) {
        return { field: "intermittent_ride_amount", message: "Informe o valor por corrida do Intermitente." };
      }
    }
    return null;
  }

  if (profile === "MEI") {
    if (!contract.meiRemunerationModel) {
      return { field: "mei_remuneration_model", message: "Defina o modelo de remuneracao do MEI." };
    }
    if (!contract.paymentMethod) {
      return { field: "mei_payment_method", message: "Defina a forma de pagamento do MEI." };
    }
    if (!contract.paymentFrequency) {
      return { field: "mei_payment_frequency", message: "Defina a frequencia de pagamento do MEI." };
    }
    if (!contract.meiWorkMode) {
      return { field: "mei_work_mode", message: "Defina a forma de atuacao do MEI." };
    }
    if (normalizeCnpjDigits(contract.meiCnpj).length !== 14) {
      return { field: "mei_cnpj", message: "Informe um CNPJ valido do prestador MEI." };
    }
    if (!contract.meiLegalName?.trim()) {
      return { field: "mei_legal_name", message: "Informe a razao social do prestador MEI." };
    }
    if (!contract.meiOperationVehicleMode) {
      return { field: "mei_operation_vehicle_mode", message: "Defina a forma de operacao do MEI." };
    }
    if (!contract.meiFuelResponsibility) {
      return { field: "mei_fuel_responsibility", message: "Defina a responsabilidade do combustivel no MEI." };
    }
    if (!contract.meiMaintenanceResponsibility) {
      return { field: "mei_maintenance_responsibility", message: "Defina a responsabilidade da manutencao no MEI." };
    }
    if (contract.meiRemunerationModel === "COMMISSION_PERCENT") {
      if (!hasPositiveNumber(contract.meiCommissionPercent)) {
        return { field: "mei_commission_percent", message: "Informe o percentual de comissao do MEI." };
      }
      if (!contract.meiCommissionBase) {
        return { field: "mei_commission_base", message: "Defina a base da comissao do MEI." };
      }
    }
    if (contract.meiRemunerationModel === "PER_RIDE_FIXED" && !hasPositiveNumber(contract.meiPerRideAmount)) {
      return { field: "mei_per_ride_amount", message: "Informe o valor por corrida do MEI." };
    }
    if (contract.meiRemunerationModel === "RIDE_REVENUE_SHARE") {
      if (!hasPositiveNumber(contract.meiRevenueSharePercent)) {
        return { field: "mei_revenue_share_percent", message: "Informe o percentual de repasse do MEI." };
      }
      if (!contract.meiRevenueShareBase) {
        return { field: "mei_revenue_share_base", message: "Defina a base do repasse do MEI." };
      }
    }
    if (contract.meiRemunerationModel === "FIXED_PLUS_VARIABLE") {
      if (!hasPositiveNumber(contract.meiFixedBaseAmount)) {
        return { field: "mei_fixed_base_amount", message: "Informe o valor base do MEI." };
      }
      if ((contract.meiVariableType ?? "PERCENT") === "PERCENT" && !hasPositiveNumber(contract.meiVariablePercent)) {
        return { field: "mei_variable_percent", message: "Informe o percentual variavel do MEI." };
      }
      if ((contract.meiVariableType ?? "PERCENT") === "AMOUNT" && !hasPositiveNumber(contract.meiVariableAmount)) {
        return { field: "mei_variable_amount", message: "Informe o valor variavel do MEI." };
      }
    }
    return null;
  }

  return null;
}

export function DriverProfileEditorOperationSection({
  activeSection,
  driverType,
  contractProfile,
  journey,
  contract,
  onOpenContractsSection,
  isGeneratingContract = false,
  isRequestingSignature = false,
  isActivatingContract = false,
  isTerminatingContract = false,
  canGenerateContract = true,
  onGenerateContract,
  onRequestSignature,
  onActivateContract,
  onCancelContract,
  onContractProfileChange,
  onJourneyChange,
  onContractChange,
  effectiveCompensationLabel,
  customModel,
  customValue,
  customNotes,
  onCustomModelChange,
  onCustomValueChange,
  onCustomNotesChange
}: DriverProfileEditorOperationSectionProps) {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isContractModalReadOnly, setIsContractModalReadOnly] = useState(false);
  const [highlightExperience, setHighlightExperience] = useState(false);
  const [isManualCltExperienceDates, setIsManualCltExperienceDates] = useState(false);
  const [workProfiles, setWorkProfiles] = useState<WorkProfile[]>([]);
  const [draftJourney, setDraftJourney] = useState<DriverJourney>(normalizeJourneyDraft(journey));
  const [draftContract, setDraftContract] = useState<DriverContract>(
    normalizeIntermittentContractDraft(contract ?? emptyContract)
  );
  const [selectedContractPreview, setSelectedContractPreview] = useState<DriverEmploymentContract | null>(null);
  const [selectedContractPrintHtml, setSelectedContractPrintHtml] = useState("");
  const [isBuildingContractPreview, setIsBuildingContractPreview] = useState(false);

  const selectedProfile = contractProfile || deriveContractProfile(driverType, customModel);
  const profile = profileCopy(selectedProfile);
  const currentContract = contract ?? emptyContract;
  const currentJourney = normalizeJourneyDraft(journey);
  const draftProfile = (draftContract as DriverContract & { profile?: DriverContractProfile }).profile;
  const isCltDraft = draftProfile === "CLT";
  const cltExperiencePreset = resolveCltPresetFromDates(
    draftContract.experienceStartDate,
    draftContract.experienceEndDate
  );
  const cltExperienceDurationDays = getExperienceDurationDays(
    draftContract.experienceStartDate,
    draftContract.experienceEndDate
  );
  const cltExperienceLeadDays =
    getExperienceLeadDays(cltExperienceDurationDays) ??
    draftContract.experienceNotifyLeadDays ??
    getExperienceLeadDays(defaultCltExperiencePresetDays);
  const employmentContracts = currentContract.employmentContracts ?? [];
  const openEmploymentContract = employmentContracts.find(
    (item) =>
      item.status === "DRAFT" ||
      item.status === "PENDING_SIGNATURE" ||
      item.status === "ACTIVE" ||
      item.status === "EXPIRING_SOON"
  );
  const hasOpenContractCycle = employmentContracts.some(
    (item) =>
      item.status === "DRAFT" ||
      item.status === "PENDING_SIGNATURE" ||
      item.status === "ACTIVE" ||
      item.status === "EXPIRING_SOON"
  );
  const hasConfiguredLinkage = hasConfiguredEmploymentSettings(currentContract);
  const contractStatusLabel = resolveEmploymentContractStatusLabel(openEmploymentContract?.status);
  const signatureStatusLabel = resolveSignatureStatusLabel(openEmploymentContract);
  const linkageTitle = currentContract.workProfileTemplateName?.trim() || profile.title;
  const draftValidation = useMemo(
    () => validateTemplateDrivenContract(draftContract),
    [draftContract]
  );
  const selectedWorkProfile = useMemo(
    () => workProfiles.find((item) => item.id === draftContract.workProfileTemplateId),
    [workProfiles, draftContract.workProfileTemplateId]
  );
  const publishedContractTemplates = useMemo(
    () =>
      loadDocumentTemplates().filter(
        (item) => item.scope === "DRIVER_EMPLOYMENT" && item.status === "PUBLISHED"
      ),
    []
  );

  useEffect(() => {
    void request<WorkProfile[]>("/admin/work-profiles")
      .then((items) => {
        setWorkProfiles(items.filter((item) => item.isActive));
      })
      .catch(() => setWorkProfiles([]));
  }, []);
  const isFieldInvalid = (field: ContractValidationField) => draftValidation?.field === field;
  const fieldClassName = (field: ContractValidationField, extraClassName?: string) =>
    `${extraClassName ? `${extraClassName} ` : ""}${isFieldInvalid(field) ? "driver-editor-field-invalid" : ""}`.trim();
  const compensationPreviewLabel = useMemo(() => effectiveCompensationLabel, [effectiveCompensationLabel]);
  const intermittentAvailableDaysSummary = useMemo(
    () => formatWeekDayList((draftJourney.availableDays ?? []).filter((day): day is WeekDay => isWeekDay(day))),
    [draftJourney.availableDays]
  );
  const intermittentPreferredDaysSummary = useMemo(
    () =>
      formatWeekDayList(
        (draftContract.intermittentPreferredWeekDays ?? []).filter(
          (day): day is WeekDay => isWeekDay(day)
        )
      ),
    [draftContract.intermittentPreferredWeekDays]
  );
  const intermittentOperationalSummary = useMemo(() => {
    if (draftProfile !== "INTERMITENTE") return "";
    const start = draftJourney.availabilityStartTime || "--:--";
    const end = draftJourney.availabilityEndTime || "--:--";
    return `Disponivel em ${intermittentAvailableDaysSummary}, das ${start} as ${end}. Preferencia: ${intermittentPreferredDaysSummary}.`;
  }, [
    draftProfile,
    draftJourney.availabilityStartTime,
    draftJourney.availabilityEndTime,
    intermittentAvailableDaysSummary,
    intermittentPreferredDaysSummary
  ]);
  const meiOperationalSummary = useMemo(() => {
    if (draftProfile !== "MEI") return "";
    const workMode =
      draftContract.meiWorkMode === "SCHEDULED"
        ? "agenda definida"
        : draftContract.meiWorkMode === "MIXED"
          ? "atuacao mista"
          : "sob demanda";
    const vehicleMode =
      draftContract.meiOperationVehicleMode === "COMPANY_VEHICLE"
        ? "veiculo da empresa"
        : draftContract.meiOperationVehicleMode === "BOTH"
          ? "veiculo proprio ou da empresa"
          : "veiculo proprio";
    const fuel =
      draftContract.meiFuelResponsibility === "COMPANY"
        ? "combustivel pela empresa"
        : draftContract.meiFuelResponsibility === "SHARED"
          ? "combustivel dividido"
          : "combustivel pelo motorista";
    const maintenance =
      draftContract.meiMaintenanceResponsibility === "COMPANY"
        ? "manutencao pela empresa"
        : draftContract.meiMaintenanceResponsibility === "SHARED"
          ? "manutencao dividida"
          : "manutencao pelo motorista";
    return `Atuacao ${workMode}, operacao com ${vehicleMode}, ${fuel} e ${maintenance}.`;
  }, [
    draftProfile,
    draftContract.meiWorkMode,
    draftContract.meiOperationVehicleMode,
    draftContract.meiFuelResponsibility,
    draftContract.meiMaintenanceResponsibility
  ]);
  const fixedScheduleMode: FixedScheduleMode = draftJourney.fixedScheduleMode === "PER_DAY" ? "PER_DAY" : "UNIFORM";
  const fixedScheduleActiveDays = useMemo(
    () =>
      (draftJourney.availableDays ?? defaultWeekDays).filter(
        (day, index, list): day is WeekDay => isWeekDay(day) && list.indexOf(day) === index
      ),
    [draftJourney.availableDays]
  );
  const normalizedJourneyDaySchedules = useMemo(
    () =>
      normalizeJourneyDaySchedules(
        draftJourney,
        fixedScheduleActiveDays,
        draftJourney.startTime || "08:00",
        draftJourney.endTime || "17:00"
      ),
    [draftJourney, fixedScheduleActiveDays]
  );
  const normalizedVariableDaySchedules = useMemo(
    () =>
      normalizeJourneyDaySchedules(
        draftJourney,
        fixedScheduleActiveDays,
        draftJourney.availabilityStartTime || "06:00",
        draftJourney.availabilityEndTime || "18:00"
      ),
    [draftJourney, fixedScheduleActiveDays]
  );
  const uniformDailyMinutes = calculateDurationMinutes(draftJourney.startTime, draftJourney.endTime);
  const uniformWeeklyMinutes =
    uniformDailyMinutes !== undefined ? uniformDailyMinutes * fixedScheduleActiveDays.length : undefined;
  const perDayWeeklyMinutes = normalizedJourneyDaySchedules.reduce((total, daySchedule) => {
    if (!daySchedule.enabled) return total;
    const minutes = calculateDurationMinutes(daySchedule.startTime, daySchedule.endTime);
    return total + (minutes ?? 0);
  }, 0);
  const variableWeeklyMinutes = normalizedVariableDaySchedules.reduce((total, daySchedule) => {
    if (!daySchedule.enabled) return total;
    const minutes = calculateDurationMinutes(daySchedule.startTime, daySchedule.endTime);
    return total + (minutes ?? 0);
  }, 0);

  function updateFixedScheduleMode(mode: FixedScheduleMode) {
    setDraftJourney((current) => {
      const currentActiveDays =
        (current.availableDays ?? defaultWeekDays).filter(
          (day, index, list): day is WeekDay => isWeekDay(day) && list.indexOf(day) === index
        ) || defaultWeekDays;
      if (mode === "PER_DAY") {
        return {
          ...current,
          fixedScheduleMode: mode,
          daySchedules: normalizeJourneyDaySchedules(
            current,
            currentActiveDays,
            current.startTime || "08:00",
            current.endTime || "17:00"
          )
        };
      }
      return {
        ...current,
        fixedScheduleMode: mode,
        daySchedules: undefined
      };
    });
  }

  function toggleFixedDay(day: WeekDay) {
    setDraftJourney((current) => {
      const currentDays = (current.availableDays ?? defaultWeekDays).filter(
        (item, index, list): item is WeekDay => isWeekDay(item) && list.indexOf(item) === index
      );
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((item) => item !== day)
        : [...currentDays, day];

      const nextJourney: DriverJourney = {
        ...current,
        availableDays: nextDays
      };

      if (current.fixedScheduleMode === "PER_DAY") {
        const daySchedules = normalizeJourneyDaySchedules(
          nextJourney,
          nextDays,
          current.startTime || "08:00",
          current.endTime || "17:00"
        ).map((item) => (item.day === day ? { ...item, enabled: nextDays.includes(day) } : item));
        nextJourney.daySchedules = daySchedules;
      }

      return nextJourney;
    });
  }

  function updateFixedDaySchedule(day: WeekDay, patch: Partial<JourneyDaySchedule>) {
    setDraftJourney((current) => {
      const activeDays = (current.availableDays ?? defaultWeekDays).filter(
        (item, index, list): item is WeekDay => isWeekDay(item) && list.indexOf(item) === index
      );
      const currentSchedules = normalizeJourneyDaySchedules(
        current,
        activeDays,
        current.startTime || "08:00",
        current.endTime || "17:00"
      );
      const nextSchedules = currentSchedules.map((item) => {
        if (item.day !== day) return item;
        const nextItem: JourneyDaySchedule = {
          ...item,
          ...patch
        };
        return {
          ...nextItem,
          startTime: nextItem.enabled ? nextItem.startTime || item.startTime || "08:00" : undefined,
          endTime: nextItem.enabled ? nextItem.endTime || item.endTime || "17:00" : undefined
        };
      });
      const nextActiveDays = nextSchedules.filter((item) => item.enabled).map((item) => item.day);
      return {
        ...current,
        availableDays: nextActiveDays,
        daySchedules: nextSchedules
      };
    });
  }

  function updateVariableDaySchedule(day: WeekDay, patch: Partial<JourneyDaySchedule>) {
    setDraftJourney((current) => {
      const activeDays = (current.availableDays ?? defaultWeekDays).filter(
        (item, index, list): item is WeekDay => isWeekDay(item) && list.indexOf(item) === index
      );
      const currentSchedules = normalizeJourneyDaySchedules(
        current,
        activeDays,
        current.availabilityStartTime || "06:00",
        current.availabilityEndTime || "18:00"
      );
      const nextSchedules = currentSchedules.map((item) => {
        if (item.day !== day) return item;
        const nextItem: JourneyDaySchedule = {
          ...item,
          ...patch
        };
        return {
          ...nextItem,
          startTime: nextItem.enabled ? nextItem.startTime || item.startTime || "06:00" : undefined,
          endTime: nextItem.enabled ? nextItem.endTime || item.endTime || "18:00" : undefined
        };
      });
      const nextActiveDays = nextSchedules.filter((item) => item.enabled).map((item) => item.day);
      const availabilityWindow = deriveAvailabilityWindow(nextSchedules);

      return {
        ...current,
        fixedSchedule: false,
        availableDays: nextActiveDays,
        daySchedules: nextSchedules,
        availabilityStartTime: availabilityWindow.startTime || current.availabilityStartTime || "06:00",
        availabilityEndTime: availabilityWindow.endTime || current.availabilityEndTime || "18:00"
      };
    });
  }

function buildCltExperienceContract(
  current: DriverContract,
  durationDays: CltExperiencePresetDays,
  startDateOverride?: string
): DriverContract {
  const cltCompensationNormalized: DriverContract = normalizeCltCompensation(current);
  const startDate =
    startDateOverride?.trim() ||
    cltCompensationNormalized.startDate?.trim() ||
    cltCompensationNormalized.experienceStartDate?.trim() ||
    getTodayIsoDate();
  const endDate = addDaysIsoDate(startDate, durationDays);
  return {
    ...cltCompensationNormalized,
    experienceEnabled: true,
    experienceStartDate: startDate,
    experienceEndDate: endDate,
    notifyExperienceEnd: true,
    experienceNotifyLeadDays: getExperienceLeadDays(durationDays),
    experienceNotifyRepeatDays: 7
  };
}

  function applyCltExperiencePreset(days: CltExperiencePresetDays, startDateOverride?: string) {
    setDraftContract((current) => buildCltExperienceContract(current, days, startDateOverride));
    setIsManualCltExperienceDates(false);
  }

  function openContractModal(focusExperience = false) {
    const readOnly = hasOpenContractCycle;
    const initialProfile = hasConfiguredEmploymentSettings(currentContract) ? selectedProfile : undefined;
    const baseDraftContract = normalizeIntermittentContractDraft({
      ...(currentContract ?? emptyContract),
      profile: initialProfile
    } as DriverContract);
    const nextDraftContract =
      initialProfile === "CLT"
        ? buildCltExperienceContract(
            baseDraftContract,
            resolveCltPresetFromDates(baseDraftContract.experienceStartDate, baseDraftContract.experienceEndDate) ??
              defaultCltExperiencePresetDays
          )
        : baseDraftContract;
    setDraftContract(nextDraftContract);
    const baseJourney = normalizeJourneyDraft(currentJourney);
    setDraftJourney(initialProfile === "INTERMITENTE" ? normalizeIntermittentJourneyDraft(baseJourney) : baseJourney);
    setIsManualCltExperienceDates(
      initialProfile === "CLT" &&
        resolveCltPresetFromDates(nextDraftContract.experienceStartDate, nextDraftContract.experienceEndDate) ===
          undefined
    );
    setHighlightExperience(readOnly ? false : focusExperience);
    setIsContractModalReadOnly(readOnly);
    setIsContractModalOpen(true);
  }

  function toggleBenefit(benefit: string, checked: boolean) {
    setDraftContract((current) => {
      const list = current.benefitsList ?? [];
      const next = checked ? [...new Set([...list, benefit])] : list.filter((item) => item !== benefit);
      return { ...current, benefitsList: next };
    });
  }

  function saveContractModal() {
    if (isContractModalReadOnly) {
      setIsContractModalOpen(false);
      return;
    }
    const validationError = validateTemplateDrivenContract(draftContract);
    if (validationError) return;

    const normalizedContract: DriverContract = {
      ...draftContract,
      employmentTemplateKey:
        selectedWorkProfile?.remuneration.contractTemplateKey?.trim() ||
        draftContract.employmentTemplateKey?.trim() ||
        undefined,
      employmentTemplateName:
        selectedWorkProfile?.remuneration.contractTemplateName?.trim() ||
        draftContract.employmentTemplateName?.trim() ||
        undefined,
      employmentTemplateVersion:
        selectedWorkProfile?.remuneration.contractTemplateVersion?.trim() ||
        draftContract.employmentTemplateVersion?.trim() ||
        undefined,
      startDate: draftContract.startDate?.trim() || undefined,
      endDate:
        draftContract.hasFixedTermContract && draftContract.endDate?.trim()
          ? draftContract.endDate.trim()
          : undefined,
      notifyContractEnd: draftContract.hasFixedTermContract
        ? Boolean(draftContract.notifyContractEnd)
        : undefined,
      contractEndNotifyLeadDays:
        draftContract.hasFixedTermContract && draftContract.notifyContractEnd
          ? draftContract.contractEndNotifyLeadDays
          : undefined,
      experienceEnabled: Boolean(draftContract.experienceEnabled),
      experienceStartDate: draftContract.experienceEnabled
        ? draftContract.experienceStartDate?.trim() || undefined
        : undefined,
      experienceEndDate: draftContract.experienceEnabled
        ? draftContract.experienceEndDate?.trim() || undefined
        : undefined,
      autoRenewAfterExperience: draftContract.experienceEnabled
        ? Boolean(draftContract.autoRenewAfterExperience)
        : undefined,
      notifyExperienceEnd: draftContract.experienceEnabled
        ? Boolean(draftContract.notifyExperienceEnd)
        : undefined,
      experienceNotifyLeadDays:
        draftContract.experienceEnabled && draftContract.notifyExperienceEnd
          ? draftContract.experienceNotifyLeadDays
          : undefined,
      experienceNotifyRepeatDays:
        draftContract.experienceEnabled && draftContract.notifyExperienceEnd
          ? draftContract.experienceNotifyRepeatDays
          : undefined
    };

    const mappedProfile = mapWorkProfileContractTypeToDriverProfile(
      normalizedContract.workProfileContractType
    );
    onContractProfileChange(mappedProfile);
    onJourneyChange(draftJourney);
    onContractChange(normalizedContract);
    setIsContractModalOpen(false);
    setHighlightExperience(false);
  }

  function handleGenerateContractClick() {
    if (!onGenerateContract || isGeneratingContract || !canGenerateContract) return;
    const templateKey =
      currentContract.employmentTemplateKey?.trim() ||
      draftContract.employmentTemplateKey?.trim() ||
      selectedWorkProfile?.remuneration.contractTemplateKey?.trim() ||
      undefined;
    const templateName =
      currentContract.employmentTemplateName?.trim() ||
      draftContract.employmentTemplateName?.trim() ||
      selectedWorkProfile?.remuneration.contractTemplateName?.trim() ||
      undefined;
    const templateVersion =
      currentContract.employmentTemplateVersion?.trim() ||
      draftContract.employmentTemplateVersion?.trim() ||
      selectedWorkProfile?.remuneration.contractTemplateVersion?.trim() ||
      undefined;

    const profileTemplateContent =
      templateKey &&
      selectedWorkProfile?.remuneration.contractTemplateKey?.trim() === templateKey
        ? selectedWorkProfile?.remuneration.contractTemplateContent
        : undefined;
    const resolvedTemplateContentFromCatalog = templateKey
      ? publishedContractTemplates.find(
          (item) =>
            item.key === templateKey &&
            (!templateVersion || item.version === templateVersion)
        )?.content ||
        publishedContractTemplates.find((item) => item.key === templateKey)?.content
      : undefined;
    const templateContent =
      typeof profileTemplateContent === "string" && profileTemplateContent.trim().length > 0
        ? profileTemplateContent
        : resolvedTemplateContentFromCatalog;

    void onGenerateContract(
      templateKey
        ? {
            templateKey,
            templateName,
            templateVersion,
            templateContent
          }
        : undefined
    );
  }

  function handleRequestSignatureClick(contractId?: string) {
    if (!contractId || !onRequestSignature || isRequestingSignature) return;
    void onRequestSignature(contractId);
  }

  function handleCancelContractClick(target?: DriverEmploymentContract) {
    if (!target?.id || !onCancelContract || isTerminatingContract) return;
    const mode =
      target.status === "DRAFT" || target.status === "PENDING_SIGNATURE"
        ? "CANCEL"
        : "FINALIZE";
    void onCancelContract(target.id, mode);
  }

  function handleActivateContractClick(contractId?: string) {
    if (!contractId || !onActivateContract || isActivatingContract) return;
    void onActivateContract(contractId);
  }

  function handleViewContractClick(target?: DriverEmploymentContract) {
    if (!target) return;
    setSelectedContractPreview(target);
    setSelectedContractPrintHtml("");
    setIsBuildingContractPreview(true);
    window.setTimeout(() => {
      setSelectedContractPrintHtml(buildContractViewerHtml(target));
      setIsBuildingContractPreview(false);
    }, 0);
  }

  function handlePrintContractClick(target?: DriverEmploymentContract) {
    if (!target || typeof window === "undefined") return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        iframe.remove();
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => iframe.remove(), 1200);
    };

    iframe.srcdoc = buildContractViewerHtml(target);
    document.body.appendChild(iframe);
  }

  return (
    <article id="driver-editor-operation" className={`panel panel-wide driver-editor-panel driver-editor-section ${activeSection === "contract" ? "is-expanded" : "is-collapsed"}`}>
      <div className="driver-editor-section-top">
        <span className="driver-editor-section-index">05</span>
        <div className="panel-head">
          <h2>Operacao e remuneracao</h2>
          <span>Escolha o tipo de vinculo e configure vigencia, experiencia, pagamento e regras operacionais.</span>
        </div>
      </div>

      <div className="driver-editor-summary-strip driver-editor-contract-grid">
        {!hasOpenContractCycle && !hasConfiguredLinkage ? (
          <article className="driver-editor-summary-card">
            <span>Vinculo</span>
            <strong>Nenhum vinculo ativo</strong>
            <small>Este motorista ainda nao possui vinculo ativo.</small>
            <small>Crie um contrato para iniciar sua operacao.</small>
            <button type="button" className="secondary" onClick={() => openContractModal(false)}>
              Criar vinculo
            </button>
          </article>
        ) : !hasOpenContractCycle && hasConfiguredLinkage ? (
          <article className="driver-editor-summary-card">
            <span>Vinculo configurado</span>
            <strong>{linkageTitle}</strong>
            <small>Tipo de perfil: {profile.title}</small>
            <small>Vigencia e experiencia: {buildContractWindowSummary(currentContract)}</small>
            <small>Status do contrato: Configurado (ainda nao gerado)</small>
            <small>Status da assinatura: Nao iniciado</small>
            {!canGenerateContract ? <small>Salve o cadastro do motorista para habilitar a geracao do contrato.</small> : null}
            <div className="overtime-editor-footer">
              <button type="button" onClick={() => openContractModal(false)}>
                Editar vinculo
              </button>
              <button
                type="button"
                className="secondary-link"
                onClick={handleGenerateContractClick}
                disabled={isGeneratingContract || !canGenerateContract}
              >
                {isGeneratingContract ? "Gerando..." : "Gerar contrato"}
              </button>
            </div>
          </article>
        ) : (
          <article className="driver-editor-summary-card">
            <span>Vinculo ativo</span>
            <strong>{linkageTitle}</strong>
            <small>Tipo de perfil: {profile.title}</small>
            <small>Remuneracao: {getSalarySummary(selectedProfile, currentContract)}</small>
            <small>Vigencia e experiencia: {buildContractWindowSummary(currentContract)}</small>
            <small>Status do contrato: {contractStatusLabel}</small>
            <small>Status da assinatura: {signatureStatusLabel}</small>
            <small>{compensationPreviewLabel}</small>
            <div className="overtime-editor-footer">
              {openEmploymentContract?.status === "DRAFT" ||
              openEmploymentContract?.status === "PENDING_SIGNATURE" ? (
                <>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handleRequestSignatureClick(openEmploymentContract?.id)}
                    disabled={isRequestingSignature}
                  >
                    {isRequestingSignature ? "Enviando..." : "Enviar para assinatura"}
                  </button>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handleCancelContractClick(openEmploymentContract)}
                    disabled={isTerminatingContract}
                  >
                    Cancelar assinatura
                  </button>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handleViewContractClick(openEmploymentContract)}
                  >
                    Visualizar
                  </button>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handlePrintContractClick(openEmploymentContract)}
                  >
                    Imprimir
                  </button>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handleActivateContractClick(openEmploymentContract?.id)}
                    disabled={isActivatingContract}
                  >
                    {isActivatingContract ? "Finalizando..." : "Finalizar manualmente"}
                  </button>
                </>
              ) : openEmploymentContract?.signedAt ||
                openEmploymentContract?.status === "ACTIVE" ||
                openEmploymentContract?.status === "EXPIRING_SOON" ? (
                <>
                  <button type="button" onClick={() => handleViewContractClick(openEmploymentContract)}>
                    Ver contrato assinado
                  </button>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => handleCancelContractClick(openEmploymentContract)}
                    disabled={isTerminatingContract}
                  >
                    Cancelar contrato
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="secondary-link"
                  onClick={() => onOpenContractsSection?.()}
                >
                  Gerenciar no step 6
                </button>
              )}
            </div>
          </article>
        )}
      </div>

      <DriverProfileEditorModal
        open={isContractModalOpen}
        title={hasOpenContractCycle ? "Vinculo ativo" : hasConfiguredLinkage ? "Editar vinculo" : "Criar vinculo"}
        description="Defina vigencia, experiencia e selecione o perfil de trabalho que servira como base do contrato."
        onClose={() => {
          setIsContractModalOpen(false);
        }}
        footer={
          isContractModalReadOnly ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setIsContractModalOpen(false);
              }}
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsContractModalOpen(false);
                }}
              >
                Cancelar
              </button>
              <button type="button" onClick={saveContractModal} disabled={Boolean(draftValidation)}>
                Salvar configuracao
              </button>
            </>
          )
        }
      >
        <div className="form-grid driver-editor-contract-modal-stack">
          {draftValidation && !isContractModalReadOnly ? (
            <div className="driver-editor-modal-field-full driver-editor-contract-validation-alert" role="alert" aria-live="polite">
              <strong>Revisar configuracao</strong>
              <span>{draftValidation.message}</span>
            </div>
          ) : null}
          {isContractModalReadOnly ? (
            <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
              <strong>Modo leitura</strong>
              <span>Existe contrato em andamento. Para alterar regras, finalize o ciclo atual no step 6.</span>
            </div>
          ) : null}
          <fieldset
            className="driver-editor-contract-modal-fieldset driver-editor-modal-field-full"
            disabled={isContractModalReadOnly}
          >
          <section className="driver-editor-contract-card driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head">
              <strong>Perfil de trabalho</strong>
              <small>Selecione o template de perfil para servir de base ao vinculo.</small>
            </div>
            <div className="form-grid">
              <label>
                Template de perfil (RH)
                <select
                  className="select"
                  value={draftContract.workProfileTemplateId ?? ""}
                  onChange={(event) => {
                    const selected = workProfiles.find((item) => item.id === event.target.value);
                    if (!selected) {
                      setDraftContract((current) => ({
                        ...current,
                        workProfileTemplateId: undefined,
                        workProfileTemplateName: undefined,
                        workProfileSummary: undefined,
                        workProfileContractType: undefined,
                        employmentTemplateKey: undefined,
                        employmentTemplateName: undefined,
                        employmentTemplateVersion: undefined
                      }));
                      return;
                    }

                    const mappedProfile = mapWorkProfileContractTypeToDriverProfile(
                      selected.contractType
                    );
                    onContractProfileChange(mappedProfile);
                    setDraftContract((current) => {
                      const profileTemplateKey = selected.remuneration.contractTemplateKey?.trim();
                      const profileTemplateName = selected.remuneration.contractTemplateName?.trim();
                      const profileTemplateVersion = selected.remuneration.contractTemplateVersion?.trim();
                      const nextDraft = ({
                        ...current,
                        profile: mappedProfile,
                        workProfileTemplateId: selected.id,
                        workProfileTemplateName: selected.name,
                        workProfileSummary: selected.summary,
                        workProfileContractType: selected.contractType,
                        employmentTemplateKey: profileTemplateKey || undefined,
                        employmentTemplateName: profileTemplateName || undefined,
                        employmentTemplateVersion: profileTemplateVersion || undefined
                      }) as DriverContract;

                      if (mappedProfile === "CLT") {
                        return buildCltExperienceContract(
                          nextDraft,
                          resolveCltPresetFromDates(nextDraft.experienceStartDate, nextDraft.experienceEndDate) ??
                            defaultCltExperiencePresetDays,
                          nextDraft.startDate?.trim() || undefined
                        );
                      }

                      return nextDraft;
                    });

                    if (mappedProfile === "INTERMITENTE") {
                      setDraftJourney((current) => normalizeIntermittentJourneyDraft(current));
                    }
                    if (mappedProfile === "CLT") {
                      setIsManualCltExperienceDates(false);
                    }
                  }}
                >
                  <option value="">
                    {workProfiles.length === 0
                      ? "Nenhum perfil ativo encontrado"
                      : "Selecione um perfil"}
                  </option>
                  {workProfiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.contractType})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedWorkProfile ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Resumo do perfil selecionado</strong>
                <span>{selectedWorkProfile.summary}</span>
              </div>
            ) : draftContract.workProfileSummary?.trim() ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Resumo do perfil selecionado</strong>
                <span>{draftContract.workProfileSummary.trim()}</span>
              </div>
            ) : (
              <div className="driver-editor-contract-inline-note">
                <strong>Nenhum perfil de trabalho selecionado</strong>
                <span>Selecione um perfil para carregar uma base coerente de jornada, remuneracao e politicas.</span>
              </div>
            )}
          </section>

          <section className="driver-editor-contract-card driver-editor-contract-card-term driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head">
              <strong>Vigencia</strong>
              <small>Defina o periodo de vigencia do vinculo.</small>
            </div>
            <div className="form-grid">
              <label className={fieldClassName("contract_start_date")}>
                Data de inicio
                <input
                  type="date"
                  value={draftContract.startDate ?? ""}
                  onChange={(event) =>
                    setDraftContract((current) => {
                      const nextStartDate = event.target.value;
                      if (isCltDraft) {
                        return {
                          ...buildCltExperienceContract(
                            { ...current, startDate: nextStartDate },
                            resolveCltPresetFromDates(current.experienceStartDate, current.experienceEndDate) ??
                              defaultCltExperiencePresetDays,
                            nextStartDate
                          ),
                          startDate: nextStartDate
                        };
                      }
                      return {
                        ...current,
                        startDate: nextStartDate,
                        experienceStartDate:
                          current.experienceEnabled && !current.experienceStartDate
                            ? nextStartDate
                            : current.experienceStartDate
                      };
                    })
                  }
                />
              </label>
              <label>
                Contrato com prazo definido?
                <select
                  className="select"
                  value={draftContract.hasFixedTermContract ? "YES" : "NO"}
                  onChange={(event) =>
                    setDraftContract((current) => ({
                      ...current,
                      hasFixedTermContract: event.target.value === "YES"
                    }))
                  }
                >
                  <option value="YES">Sim</option>
                  <option value="NO">Nao</option>
                </select>
              </label>
              {draftContract.hasFixedTermContract ? (
                <label className={fieldClassName("contract_end_date")}>
                  Data de termino
                  <input
                    type="date"
                    value={draftContract.endDate ?? ""}
                    onChange={(event) =>
                      setDraftContract((current) => ({ ...current, endDate: event.target.value }))
                    }
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="driver-editor-contract-card driver-editor-contract-card-experience driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head">
              <strong>Periodo de experiencia</strong>
              <small>
                {isCltDraft
                  ? "Selecione 30, 60 ou 90 dias. As datas seguem automaticamente a vigencia."
                  : "Opcional, conforme regra contratual da empresa."}
              </small>
            </div>
            <div className="form-grid">
              {isCltDraft ? (
                <>
                  <label className={fieldClassName("clt_experience_period")}>
                    Periodo da experiencia
                    <select
                      className="select"
                      value={String(cltExperiencePreset ?? defaultCltExperiencePresetDays)}
                      onChange={(event) =>
                        applyCltExperiencePreset(
                          Number(event.target.value) as CltExperiencePresetDays,
                          draftContract.startDate?.trim() || undefined
                        )
                      }
                    >
                      {cltExperiencePresetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} dias
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldClassName("experience_start_date")}>
                    Inicio da experiencia
                    <input
                      type="date"
                      value={draftContract.experienceStartDate ?? draftContract.startDate ?? ""}
                      readOnly
                    />
                  </label>
                  <label className={fieldClassName("experience_end_date")}>
                    Fim da experiencia
                    <input
                      type="date"
                      value={draftContract.experienceEndDate ?? ""}
                      readOnly
                    />
                  </label>
                  <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                    <strong>{`Inicio ${formatDatePtBr(draftContract.experienceStartDate)} | Fim ${formatDatePtBr(draftContract.experienceEndDate)}`}</strong>
                    <span>A data de inicio da experiencia acompanha a data de inicio da vigencia do contrato.</span>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    Possui periodo de experiencia?
                    <select
                      className="select"
                      value={draftContract.experienceEnabled ? "YES" : "NO"}
                      onChange={(event) =>
                        setDraftContract((current) => ({
                          ...current,
                          experienceEnabled: event.target.value === "YES"
                        }))
                      }
                    >
                      <option value="NO">Nao</option>
                      <option value="YES">Sim</option>
                    </select>
                  </label>

                  {draftContract.experienceEnabled ? (
                    <>
                      <label className={fieldClassName("experience_start_date")}>
                        Inicio da experiencia
                        <input
                          type="date"
                          value={draftContract.experienceStartDate ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              experienceStartDate: event.target.value
                            }))
                          }
                        />
                      </label>
                      <label className={fieldClassName("experience_end_date")}>
                        Fim da experiencia
                        <input
                          type="date"
                          value={draftContract.experienceEndDate ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              experienceEndDate: event.target.value
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {false ? (
            <>
          <section className="driver-editor-contract-card driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head">
              <strong>Tipo de vinculo</strong>
              <small>Selecione primeiro o perfil para liberar as configuracoes especificas.</small>
            </div>
            <div className="driver-editor-profile-picker" role="radiogroup" aria-label="Tipo de vinculo">
              {(["CLT", "INTERMITENTE", "MEI"] as const).map((option) => {
                const optionCopy = profileCopy(option);
                const isActive = draftProfile === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`driver-editor-profile-option ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      setDraftContract((current) => {
                        if (option === "CLT") {
                          return {
                            ...buildCltExperienceContract(
                              { ...current, profile: option } as DriverContract,
                              resolveCltPresetFromDates(current.experienceStartDate, current.experienceEndDate) ??
                                defaultCltExperiencePresetDays
                            ),
                            profile: option
                          } as DriverContract;
                        }
                        return ({ ...current, profile: option }) as DriverContract;
                      });
                      if (option === "INTERMITENTE") {
                        setDraftJourney((current) => normalizeIntermittentJourneyDraft(current));
                      }
                      if (option === "CLT") {
                        setIsManualCltExperienceDates(false);
                      }
                    }}
                  >
                    <div className="driver-editor-profile-option-copy">
                      <strong>{optionCopy.title}</strong>
                      <small>{optionCopy.description}</small>
                    </div>
                  </button>
                );
              })}
            </div>
            {!draftProfile ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Selecione um tipo de vinculo</strong>
                <span>Depois da selecao, os blocos de vigencia, remuneracao e jornada serao exibidos.</span>
              </div>
            ) : null}
          </section>
          {draftProfile ? (
            <>
          {draftProfile === "MEI" ? (
            <section className="driver-editor-contract-card driver-editor-modal-field-full">
              <div className="driver-editor-contract-card-head">
                <strong>Dados fiscais do prestador</strong>
                <small>Identificacao juridica para contrato e faturamento do MEI.</small>
              </div>
              <div className="form-grid">
                <label className={fieldClassName("mei_cnpj")}>CNPJ do MEI
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                    value={formatCnpjInput(draftContract.meiCnpj)}
                    onChange={(event) =>
                      setDraftContract((current) => ({
                        ...current,
                        meiCnpj: formatCnpjInput(event.target.value)
                      }))
                    }
                  />
                </label>
                <label className={fieldClassName("mei_legal_name")}>Razao social
                  <input
                    type="text"
                    placeholder="Nome empresarial do MEI"
                    value={draftContract.meiLegalName ?? ""}
                    onChange={(event) =>
                      setDraftContract((current) => ({
                        ...current,
                        meiLegalName: event.target.value
                      }))
                    }
                  />
                </label>
                <label>Nome fantasia (opcional)
                  <input
                    type="text"
                    placeholder="Nome comercial"
                    value={draftContract.meiTradeName ?? ""}
                    onChange={(event) =>
                      setDraftContract((current) => ({
                        ...current,
                        meiTradeName: event.target.value
                      }))
                    }
                  />
                </label>
                <label>Inscricao municipal (opcional)
                  <input
                    type="text"
                    placeholder="Numero da inscricao"
                    value={draftContract.meiMunicipalRegistration ?? ""}
                    onChange={(event) =>
                      setDraftContract((current) => ({
                        ...current,
                        meiMunicipalRegistration: event.target.value
                      }))
                    }
                  />
                </label>
              </div>
            </section>
          ) : null}
          <section className="driver-editor-contract-card driver-editor-contract-card-term driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head"><strong>Vigencia</strong><small>Controle prazo do contrato e alertas de vencimento.</small></div>
            <div className="form-grid">
              <label>Contrato com prazo definido?
                <select className="select" value={draftContract.hasFixedTermContract ? "YES" : "NO"} onChange={(event) => setDraftContract((current) => ({ ...current, hasFixedTermContract: event.target.value === "YES" }))}>
                  <option value="YES">Sim</option><option value="NO">Nao</option>
                </select>
              </label>
              <label>Data de inicio
                <input
                  type="date"
                  value={draftContract.startDate ?? ""}
                  onChange={(event) =>
                    setDraftContract((current) => {
                      const nextStartDate = event.target.value;
                      if (isCltDraft && !isManualCltExperienceDates) {
                        return {
                          ...buildCltExperienceContract(
                            { ...current, startDate: nextStartDate },
                            resolveCltPresetFromDates(current.experienceStartDate, current.experienceEndDate) ??
                              defaultCltExperiencePresetDays,
                            nextStartDate
                          ),
                          startDate: nextStartDate
                        };
                      }

                      return {
                        ...current,
                        startDate: nextStartDate,
                        experienceStartDate:
                          current.experienceEnabled && !current.experienceStartDate
                            ? nextStartDate
                            : current.experienceStartDate
                      };
                    })
                  }
                />
              </label>
              {draftContract.hasFixedTermContract ? (
                <>
                  <label>Data de termino
                    <input type="date" value={draftContract.endDate ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, endDate: event.target.value }))} />
                  </label>
                  <label>Ativar alerta de vencimento?
                    <select className="select" value={draftContract.notifyContractEnd ? "YES" : "NO"} onChange={(event) => setDraftContract((current) => ({ ...current, notifyContractEnd: event.target.value === "YES" }))}>
                      <option value="YES">Sim</option><option value="NO">Nao</option>
                    </select>
                  </label>
                  {draftContract.notifyContractEnd ? (
                    <label>Avisar com antecedencia (dias)
                      <input type="number" min="0" step="1" value={draftContract.contractEndNotifyLeadDays ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, contractEndNotifyLeadDays: parseIntMin(event.target.value, 0) }))} />
                    </label>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <section className={`driver-editor-contract-card driver-editor-contract-card-experience driver-editor-modal-field-full ${highlightExperience ? "is-highlighted" : ""}`}>
            <div className="driver-editor-contract-card-head"><strong>Periodo de experiencia</strong><small>Bloco principal para CLT e opcional nos demais.</small></div>
            <div className="form-grid">
              {isCltDraft ? (
                <>
                  <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                    <strong>Obrigatorio para CLT</strong>
                    <span>Selecione 30, 60 ou 90 dias. O alerta sera automatico em 1/3 do periodo e depois semanal.</span>
                  </div>
                  <label className={fieldClassName("clt_experience_period")}>Duracao da experiencia
                    <select
                      className="select"
                      value={String(cltExperiencePreset ?? defaultCltExperiencePresetDays)}
                      onChange={(event) => applyCltExperiencePreset(Number(event.target.value) as CltExperiencePresetDays)}
                    >
                      {cltExperiencePresetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option} dias
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                    <strong>{`Inicio ${formatDatePtBr(draftContract.experienceStartDate)} | Fim ${formatDatePtBr(draftContract.experienceEndDate)}`}</strong>
                    <span>{`Alerta automatico: ${cltExperienceLeadDays ?? 0} dia(s) antes do fim, repetindo a cada 7 dias.`}</span>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setIsManualCltExperienceDates((current) => !current)}
                    >
                      {isManualCltExperienceDates ? "Fechar edicao manual" : "Alterar datas manualmente"}
                    </button>
                  </div>

                  {isManualCltExperienceDates ? (
                    <>
                      <label className={fieldClassName("clt_experience_period")}>Inicio da experiencia
                        <input
                          type="date"
                          value={draftContract.experienceStartDate ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => {
                              const nextStartDate = event.target.value;
                              const durationDays = getExperienceDurationDays(nextStartDate, current.experienceEndDate);
                              return {
                                ...current,
                                experienceEnabled: true,
                                experienceStartDate: nextStartDate,
                                notifyExperienceEnd: true,
                                experienceNotifyLeadDays:
                                  getExperienceLeadDays(durationDays) ??
                                  current.experienceNotifyLeadDays ??
                                  getExperienceLeadDays(defaultCltExperiencePresetDays),
                                experienceNotifyRepeatDays: 7
                              };
                            })
                          }
                        />
                      </label>
                      <label className={fieldClassName("clt_experience_period")}>Fim da experiencia
                        <input
                          type="date"
                          value={draftContract.experienceEndDate ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => {
                              const nextEndDate = event.target.value;
                              const durationDays = getExperienceDurationDays(current.experienceStartDate, nextEndDate);
                              return {
                                ...current,
                                experienceEnabled: true,
                                experienceEndDate: nextEndDate,
                                notifyExperienceEnd: true,
                                experienceNotifyLeadDays:
                                  getExperienceLeadDays(durationDays) ??
                                  current.experienceNotifyLeadDays ??
                                  getExperienceLeadDays(defaultCltExperiencePresetDays),
                                experienceNotifyRepeatDays: 7
                              };
                            })
                          }
                        />
                      </label>
                      <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                        <strong>Voltar para configuracao rapida</strong>
                        <span>Use os botoes 30/60/90 dias para recalcular automaticamente as datas.</span>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            applyCltExperiencePreset(
                              cltExperiencePreset ?? defaultCltExperiencePresetDays,
                              draftContract.experienceStartDate ?? draftContract.startDate ?? getTodayIsoDate()
                            )
                          }
                        >
                          Usar 30/60/90 dias
                        </button>
                      </div>
                    </>
                  ) : null}

                  <label className="driver-editor-modal-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(draftContract.autoRenewAfterExperience)}
                      onChange={(event) =>
                        setDraftContract((current) => ({ ...current, autoRenewAfterExperience: event.target.checked }))
                      }
                    />
                    <span>Renovar automaticamente apos a experiencia</span>
                  </label>
                </>
              ) : (
                <>
                  <label>Periodo de experiencia ativo?
                    <select
                      className="select"
                      value={draftContract.experienceEnabled ? "YES" : "NO"}
                      onChange={(event) =>
                        setDraftContract((current) => {
                          const enabled = event.target.value === "YES";
                          return {
                            ...current,
                            experienceEnabled: enabled,
                            experienceStartDate:
                              enabled && !current.experienceStartDate ? current.startDate ?? "" : current.experienceStartDate
                          };
                        })
                      }
                    >
                      <option value="YES">Sim</option><option value="NO">Nao</option>
                    </select>
                  </label>
                  {draftContract.experienceEnabled ? (
                    <>
                      <label>Inicio da experiencia
                        <input type="date" value={draftContract.experienceStartDate ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, experienceStartDate: event.target.value }))} />
                      </label>
                      <label>Fim da experiencia
                        <input type="date" value={draftContract.experienceEndDate ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, experienceEndDate: event.target.value }))} />
                      </label>
                      <label className="driver-editor-modal-checkbox"><input type="checkbox" checked={Boolean(draftContract.autoRenewAfterExperience)} onChange={(event) => setDraftContract((current) => ({ ...current, autoRenewAfterExperience: event.target.checked }))} /><span>Renovar automaticamente apos a experiencia</span></label>
                      <label>Notificar finalizacao do periodo?
                        <select className="select" value={draftContract.notifyExperienceEnd ? "YES" : "NO"} onChange={(event) => setDraftContract((current) => ({ ...current, notifyExperienceEnd: event.target.value === "YES" }))}>
                          <option value="YES">Sim</option><option value="NO">Nao</option>
                        </select>
                      </label>
                      {draftContract.notifyExperienceEnd ? (
                        <>
                          <label>Avisar com antecedencia (dias)
                            <input type="number" min="0" step="1" value={draftContract.experienceNotifyLeadDays ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, experienceNotifyLeadDays: parseIntMin(event.target.value, 0) }))} />
                          </label>
                          <label>Repetir alerta a cada (dias)
                            <input type="number" min="1" step="1" value={draftContract.experienceNotifyRepeatDays ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, experienceNotifyRepeatDays: parseIntMin(event.target.value, 1) }))} />
                          </label>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </section>

          {draftProfile !== "MEI" ? (
            <section className="driver-editor-contract-card driver-editor-contract-card-benefits driver-editor-modal-field-full">
              <div className="driver-editor-contract-card-head">
                <strong>{draftProfile === "CLT" ? "Beneficios do colaborador" : "Beneficios"}</strong>
                <small>{draftProfile === "CLT" ? "Beneficios vinculados ao colaborador CLT." : "Aplicavel principalmente para CLT/Intermitente."}</small>
              </div>
              <div className="form-grid">
                <label className="driver-editor-modal-field-full">Beneficios
                  <div className="driver-editor-benefits-grid">
                    {benefitOptions.map((benefit) => <label key={benefit} className="driver-editor-benefit-option"><input type="checkbox" checked={(draftContract.benefitsList ?? []).includes(benefit)} onChange={(event) => toggleBenefit(benefit, event.target.checked)} /><span>{benefit}</span></label>)}
                  </div>
                </label>
                <label className="driver-editor-modal-field-full">Outros beneficios
                  <input value={draftContract.otherBenefits ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, otherBenefits: event.target.value }))} />
                </label>
              </div>
            </section>
          ) : null}

          <section className="driver-editor-contract-card driver-editor-contract-card-salary driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head">
              <strong>Remuneracao</strong>
              <small>
                {draftProfile === "INTERMITENTE"
                  ? "Defina a forma principal de pagamento e os valores variaveis."
                  : draftProfile === "MEI"
                    ? "Modelo de ganho do parceiro (comissao, repasse ou valor por corrida)."
                    : "Remuneracao CLT com salario fixo e opcao de comissao adicional."}
              </small>
            </div>
            <div className="form-grid">
              {draftProfile === "INTERMITENTE" ? (
                <>
                  <label className={fieldClassName("intermittent_payment_mode")}>Forma de pagamento principal
                    <select
                      className="select"
                      value={draftContract.intermittentPaymentMode ?? ""}
                      onChange={(event) =>
                        setDraftContract((current) => {
                          const paymentMode = event.target.value as IntermittentPaymentMode;
                          const legacyPaymentMethod = mapIntermittentModeToLegacyPaymentMethod(paymentMode);
                          return {
                            ...current,
                            intermittentPaymentMode: paymentMode,
                            paymentMethod: legacyPaymentMethod || current.paymentMethod
                          };
                        })
                      }
                    >
                      <option value="">Selecionar forma</option>
                      <option value="DAILY">Por diaria</option>
                      <option value="PER_RIDE">Por corrida</option>
                      <option value="DAILY_PLUS_RIDE">Diaria + corrida</option>
                    </select>
                  </label>

                  {(draftContract.intermittentPaymentMode === "DAILY" ||
                    draftContract.intermittentPaymentMode === "DAILY_PLUS_RIDE") ? (
                    <label className={fieldClassName("intermittent_daily_rate")}>Valor da diaria
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={formatCurrencyField(draftContract.intermittentDailyRate)}
                        onChange={(event) =>
                          setDraftContract((current) => ({
                            ...current,
                            intermittentDailyRate: parseCurrencyMasked(event.target.value)
                          }))
                        }
                      />
                    </label>
                  ) : null}

                  {(draftContract.intermittentPaymentMode === "PER_RIDE" ||
                    draftContract.intermittentPaymentMode === "DAILY_PLUS_RIDE") ? (
                    <>
                      <label>Variavel por corrida
                        <select
                          className="select"
                          value={draftContract.intermittentRideCompensationType ?? "AMOUNT"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              intermittentRideCompensationType: event.target.value as IntermittentRideCompensationType
                            }))
                          }
                        >
                          <option value="AMOUNT">Valor por corrida (R$)</option>
                          <option value="PERCENT">Comissao percentual (%)</option>
                        </select>
                      </label>
                      {(draftContract.intermittentRideCompensationType ?? "AMOUNT") === "PERCENT" ? (
                        <label className={fieldClassName("intermittent_ride_percent")}>Percentual por corrida
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={formatPercentField(draftContract.intermittentRidePercent)}
                            onChange={(event) =>
                              setDraftContract((current) => ({
                                ...current,
                                intermittentRidePercent: parsePercentMasked(event.target.value)
                              }))
                            }
                          />
                        </label>
                      ) : (
                        <label className={fieldClassName("intermittent_ride_amount")}>Valor por corrida
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={formatCurrencyField(draftContract.intermittentRideAmount)}
                            onChange={(event) =>
                              setDraftContract((current) => ({
                                ...current,
                                intermittentRideAmount: parseCurrencyMasked(event.target.value)
                              }))
                            }
                          />
                        </label>
                      )}
                    </>
                  ) : null}

                  <label>Frequencia de pagamento
                    <select
                      className="select"
                      value={draftContract.paymentFrequency ?? ""}
                      onChange={(event) => setDraftContract((current) => ({ ...current, paymentFrequency: event.target.value }))}
                    >
                      <option value="">Selecionar frequencia</option>
                      <option value="DIARIA">Diaria</option>
                      <option value="SEMANAL">Semanal</option>
                      <option value="QUINZENAL">Quinzenal</option>
                      <option value="MENSAL">Mensal</option>
                    </select>
                  </label>
                </>
              ) : draftProfile === "MEI" ? (
                <>
                  <label className={fieldClassName("mei_remuneration_model")}>Modelo de remuneracao
                    <select
                      className="select"
                      value={draftContract.meiRemunerationModel ?? ""}
                      onChange={(event) =>
                        setDraftContract((current) => ({
                          ...current,
                          meiRemunerationModel: event.target.value as MeiRemunerationModel
                        }))
                      }
                    >
                      <option value="">Selecionar modelo</option>
                      <option value="COMMISSION_PERCENT">Comissao (%)</option>
                      <option value="PER_RIDE_FIXED">Valor fixo por corrida</option>
                      <option value="RIDE_REVENUE_SHARE">Repasse por corrida</option>
                      <option value="FIXED_PLUS_VARIABLE">Fixo + variavel</option>
                    </select>
                  </label>

                  {draftContract.meiRemunerationModel === "COMMISSION_PERCENT" ? (
                    <>
                      <label className={fieldClassName("mei_commission_percent")}>Percentual (%)
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={formatPercentField(draftContract.meiCommissionPercent)}
                          onChange={(event) =>
                            setDraftContract((current) => ({ ...current, meiCommissionPercent: parsePercentMasked(event.target.value) }))
                          }
                        />
                      </label>
                      <label className={fieldClassName("mei_commission_base")}>Base da comissao
                        <select
                          className="select"
                          value={draftContract.meiCommissionBase ?? "RIDE"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiCommissionBase: event.target.value as MeiCommissionBase
                            }))
                          }
                        >
                          <option value="RIDE">Por corrida</option>
                          <option value="GROSS_REVENUE">Por faturamento</option>
                          <option value="RATING">Por avaliacao</option>
                        </select>
                      </label>
                    </>
                  ) : null}

                  {draftContract.meiRemunerationModel === "PER_RIDE_FIXED" ? (
                    <label className={fieldClassName("mei_per_ride_amount")}>Valor por corrida (R$)
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={formatCurrencyField(draftContract.meiPerRideAmount)}
                        onChange={(event) =>
                          setDraftContract((current) => ({ ...current, meiPerRideAmount: parseCurrencyMasked(event.target.value) }))
                        }
                      />
                    </label>
                  ) : null}

                  {draftContract.meiRemunerationModel === "RIDE_REVENUE_SHARE" ? (
                    <>
                      <label className={fieldClassName("mei_revenue_share_percent")}>Percentual de repasse (%)
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={formatPercentField(draftContract.meiRevenueSharePercent)}
                          onChange={(event) =>
                            setDraftContract((current) => ({ ...current, meiRevenueSharePercent: parsePercentMasked(event.target.value) }))
                          }
                        />
                      </label>
                      <label className={fieldClassName("mei_revenue_share_base")}>Base do repasse
                        <select
                          className="select"
                          value={draftContract.meiRevenueShareBase ?? "RIDE_GROSS"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiRevenueShareBase: event.target.value as MeiRevenueShareBase
                            }))
                          }
                        >
                          <option value="RIDE_GROSS">Valor da corrida</option>
                          <option value="RIDE_NET">Valor liquido</option>
                        </select>
                      </label>
                    </>
                  ) : null}

                  {draftContract.meiRemunerationModel === "FIXED_PLUS_VARIABLE" ? (
                    <>
                      <label className={fieldClassName("mei_fixed_base_amount")}>Valor base (R$)
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={formatCurrencyField(draftContract.meiFixedBaseAmount)}
                          onChange={(event) =>
                            setDraftContract((current) => ({ ...current, meiFixedBaseAmount: parseCurrencyMasked(event.target.value) }))
                          }
                        />
                      </label>
                      <label>Variavel
                        <select
                          className="select"
                          value={draftContract.meiVariableType ?? "PERCENT"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiVariableType: event.target.value as MeiVariableType
                            }))
                          }
                        >
                          <option value="PERCENT">Percentual (%)</option>
                          <option value="AMOUNT">Valor fixo (R$)</option>
                        </select>
                      </label>
                      {(draftContract.meiVariableType ?? "PERCENT") === "PERCENT" ? (
                        <label className={fieldClassName("mei_variable_percent")}>Percentual variavel (%)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={formatPercentField(draftContract.meiVariablePercent)}
                            onChange={(event) =>
                              setDraftContract((current) => ({ ...current, meiVariablePercent: parsePercentMasked(event.target.value) }))
                            }
                          />
                        </label>
                      ) : (
                        <label className={fieldClassName("mei_variable_amount")}>Valor variavel (R$)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={formatCurrencyField(draftContract.meiVariableAmount)}
                            onChange={(event) =>
                              setDraftContract((current) => ({ ...current, meiVariableAmount: parseCurrencyMasked(event.target.value) }))
                            }
                          />
                        </label>
                      )}
                      <label>Base da variavel
                        <select
                          className="select"
                          value={draftContract.meiVariableBase ?? "RIDE"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiVariableBase: event.target.value as MeiCommissionBase
                            }))
                          }
                        >
                          <option value="RIDE">Por corrida</option>
                          <option value="GROSS_REVENUE">Por faturamento</option>
                          <option value="RATING">Por avaliacao</option>
                        </select>
                      </label>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="driver-editor-modal-field-full">Estrutura salarial
                    <select
                      className="select"
                      value={resolveCltSalaryModel(draftContract)}
                      onChange={(event) => {
                        const nextSalaryModel = event.target.value as CltSalaryModel;
                        setDraftContract((current) => {
                          if (nextSalaryModel === "FIXED") {
                            return {
                              ...current,
                              salaryModel: "FIXED",
                              commissionType: undefined,
                              commissionPercent: undefined,
                              commissionPerRide: undefined,
                              commissionApplyOn: undefined
                            };
                          }

                          return {
                            ...current,
                            salaryModel: "FIXED_PLUS_COMMISSION",
                            commissionType: current.commissionType ?? "PERCENT",
                            commissionApplyOn: current.commissionApplyOn ?? "RIDE"
                          };
                        });
                      }}
                    >
                      <option value="FIXED">Salario fixo</option>
                      <option value="FIXED_PLUS_COMMISSION">Salario + comissao</option>
                    </select>
                  </label>
                  <label className={fieldClassName("clt_fixed_salary")}>Valor fixo mensal
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formatCurrencyField(draftContract.fixedSalary)}
                      onChange={(event) =>
                        setDraftContract((current) => ({
                          ...current,
                          fixedSalary: parseCurrencyMasked(event.target.value)
                        }))
                      }
                    />
                  </label>
                  {resolveCltSalaryModel(draftContract) === "FIXED_PLUS_COMMISSION" ? (
                    <>
                      <label>Tipo de comissao
                        <select
                          className="select"
                          value={draftContract.commissionType ?? "PERCENT"}
                          onChange={(event) =>
                            setDraftContract((current) => {
                              const nextType = event.target.value as "PERCENT" | "PER_RIDE";
                              return {
                                ...current,
                                salaryModel: "FIXED_PLUS_COMMISSION",
                                commissionType: nextType,
                                commissionApplyOn: current.commissionApplyOn ?? "RIDE",
                                commissionPercent: nextType === "PERCENT" ? current.commissionPercent : undefined,
                                commissionPerRide: nextType === "PER_RIDE" ? current.commissionPerRide : undefined
                              };
                            })
                          }
                        >
                          <option value="PERCENT">Percentual (%)</option>
                          <option value="PER_RIDE">Valor por corrida (R$)</option>
                        </select>
                      </label>
                      {(draftContract.commissionType ?? "PERCENT") === "PERCENT" ? (
                        <label className={fieldClassName("clt_commission_percent")}>Percentual de comissao
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={formatPercentField(draftContract.commissionPercent)}
                            onChange={(event) =>
                              setDraftContract((current) => ({
                                ...current,
                                salaryModel: "FIXED_PLUS_COMMISSION",
                                commissionPercent: parsePercentMasked(event.target.value)
                              }))
                            }
                          />
                        </label>
                      ) : (
                        <label className={fieldClassName("clt_commission_per_ride")}>Comissao por corrida (R$)
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={formatCurrencyField(draftContract.commissionPerRide)}
                            onChange={(event) =>
                              setDraftContract((current) => ({
                                ...current,
                                salaryModel: "FIXED_PLUS_COMMISSION",
                                commissionPerRide: parseCurrencyMasked(event.target.value)
                              }))
                            }
                          />
                        </label>
                      )}
                      <label>Base da comissao
                        <select
                          className="select"
                          value={draftContract.commissionApplyOn ?? "RIDE"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              salaryModel: "FIXED_PLUS_COMMISSION",
                              commissionApplyOn: event.target.value as "RIDE" | "RATING"
                            }))
                          }
                        >
                          <option value="RIDE">Por corrida</option>
                          <option value="RATING">Por avaliacao</option>
                        </select>
                      </label>
                    </>
                  ) : null}

                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Hora extra (CLT)</strong>
                      <small>Defina a politica de hora extra aplicada a este motorista.</small>
                    </div>
                    <div className="form-grid">
                      <label className="toggle-field">
                        <span>Hora extra ativa no motorista</span>
                        <input
                          type="checkbox"
                          checked={draftContract.overtimeEnabled ?? true}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              overtimeUseGlobalPolicy: false,
                              overtimeEnabled: event.target.checked
                            }))
                          }
                        />
                      </label>

                      {draftContract.overtimeEnabled !== false ? (
                        <>
                          <label className={fieldClassName("overtime_policy_mode")}>Destino da hora extra
                            <select
                              className="select"
                              value={draftContract.overtimePolicyMode ?? "PAID"}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimePolicyMode: event.target.value as OvertimePolicyMode
                                }))
                              }
                            >
                              <option value="PAID">Pagamento em folha</option>
                              <option value="BANK_HOURS">Banco de horas</option>
                            </select>
                          </label>

                          <label>Limite diario (horas) - opcional
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={draftContract.overtimeDailyLimitHours ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeDailyLimitHours: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label>Limite semanal (horas) - opcional
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={draftContract.overtimeWeeklyLimitHours ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeWeeklyLimitHours: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label className={fieldClassName("overtime_after_daily")}>HE apos X horas no dia
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={draftContract.overtimeAfterDailyHours ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeAfterDailyHours: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label>HE apos X horas na semana
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={draftContract.overtimeAfterWeeklyHours ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeAfterWeeklyHours: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label className={fieldClassName("overtime_multiplier_50")}>Multiplicador 50%
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftContract.overtimeMultiplier50 ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeMultiplier50: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label className={fieldClassName("overtime_multiplier_100")}>Multiplicador 100%
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftContract.overtimeMultiplier100 ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeMultiplier100: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label>Multiplicador noturno
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftContract.overtimeNightMultiplier ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeNightMultiplier: parseNumeric(event.target.value)
                                }))
                              }
                            />
                          </label>

                          <label className={fieldClassName("overtime_rounding_minutes")}>Arredondamento (min)
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={draftContract.overtimeRoundingMinutes ?? ""}
                              onChange={(event) =>
                                setDraftContract((current) => ({
                                  ...current,
                                  overtimeUseGlobalPolicy: false,
                                  overtimeRoundingMinutes: parseIntMin(event.target.value, 0)
                                }))
                              }
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="driver-editor-contract-card driver-editor-contract-card-journey driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head"><strong>Jornada de trabalho</strong><small>Regras operacionais e disponibilidade por perfil.</small></div>
            <div className="form-grid">
              {draftProfile === "CLT" ? (
                <>
                  <label>Turno
                    <select className="select" value={draftJourney.shift ?? ""} onChange={(event) => setDraftJourney((current) => ({ ...current, shift: event.target.value }))}>
                      <option value="">Selecionar turno</option>
                      <option value="Manha">Manha</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Personalizado">Personalizado</option>
                    </select>
                  </label>

                  <label>Escala de trabalho
                    <select
                      className="select"
                      value={resolveJourneyScaleType(draftJourney)}
                      onChange={(event) => {
                        const nextType = event.target.value as JourneyScaleType;
                        setDraftJourney((current) => ({
                          ...current,
                          scaleType: nextType,
                          customScaleWorkDays: nextType === "CUSTOM" ? current.customScaleWorkDays : undefined,
                          customScaleOffDays: nextType === "CUSTOM" ? current.customScaleOffDays : undefined,
                          scale: resolveScaleLabel(nextType, current.customScaleWorkDays, current.customScaleOffDays)
                        }));
                      }}
                    >
                      {journeyScaleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {resolveJourneyScaleType(draftJourney) === "CUSTOM" ? (
                    <>
                      <label>Dias trabalhados por ciclo
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draftJourney.customScaleWorkDays ?? ""}
                          onChange={(event) =>
                            setDraftJourney((current) => {
                              const workDays = parseIntMin(event.target.value, 1);
                              return {
                                ...current,
                                customScaleWorkDays: workDays,
                                scale: resolveScaleLabel("CUSTOM", workDays, current.customScaleOffDays)
                              };
                            })
                          }
                        />
                      </label>
                      <label>Dias de folga
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draftJourney.customScaleOffDays ?? ""}
                          onChange={(event) =>
                            setDraftJourney((current) => {
                              const offDays = parseIntMin(event.target.value, 1);
                              return {
                                ...current,
                                customScaleOffDays: offDays,
                                scale: resolveScaleLabel("CUSTOM", current.customScaleWorkDays, offDays)
                              };
                            })
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  <div className="driver-editor-modal-field-full driver-editor-scale-preview">
                    <strong>
                      {resolveJourneyScaleType(draftJourney) === "CUSTOM" &&
                      (draftJourney.customScaleWorkDays ?? 0) > 0 &&
                      (draftJourney.customScaleOffDays ?? 0) > 0
                        ? `Ciclo: ${draftJourney.customScaleWorkDays} dias de trabalho / ${draftJourney.customScaleOffDays} de folga`
                        : resolveScaleLabel(
                            resolveJourneyScaleType(draftJourney),
                            draftJourney.customScaleWorkDays,
                            draftJourney.customScaleOffDays
                          )}
                    </strong>
                    <div className="driver-editor-scale-preview-track" aria-hidden="true">
                      {resolveScalePreviewTokens(resolveJourneyScaleType(draftJourney), draftJourney.customScaleWorkDays, draftJourney.customScaleOffDays).map((item, index) => (
                        <span key={`${item}-${index}`} className={`driver-editor-scale-token ${item === "T" ? "is-work" : "is-off"}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full">
                    <span>Modelo de jornada</span>
                    <div className="driver-editor-profile-picker driver-editor-contract-toggle-picker">
                      <button
                        type="button"
                        className={`driver-editor-profile-option ${draftJourney.fixedSchedule === false ? "" : "is-active"}`}
                        onClick={() =>
                          setDraftJourney((current) => ({
                            ...current,
                            fixedSchedule: true,
                            fixedScheduleMode: current.fixedScheduleMode ?? "UNIFORM",
                            availabilityStartTime: "",
                            availabilityEndTime: "",
                            availableDays:
                              current.availableDays && current.availableDays.length > 0
                                ? current.availableDays
                                : defaultWeekDays,
                            acceptsOutsideSchedule: undefined
                          }))
                        }
                      >
                        <div className="driver-editor-profile-option-copy">
                          <strong>Horario fixo</strong>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`driver-editor-profile-option ${draftJourney.fixedSchedule === false ? "is-active" : ""}`}
                        onClick={() =>
                          setDraftJourney((current) => {
                            const nextAvailableDays =
                              current.availableDays && current.availableDays.length > 0
                                ? current.availableDays
                                : defaultWeekDays;
                            return {
                              ...current,
                              fixedSchedule: false,
                              fixedScheduleMode: undefined,
                              startTime: "",
                              endTime: "",
                              daySchedules: normalizeJourneyDaySchedules(
                                current,
                                nextAvailableDays.filter(
                                  (day, index, list): day is WeekDay => isWeekDay(day) && list.indexOf(day) === index
                                ),
                                current.availabilityStartTime || "06:00",
                                current.availabilityEndTime || "18:00"
                              ),
                              availabilityStartTime: current.availabilityStartTime || "06:00",
                              availabilityEndTime: current.availabilityEndTime || "18:00",
                              availableDays: nextAvailableDays,
                              acceptsOutsideSchedule: current.acceptsOutsideSchedule ?? false
                            };
                          })
                        }
                      >
                        <div className="driver-editor-profile-option-copy">
                          <strong>Horario variavel / sob demanda</strong>
                        </div>
                      </button>
                    </div>
                  </div>

                  {draftJourney.fixedSchedule === false ? (
                    <>
                      <div className="driver-editor-modal-field-full driver-editor-contract-subsection driver-editor-contract-subsection-compact">
                        <div className="driver-editor-contract-subsection-head">
                          <strong>Horario por dia (variavel/sob demanda)</strong>
                          <small>Ative cada dia e configure inicio/fim individual da disponibilidade.</small>
                        </div>
                        <div className="form-grid">
                          {normalizedVariableDaySchedules.map((daySchedule) => {
                            const dayLabel = weekDayOptions.find((item) => item.value === daySchedule.day)?.label ?? daySchedule.day;
                            return (
                              <div key={`variable-${daySchedule.day}`} className="driver-editor-modal-field-full driver-editor-day-row">
                                <label className="driver-editor-day-check">
                                  <input
                                    type="checkbox"
                                    checked={daySchedule.enabled}
                                    onChange={(event) =>
                                      updateVariableDaySchedule(daySchedule.day, { enabled: event.target.checked })
                                    }
                                  />
                                  <span>{dayLabel}</span>
                                </label>
                                <label className="driver-editor-day-time-label">{`Inicio (${dayLabel})`}
                                  <input
                                    type="time"
                                    value={daySchedule.startTime ?? ""}
                                    disabled={!daySchedule.enabled}
                                    onChange={(event) =>
                                      updateVariableDaySchedule(daySchedule.day, { startTime: event.target.value })
                                    }
                                  />
                                </label>
                                <label className="driver-editor-day-time-label">{`Fim (${dayLabel})`}
                                  <input
                                    type="time"
                                    value={daySchedule.endTime ?? ""}
                                    disabled={!daySchedule.enabled}
                                    onChange={(event) =>
                                      updateVariableDaySchedule(daySchedule.day, { endTime: event.target.value })
                                    }
                                  />
                                </label>
                              </div>
                            );
                          })}
                          <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                            <strong>{`Disponibilidade semanal estimada: ${formatDurationLabel(variableWeeklyMinutes)}`}</strong>
                          </div>
                        </div>
                      </div>
                      <label>Aceita chamadas fora do horario?
                        <select
                          className="select"
                          value={draftJourney.acceptsOutsideSchedule ? "YES" : "NO"}
                          onChange={(event) =>
                            setDraftJourney((current) => ({
                              ...current,
                              acceptsOutsideSchedule: event.target.value === "YES"
                            }))
                          }
                        >
                          <option value="YES">Sim</option>
                          <option value="NO">Nao</option>
                        </select>
                      </label>
                      <label className="driver-editor-modal-field-full">Observacoes
                        <textarea
                          rows={3}
                          value={draftJourney.availabilityNotes ?? ""}
                          onChange={(event) =>
                            setDraftJourney((current) => ({ ...current, availabilityNotes: event.target.value }))
                          }
                          placeholder="Detalhes de disponibilidade e excecoes de atendimento."
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="driver-editor-modal-field-full">
                        <span>Dias ativos da semana</span>
                        <div className="driver-editor-availability-days">
                          {weekDayOptions.map((day) => {
                            const isActive = fixedScheduleActiveDays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                className={`driver-editor-availability-day ${isActive ? "is-active" : ""}`}
                                onClick={() => toggleFixedDay(day.value)}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="driver-editor-modal-field-full">
                        <span>Configuracao do horario</span>
                        <div className="driver-editor-profile-picker driver-editor-contract-toggle-picker">
                          <button
                            type="button"
                            className={`driver-editor-profile-option ${fixedScheduleMode === "UNIFORM" ? "is-active" : ""}`}
                            onClick={() => updateFixedScheduleMode("UNIFORM")}
                          >
                            <div className="driver-editor-profile-option-copy">
                              <strong>Horario fixo para todos os dias ativos</strong>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`driver-editor-profile-option ${fixedScheduleMode === "PER_DAY" ? "is-active" : ""}`}
                            onClick={() => updateFixedScheduleMode("PER_DAY")}
                          >
                            <div className="driver-editor-profile-option-copy">
                              <strong>Horario personalizado por dia</strong>
                            </div>
                          </button>
                        </div>
                      </div>

                      {fixedScheduleMode === "UNIFORM" ? (
                        <>
                          <label>Inicio da jornada
                            <input
                              type="time"
                              value={draftJourney.startTime ?? ""}
                              onChange={(event) =>
                                setDraftJourney((current) => ({ ...current, startTime: event.target.value }))
                              }
                            />
                          </label>
                          <label>Fim da jornada
                            <input
                              type="time"
                              value={draftJourney.endTime ?? ""}
                              onChange={(event) =>
                                setDraftJourney((current) => ({ ...current, endTime: event.target.value }))
                              }
                            />
                          </label>
                          <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                            <strong>{`Carga diaria: ${formatDurationLabel(uniformDailyMinutes)}`}</strong>
                            <span>{`Carga semanal estimada: ${formatDurationLabel(uniformWeeklyMinutes)} (${fixedScheduleActiveDays.length} dia(s) ativo(s)).`}</span>
                          </div>
                        </>
                      ) : (
                      <div className="driver-editor-modal-field-full driver-editor-contract-subsection driver-editor-contract-subsection-compact">
                          <div className="driver-editor-contract-subsection-head">
                            <strong>Horario por dia</strong>
                            <small>Ative o dia e configure inicio/fim individual.</small>
                          </div>
                          <div className="form-grid">
                            {normalizedJourneyDaySchedules.map((daySchedule) => {
                              const dayLabel = weekDayOptions.find((item) => item.value === daySchedule.day)?.label ?? daySchedule.day;
                              const dayDuration = daySchedule.enabled
                                ? calculateDurationMinutes(daySchedule.startTime, daySchedule.endTime)
                                : undefined;
                              return (
                                <div key={daySchedule.day} className="driver-editor-modal-field-full">
                                  <div className="driver-editor-contract-inline-note">
                                    <strong>{dayLabel}</strong>
                                    <label className="driver-editor-modal-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={daySchedule.enabled}
                                        onChange={(event) =>
                                          updateFixedDaySchedule(daySchedule.day, { enabled: event.target.checked })
                                        }
                                      />
                                      <span>Dia ativo</span>
                                    </label>
                                  </div>
                                  {daySchedule.enabled ? (
                                    <div className="form-grid">
                                      <label>{`Inicio (${dayLabel})`}
                                        <input
                                          type="time"
                                          value={daySchedule.startTime ?? ""}
                                          onChange={(event) =>
                                            updateFixedDaySchedule(daySchedule.day, { startTime: event.target.value })
                                          }
                                        />
                                      </label>
                                      <label>{`Fim (${dayLabel})`}
                                        <input
                                          type="time"
                                          value={daySchedule.endTime ?? ""}
                                          onChange={(event) =>
                                            updateFixedDaySchedule(daySchedule.day, { endTime: event.target.value })
                                          }
                                        />
                                      </label>
                                      <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                                        <span>{`Carga do dia: ${formatDurationLabel(dayDuration)}`}</span>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                            <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                              <strong>{`Carga semanal estimada: ${formatDurationLabel(perDayWeeklyMinutes)}`}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : null}
              {draftProfile === "INTERMITENTE" ? (
                <>
                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Convocacao</strong>
                      <small>Defina como o motorista e acionado para trabalhar.</small>
                    </div>
                    <div className="form-grid">
                      <label className={fieldClassName("intermittent_convocation_mode")}>Modelo de convocacao
                        <select
                          className="select"
                          value={draftContract.intermittentConvocationMode ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              intermittentConvocationMode: event.target.value as IntermittentConvocationMode
                            }))
                          }
                        >
                          <option value="">Selecionar modelo</option>
                          <option value="ON_DEMAND">Sob demanda</option>
                          <option value="ADVANCE_NOTICE">Com antecedencia minima</option>
                          <option value="FIXED_WINDOW">Fixo por periodo</option>
                        </select>
                      </label>

                      {draftContract.intermittentConvocationMode === "ADVANCE_NOTICE" ? (
                        <label className={fieldClassName("intermittent_notice_hours")}>Aviso minimo (horas)
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draftContract.intermittentNoticeHours ?? ""}
                            onChange={(event) =>
                              setDraftContract((current) => ({
                                ...current,
                                intermittentNoticeHours: parseIntMin(event.target.value, 0)
                              }))
                            }
                          />
                        </label>
                      ) : null}

                      <label className="driver-editor-modal-field-full">Regras e acordos de convocacao
                        <textarea
                          rows={3}
                          value={draftContract.intermittentConvocationNotes ?? ""}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              intermittentConvocationNotes: event.target.value
                            }))
                          }
                          placeholder="Detalhe regras internas para convocacao e aceite."
                        />
                      </label>
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Disponibilidade de trabalho</strong>
                      <small>Defina disponibilidade por dia para convocações variaveis/sob demanda.</small>
                    </div>
                    <div className="form-grid">
                      {normalizedVariableDaySchedules.map((daySchedule) => {
                        const dayLabel = weekDayOptions.find((item) => item.value === daySchedule.day)?.label ?? daySchedule.day;
                        return (
                          <div
                            key={`intermittent-variable-${daySchedule.day}`}
                            className="driver-editor-modal-field-full driver-editor-day-row"
                          >
                            <label className="driver-editor-day-check">
                              <input
                                type="checkbox"
                                checked={daySchedule.enabled}
                                onChange={(event) =>
                                  updateVariableDaySchedule(daySchedule.day, { enabled: event.target.checked })
                                }
                              />
                              <span>{dayLabel}</span>
                            </label>
                            <label className="driver-editor-day-time-label">{`Inicio (${dayLabel})`}
                              <input
                                type="time"
                                value={daySchedule.startTime ?? ""}
                                disabled={!daySchedule.enabled}
                                onChange={(event) =>
                                  updateVariableDaySchedule(daySchedule.day, { startTime: event.target.value })
                                }
                              />
                            </label>
                            <label className="driver-editor-day-time-label">{`Fim (${dayLabel})`}
                              <input
                                type="time"
                                value={daySchedule.endTime ?? ""}
                                disabled={!daySchedule.enabled}
                                onChange={(event) =>
                                  updateVariableDaySchedule(daySchedule.day, { endTime: event.target.value })
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                      <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                        <strong>{`Disponibilidade semanal estimada: ${formatDurationLabel(variableWeeklyMinutes)}`}</strong>
                        <span>Dias disponiveis = pode trabalhar.</span>
                      </div>
                      <label>Aceita chamadas fora do horario?
                        <select
                          className="select"
                          value={draftJourney.acceptsOutsideSchedule ? "YES" : "NO"}
                          onChange={(event) =>
                            setDraftJourney((current) => ({
                              ...current,
                              fixedSchedule: false,
                              acceptsOutsideSchedule: event.target.value === "YES"
                            }))
                          }
                        >
                          <option value="YES">Sim</option>
                          <option value="NO">Nao</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Preferencias e restricoes</strong>
                      <small>Dias preferenciais = dias em que prefere ser convocado.</small>
                    </div>
                    <div className="form-grid">
                      <div className="driver-editor-modal-field-full">
                        <span>Dias preferenciais</span>
                        <div className="driver-editor-availability-days">
                          {weekDayOptions.map((day) => {
                            const selectedDays = draftContract.intermittentPreferredWeekDays ?? [];
                            const isSelected = selectedDays.includes(day.value);
                            return (
                              <button
                                key={`pref-${day.value}`}
                                type="button"
                                className={`driver-editor-availability-day ${isSelected ? "is-active" : ""}`}
                                onClick={() =>
                                  setDraftContract((current) => {
                                    const currentDays = current.intermittentPreferredWeekDays ?? [];
                                    const nextDays = currentDays.includes(day.value)
                                      ? currentDays.filter((item) => item !== day.value)
                                      : [...currentDays, day.value];
                                    return {
                                      ...current,
                                      intermittentPreferredWeekDays: nextDays,
                                      intermittentPreferredDays: nextDays.join(", ")
                                    };
                                  })
                                }
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label className="driver-editor-modal-field-full">Restricoes e observacoes
                        <textarea
                          rows={3}
                          value={draftJourney.availabilityNotes ?? ""}
                          onChange={(event) =>
                            setDraftJourney((current) => ({ ...current, fixedSchedule: false, availabilityNotes: event.target.value }))
                          }
                          placeholder="Restricoes operacionais, periodos de indisponibilidade e excecoes."
                        />
                      </label>
                    </div>
                    <div className="driver-editor-contract-inline-note">
                      <strong>Resumo automatico</strong>
                      <span>{intermittentOperationalSummary}</span>
                    </div>
                  </div>
                </>
              ) : null}
              {draftProfile === "MEI" ? (
                <>
                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Forma de atuacao</strong>
                      <small>Modelo operacional do parceiro na plataforma.</small>
                    </div>
                    <div className="form-grid">
                      <label className={fieldClassName("mei_work_mode")}>Forma de atuacao
                        <select
                          className="select"
                          value={draftContract.meiWorkMode ?? "ON_DEMAND"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiWorkMode: event.target.value as MeiWorkMode
                            }))
                          }
                        >
                          <option value="ON_DEMAND">Sob demanda</option>
                          <option value="SCHEDULED">Agenda definida</option>
                          <option value="MIXED">Mista</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Forma de pagamento</strong>
                      <small>Liquidacao financeira separada da regra de remuneracao.</small>
                    </div>
                    <div className="form-grid">
                      <label className={fieldClassName("mei_payment_method")}>Forma de pagamento
                        <select className="select" value={draftContract.paymentMethod ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, paymentMethod: event.target.value }))}>
                          <option value="">Selecionar forma</option>
                          <option value="PIX">Pix</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                          <option value="BOLETO">Boleto</option>
                        </select>
                      </label>
                      <label className={fieldClassName("mei_payment_frequency")}>Frequencia de pagamento
                        <select className="select" value={draftContract.paymentFrequency ?? ""} onChange={(event) => setDraftContract((current) => ({ ...current, paymentFrequency: event.target.value }))}>
                          <option value="">Selecionar frequencia</option>
                          <option value="DIARIA">Diaria</option>
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINZENAL">Quinzenal</option>
                          <option value="MENSAL">Mensal</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full driver-editor-contract-subsection">
                    <div className="driver-editor-contract-subsection-head">
                      <strong>Operacao (veiculo e custos)</strong>
                      <small>Defina uso de veiculo e divisao de responsabilidades.</small>
                    </div>
                    <div className="form-grid">
                      <label className={fieldClassName("mei_operation_vehicle_mode")}>Forma de operacao
                        <select
                          className="select"
                          value={draftContract.meiOperationVehicleMode ?? "OWN_VEHICLE"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiOperationVehicleMode: event.target.value as MeiOperationVehicleMode
                            }))
                          }
                        >
                          <option value="OWN_VEHICLE">Veiculo proprio</option>
                          <option value="COMPANY_VEHICLE">Veiculo da empresa</option>
                          <option value="BOTH">Ambos</option>
                        </select>
                      </label>
                      <label className={fieldClassName("mei_fuel_responsibility")}>Combustivel
                        <select
                          className="select"
                          value={draftContract.meiFuelResponsibility ?? "DRIVER"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiFuelResponsibility: event.target.value as MeiCostResponsibility
                            }))
                          }
                        >
                          <option value="DRIVER">Motorista</option>
                          <option value="COMPANY">Empresa</option>
                          <option value="SHARED">Dividido</option>
                        </select>
                      </label>
                      <label className={fieldClassName("mei_maintenance_responsibility")}>Manutencao
                        <select
                          className="select"
                          value={draftContract.meiMaintenanceResponsibility ?? "DRIVER"}
                          onChange={(event) =>
                            setDraftContract((current) => ({
                              ...current,
                              meiMaintenanceResponsibility: event.target.value as MeiCostResponsibility
                            }))
                          }
                        >
                          <option value="DRIVER">Motorista</option>
                          <option value="COMPANY">Empresa</option>
                          <option value="SHARED">Dividido</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="driver-editor-modal-field-full driver-editor-contract-inline-note">
                    <strong>Resumo operacional</strong>
                    <span>{meiOperationalSummary}</span>
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <section className="driver-editor-contract-card driver-editor-contract-card-notes driver-editor-modal-field-full">
            <div className="driver-editor-contract-card-head"><strong>Observacoes</strong><small>Detalhes operacionais e administrativos.</small></div>
            <label className="driver-editor-modal-field-full">Observacoes do contrato
              <textarea rows={4} value={draftProfile === "MEI" ? (draftContract.fiscalNotes ?? "") : (draftContract.notes ?? "")} onChange={(event) => setDraftContract((current) => ({ ...current, [draftProfile === "MEI" ? "fiscalNotes" : "notes"]: event.target.value }))} />
            </label>
          </section>
            </>
          ) : null}
            </>
          ) : null}
          </fieldset>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={Boolean(selectedContractPreview)}
        title={selectedContractPreview ? selectedContractPreview.title : "Contrato"}
        description={
          selectedContractPreview
            ? `${resolveEmploymentContractStatusLabel(selectedContractPreview.status)} - ${new Date(
                selectedContractPreview.generatedAt
              ).toLocaleString("pt-BR")} - ${
                selectedContractPreview.templateName || selectedContractPreview.templateKey
              } (${selectedContractPreview.templateVersion})`
            : undefined
        }
        onClose={() => {
          setSelectedContractPreview(null);
          setSelectedContractPrintHtml("");
          setIsBuildingContractPreview(false);
        }}
        dialogWidth="min(1020px, calc(100vw - 24px))"
        bodyScrollable={false}
        footer={
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => handlePrintContractClick(selectedContractPreview ?? undefined)}
              disabled={!selectedContractPreview}
            >
              Imprimir
            </button>
            <button type="button" className="secondary" onClick={() => setSelectedContractPreview(null)}>
              Fechar
            </button>
          </>
        }
      >
        {selectedContractPreview ? (
          <div className="driver-editor-contracts-preview is-frame">
            {isBuildingContractPreview ? (
              <p className="helper-text">Carregando pre-visualizacao...</p>
            ) : selectedContractPrintHtml ? (
              <iframe
                title="Pre-visualizacao de impressao do contrato"
                srcDoc={selectedContractPrintHtml}
                style={{
                  width: "100%",
                  height: "72vh",
                  border: "1px solid rgba(217, 224, 238, 0.9)",
                  borderRadius: "12px",
                  background: "#fff",
                  display: "block"
                }}
              />
            ) : (
              <p className="helper-text">Nao foi possivel montar a pre-visualizacao.</p>
            )}
          </div>
        ) : null}
      </DriverProfileEditorModal>
    </article>
  );
}

