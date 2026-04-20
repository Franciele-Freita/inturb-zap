import { OvertimeTemplate } from "./api";

export type OvertimePolicyCategory = "OVERTIME" | "NIGHT";

type NightPolicySnapshot = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  percent: number;
  accumulatesWithOvertime: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toClock(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized) ? normalized : fallback;
}

export function resolveOvertimePolicyCategory(settings: unknown): OvertimePolicyCategory {
  const root = asRecord(settings);
  return root.policyCategory === "NIGHT" ? "NIGHT" : "OVERTIME";
}

export function isOvertimeTemplateCategory(
  template: OvertimeTemplate,
  category: OvertimePolicyCategory
): boolean {
  return resolveOvertimePolicyCategory(template.settings) === category;
}

export function readNightPolicySnapshot(settings: unknown): NightPolicySnapshot {
  const root = asRecord(settings);
  const percentages = asRecord(root.percentages);
  const night = asRecord(root.night);
  const fallbackPercent = toNumber(percentages.nightAdditionalPercent, 20);
  const enabled = toBoolean(night.enabled, true);

  return {
    enabled,
    startTime: enabled ? toClock(night.startTime, "22:00") : "22:00",
    endTime: enabled ? toClock(night.endTime, "05:00") : "05:00",
    percent: enabled ? toNumber(night.percent, fallbackPercent) : fallbackPercent,
    accumulatesWithOvertime: enabled ? toBoolean(night.accumulatesWithOvertime, true) : false
  };
}
