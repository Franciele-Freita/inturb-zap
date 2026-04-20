export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type JourneyType = "FIXED" | "FLEXIBLE" | "INTERMITTENT";
export type BreakType = "NONE" | "FIXED" | "FLEXIBLE";
export type FixedScaleType = "FIVE_TWO" | "SIX_ONE" | "CUSTOM";
export type IntermittentRemunerationType = "HOUR" | "SHIFT" | "DAILY";

export type WorkJourneyFixedConfig = {
  scaleType: FixedScaleType;
  activeDays: DayOfWeek[];
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
  fixedConfig?: WorkJourneyFixedConfig;
  flexibleConfig?: WorkJourneyFlexibleConfig;
  intermittentConfig?: WorkJourneyIntermittentConfig;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "admin_panel_work_journeys_v1";

export const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sab" },
  { value: "SUN", label: "Dom" }
];

const daySet = new Set<DayOfWeek>(DAY_OPTIONS.map((item) => item.value));

const defaultWorkJourneys: WorkJourneyTemplate[] = [
  {
    id: "journey_fixed_6x1",
    name: "Operacao 6x1 - Turno manha",
    description: "Jornada fixa para motoristas de operacao diaria.",
    isActive: true,
    type: "FIXED",
    allowedDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    breakType: "FIXED",
    breakDurationMinutes: 60,
    maxHoursPerDay: 10,
    fixedConfig: {
      scaleType: "SIX_ONE",
      activeDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      startTime: "07:00",
      endTime: "15:20",
      dailyHours: 7.33,
      weeklyHours: 44
    },
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:00:00.000Z"
  },
  {
    id: "journey_flexible_driver",
    name: "Flexivel motorista urbano",
    description: "Jornada com faixas de entrada e saida para compensacao no mesmo dia.",
    isActive: true,
    type: "FLEXIBLE",
    allowedDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    breakType: "FLEXIBLE",
    breakDurationMinutes: 45,
    maxHoursPerDay: 10,
    flexibleConfig: {
      expectedDailyHours: 8,
      expectedWeeklyHours: 44,
      entryWindowStart: "06:00",
      entryWindowEnd: "10:00",
      exitWindowStart: "14:00",
      exitWindowEnd: "20:00",
      minimumBreakMinutes: 30,
      breakMandatory: true,
      allowSameDayCompensation: true,
      allowSameWeekCompensation: true
    },
    createdAt: "2026-04-10T10:10:00.000Z",
    updatedAt: "2026-04-10T10:10:00.000Z"
  },
  {
    id: "journey_intermittent_call",
    name: "Intermitente por convocacao",
    description: "Jornada intermitente para picos de demanda.",
    isActive: false,
    type: "INTERMITTENT",
    allowedDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    breakType: "NONE",
    maxHoursPerDay: 12,
    intermittentConfig: {
      minHoursPerCall: 4,
      maxHoursPerCall: 8,
      callDays: ["FRI", "SAT", "SUN"],
      allowedStartTime: "06:00",
      allowedEndTime: "23:00",
      allowMultipleCallsPerDay: false,
      remunerationType: "SHIFT",
      remunerationValue: undefined,
      requireCallAcceptance: true,
      requirePriorSchedule: true
    },
    createdAt: "2026-04-10T10:20:00.000Z",
    updatedAt: "2026-04-10T10:20:00.000Z"
  }
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
    summary.push(
      `Escala ${resolveScaleTypeLabel(journey.fixedConfig.scaleType)} com dias ativos em ${formatDayList(journey.fixedConfig.activeDays)}`
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

  return summary;
}

export function loadWorkJourneys(): WorkJourneyTemplate[] {
  if (typeof window === "undefined") {
    return sortJourneys(defaultWorkJourneys);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return sortJourneys(defaultWorkJourneys);
  }

  try {
    const parsed = JSON.parse(raw) as WorkJourneyTemplate[];
    if (!Array.isArray(parsed)) {
      return sortJourneys(defaultWorkJourneys);
    }

    return sortJourneys(parsed.map(sanitizeJourney).filter((item): item is WorkJourneyTemplate => Boolean(item)));
  } catch {
    return sortJourneys(defaultWorkJourneys);
  }
}

export function saveWorkJourneys(items: WorkJourneyTemplate[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortJourneys(items)));
}

function sortJourneys(items: WorkJourneyTemplate[]): WorkJourneyTemplate[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function sanitizeJourney(input: WorkJourneyTemplate): WorkJourneyTemplate | null {
  if (!input || typeof input !== "object") return null;
  if (typeof input.id !== "string" || typeof input.name !== "string") return null;

  const type: JourneyType =
    input.type === "FLEXIBLE" || input.type === "INTERMITTENT" ? input.type : "FIXED";

  const allowedDays = sanitizeDays(input.allowedDays);
  const breakType: BreakType =
    input.breakType === "NONE" || input.breakType === "FLEXIBLE" ? input.breakType : "FIXED";

  const fixedConfig = type === "FIXED" ? sanitizeFixedConfig(input.fixedConfig) : undefined;
  const flexibleConfig = type === "FLEXIBLE" ? sanitizeFlexibleConfig(input.flexibleConfig) : undefined;
  const intermittentConfig =
    type === "INTERMITTENT" ? sanitizeIntermittentConfig(input.intermittentConfig) : undefined;

  return {
    id: input.id,
    name: input.name.trim() || "Jornada sem nome",
    description: typeof input.description === "string" ? input.description : undefined,
    isActive: Boolean(input.isActive),
    type,
    allowedDays: allowedDays.length > 0 ? allowedDays : ["MON", "TUE", "WED", "THU", "FRI"],
    breakType,
    breakDurationMinutes:
      breakType === "NONE"
        ? undefined
        : Number.isFinite(Number(input.breakDurationMinutes))
          ? Math.max(0, Math.trunc(Number(input.breakDurationMinutes)))
          : 0,
    maxHoursPerDay:
      Number.isFinite(input.maxHoursPerDay) && input.maxHoursPerDay > 0 ? Number(input.maxHoursPerDay) : 8,
    notes: typeof input.notes === "string" ? input.notes : undefined,
    fixedConfig,
    flexibleConfig,
    intermittentConfig,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString()
  };
}

function sanitizeDays(days: DayOfWeek[] | undefined): DayOfWeek[] {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.filter((day): day is DayOfWeek => daySet.has(day as DayOfWeek)))];
}

function sanitizeFixedConfig(value: WorkJourneyTemplate["fixedConfig"]): WorkJourneyFixedConfig {
  const input = value ?? {
    scaleType: "FIVE_TWO",
    activeDays: ["MON", "TUE", "WED", "THU", "FRI"],
    startTime: "08:00",
    endTime: "17:00",
    dailyHours: 8,
    weeklyHours: 40
  };

  return {
    scaleType: input.scaleType === "SIX_ONE" || input.scaleType === "CUSTOM" ? input.scaleType : "FIVE_TWO",
    activeDays: sanitizeDays(input.activeDays),
    startTime: typeof input.startTime === "string" ? input.startTime : "08:00",
    endTime: typeof input.endTime === "string" ? input.endTime : "17:00",
    dailyHours: Number.isFinite(input.dailyHours) ? Number(input.dailyHours) : 8,
    weeklyHours: Number.isFinite(input.weeklyHours) ? Number(input.weeklyHours) : 40
  };
}

function sanitizeFlexibleConfig(value: WorkJourneyTemplate["flexibleConfig"]): WorkJourneyFlexibleConfig {
  const input = value ?? {
    expectedDailyHours: 8,
    expectedWeeklyHours: 44,
    entryWindowStart: "06:00",
    entryWindowEnd: "10:00",
    exitWindowStart: "14:00",
    exitWindowEnd: "20:00",
    minimumBreakMinutes: 30,
    breakMandatory: true,
    allowSameDayCompensation: true,
    allowSameWeekCompensation: true
  };

  return {
    expectedDailyHours: Number.isFinite(input.expectedDailyHours) ? Number(input.expectedDailyHours) : 8,
    expectedWeeklyHours: Number.isFinite(input.expectedWeeklyHours) ? Number(input.expectedWeeklyHours) : 44,
    entryWindowStart: typeof input.entryWindowStart === "string" ? input.entryWindowStart : "06:00",
    entryWindowEnd: typeof input.entryWindowEnd === "string" ? input.entryWindowEnd : "10:00",
    exitWindowStart: typeof input.exitWindowStart === "string" ? input.exitWindowStart : "14:00",
    exitWindowEnd: typeof input.exitWindowEnd === "string" ? input.exitWindowEnd : "20:00",
    minimumBreakMinutes: Number.isFinite(input.minimumBreakMinutes) ? Math.max(0, Math.trunc(input.minimumBreakMinutes)) : 0,
    breakMandatory: Boolean(input.breakMandatory),
    allowSameDayCompensation: Boolean(input.allowSameDayCompensation),
    allowSameWeekCompensation: Boolean(input.allowSameWeekCompensation)
  };
}

function sanitizeIntermittentConfig(
  value: WorkJourneyTemplate["intermittentConfig"]
): WorkJourneyIntermittentConfig {
  const input = value ?? {
    minHoursPerCall: 4,
    maxHoursPerCall: 8,
    callDays: ["MON", "TUE", "WED", "THU", "FRI"],
    allowedStartTime: "06:00",
    allowedEndTime: "22:00",
    allowMultipleCallsPerDay: false,
    remunerationType: "HOUR",
    remunerationValue: undefined,
    requireCallAcceptance: true,
    requirePriorSchedule: false
  };

  return {
    minHoursPerCall: Number.isFinite(input.minHoursPerCall) ? Number(input.minHoursPerCall) : 4,
    maxHoursPerCall: Number.isFinite(input.maxHoursPerCall) ? Number(input.maxHoursPerCall) : 8,
    callDays: sanitizeDays(input.callDays),
    allowedStartTime: typeof input.allowedStartTime === "string" ? input.allowedStartTime : "06:00",
    allowedEndTime: typeof input.allowedEndTime === "string" ? input.allowedEndTime : "22:00",
    allowMultipleCallsPerDay: Boolean(input.allowMultipleCallsPerDay),
    remunerationType:
      input.remunerationType === "SHIFT" || input.remunerationType === "DAILY"
        ? input.remunerationType
        : "HOUR",
    remunerationValue:
      Number.isFinite(input.remunerationValue) && Number(input.remunerationValue) >= 0
        ? Number(input.remunerationValue)
        : undefined,
    requireCallAcceptance: Boolean(input.requireCallAcceptance),
    requirePriorSchedule: Boolean(input.requirePriorSchedule)
  };
}
