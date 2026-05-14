import { BadRequestException } from "@nestjs/common";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_TZ_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

export function normalizeDateOnlyValue(value: unknown, message: string): Date {
  if (typeof value !== "string") {
    throw new BadRequestException(message);
  }

  const dateKey = normalizeDateKeyValue(value, message);
  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(message);
  }
  return parsed;
}

export function normalizeDateTimeValue(value: unknown, message: string): Date {
  if (typeof value !== "string") {
    throw new BadRequestException(message);
  }

  const normalized = value.trim();
  if (normalized.length < 16) {
    throw new BadRequestException(message);
  }

  // If no timezone is provided, interpret as UTC to avoid server-local drift.
  const normalizedWithTimezone = ISO_TZ_PATTERN.test(normalized) ? normalized : `${normalized}Z`;
  const parsed = new Date(normalizedWithTimezone);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(message);
  }

  return parsed;
}

export function normalizeDateKeyValue(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new BadRequestException(message);
  }
  const normalized = value.trim();
  if (!DATE_KEY_PATTERN.test(normalized)) {
    throw new BadRequestException(message);
  }
  return normalized;
}

export function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildDateTimeFromDateKey(dateKey: string, time: string, dateMessage: string, timeMessage: string): Date {
  const normalizedDateKey = normalizeDateKeyValue(dateKey, dateMessage);
  if (!CLOCK_TIME_PATTERN.test(time)) {
    throw new BadRequestException(timeMessage);
  }
  return new Date(`${normalizedDateKey}T${time}:00.000Z`);
}

export function buildDayRangeUtc(dateKey: string, message: string): { start: Date; end: Date } {
  const normalized = normalizeDateKeyValue(dateKey, message);
  return {
    start: new Date(`${normalized}T00:00:00.000Z`),
    end: new Date(`${normalized}T23:59:59.999Z`)
  };
}

export function buildRangeUtc(
  fromDateKey: string,
  toDateKey: string,
  fromMessage: string,
  toMessage: string
): { start: Date; end: Date } {
  const from = normalizeDateKeyValue(fromDateKey, fromMessage);
  const to = normalizeDateKeyValue(toDateKey, toMessage);
  return {
    start: new Date(`${from}T00:00:00.000Z`),
    end: new Date(`${to}T23:59:59.999Z`)
  };
}

export function resolveWeekdayFromDateKey(dateKey: string, message: string): number {
  const normalized = normalizeDateKeyValue(dateKey, message);
  return new Date(`${normalized}T00:00:00.000Z`).getUTCDay();
}

export function toPeriodKeyFromDateKey(dateKey: string, message: string): string {
  const normalized = normalizeDateKeyValue(dateKey, message);
  return normalized.slice(0, 7);
}

export function resolvePeriodDateKeys(periodKey: string): {
  startDateKey: string;
  endDateKey: string;
  dateKeys: string[];
} {
  if (typeof periodKey !== "string" || !PERIOD_KEY_PATTERN.test(periodKey.trim())) {
    throw new BadRequestException("Competencia invalida.");
  }

  const [yearText, monthText] = periodKey.trim().split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const startDateKey = toDateOnlyString(firstDay);
  const endDateKey = toDateOnlyString(lastDay);

  const dateKeys: string[] = [];
  const cursor = new Date(firstDay.getTime());
  while (cursor.getTime() <= lastDay.getTime()) {
    dateKeys.push(toDateOnlyString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { startDateKey, endDateKey, dateKeys };
}
