"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CompanySettingsOption,
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
  contractProfile: DriverContractProfile;
  journey?: DriverJourney;
  contract?: DriverContract;
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
  companyContractProfiles?: CompanySettingsOption[];
  companyBenefitOptions?: CompanySettingsOption[];
};

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

function profileCopy(profile: DriverContractProfile, customLabel?: string) {
  if (profile === "CLT") {
    return {
      title: customLabel?.trim() || "CLT",
      description: "Vinculo formal e operacao de frota."
    };
  }
  if (profile === "INTERMITENTE") {
    return {
      title: customLabel?.trim() || "Intermitente",
      description: "Vinculo sob convocacao."
    };
  }
  return {
    title: customLabel?.trim() || "MEI",
    description: "Prestador/agregado com pagamento flexivel."
  };
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
): DriverContractProfile | undefined {
  if (value === "CLT_INTERMITENTE") return "INTERMITENTE";
  if (value === "CLT") return "CLT";
  if (value === "MEI") return "MEI";
  return undefined;
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

function resolveEmploymentContractStatusTone(status?: DriverEmploymentContract["status"]): string {
  if (status === "ACTIVE" || status === "EXPIRING_SOON") return "signed";
  if (status === "PENDING_SIGNATURE") return "sent";
  if (status === "DRAFT") return "generated";
  if (status === "EXPIRED" || status === "TERMINATED") return "cancelled";
  return "none";
}

function resolveEmploymentContractProfileLabel(profile: DriverEmploymentContract["profile"]): string {
  if (profile === "INTERMITENTE") return "CLT Intermitente";
  return profile;
}

function resolveEmploymentContractKindLabel(kind: DriverEmploymentContract["kind"]): string {
  return kind === "RENEWAL" ? "Renovacao" : "Contrato inicial";
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

export function DriverProfileEditorOperationSection({
  activeSection,
  contractProfile,
  journey,
  contract,
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
  companyContractProfiles,
  companyBenefitOptions
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
  const [isContractHistoryModalOpen, setIsContractHistoryModalOpen] = useState(false);
  const [selectedContractPreview, setSelectedContractPreview] = useState<DriverEmploymentContract | null>(null);
  const [selectedContractPrintHtml, setSelectedContractPrintHtml] = useState("");
  const [isBuildingContractPreview, setIsBuildingContractPreview] = useState(false);

  const selectedProfile = contractProfile;
  const contractProfileLabelMap = useMemo(() => {
    const map = new Map<DriverContractProfile, string>();
    (companyContractProfiles ?? []).forEach((item) => {
      const value = item.value.trim();
      if (value === "CLT") {
        map.set("CLT", item.label);
      } else if (value === "CLT_INTERMITENTE") {
        map.set("INTERMITENTE", item.label);
      } else if (value === "MEI") {
        map.set("MEI", item.label);
      }
    });
    return map;
  }, [companyContractProfiles]);
  const profile = profileCopy(selectedProfile, contractProfileLabelMap.get(selectedProfile));
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
  const contractsHistory = useMemo(
    () => [...employmentContracts].sort((a, b) => +new Date(b.generatedAt) - +new Date(a.generatedAt)),
    [employmentContracts]
  );
  const hasContractsHistory = contractsHistory.length > 0;
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
      workProfileTemplateId: draftContract.workProfileTemplateId?.trim() || undefined,
      workProfileTemplateName:
        selectedWorkProfile?.name?.trim() || draftContract.workProfileTemplateName?.trim() || undefined,
      workProfileSummary:
        selectedWorkProfile?.summary?.trim() || draftContract.workProfileSummary?.trim() || undefined,
      workProfileContractType:
        selectedWorkProfile?.contractType || draftContract.workProfileContractType || undefined,
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
      hasFixedTermContract: Boolean(draftContract.hasFixedTermContract),
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
          : undefined,
      employmentContracts:
        currentContract.employmentContracts && currentContract.employmentContracts.length > 0
          ? currentContract.employmentContracts
          : undefined
    };

    const mappedProfile =
      mapWorkProfileContractTypeToDriverProfile(normalizedContract.workProfileContractType) ??
      selectedProfile;
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
            {hasContractsHistory ? (
              <button
                type="button"
                className="secondary-link"
                onClick={() => setIsContractHistoryModalOpen(true)}
              >
                Ver contratos anteriores
              </button>
            ) : null}
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
              {hasContractsHistory ? (
                <button
                  type="button"
                  className="secondary-link"
                  onClick={() => setIsContractHistoryModalOpen(true)}
                >
                  Ver contratos anteriores
                </button>
              ) : null}
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
              ) : null}
              {hasContractsHistory ? (
                <button
                  type="button"
                  className="secondary-link"
                  onClick={() => setIsContractHistoryModalOpen(true)}
                >
                  Ver contratos anteriores
                </button>
              ) : null}
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
              <span>Existe contrato em andamento. Para alterar regras, finalize o ciclo atual para liberar edicao.</span>
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

                    const mappedProfile =
                      mapWorkProfileContractTypeToDriverProfile(selected.contractType) ??
                      selectedProfile;
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

            {(companyBenefitOptions?.length ?? 0) > 0 ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Beneficios configurados para a empresa</strong>
                <span>{companyBenefitOptions?.map((item) => item.label).join(", ")}</span>
              </div>
            ) : null}
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

          </fieldset>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isContractHistoryModalOpen}
        title="Contratos anteriores"
        description="Historico completo de contratos gerados para este motorista."
        onClose={() => setIsContractHistoryModalOpen(false)}
        footer={
          <button type="button" className="secondary" onClick={() => setIsContractHistoryModalOpen(false)}>
            Fechar
          </button>
        }
      >
        {hasContractsHistory ? (
          <div className="driver-editor-contracts-history">
            {contractsHistory.map((item) => (
              <article key={item.id} className="driver-editor-contracts-history-item">
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {resolveEmploymentContractProfileLabel(item.profile)} - {resolveEmploymentContractKindLabel(item.kind)} -{" "}
                    {new Date(item.generatedAt).toLocaleString("pt-BR")}
                  </small>
                  <small>
                    Modelo: {item.templateName || item.templateKey} ({item.templateVersion})
                  </small>
                  <small>
                    Vigencia: {item.validFrom ? formatDatePtBr(item.validFrom) : "-"} ate{" "}
                    {item.validTo ? formatDatePtBr(item.validTo) : "indeterminado"}
                  </small>
                  {item.signedAt ? <small>Assinado em {new Date(item.signedAt).toLocaleString("pt-BR")}.</small> : null}
                  {item.terminatedAt ? (
                    <small>Encerrado em {new Date(item.terminatedAt).toLocaleString("pt-BR")}.</small>
                  ) : null}
                </div>
                <div className="driver-editor-contracts-history-actions">
                  <span className={`driver-editor-contracts-status-chip is-${resolveEmploymentContractStatusTone(item.status)}`}>
                    {resolveEmploymentContractStatusLabel(item.status)}
                  </span>
                  <button type="button" className="secondary" onClick={() => handleViewContractClick(item)}>
                    Pre-visualizar
                  </button>
                  <button type="button" className="secondary" onClick={() => handlePrintContractClick(item)}>
                    Imprimir
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="driver-editor-contracts-empty">Nenhum contrato anterior foi encontrado para este motorista.</div>
        )}
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

