import type { DsrWeeklyRestDay } from "./api";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type JourneyType = "FIXED" | "FLEXIBLE" | "INTERMITTENT";
export type BreakType = "NONE" | "FIXED" | "FLEXIBLE";
export type FixedScaleType = "FIVE_TWO" | "SIX_ONE" | "TWELVE_THIRTY_SIX" | "CUSTOM";
export type IntermittentRemunerationType = "HOUR" | "SHIFT" | "DAILY";

export type WorkJourneyDsrPolicySnapshot = {
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
};

export type WorkJourneyFixedConfig = {
  scaleType: FixedScaleType;
  activeDays: DayOfWeek[];
  cycleWorkDays?: number;
  cycleOffDays?: number;
  startTime: string;
  endTime: string;
  dailyHours: number;
  weeklyHours: number;
};

export type WorkJourneyFlexibleConfig = {
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
};

export type WorkJourneyIntermittentConfig = {
  minHoursPerCall: number;
  maxHoursPerCall: number;
  callDays: DayOfWeek[];
  allowedStartTime: string;
  allowedEndTime: string;
  allowMultipleCallsPerDay: boolean;
  remunerationType: IntermittentRemunerationType;
  remunerationValue?: number;
  requireCallAcceptance: boolean;
  requirePriorSchedule: boolean;
};

export type WorkJourneyTemplate = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  type: JourneyType;
  allowedDays: DayOfWeek[];
  breakType: BreakType;
  breakDurationMinutes?: number;
  maxHoursPerDay: number;
  notes?: string;
  dsrPolicy?: WorkJourneyDsrPolicySnapshot;
  fixedConfig?: WorkJourneyFixedConfig;
  flexibleConfig?: WorkJourneyFlexibleConfig;
  intermittentConfig?: WorkJourneyIntermittentConfig;
  createdAt: string;
  updatedAt: string;
};

export const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sab" },
  { value: "SUN", label: "Dom" }
];

export function resolveJourneyTypeLabel(value: JourneyType): string {
  if (value === "FIXED") return "Fixa";
  if (value === "FLEXIBLE") return "Flexivel";
  return "Intermitente";
}

export function resolveBreakTypeLabel(value: BreakType): string {
  if (value === "NONE") return "Sem intervalo";
  if (value === "FLEXIBLE") return "Flexivel";
  return "Fixo";
}

export function resolveScaleTypeLabel(value: FixedScaleType): string {
  if (value === "FIVE_TWO") return "5x2";
  if (value === "SIX_ONE") return "6x1";
  if (value === "TWELVE_THIRTY_SIX") return "12x36";
  return "Personalizada";
}

export function resolveIntermittentRemunerationLabel(value: IntermittentRemunerationType): string {
  if (value === "HOUR") return "Por hora";
  if (value === "SHIFT") return "Por turno";
  return "Por diaria";
}

export function formatDayList(days: DayOfWeek[]): string {
  if (days.length === 0) return "Nenhum dia selecionado";
  const labelByDay = new Map<DayOfWeek, string>(DAY_OPTIONS.map((item) => [item.value, item.label]));
  return days.map((day) => labelByDay.get(day) ?? day).join(", ");
}

export function summarizeWorkJourney(journey: WorkJourneyTemplate): string[] {
  const summary: string[] = [];
  summary.push(`Tipo: ${resolveJourneyTypeLabel(journey.type)}`);
  summary.push(`Dias permitidos: ${formatDayList(journey.allowedDays)}`);
  summary.push(
    journey.breakType === "NONE"
      ? "Intervalo: sem intervalo configurado"
      : `Intervalo: ${resolveBreakTypeLabel(journey.breakType)} (${journey.breakDurationMinutes ?? 0} min)`
  );
  summary.push(`Limite diario: ${journey.maxHoursPerDay}h`);

  if (journey.type === "FIXED" && journey.fixedConfig) {
    const cycleLabel =
      journey.fixedConfig.scaleType === "TWELVE_THIRTY_SIX"
        ? ` (ciclo ${journey.fixedConfig.cycleWorkDays ?? 1}x${journey.fixedConfig.cycleOffDays ?? 1})`
        : "";
    summary.push(
      `Escala ${resolveScaleTypeLabel(journey.fixedConfig.scaleType)}${cycleLabel} com dias ativos em ${formatDayList(journey.fixedConfig.activeDays)}`
    );
    summary.push(`Horario: ${journey.fixedConfig.startTime} as ${journey.fixedConfig.endTime}`);
    summary.push(`Carga: ${journey.fixedConfig.dailyHours}h/dia e ${journey.fixedConfig.weeklyHours}h/semana`);
  }

  if (journey.type === "FLEXIBLE" && journey.flexibleConfig) {
    summary.push(
      `Carga esperada: ${journey.flexibleConfig.expectedDailyHours}h/dia e ${journey.flexibleConfig.expectedWeeklyHours}h/semana`
    );
    summary.push(
      `Entrada permitida: ${journey.flexibleConfig.entryWindowStart} as ${journey.flexibleConfig.entryWindowEnd}`
    );
    summary.push(
      `Saida permitida: ${journey.flexibleConfig.exitWindowStart} as ${journey.flexibleConfig.exitWindowEnd}`
    );
    summary.push(
      `Compensacao: dia ${journey.flexibleConfig.allowSameDayCompensation ? "sim" : "nao"}, semana ${
        journey.flexibleConfig.allowSameWeekCompensation ? "sim" : "nao"
      }`
    );
  }

  if (journey.type === "INTERMITTENT" && journey.intermittentConfig) {
    summary.push(
      `Convocacao: minimo ${journey.intermittentConfig.minHoursPerCall}h e maximo ${journey.intermittentConfig.maxHoursPerCall}h`
    );
    summary.push(`Dias para convocacao: ${formatDayList(journey.intermittentConfig.callDays)}`);
    summary.push(
      `Faixa permitida: ${journey.intermittentConfig.allowedStartTime} as ${journey.intermittentConfig.allowedEndTime}`
    );
    summary.push(
      `Regras: aceite ${journey.intermittentConfig.requireCallAcceptance ? "obrigatorio" : "nao obrigatorio"} | Escala previa ${
        journey.intermittentConfig.requirePriorSchedule ? "sim" : "nao"
      }`
    );
  }

  if (journey.notes && journey.notes.trim().length > 0) {
    summary.push(`Observacoes: ${journey.notes.trim()}`);
  }
  if (journey.dsrPolicy?.enabled) {
    const fallbackDsr =
      journey.dsrPolicy.restMode === "CYCLE"
        ? `Descanso ciclo ${journey.dsrPolicy.cycleWorkDays ?? 1}x${journey.dsrPolicy.cycleOffDays ?? 1}`
        : `Descanso ${journey.dsrPolicy.weeklyRestDay ?? "SUN"}`;
    summary.push(
      `DSR: ${journey.dsrPolicy.summary || fallbackDsr}`
    );
  }

  return summary;
}
