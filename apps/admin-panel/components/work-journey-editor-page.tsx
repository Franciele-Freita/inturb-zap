"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/api";
import {
  BreakType,
  DAY_OPTIONS,
  DayOfWeek,
  FixedScaleType,
  JourneyType,
  WorkJourneyTemplate,
  formatDayList,
  loadWorkJourneys,
  saveWorkJourneys
} from "../lib/work-journeys";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  journeyId?: string;
};

type JourneyFormState = {
  name: string;
  description: string;
  isActive: boolean;
  type: JourneyType;
  breakType: BreakType;
  breakDurationMinutes: string;
  notes: string;
  fixedActiveDays: DayOfWeek[];
  fixedStartTime: string;
  fixedEndTime: string;
  fixedDailyHours: string;
  fixedWeeklyHours: string;
  fixedMaxHoursPerDay: string;
  flexExpectedDailyHours: string;
  flexExpectedWeeklyHours: string;
  flexAllowedDays: DayOfWeek[];
  flexEntryWindowStart: string;
  flexEntryWindowEnd: string;
  flexExitWindowStart: string;
  flexExitWindowEnd: string;
  flexAllowSameDayCompensation: boolean;
  flexAllowSameWeekCompensation: boolean;
  flexMaxHoursPerDay: string;
  interMinHoursPerCall: string;
  interMaxHoursPerCall: string;
  interCallDays: DayOfWeek[];
  interAllowedStartTime: string;
  interAllowedEndTime: string;
  interRequireCallAcceptance: boolean;
  interMaxHoursPerDay: string;
};

type InlineFieldKey =
  | "name"
  | "breakDurationMinutes"
  | "fixedActiveDays"
  | "fixedStartTime"
  | "fixedEndTime"
  | "fixedMaxHoursPerDay"
  | "flexExpectedWeeklyHours"
  | "flexExpectedDailyHours"
  | "flexAllowedDays"
  | "flexEntryWindow"
  | "flexExitWindow"
  | "flexMaxHoursPerDay"
  | "interMinHoursPerCall"
  | "interMaxHoursPerCall"
  | "interCallDays"
  | "interAllowedWindow"
  | "interMaxHoursPerDay";

type InlineFieldErrors = Partial<Record<InlineFieldKey, string>>;

type JourneyWizardStep = "TYPE_AND_BASIC" | "GENERAL_STRUCTURE" | "SPECIFIC_RULES" | "REVIEW";

type JourneyWizardStepDefinition = {
  key: JourneyWizardStep;
  index: string;
  title: string;
  description: string;
};

const defaultForm: JourneyFormState = {
  name: "",
  description: "",
  isActive: true,
  type: "FIXED",
  breakType: "FIXED",
  breakDurationMinutes: "60",
  notes: "",
  fixedActiveDays: ["MON", "TUE", "WED", "THU", "FRI"],
  fixedStartTime: "08:00",
  fixedEndTime: "17:00",
  fixedDailyHours: "8",
  fixedWeeklyHours: "40",
  fixedMaxHoursPerDay: "10",
  flexExpectedDailyHours: "",
  flexExpectedWeeklyHours: "44",
  flexAllowedDays: ["MON", "TUE", "WED", "THU", "FRI"],
  flexEntryWindowStart: "06:00",
  flexEntryWindowEnd: "10:00",
  flexExitWindowStart: "14:00",
  flexExitWindowEnd: "20:00",
  flexAllowSameDayCompensation: true,
  flexAllowSameWeekCompensation: true,
  flexMaxHoursPerDay: "10",
  interMinHoursPerCall: "4",
  interMaxHoursPerCall: "8",
  interCallDays: ["FRI", "SAT", "SUN"],
  interAllowedStartTime: "06:00",
  interAllowedEndTime: "23:00",
  interRequireCallAcceptance: true,
  interMaxHoursPerDay: "12"
};

const DAY_LONG_LABEL: Record<DayOfWeek, string> = {
  MON: "segunda",
  TUE: "terca",
  WED: "quarta",
  THU: "quinta",
  FRI: "sexta",
  SAT: "sabado",
  SUN: "domingo"
};

const WORKWEEK_DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
const WEEKEND_PEAK_DAYS: DayOfWeek[] = ["FRI", "SAT", "SUN"];

function toNum(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: string): number | undefined {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : undefined;
}

function isClock(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

function toMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return hour * 60 + minute;
}

function formatHoursValue(value: number): string {
  const normalized = Number(value.toFixed(2));
  return Number.isInteger(normalized) ? String(normalized) : String(normalized);
}

function normalizeDays(days: DayOfWeek[]): DayOfWeek[] {
  const unique = [...new Set(days)];
  const orderMap = new Map<DayOfWeek, number>(DAY_OPTIONS.map((day, index) => [day.value, index]));
  return unique.sort((a, b) => (orderMap.get(a) ?? 99) - (orderMap.get(b) ?? 99));
}

function isSameDayList(left: DayOfWeek[], right: DayOfWeek[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function capitalizeFirst(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDaysForSentence(days: DayOfWeek[]): string {
  const normalized = normalizeDays(days);
  if (normalized.length === 0) return "nenhum dia";
  if (isSameDayList(normalized, WORKWEEK_DAYS)) return "segunda a sexta";
  if (isSameDayList(normalized, WEEKEND_PEAK_DAYS)) return "sexta a domingo";
  if (normalized.length === 7) return "todos os dias";
  return normalized.map((day) => DAY_LONG_LABEL[day]).join(", ");
}

function deriveScaleTypeFromDays(days: DayOfWeek[]): FixedScaleType {
  const count = normalizeDays(days).length;
  if (count === 5) return "FIVE_TWO";
  if (count === 6) return "SIX_ONE";
  return "CUSTOM";
}

function computeWorkedHoursFromSchedule(
  startTime: string,
  endTime: string,
  breakType: BreakType,
  breakDurationMinutesRaw: string
): number | undefined {
  if (!isClock(startTime) || !isClock(endTime)) {
    return undefined;
  }

  const breakMinutes = breakType === "NONE" ? 0 : toInt(breakDurationMinutesRaw) ?? 0;
  const workedMinutes = toMinutes(endTime) - toMinutes(startTime) - breakMinutes;
  if (workedMinutes <= 0) {
    return undefined;
  }

  return workedMinutes / 60;
}

function deriveFlexibleDailyFromWeekly(weeklyHours: number | undefined, days: DayOfWeek[]): number | undefined {
  if (weeklyHours === undefined || weeklyHours <= 0) return undefined;
  const dayCount = normalizeDays(days).length;
  const divisor = dayCount > 0 ? dayCount : 5;
  return Number((weeklyHours / divisor).toFixed(2));
}

function mapJourneyToForm(journey: WorkJourneyTemplate): JourneyFormState {
  return {
    name: journey.name,
    description: journey.description ?? "",
    isActive: journey.isActive,
    type: journey.type,
    breakType: journey.breakType,
    breakDurationMinutes: journey.breakDurationMinutes === undefined ? "0" : String(journey.breakDurationMinutes),
    notes: journey.notes ?? "",
    fixedActiveDays: normalizeDays(
      journey.fixedConfig?.activeDays ?? journey.allowedDays ?? ["MON", "TUE", "WED", "THU", "FRI"]
    ),
    fixedStartTime: journey.fixedConfig?.startTime ?? "08:00",
    fixedEndTime: journey.fixedConfig?.endTime ?? "17:00",
    fixedDailyHours: String(journey.fixedConfig?.dailyHours ?? 8),
    fixedWeeklyHours: String(journey.fixedConfig?.weeklyHours ?? 40),
    fixedMaxHoursPerDay: String(journey.maxHoursPerDay),
    flexExpectedDailyHours:
      journey.flexibleConfig?.expectedDailyHours !== undefined
        ? String(journey.flexibleConfig.expectedDailyHours)
        : "",
    flexExpectedWeeklyHours: String(journey.flexibleConfig?.expectedWeeklyHours ?? 44),
    flexAllowedDays: normalizeDays(journey.allowedDays ?? ["MON", "TUE", "WED", "THU", "FRI"]),
    flexEntryWindowStart: journey.flexibleConfig?.entryWindowStart ?? "06:00",
    flexEntryWindowEnd: journey.flexibleConfig?.entryWindowEnd ?? "10:00",
    flexExitWindowStart: journey.flexibleConfig?.exitWindowStart ?? "14:00",
    flexExitWindowEnd: journey.flexibleConfig?.exitWindowEnd ?? "20:00",
    flexAllowSameDayCompensation: journey.flexibleConfig?.allowSameDayCompensation ?? true,
    flexAllowSameWeekCompensation: journey.flexibleConfig?.allowSameWeekCompensation ?? true,
    flexMaxHoursPerDay: String(journey.maxHoursPerDay),
    interMinHoursPerCall: String(journey.intermittentConfig?.minHoursPerCall ?? 4),
    interMaxHoursPerCall: String(journey.intermittentConfig?.maxHoursPerCall ?? 8),
    interCallDays: normalizeDays(
      journey.intermittentConfig?.callDays ?? journey.allowedDays ?? ["FRI", "SAT", "SUN"]
    ),
    interAllowedStartTime: journey.intermittentConfig?.allowedStartTime ?? "06:00",
    interAllowedEndTime: journey.intermittentConfig?.allowedEndTime ?? "23:00",
    interRequireCallAcceptance: journey.intermittentConfig?.requireCallAcceptance ?? true,
    interMaxHoursPerDay: String(journey.maxHoursPerDay)
  };
}

function getTypeDescription(type: JourneyType): string {
  if (type === "FIXED") {
    return "Jornada com horarios definidos e recorrentes, aplicada a rotinas com entrada e saida previsiveis.";
  }
  if (type === "FLEXIBLE") {
    return "Jornada com carga horaria definida, mas com liberdade dentro de faixas de entrada e saida permitidas.";
  }
  return "Jornada sob convocacao, com definicao de disponibilidade e limites por convocacao.";
}

function getSpecificSectionMeta(type: JourneyType): { title: string; description: string } {
  if (type === "FIXED") {
    return {
      title: "Regras da jornada fixa",
      description: "Foco em horario fixo e recorrencia. Entrada e saida sao a base da carga calculada."
    };
  }
  if (type === "FLEXIBLE") {
    return {
      title: "Regras da jornada flexivel",
      description:
        "O colaborador deve cumprir a carga horaria prevista respeitando os dias permitidos e as faixas configuradas."
    };
  }
  return {
    title: "Regras da jornada intermitente",
    description: "Configure quando o colaborador pode ser convocado e os limites de cada convocacao."
  };
}

function buildJourneyWizardSteps(type: JourneyType): JourneyWizardStepDefinition[] {
  return [
    {
      key: "TYPE_AND_BASIC",
      index: "01",
      title: "Tipo e dados basicos",
      description: "Defina o modelo e identificacao da jornada"
    },
    {
      key: "GENERAL_STRUCTURE",
      index: "02",
      title: "Estrutura geral",
      description: "Configure intervalo e regras operacionais comuns"
    },
    {
      key: "SPECIFIC_RULES",
      index: "03",
      title: "Regras especificas",
      description:
        type === "FIXED"
          ? "Horarios e recorrencia da jornada fixa"
          : type === "FLEXIBLE"
            ? "Carga, faixas e compensacao da jornada flexivel"
            : "Convocacao e regras da jornada intermitente"
    },
    {
      key: "REVIEW",
      index: "04",
      title: "Revisao",
      description: "Confira o resumo antes de salvar"
    }
  ];
}

function getBreakTypeHelpText(breakType: BreakType): string {
  if (breakType === "NONE") {
    return "Nenhum intervalo sera considerado nesta jornada.";
  }
  if (breakType === "FIXED") {
    return "O intervalo sera aplicado com duracao fixa na jornada.";
  }
  return "O intervalo podera ser realizado de forma flexivel dentro da jornada, conforme politica definida.";
}

function buildJourneyFromForm(
  form: JourneyFormState,
  metadata: { id: string; createdAt: string; updatedAt: string }
): WorkJourneyTemplate {
  const breakDuration = form.breakType === "NONE" ? undefined : toInt(form.breakDurationMinutes) ?? 0;

  if (form.type === "FIXED") {
    const activeDays = normalizeDays(form.fixedActiveDays);
    const computedDaily = computeWorkedHoursFromSchedule(
      form.fixedStartTime,
      form.fixedEndTime,
      form.breakType,
      form.breakDurationMinutes
    );
    const dailyHours = computedDaily ?? toNum(form.fixedDailyHours) ?? 8;
    const weeklyHours = Number((dailyHours * activeDays.length).toFixed(2));

    return {
      id: metadata.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      type: form.type,
      allowedDays: activeDays,
      breakType: form.breakType,
      breakDurationMinutes: breakDuration,
      maxHoursPerDay: toNum(form.fixedMaxHoursPerDay) ?? 8,
      notes: form.notes.trim() || undefined,
      fixedConfig: {
        scaleType: deriveScaleTypeFromDays(activeDays),
        activeDays,
        startTime: form.fixedStartTime,
        endTime: form.fixedEndTime,
        dailyHours: Number(dailyHours.toFixed(2)),
        weeklyHours
      },
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };
  }

  if (form.type === "FLEXIBLE") {
    const allowedDays = normalizeDays(form.flexAllowedDays);
    const expectedWeeklyHours = toNum(form.flexExpectedWeeklyHours) ?? 44;
    const explicitDaily = toNum(form.flexExpectedDailyHours);
    const derivedDaily = deriveFlexibleDailyFromWeekly(expectedWeeklyHours, allowedDays);

    return {
      id: metadata.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      type: form.type,
      allowedDays,
      breakType: form.breakType,
      breakDurationMinutes: breakDuration,
      maxHoursPerDay: toNum(form.flexMaxHoursPerDay) ?? 8,
      notes: form.notes.trim() || undefined,
      flexibleConfig: {
        expectedDailyHours: explicitDaily ?? derivedDaily ?? 8,
        expectedWeeklyHours,
        entryWindowStart: form.flexEntryWindowStart,
        entryWindowEnd: form.flexEntryWindowEnd,
        exitWindowStart: form.flexExitWindowStart,
        exitWindowEnd: form.flexExitWindowEnd,
        minimumBreakMinutes: form.breakType === "NONE" ? 0 : toInt(form.breakDurationMinutes) ?? 0,
        breakMandatory: form.breakType !== "NONE",
        allowSameDayCompensation: form.flexAllowSameDayCompensation,
        allowSameWeekCompensation: form.flexAllowSameWeekCompensation
      },
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };
  }

  const callDays = normalizeDays(form.interCallDays);

  return {
    id: metadata.id,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    isActive: form.isActive,
    type: form.type,
    allowedDays: callDays,
    breakType: form.breakType,
    breakDurationMinutes: breakDuration,
    maxHoursPerDay: toNum(form.interMaxHoursPerDay) ?? 8,
    notes: form.notes.trim() || undefined,
    intermittentConfig: {
      minHoursPerCall: toNum(form.interMinHoursPerCall) ?? 4,
      maxHoursPerCall: toNum(form.interMaxHoursPerCall) ?? 8,
      callDays,
      allowedStartTime: form.interAllowedStartTime,
      allowedEndTime: form.interAllowedEndTime,
      allowMultipleCallsPerDay: false,
      remunerationType: "HOUR",
      remunerationValue: undefined,
      requireCallAcceptance: form.interRequireCallAcceptance,
      requirePriorSchedule: false
    },
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  };
}

function validateForm(form: JourneyFormState): string[] {
  const issues: string[] = [];

  if (form.name.trim().length < 3) {
    issues.push("Nome da jornada precisa ter pelo menos 3 caracteres.");
  }

  if (form.breakType !== "NONE") {
    const breakDuration = toInt(form.breakDurationMinutes);
    if (breakDuration === undefined || breakDuration <= 0) {
      issues.push(
        form.breakType === "FLEXIBLE"
          ? "Informe a duracao minima do intervalo em minutos."
          : "Informe a duracao do intervalo em minutos."
      );
    }
  }

  if (form.type === "FIXED") {
    const maxHoursPerDay = toNum(form.fixedMaxHoursPerDay);
    if (maxHoursPerDay === undefined || maxHoursPerDay <= 0 || maxHoursPerDay > 24) {
      issues.push("Limite maximo de horas por dia da jornada fixa deve estar entre 0.5 e 24.");
    }
    if (form.fixedActiveDays.length === 0) {
      issues.push("Selecione os dias ativos da jornada fixa.");
    }
    if (!isClock(form.fixedStartTime) || !isClock(form.fixedEndTime)) {
      issues.push("Hora de entrada e saida da jornada fixa precisam estar no formato HH:mm.");
    } else if (toMinutes(form.fixedEndTime) <= toMinutes(form.fixedStartTime)) {
      issues.push("Hora de saida da jornada fixa deve ser maior que a hora de entrada.");
    }

    const computedDaily = computeWorkedHoursFromSchedule(
      form.fixedStartTime,
      form.fixedEndTime,
      form.breakType,
      form.breakDurationMinutes
    );
    if (computedDaily === undefined) {
      issues.push("Horario e intervalo da jornada fixa geraram uma carga diaria invalida.");
    } else if (maxHoursPerDay !== undefined && computedDaily > maxHoursPerDay) {
      issues.push("Carga diaria calculada da jornada fixa nao pode ultrapassar o limite maximo por dia.");
    }
  }

  if (form.type === "FLEXIBLE") {
    const maxHoursPerDay = toNum(form.flexMaxHoursPerDay);
    const expectedWeekly = toNum(form.flexExpectedWeeklyHours);
    const expectedDailyRaw = form.flexExpectedDailyHours.trim();
    const expectedDaily = expectedDailyRaw.length > 0 ? toNum(expectedDailyRaw) : undefined;
    const dayCount = normalizeDays(form.flexAllowedDays).length;

    if (maxHoursPerDay === undefined || maxHoursPerDay <= 0 || maxHoursPerDay > 24) {
      issues.push("Limite maximo de horas por dia da jornada flexivel deve estar entre 0.5 e 24.");
    }
    if (form.flexAllowedDays.length === 0) {
      issues.push("Selecione ao menos um dia permitido para a jornada flexivel.");
    }
    if (expectedWeekly === undefined || expectedWeekly <= 0) {
      issues.push("Informe a carga horaria semanal esperada da jornada flexivel.");
    }
    if (expectedDailyRaw.length > 0 && (expectedDaily === undefined || expectedDaily <= 0)) {
      issues.push("A carga horaria diaria esperada deve ser maior que zero quando informada.");
    }

    if (expectedDaily !== undefined && maxHoursPerDay !== undefined && expectedDaily > maxHoursPerDay) {
      issues.push("Carga diaria esperada da jornada flexivel nao pode ultrapassar o limite maximo por dia.");
    }

    if (expectedWeekly !== undefined && maxHoursPerDay !== undefined && dayCount > 0) {
      const maxWeeklyByLimit = maxHoursPerDay * dayCount;
      if (expectedWeekly > maxWeeklyByLimit) {
        issues.push("Carga semanal esperada ultrapassa o limite diario considerando os dias permitidos.");
      }
    }

    if (expectedDaily !== undefined && expectedWeekly !== undefined && dayCount > 0) {
      const impliedWeekly = Number((expectedDaily * dayCount).toFixed(2));
      if (Math.abs(impliedWeekly - expectedWeekly) > 1) {
        issues.push(
          "Carga diaria e semanal da jornada flexivel estao incoerentes para os dias permitidos."
        );
      }
    }

    if (!isClock(form.flexEntryWindowStart) || !isClock(form.flexEntryWindowEnd)) {
      issues.push("Faixa permitida de entrada da jornada flexivel esta invalida.");
    } else if (toMinutes(form.flexEntryWindowEnd) <= toMinutes(form.flexEntryWindowStart)) {
      issues.push("Fim da faixa de entrada deve ser maior que o inicio.");
    }

    if (!isClock(form.flexExitWindowStart) || !isClock(form.flexExitWindowEnd)) {
      issues.push("Faixa permitida de saida da jornada flexivel esta invalida.");
    } else if (toMinutes(form.flexExitWindowEnd) <= toMinutes(form.flexExitWindowStart)) {
      issues.push("Fim da faixa de saida deve ser maior que o inicio.");
    }
  }

  if (form.type === "INTERMITTENT") {
    const maxHoursPerDay = toNum(form.interMaxHoursPerDay);
    const minHours = toNum(form.interMinHoursPerCall);
    const maxHours = toNum(form.interMaxHoursPerCall);

    if (maxHoursPerDay === undefined || maxHoursPerDay <= 0 || maxHoursPerDay > 24) {
      issues.push("Limite maximo de horas por dia da jornada intermitente deve estar entre 0.5 e 24.");
    }
    if (minHours === undefined || minHours <= 0) {
      issues.push("Informe a quantidade minima de horas por convocacao.");
    }
    if (maxHours === undefined || maxHours <= 0) {
      issues.push("Informe a quantidade maxima de horas por convocacao.");
    }
    if (minHours !== undefined && maxHours !== undefined && minHours > maxHours) {
      issues.push("Quantidade minima de horas por convocacao nao pode ser maior que a maxima.");
    }
    if (maxHours !== undefined && maxHoursPerDay !== undefined && maxHours > maxHoursPerDay) {
      issues.push("Maximo de horas por convocacao nao pode ultrapassar o limite maximo de horas por dia.");
    }
    if (form.interCallDays.length === 0) {
      issues.push("Selecione ao menos um dia permitido para convocacao.");
    }
    if (!isClock(form.interAllowedStartTime) || !isClock(form.interAllowedEndTime)) {
      issues.push("Faixa de horario permitida da jornada intermitente esta invalida.");
    } else if (toMinutes(form.interAllowedEndTime) <= toMinutes(form.interAllowedStartTime)) {
      issues.push("Fim da faixa de horario permitida deve ser maior que o inicio.");
    }
  }

  return issues;
}

function computeInlineFieldErrors(form: JourneyFormState): InlineFieldErrors {
  const errors: InlineFieldErrors = {};

  if (form.name.trim().length < 3) {
    errors.name = "Informe pelo menos 3 caracteres.";
  }

  if (form.breakType !== "NONE") {
    const breakDuration = toInt(form.breakDurationMinutes);
    if (breakDuration === undefined || breakDuration <= 0) {
      errors.breakDurationMinutes = "Duracao obrigatoria para o tipo de intervalo selecionado.";
    }
  }

  if (form.type === "FIXED") {
    if (form.fixedActiveDays.length === 0) {
      errors.fixedActiveDays = "Selecione ao menos um dia ativo.";
    }
    if (!isClock(form.fixedStartTime)) {
      errors.fixedStartTime = "Horario invalido.";
    }
    if (!isClock(form.fixedEndTime)) {
      errors.fixedEndTime = "Horario invalido.";
    }
    const maxHours = toNum(form.fixedMaxHoursPerDay);
    if (maxHours === undefined || maxHours <= 0 || maxHours > 24) {
      errors.fixedMaxHoursPerDay = "Informe um valor entre 0.5 e 24.";
    }
  }

  if (form.type === "FLEXIBLE") {
    const weekly = toNum(form.flexExpectedWeeklyHours);
    const dailyRaw = form.flexExpectedDailyHours.trim();
    const daily = dailyRaw.length > 0 ? toNum(dailyRaw) : undefined;
    const maxHours = toNum(form.flexMaxHoursPerDay);
    const dayCount = normalizeDays(form.flexAllowedDays).length;

    if (weekly === undefined || weekly <= 0) {
      errors.flexExpectedWeeklyHours = "Informe a carga semanal esperada.";
    }
    if (dailyRaw.length > 0 && (daily === undefined || daily <= 0)) {
      errors.flexExpectedDailyHours = "Quando informada, a carga diaria deve ser maior que zero.";
    }
    if (form.flexAllowedDays.length === 0) {
      errors.flexAllowedDays = "Selecione ao menos um dia permitido.";
    }
    if (maxHours === undefined || maxHours <= 0 || maxHours > 24) {
      errors.flexMaxHoursPerDay = "Informe um valor entre 0.5 e 24.";
    }
    if (!isClock(form.flexEntryWindowStart) || !isClock(form.flexEntryWindowEnd)) {
      errors.flexEntryWindow = "Faixa de entrada invalida.";
    } else if (toMinutes(form.flexEntryWindowEnd) <= toMinutes(form.flexEntryWindowStart)) {
      errors.flexEntryWindow = "Fim deve ser maior que o inicio.";
    }
    if (!isClock(form.flexExitWindowStart) || !isClock(form.flexExitWindowEnd)) {
      errors.flexExitWindow = "Faixa de saida invalida.";
    } else if (toMinutes(form.flexExitWindowEnd) <= toMinutes(form.flexExitWindowStart)) {
      errors.flexExitWindow = "Fim deve ser maior que o inicio.";
    }
    if (daily !== undefined && weekly !== undefined && dayCount > 0) {
      const impliedWeekly = Number((daily * dayCount).toFixed(2));
      if (Math.abs(impliedWeekly - weekly) > 1) {
        errors.flexExpectedDailyHours = "Valor inconsistente com carga semanal e dias permitidos.";
      }
    }
  }

  if (form.type === "INTERMITTENT") {
    const maxHours = toNum(form.interMaxHoursPerDay);
    const minHours = toNum(form.interMinHoursPerCall);
    const maxPerCall = toNum(form.interMaxHoursPerCall);

    if (minHours === undefined || minHours <= 0) {
      errors.interMinHoursPerCall = "Informe um valor maior que zero.";
    }
    if (maxPerCall === undefined || maxPerCall <= 0) {
      errors.interMaxHoursPerCall = "Informe um valor maior que zero.";
    } else if (minHours !== undefined && minHours > maxPerCall) {
      errors.interMaxHoursPerCall = "Deve ser maior ou igual ao minimo.";
    }
    if (form.interCallDays.length === 0) {
      errors.interCallDays = "Selecione ao menos um dia permitido.";
    }
    if (!isClock(form.interAllowedStartTime) || !isClock(form.interAllowedEndTime)) {
      errors.interAllowedWindow = "Faixa de horario invalida.";
    } else if (toMinutes(form.interAllowedEndTime) <= toMinutes(form.interAllowedStartTime)) {
      errors.interAllowedWindow = "Fim deve ser maior que o inicio.";
    }
    if (maxHours === undefined || maxHours <= 0 || maxHours > 24) {
      errors.interMaxHoursPerDay = "Informe um valor entre 0.5 e 24.";
    }
  }

  return errors;
}

function resolveBreakSummary(form: JourneyFormState): string {
  if (form.breakType === "NONE") {
    return "sem intervalo";
  }
  const minutes = toInt(form.breakDurationMinutes) ?? 0;
  if (form.breakType === "FLEXIBLE") {
    return `com intervalo flexivel de no minimo ${minutes} minutos`;
  }
  return `com ${minutes} minutos de intervalo`;
}

function buildJourneyPreviewText(form: JourneyFormState): string {
  if (form.type === "FIXED") {
    const computedDaily = computeWorkedHoursFromSchedule(
      form.fixedStartTime,
      form.fixedEndTime,
      form.breakType,
      form.breakDurationMinutes
    );
    const dayPhrase = capitalizeFirst(formatDaysForSentence(form.fixedActiveDays));
    const daily = computedDaily !== undefined ? formatHoursValue(computedDaily) : form.fixedDailyHours || "-";
    const weekly =
      computedDaily !== undefined
        ? formatHoursValue(computedDaily * normalizeDays(form.fixedActiveDays).length)
        : form.fixedWeeklyHours || "-";
    return `${dayPhrase}, das ${form.fixedStartTime} as ${form.fixedEndTime}, ${resolveBreakSummary(form)}. Jornada estimada de ${daily}h por dia e ${weekly}h por semana.`;
  }

  if (form.type === "FLEXIBLE") {
    const dayPhrase = capitalizeFirst(formatDaysForSentence(form.flexAllowedDays));
    return `${dayPhrase}, com entrada entre ${form.flexEntryWindowStart} e ${form.flexEntryWindowEnd} e saida entre ${form.flexExitWindowStart} e ${form.flexExitWindowEnd}. Carga esperada de ${form.flexExpectedWeeklyHours || "-"}h por semana.`;
  }

  const dayPhrase = formatDaysForSentence(form.interCallDays);
  return `Convocacoes permitidas de ${dayPhrase}, entre ${form.interAllowedStartTime} e ${form.interAllowedEndTime}, com duracao entre ${form.interMinHoursPerCall || "-"}h e ${form.interMaxHoursPerCall || "-"}h por convocacao.`;
}

type DayPickerProps = {
  title: string;
  selected: DayOfWeek[];
  disabled: boolean;
  required?: boolean;
  error?: string;
  onToggle: (day: DayOfWeek) => void;
};

function DayPicker({ title, selected, disabled, required, error, onToggle }: DayPickerProps) {
  return (
    <fieldset className="journey-day-picker" disabled={disabled}>
      <legend>
        {title}
        {required ? <span className="journey-required">*</span> : null}
      </legend>
      <div className="journey-day-grid">
        {DAY_OPTIONS.map((day) => {
          const isSelected = selected.includes(day.value);
          return (
            <button
              key={`${title}-${day.value}`}
              type="button"
              className={isSelected ? "journey-day-chip is-selected" : "journey-day-chip"}
              onClick={() => onToggle(day.value)}
              aria-pressed={isSelected}
              title={`${day.label} ${isSelected ? "selecionado" : "nao selecionado"}`}
            >
              <span className="journey-day-chip-check" aria-hidden="true">
                {isSelected ? "[x]" : "[ ]"}
              </span>
              <span>{day.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <small className="journey-field-error">{error}</small> : null}
    </fieldset>
  );
}

export function WorkJourneyEditorPage({ mode, journeyId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<JourneyFormState>(defaultForm);
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeStep, setActiveStep] = useState<JourneyWizardStep>("TYPE_AND_BASIC");
  const [statusMessage, setStatusMessage] = useState<string | null>(
    mode === "create" ? null : "Carregando jornada."
  );
  const [loadedJourney, setLoadedJourney] = useState<WorkJourneyTemplate | null>(null);

  useEffect(() => {
    if (mode === "create" || !journeyId) {
      setIsLoading(false);
      return;
    }

    const found = loadWorkJourneys().find((item) => item.id === journeyId);
    if (!found) {
      setStatusMessage("Jornada nao encontrada.");
      setIsLoading(false);
      return;
    }

    setLoadedJourney(found);
    setForm(mapJourneyToForm(found));
    setStatusMessage(null);
    setIsLoading(false);
  }, [mode, journeyId]);

  useEffect(() => {
    if (form.breakType === "NONE" && form.breakDurationMinutes !== "0") {
      setForm((current) => ({ ...current, breakDurationMinutes: "0" }));
    }
  }, [form.breakType, form.breakDurationMinutes]);

  useEffect(() => {
    if (form.type !== "FIXED") {
      return;
    }

    const computedDailyHours = computeWorkedHoursFromSchedule(
      form.fixedStartTime,
      form.fixedEndTime,
      form.breakType,
      form.breakDurationMinutes
    );

    if (computedDailyHours === undefined) {
      return;
    }

    const nextDailyHours = formatHoursValue(computedDailyHours);
    setForm((current) =>
      current.fixedDailyHours === nextDailyHours ? current : { ...current, fixedDailyHours: nextDailyHours }
    );
  }, [form.type, form.fixedStartTime, form.fixedEndTime, form.breakType, form.breakDurationMinutes]);

  useEffect(() => {
    if (form.type !== "FIXED") {
      return;
    }

    const dailyHours = toNum(form.fixedDailyHours);
    if (dailyHours === undefined || form.fixedActiveDays.length === 0) {
      return;
    }

    const computedWeeklyHours = formatHoursValue(dailyHours * normalizeDays(form.fixedActiveDays).length);
    setForm((current) =>
      current.fixedWeeklyHours === computedWeeklyHours ? current : { ...current, fixedWeeklyHours: computedWeeklyHours }
    );
  }, [form.type, form.fixedDailyHours, form.fixedActiveDays]);

  const validationErrors = useMemo(() => validateForm(form), [form]);
  const inlineFieldErrors = useMemo(() => computeInlineFieldErrors(form), [form]);
  const canSave = useMemo(
    () => !isReadOnly && !isLoading && !isSaving && validationErrors.length === 0,
    [isReadOnly, isLoading, isSaving, validationErrors.length]
  );
  const pageTitle =
    mode === "create" ? "Cadastrar jornada" : mode === "edit" ? "Editar jornada" : "Visualizar jornada";
  const pageSubtitle =
    "Configure jornadas fixas, flexiveis ou intermitentes para reutilizacao em perfis de trabalho.";
  const typeDescription = useMemo(() => getTypeDescription(form.type), [form.type]);
  const specificSectionMeta = useMemo(() => getSpecificSectionMeta(form.type), [form.type]);
  const wizardSteps = useMemo(() => buildJourneyWizardSteps(form.type), [form.type]);
  const activeStepIndex = useMemo(
    () => Math.max(wizardSteps.findIndex((step) => step.key === activeStep), 0),
    [wizardSteps, activeStep]
  );
  const progress = Math.round(((activeStepIndex + 1) / wizardSteps.length) * 100);
  const journeyPreview = useMemo(() => buildJourneyPreviewText(form), [form]);
  const breakTypeHelpText = useMemo(() => getBreakTypeHelpText(form.breakType), [form.breakType]);
  const showInlineErrors = submitAttempted && !isReadOnly;

  const flexDerivedDailyHint = useMemo(() => {
    if (form.type !== "FLEXIBLE") return null;
    const weekly = toNum(form.flexExpectedWeeklyHours);
    const derived = deriveFlexibleDailyFromWeekly(weekly, form.flexAllowedDays);
    if (derived === undefined) return null;
    return `Carga diaria sugerida pela carga semanal e dias permitidos: ${formatHoursValue(derived)}h/dia.`;
  }, [form.type, form.flexExpectedWeeklyHours, form.flexAllowedDays]);
  const stepErrors = useMemo<Record<JourneyWizardStep, string[]>>(() => {
    function unique(messages: Array<string | undefined>): string[] {
      return [...new Set(messages.filter((message): message is string => Boolean(message?.trim().length)))];
    }

    const typeAndBasicErrors = unique([inlineFieldErrors.name]);
    const generalStructureErrors = unique([inlineFieldErrors.breakDurationMinutes]);

    const specificErrors =
      form.type === "FIXED"
        ? unique([
            inlineFieldErrors.fixedActiveDays,
            inlineFieldErrors.fixedStartTime,
            inlineFieldErrors.fixedEndTime,
            inlineFieldErrors.fixedMaxHoursPerDay
          ])
        : form.type === "FLEXIBLE"
          ? unique([
              inlineFieldErrors.flexExpectedWeeklyHours,
              inlineFieldErrors.flexExpectedDailyHours,
              inlineFieldErrors.flexAllowedDays,
              inlineFieldErrors.flexEntryWindow,
              inlineFieldErrors.flexExitWindow,
              inlineFieldErrors.flexMaxHoursPerDay
            ])
          : unique([
              inlineFieldErrors.interMinHoursPerCall,
              inlineFieldErrors.interMaxHoursPerCall,
              inlineFieldErrors.interCallDays,
              inlineFieldErrors.interAllowedWindow,
              inlineFieldErrors.interMaxHoursPerDay
            ]);

    return {
      TYPE_AND_BASIC: typeAndBasicErrors,
      GENERAL_STRUCTURE: generalStructureErrors,
      SPECIFIC_RULES: specificErrors,
      REVIEW: validationErrors
    };
  }, [inlineFieldErrors, form.type, validationErrors]);

  const currentStepErrors = stepErrors[activeStep] ?? [];

  function updateField<Key extends keyof JourneyFormState>(field: Key, value: JourneyFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDays(field: "fixedActiveDays" | "flexAllowedDays" | "interCallDays", day: DayOfWeek) {
    setForm((current) => {
      const list = current[field];
      const next = list.includes(day) ? list.filter((item) => item !== day) : [...list, day];
      return { ...current, [field]: normalizeDays(next) };
    });
  }

  function fieldError(field: InlineFieldKey): string | undefined {
    return showInlineErrors ? inlineFieldErrors[field] : undefined;
  }

  function invalidClass(field: InlineFieldKey): string | undefined {
    return fieldError(field) ? "journey-input-invalid" : undefined;
  }

  function canNavigateToStep(targetStep: JourneyWizardStep): boolean {
    if (isReadOnly) return true;

    const targetIndex = wizardSteps.findIndex((step) => step.key === targetStep);
    if (targetIndex <= 0) return true;

    for (let index = 0; index < targetIndex; index += 1) {
      const stepKey = wizardSteps[index].key;
      if ((stepErrors[stepKey] ?? []).length > 0) {
        return false;
      }
    }

    return true;
  }

  function goToStep(nextStep: JourneyWizardStep) {
    if (!canNavigateToStep(nextStep)) {
      setSubmitAttempted(true);
      setStatusMessage("Revise os campos obrigatorios das etapas anteriores para continuar.");
      return;
    }

    setStatusMessage(null);
    setActiveStep(nextStep);
  }

  function goToPreviousStep() {
    const previousIndex = activeStepIndex - 1;
    if (previousIndex < 0) return;
    setStatusMessage(null);
    setActiveStep(wizardSteps[previousIndex].key);
  }

  function goToNextStep() {
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= wizardSteps.length) return;

    setSubmitAttempted(true);
    if (!isReadOnly && currentStepErrors.length > 0) {
      setStatusMessage(currentStepErrors[0]);
      return;
    }

    setStatusMessage(null);
    setActiveStep(wizardSteps[nextIndex].key);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!isReadOnly && activeStep !== "REVIEW") {
      goToNextStep();
      return;
    }

    if (!canSave) {
      if (validationErrors.length > 0) {
        setStatusMessage(validationErrors[0]);
      }
      return;
    }

    setIsSaving(true);
    setStatusMessage("Salvando jornada...");

    try {
      const now = new Date().toISOString();
      const current = loadWorkJourneys();

      if (mode === "edit" && journeyId) {
        const target = current.find((item) => item.id === journeyId);
        if (!target) {
          throw new Error("Jornada nao encontrada para edicao.");
        }

        const updated = current.map((item) =>
          item.id === journeyId
            ? buildJourneyFromForm(form, { id: target.id, createdAt: target.createdAt, updatedAt: now })
            : item
        );
        saveWorkJourneys(updated);
      } else {
        const created = buildJourneyFromForm(form, {
          id: `journey_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
          updatedAt: now
        });
        saveWorkJourneys([...current, created]);
      }

      router.push("/administrative/scales");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar jornada.");
      setIsSaving(false);
    }
  }

  const disabled = isReadOnly || isLoading || isSaving;
  const navigationDisabled = isLoading || isSaving;
  const createdOrUpdatedLabel = loadedJourney
    ? `Criada em ${formatDateTime(loadedJourney.createdAt)} | Atualizada em ${formatDateTime(loadedJourney.updatedAt)}`
    : null;

  return (
    <main className="page-shell page-shell-wide journey-editor-page-shell">
      <header className="journey-editor-page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </header>

      {statusMessage ? <p className="journey-editor-status-message">{statusMessage}</p> : null}
      {createdOrUpdatedLabel ? <p className="journey-editor-meta">{createdOrUpdatedLabel}</p> : null}

      <div className="driver-editor-workspace journey-editor-workspace">
        <aside className="driver-editor-stepbar" aria-label="Etapas do cadastro da jornada">
          <div className="driver-editor-stepbar-progress">
            <div className="driver-editor-stepbar-progress-head">
              <span>Progresso</span>
              <strong>{progress}%</strong>
            </div>
            <div className="driver-editor-stepbar-progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="driver-editor-stepnav">
            {wizardSteps.map((step, index) => {
              const isActive = activeStep === step.key;
              const isComplete = index < activeStepIndex && (stepErrors[step.key] ?? []).length === 0;

              return (
                <button
                  key={step.key}
                  type="button"
                  className={[
                    "driver-editor-stepchip",
                    isActive ? "is-active" : "",
                    isComplete ? "is-complete" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => goToStep(step.key)}
                  disabled={navigationDisabled}
                >
                  <span>{step.index}</span>
                  <div className="driver-editor-stepcopy">
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid grid-single">
          <article className="panel panel-wide journey-editor-card">
            <form className="stack journey-editor-form" onSubmit={(event) => void onSubmit(event)}>
            {!isReadOnly ? <p className="journey-required-note">Campos obrigatorios marcados com *.</p> : null}

            <div className="driver-editor-form-step-meta">
              <span className="driver-editor-form-step-badge">{wizardSteps[activeStepIndex]?.index ?? "01"}</span>
              <strong>{wizardSteps[activeStepIndex]?.title ?? "Etapa"}</strong>
              <small>{wizardSteps[activeStepIndex]?.description ?? ""}</small>
            </div>

            {currentStepErrors.length > 0 && showInlineErrors ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Existem campos pendentes nesta etapa</strong>
                <span>{currentStepErrors.join(" | ")}</span>
              </div>
            ) : null}

            {activeStep === "TYPE_AND_BASIC" ? (
              <>
                <div className="panel-head">
                  <h2>Tipo da jornada</h2>
                  <span>Essa escolha define a estrutura das etapas seguintes.</span>
                </div>

                <div className="form-grid">
                  <label>
                    <span>
                      Tipo de jornada<span className="journey-required">*</span>
                    </span>
                    <select
                      className="select"
                      value={form.type}
                      onChange={(event) => updateField("type", event.target.value as JourneyType)}
                      disabled={disabled}
                    >
                      <option value="FIXED">Fixa</option>
                      <option value="FLEXIBLE">Flexivel</option>
                      <option value="INTERMITTENT">Intermitente</option>
                    </select>
                  </label>
                </div>

                <div className="driver-editor-contract-inline-note">
                  <strong>
                    {form.type === "FIXED"
                      ? "Jornada fixa"
                      : form.type === "FLEXIBLE"
                        ? "Jornada flexivel"
                        : "Jornada intermitente"}
                  </strong>
                  <span>{typeDescription}</span>
                </div>

                <div className="panel-head">
                  <h2>Dados basicos</h2>
                  <span>Identificacao da jornada no cadastro.</span>
                </div>

                <div className="form-grid">
                  <label>
                    <span>
                      Nome da jornada<span className="journey-required">*</span>
                    </span>
                    <input
                      className={invalidClass("name")}
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Ex.: Jornada flexivel motorista urbano"
                      disabled={disabled}
                    />
                    {fieldError("name") ? (
                      <small className="journey-field-error">{fieldError("name")}</small>
                    ) : null}
                  </label>
                </div>

                <label>
                  Descricao
                  <input
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Descricao opcional da jornada."
                    disabled={disabled}
                  />
                </label>

                <section className="editor-status-block">
                  <h3 className="editor-status-title">Status</h3>
                  <label className="editor-status-toggle">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateField("isActive", event.target.checked)}
                      disabled={disabled}
                    />
                    <span>Status ativo</span>
                  </label>
                </section>
              </>
            ) : null}

            {activeStep === "GENERAL_STRUCTURE" ? (
              <>
                <div className="panel-head">
                  <h2>Estrutura geral da jornada</h2>
                  <span>Configuracoes comuns para qualquer tipo de jornada.</span>
                </div>

                <div className="form-grid">
                  <label>
                    <span>
                      Tipo de intervalo<span className="journey-required">*</span>
                    </span>
                    <select
                      className="select"
                      value={form.breakType}
                      onChange={(event) => updateField("breakType", event.target.value as BreakType)}
                      disabled={disabled}
                    >
                      <option value="NONE">Sem intervalo</option>
                      <option value="FIXED">Fixo</option>
                      <option value="FLEXIBLE">Flexivel</option>
                    </select>
                    <small className="helper-text">{breakTypeHelpText}</small>
                  </label>

                  {form.breakType !== "NONE" ? (
                    <label>
                      <span>
                        {form.breakType === "FLEXIBLE"
                          ? "Duracao minima do intervalo (min)"
                          : "Duracao do intervalo (min)"}
                        <span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("breakDurationMinutes")}
                        type="number"
                        min="0"
                        step="1"
                        value={form.breakDurationMinutes}
                        onChange={(event) => updateField("breakDurationMinutes", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("breakDurationMinutes") ? (
                        <small className="journey-field-error">{fieldError("breakDurationMinutes")}</small>
                      ) : null}
                    </label>
                  ) : (
                    <div className="driver-editor-contract-inline-note">
                      <strong>Sem intervalo configurado</strong>
                      <span>Nenhum intervalo sera considerado nesta jornada.</span>
                    </div>
                  )}
                </div>

                <div className="form-grid">
                  <label>
                    Observacoes operacionais
                    <input
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Informe regras complementares, excecoes ou orientacoes internas."
                      disabled={disabled}
                    />
                  </label>
                </div>
              </>
            ) : null}

            {activeStep === "SPECIFIC_RULES" ? (
              <>
                <div className="panel-head">
                  <h2>{specificSectionMeta.title}</h2>
                  <span>{specificSectionMeta.description}</span>
                </div>

                {form.type === "FIXED" ? (
              <>
                <DayPicker
                  title="Dias ativos"
                  selected={form.fixedActiveDays}
                  disabled={disabled}
                  required
                  error={fieldError("fixedActiveDays")}
                  onToggle={(day) => toggleDays("fixedActiveDays", day)}
                />

                <div className="form-grid">
                  <label>
                    <span>
                      Hora de entrada<span className="journey-required">*</span>
                    </span>
                    <input
                      className={invalidClass("fixedStartTime")}
                      type="time"
                      value={form.fixedStartTime}
                      onChange={(event) => updateField("fixedStartTime", event.target.value)}
                      disabled={disabled}
                    />
                    {fieldError("fixedStartTime") ? (
                      <small className="journey-field-error">{fieldError("fixedStartTime")}</small>
                    ) : null}
                  </label>
                  <label>
                    <span>
                      Hora de saida<span className="journey-required">*</span>
                    </span>
                    <input
                      className={invalidClass("fixedEndTime")}
                      type="time"
                      value={form.fixedEndTime}
                      onChange={(event) => updateField("fixedEndTime", event.target.value)}
                      disabled={disabled}
                    />
                    {fieldError("fixedEndTime") ? (
                      <small className="journey-field-error">{fieldError("fixedEndTime")}</small>
                    ) : null}
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    <span>
                      Limite maximo de horas por dia<span className="journey-required">*</span>
                    </span>
                    <input
                      className={invalidClass("fixedMaxHoursPerDay")}
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={form.fixedMaxHoursPerDay}
                      onChange={(event) => updateField("fixedMaxHoursPerDay", event.target.value)}
                      disabled={disabled}
                    />
                    {fieldError("fixedMaxHoursPerDay") ? (
                      <small className="journey-field-error">{fieldError("fixedMaxHoursPerDay")}</small>
                    ) : null}
                  </label>
                </div>

                <section className="journey-derived-block">
                  <strong className="journey-derived-title">Carga calculada automaticamente</strong>
                  <p className="helper-text">
                    Esses valores sao derivados da hora de entrada, hora de saida, intervalo e dias ativos.
                  </p>
                  <div className="form-grid journey-derived-grid">
                    <label className="journey-derived-field">
                      Carga horaria diaria
                      <input
                        className="journey-readonly-input"
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.fixedDailyHours}
                        readOnly
                        aria-readonly="true"
                      />
                    </label>
                    <label className="journey-derived-field">
                      Carga horaria semanal
                      <input
                        className="journey-readonly-input"
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.fixedWeeklyHours}
                        readOnly
                        aria-readonly="true"
                      />
                    </label>
                  </div>
                </section>
              </>
            ) : null}

                {form.type === "FLEXIBLE" ? (
              <>
                <div className="stack">
                  <h3>Carga horaria</h3>
                  <div className="form-grid">
                    <label>
                      <span>
                        Carga horaria semanal esperada<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexExpectedWeeklyHours")}
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.flexExpectedWeeklyHours}
                        onChange={(event) => updateField("flexExpectedWeeklyHours", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("flexExpectedWeeklyHours") ? (
                        <small className="journey-field-error">{fieldError("flexExpectedWeeklyHours")}</small>
                      ) : null}
                      <small className="helper-text">
                        Campo principal da jornada flexivel.
                      </small>
                    </label>
                    <label>
                      Carga horaria diaria esperada (opcional)
                      <input
                        className={invalidClass("flexExpectedDailyHours")}
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.flexExpectedDailyHours}
                        onChange={(event) => updateField("flexExpectedDailyHours", event.target.value)}
                        disabled={disabled}
                        placeholder="Ex.: 8"
                      />
                      {fieldError("flexExpectedDailyHours") ? (
                        <small className="journey-field-error">{fieldError("flexExpectedDailyHours")}</small>
                      ) : null}
                      {flexDerivedDailyHint ? <small className="helper-text">{flexDerivedDailyHint}</small> : null}
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      <span>
                        Limite maximo de horas por dia<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexMaxHoursPerDay")}
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={form.flexMaxHoursPerDay}
                        onChange={(event) => updateField("flexMaxHoursPerDay", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("flexMaxHoursPerDay") ? (
                        <small className="journey-field-error">{fieldError("flexMaxHoursPerDay")}</small>
                      ) : null}
                    </label>
                  </div>
                </div>

                <div className="stack">
                  <h3>Dias e faixas</h3>
                  <DayPicker
                    title="Dias permitidos"
                    selected={form.flexAllowedDays}
                    disabled={disabled}
                    required
                    error={fieldError("flexAllowedDays")}
                    onToggle={(day) => toggleDays("flexAllowedDays", day)}
                  />

                  <div className="form-grid">
                    <label>
                      <span>
                        Faixa permitida de entrada - inicio<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexEntryWindow")}
                        type="time"
                        value={form.flexEntryWindowStart}
                        onChange={(event) => updateField("flexEntryWindowStart", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                    <label>
                      <span>
                        Faixa permitida de entrada - fim<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexEntryWindow")}
                        type="time"
                        value={form.flexEntryWindowEnd}
                        onChange={(event) => updateField("flexEntryWindowEnd", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                  {fieldError("flexEntryWindow") ? (
                    <small className="journey-field-error">{fieldError("flexEntryWindow")}</small>
                  ) : null}

                  <div className="form-grid">
                    <label>
                      <span>
                        Faixa permitida de saida - inicio<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexExitWindow")}
                        type="time"
                        value={form.flexExitWindowStart}
                        onChange={(event) => updateField("flexExitWindowStart", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                    <label>
                      <span>
                        Faixa permitida de saida - fim<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("flexExitWindow")}
                        type="time"
                        value={form.flexExitWindowEnd}
                        onChange={(event) => updateField("flexExitWindowEnd", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                  {fieldError("flexExitWindow") ? (
                    <small className="journey-field-error">{fieldError("flexExitWindow")}</small>
                  ) : null}
                </div>

                <div className="stack">
                  <h3>Compensacao</h3>
                  <div className="form-grid">
                    <label className="toggle-field">
                      <span>Permitir compensacao no mesmo dia</span>
                      <input
                        type="checkbox"
                        checked={form.flexAllowSameDayCompensation}
                        onChange={(event) => updateField("flexAllowSameDayCompensation", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                    <label className="toggle-field">
                      <span>Permitir compensacao na mesma semana</span>
                      <input
                        type="checkbox"
                        checked={form.flexAllowSameWeekCompensation}
                        onChange={(event) => updateField("flexAllowSameWeekCompensation", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : null}

                {form.type === "INTERMITTENT" ? (
              <>
                <div className="stack">
                  <h3>Convocacao</h3>
                  <div className="form-grid">
                    <label>
                      <span>
                        Minimo de horas por convocacao<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("interMinHoursPerCall")}
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.interMinHoursPerCall}
                        onChange={(event) => updateField("interMinHoursPerCall", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("interMinHoursPerCall") ? (
                        <small className="journey-field-error">{fieldError("interMinHoursPerCall")}</small>
                      ) : null}
                    </label>
                    <label>
                      <span>
                        Maximo de horas por convocacao<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("interMaxHoursPerCall")}
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.interMaxHoursPerCall}
                        onChange={(event) => updateField("interMaxHoursPerCall", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("interMaxHoursPerCall") ? (
                        <small className="journey-field-error">{fieldError("interMaxHoursPerCall")}</small>
                      ) : null}
                    </label>
                  </div>
                  <div className="form-grid">
                    <label>
                      <span>
                        Limite maximo de horas por dia<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("interMaxHoursPerDay")}
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={form.interMaxHoursPerDay}
                        onChange={(event) => updateField("interMaxHoursPerDay", event.target.value)}
                        disabled={disabled}
                      />
                      {fieldError("interMaxHoursPerDay") ? (
                        <small className="journey-field-error">{fieldError("interMaxHoursPerDay")}</small>
                      ) : null}
                    </label>
                  </div>

                  <DayPicker
                    title="Dias permitidos para convocacao"
                    selected={form.interCallDays}
                    disabled={disabled}
                    required
                    error={fieldError("interCallDays")}
                    onToggle={(day) => toggleDays("interCallDays", day)}
                  />

                  <div className="form-grid">
                    <label>
                      <span>
                        Faixa de horario permitida - inicio<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("interAllowedWindow")}
                        type="time"
                        value={form.interAllowedStartTime}
                        onChange={(event) => updateField("interAllowedStartTime", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                    <label>
                      <span>
                        Faixa de horario permitida - fim<span className="journey-required">*</span>
                      </span>
                      <input
                        className={invalidClass("interAllowedWindow")}
                        type="time"
                        value={form.interAllowedEndTime}
                        onChange={(event) => updateField("interAllowedEndTime", event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                  {fieldError("interAllowedWindow") ? (
                    <small className="journey-field-error">{fieldError("interAllowedWindow")}</small>
                  ) : null}
                </div>

                <div className="stack">
                  <h3>Regras</h3>
                  <div className="form-grid">
                    <label className="toggle-field">
                      <span>Exigir aceite da convocacao</span>
                      <input
                        type="checkbox"
                        checked={form.interRequireCallAcceptance}
                        onChange={(event) => updateField("interRequireCallAcceptance", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : null}
              </>
            ) : null}

            {activeStep === "REVIEW" ? (
              <>
                <div className="panel-head">
                  <h2>Revisao final</h2>
                  <span>Confira o resumo antes de salvar esta jornada.</span>
                </div>

                <div className="driver-editor-contract-inline-note">
                  <strong>
                    {form.type === "FIXED"
                      ? "Jornada fixa"
                      : form.type === "FLEXIBLE"
                        ? "Jornada flexivel"
                        : "Jornada intermitente"}
                  </strong>
                  <span>{typeDescription}</span>
                </div>

                <div className="journey-summary">
                  <strong>Resumo da jornada configurada</strong>
                  <p>{journeyPreview}</p>
                  <ul className="journey-summary-list">
                    <li>
                      <strong>Nome:</strong> {form.name.trim() || "Nao informado"}
                    </li>
                    <li>
                      <strong>Status:</strong> {form.isActive ? "Ativa" : "Inativa"}
                    </li>
                    <li>
                      <strong>Tipo de intervalo:</strong>{" "}
                      {form.breakType === "NONE"
                        ? "Sem intervalo"
                        : form.breakType === "FIXED"
                          ? "Intervalo fixo"
                          : "Intervalo flexivel"}
                    </li>
                    <li>
                      <strong>Regras especificas:</strong> {specificSectionMeta.description}
                    </li>
                  </ul>
                </div>
              </>
            ) : null}

            {activeStep === "REVIEW" && validationErrors.length > 0 && !isReadOnly ? (
              <div className="driver-editor-contract-validation-alert" role="alert">
                <strong>Corrija os campos abaixo antes de salvar:</strong>
                <ul>
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="driver-editor-form-footer">
              <div className="driver-editor-form-actions">
                <Link href="/administrative/scales" className="button-link secondary-link">
                  Voltar para lista
                </Link>
                <div className="driver-editor-form-nav-actions">
                  {activeStepIndex > 0 ? (
                    <button
                      type="button"
                      className="driver-editor-nav-button"
                      onClick={goToPreviousStep}
                      disabled={navigationDisabled}
                    >
                      Etapa anterior
                    </button>
                  ) : null}

                  {activeStep !== "REVIEW" ? (
                    <button
                      type="button"
                      className="driver-editor-nav-button"
                      onClick={goToNextStep}
                      disabled={navigationDisabled}
                    >
                      Proxima etapa
                    </button>
                  ) : null}

                  {!isReadOnly && activeStep === "REVIEW" ? (
                    <button type="submit" className="driver-editor-submit-button" disabled={!canSave}>
                      {isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar jornada"}
                    </button>
                  ) : null}

                  {isReadOnly && journeyId ? (
                    <Link href={`/administrative/scales/${journeyId}/edit`} className="button-link">
                      Editar jornada
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
