import { Injectable } from "@nestjs/common";

type TimeEntryLike = {
  occurredAt: Date;
  kind: string;
};

type WorkInterval = {
  start: Date;
  end: Date;
};

@Injectable()
export class LaborPolicyService {
  calculateWorkedAndBreakMinutes(entries: TimeEntryLike[]): {
    workedMinutes: number;
    breakMinutes: number;
  } {
    return this.calculateWorkedAndBreakCore(entries);
  }

  calculateLiveWorkedAndBreakMinutes(entries: TimeEntryLike[], now: Date): {
    workedMinutes: number;
    breakMinutes: number;
  } {
    return this.calculateWorkedAndBreakCore(entries, now);
  }

  resolveNightPolicy(settings: unknown): {
    enabled: boolean;
    percent: number;
    startTime: string;
    endTime: string;
  } {
    const fallback = {
      enabled: false,
      percent: 20,
      startTime: "22:00",
      endTime: "05:00"
    };

    if (!isRecord(settings)) {
      return fallback;
    }

    const policyCategory = asString(settings.policyCategory)?.toUpperCase();
    if (policyCategory !== "NIGHT") {
      return fallback;
    }

    const night = isRecord(settings.night) ? settings.night : undefined;
    const percentages = isRecord(settings.percentages) ? settings.percentages : undefined;

    const enabled =
      typeof night?.enabled === "boolean"
        ? night.enabled
        : true;

    const percentRaw =
      asFiniteNumber(night?.percent) ??
      asFiniteNumber(percentages?.nightAdditionalPercent) ??
      20;

    const startTime = isClockText(asString(night?.startTime)) ? asString(night?.startTime)! : "22:00";
    const endTime = isClockText(asString(night?.endTime)) ? asString(night?.endTime)! : "05:00";

    return {
      enabled,
      percent: Math.max(0, percentRaw),
      startTime,
      endTime
    };
  }

  calculateNightMinutesFromEntries(
    entries: TimeEntryLike[],
    referenceTime: Date,
    nightStartTime: string,
    nightEndTime: string,
    options?: {
      applyReducedNightHour?: boolean;
      reducedNightHourMinutes?: number;
    }
  ): {
    clockMinutes: number;
    reducedMinutes: number;
  } {
    const intervals = this.buildWorkIntervals(entries, referenceTime);
    if (intervals.length === 0) {
      return { clockMinutes: 0, reducedMinutes: 0 };
    }

    const startMinutes = toClockMinutes(nightStartTime);
    const endMinutes = toClockMinutes(nightEndTime);

    let clockMinutes = 0;
    for (const interval of intervals) {
      clockMinutes += this.calculateNightOverlapMinutes(interval, startMinutes, endMinutes);
    }

    const safeClockMinutes = Math.max(0, clockMinutes);
    const applyReducedNightHour = options?.applyReducedNightHour ?? true;
    if (!applyReducedNightHour) {
      return {
        clockMinutes: safeClockMinutes,
        reducedMinutes: safeClockMinutes
      };
    }

    const reducedNightHourMinutes = options?.reducedNightHourMinutes ?? 52.5;
    const conversion = 60 / reducedNightHourMinutes;
    return {
      clockMinutes: safeClockMinutes,
      reducedMinutes: Math.max(0, Math.round(safeClockMinutes * conversion))
    };
  }

  private buildWorkIntervals(entries: TimeEntryLike[], referenceTime: Date): WorkInterval[] {
    const intervals: WorkInterval[] = [];
    let currentInAt: Date | null = null;
    let currentBreakAt: Date | null = null;

    for (const entry of entries) {
      const kind = normalizeEntryKind(entry.kind);
      if (kind === "IN") {
        if (!currentInAt) {
          currentInAt = entry.occurredAt;
          currentBreakAt = null;
        }
        continue;
      }

      if (kind === "BREAK_START") {
        if (currentInAt && !currentBreakAt) {
          currentBreakAt = entry.occurredAt;
          if (currentInAt.getTime() < currentBreakAt.getTime()) {
            intervals.push({ start: currentInAt, end: currentBreakAt });
          }
        }
        continue;
      }

      if (kind === "BREAK_END") {
        if (currentInAt && currentBreakAt) {
          currentInAt = entry.occurredAt;
          currentBreakAt = null;
        }
        continue;
      }

      if (currentInAt) {
        const intervalEnd = entry.occurredAt;
        if (currentInAt.getTime() < intervalEnd.getTime()) {
          intervals.push({ start: currentInAt, end: intervalEnd });
        }
      }
      currentInAt = null;
      currentBreakAt = null;
    }

    if (currentInAt && currentInAt.getTime() < referenceTime.getTime()) {
      intervals.push({ start: currentInAt, end: referenceTime });
    }

    return intervals;
  }

  private calculateWorkedAndBreakCore(
    entries: TimeEntryLike[],
    openIntervalReference?: Date
  ): { workedMinutes: number; breakMinutes: number } {
    let workedMinutes = 0;
    let breakMinutes = 0;
    let currentInAt: Date | null = null;
    let currentBreakAt: Date | null = null;
    let breakAccumulator = 0;

    for (const entry of entries) {
      const kind = normalizeEntryKind(entry.kind);
      if (kind === "IN") {
        if (!currentInAt) {
          currentInAt = entry.occurredAt;
          currentBreakAt = null;
          breakAccumulator = 0;
        }
        continue;
      }

      if (kind === "BREAK_START") {
        if (currentInAt && !currentBreakAt) {
          currentBreakAt = entry.occurredAt;
        }
        continue;
      }

      if (kind === "BREAK_END") {
        if (currentInAt && currentBreakAt) {
          breakAccumulator += Math.max(0, diffMinutes(currentBreakAt, entry.occurredAt));
          currentBreakAt = null;
        }
        continue;
      }

      if (currentInAt) {
        if (currentBreakAt) {
          breakAccumulator += Math.max(0, diffMinutes(currentBreakAt, entry.occurredAt));
          currentBreakAt = null;
        }
        const spanMinutes = Math.max(0, diffMinutes(currentInAt, entry.occurredAt));
        const netWorked = Math.max(0, spanMinutes - breakAccumulator);
        workedMinutes += netWorked;
        breakMinutes += breakAccumulator;
      }
      currentInAt = null;
      currentBreakAt = null;
      breakAccumulator = 0;
    }

    if (openIntervalReference && currentInAt) {
      if (currentBreakAt) {
        breakAccumulator += Math.max(0, diffMinutes(currentBreakAt, openIntervalReference));
      }
      const spanMinutes = Math.max(0, diffMinutes(currentInAt, openIntervalReference));
      const netWorked = Math.max(0, spanMinutes - breakAccumulator);
      workedMinutes += netWorked;
      breakMinutes += breakAccumulator;
    }

    return {
      workedMinutes,
      breakMinutes
    };
  }

  private calculateNightOverlapMinutes(
    interval: WorkInterval,
    nightStartMinutes: number,
    nightEndMinutes: number
  ): number {
    const intervalStartMs = interval.start.getTime();
    const intervalEndMs = interval.end.getTime();
    if (intervalEndMs <= intervalStartMs) {
      return 0;
    }

    const dayStart = Date.UTC(
      interval.start.getUTCFullYear(),
      interval.start.getUTCMonth(),
      interval.start.getUTCDate()
    );
    const dayEnd = Date.UTC(
      interval.end.getUTCFullYear(),
      interval.end.getUTCMonth(),
      interval.end.getUTCDate()
    );

    let totalMs = 0;
    for (let cursorDayMs = dayStart; cursorDayMs <= dayEnd + DAY_MS; cursorDayMs += DAY_MS) {
      if (nightStartMinutes <= nightEndMinutes) {
        totalMs += overlapMs(
          intervalStartMs,
          intervalEndMs,
          cursorDayMs + nightStartMinutes * MINUTE_MS,
          cursorDayMs + nightEndMinutes * MINUTE_MS
        );
        continue;
      }

      totalMs += overlapMs(
        intervalStartMs,
        intervalEndMs,
        cursorDayMs + nightStartMinutes * MINUTE_MS,
        cursorDayMs + DAY_MS
      );
      totalMs += overlapMs(
        intervalStartMs,
        intervalEndMs,
        cursorDayMs,
        cursorDayMs + nightEndMinutes * MINUTE_MS
      );
    }

    return Math.max(0, Math.round(totalMs / MINUTE_MS));
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function overlapMs(leftStartMs: number, leftEndMs: number, rightStartMs: number, rightEndMs: number): number {
  const start = Math.max(leftStartMs, rightStartMs);
  const end = Math.min(leftEndMs, rightEndMs);
  return end > start ? end - start : 0;
}

function diffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MINUTE_MS);
}

function normalizeEntryKind(value: string): "IN" | "OUT" | "BREAK_START" | "BREAK_END" {
  switch (value) {
    case "OUT":
    case "BREAK_START":
    case "BREAK_END":
      return value;
    default:
      return "IN";
  }
}

function toClockMinutes(value: string): number {
  const [hoursText = "0", minutesText = "0"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  return Math.max(0, Math.min(23, Number.isFinite(hours) ? Math.floor(hours) : 0)) * 60 +
    Math.max(0, Math.min(59, Number.isFinite(minutes) ? Math.floor(minutes) : 0));
}

function isClockText(value: string | undefined): boolean {
  return Boolean(value && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value));
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
