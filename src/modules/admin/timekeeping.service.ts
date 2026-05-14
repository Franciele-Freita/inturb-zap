import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { WorkJourneyDay, WorkJourneyFixedConfig } from "./types";

type TimeEntryKind = "IN" | "OUT" | "BREAK_START" | "BREAK_END";
type TimeEntryIssueCode =
  | "UNEXPECTED_FIRST_ENTRY"
  | "INVALID_SEQUENCE"
  | "MISSING_BREAK_END"
  | "MISSING_OUT";
type TimeEntryIssueSeverity = "WARNING" | "ERROR";

export type DetectedTimeEntryIssue = {
  externalKey: string;
  driverId: string;
  date: string;
  code: TimeEntryIssueCode;
  severity: TimeEntryIssueSeverity;
  message: string;
  entryIds: string[];
  createdAt: string;
};
import {
  buildDateTimeFromDateKey,
  buildDayRangeUtc,
  buildRangeUtc,
  normalizeDateKeyValue,
  normalizeDateOnlyValue,
  normalizeDateTimeValue,
  resolvePeriodDateKeys,
  resolveWeekdayFromDateKey,
  toDateOnlyString,
  toPeriodKeyFromDateKey
} from "./timekeeping-date";

@Injectable()
export class TimekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  withAuditMetadata(
    metadata: Record<string, unknown> | undefined,
    input: { action: string; actorUserId?: string; changeReason?: string }
  ): Record<string, unknown> | undefined {
    const current = metadata ? { ...metadata } : {};
    const previousAudit = this.toRecordUnknown(current.audit);
    const nextAudit: Record<string, unknown> = {
      ...(previousAudit ?? {}),
      action: input.action,
      at: new Date().toISOString()
    };
    if (input.actorUserId) {
      nextAudit.actorUserId = input.actorUserId;
    }
    if (input.changeReason) {
      nextAudit.changeReason = input.changeReason;
    }
    current.audit = nextAudit;
    return current;
  }

  appendAdjustmentAudit(
    requestedSnapshot: Record<string, unknown>,
    input: { action: string; actorUserId?: string; changeReason?: string }
  ): void {
    const previousAudit = this.toRecordUnknown(requestedSnapshot.audit);
    const nextAudit: Record<string, unknown> = {
      ...(previousAudit ?? {}),
      action: input.action,
      at: new Date().toISOString()
    };
    if (input.actorUserId) {
      nextAudit.actorUserId = input.actorUserId;
    }
    if (input.changeReason) {
      nextAudit.changeReason = input.changeReason;
    }
    requestedSnapshot.audit = nextAudit;
  }

  normalizeTimeEntryGeo(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Geolocalizacao da batida invalida.");
    }

    const payload = value as Record<string, unknown>;
    const latitude = this.toOptionalNumber(
      payload.latitude ?? payload.lat,
      -90,
      90,
      "Latitude da batida invalida."
    );
    const longitude = this.toOptionalNumber(
      payload.longitude ?? payload.lng,
      -180,
      180,
      "Longitude da batida invalida."
    );
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException("Latitude e longitude sao obrigatorias quando geolocalizacao for informada.");
    }
    const accuracy = this.toOptionalNumber(payload.accuracy, 0, 100000, "Precisao da geolocalizacao invalida.");
    const provider = this.normalizeOptionalText(payload.provider, 40, "Provedor de geolocalizacao invalido.");

    return {
      latitude,
      longitude,
      accuracy,
      provider
    };
  }

  applyGeofenceToTimeEntryGeo(
    geo: Record<string, unknown> | undefined,
    geofence: {
      enabled: boolean;
      baseLatitude?: number;
      baseLongitude?: number;
      radiusMeters: number;
    }
  ): Record<string, unknown> | undefined {
    if (!geo) {
      if (!geofence.enabled) {
        return undefined;
      }
      return {
        geofence: {
          enabled: true,
          inside: false,
          confidenceScore: 0,
          reason: "MISSING_GEO",
          radiusMeters: geofence.radiusMeters,
          evaluatedAt: new Date().toISOString()
        }
      };
    }
    if (!geofence.enabled || geofence.baseLatitude === undefined || geofence.baseLongitude === undefined) {
      return {
        ...geo,
        geofence: {
          enabled: false
        }
      };
    }

    const latitude = this.toOptionalNumber(
      geo.latitude ?? geo.lat,
      -90,
      90,
      "Latitude da batida invalida."
    );
    const longitude = this.toOptionalNumber(
      geo.longitude ?? geo.lng,
      -180,
      180,
      "Longitude da batida invalida."
    );
    const accuracy = this.toOptionalNumber(
      geo.accuracy,
      0,
      100000,
      "Precisao da geolocalizacao invalida."
    ) ?? 0;

    if (latitude === undefined || longitude === undefined) {
      return {
        ...geo,
        geofence: {
          enabled: true,
          inside: false,
          confidenceScore: 0,
          reason: "MISSING_COORDINATES",
          radiusMeters: geofence.radiusMeters,
          evaluatedAt: new Date().toISOString(),
          baseLatitude: geofence.baseLatitude,
          baseLongitude: geofence.baseLongitude
        }
      };
    }

    const distanceMeters = this.calculateDistanceMeters(
      latitude,
      longitude,
      geofence.baseLatitude,
      geofence.baseLongitude
    );
    const inside = distanceMeters <= geofence.radiusMeters;
    const distanceFactor = Math.max(0, 1 - distanceMeters / Math.max(geofence.radiusMeters, 1));
    const accuracyFactor = Math.max(0, 1 - accuracy / Math.max(geofence.radiusMeters * 2, 1));
    const confidenceScore = Math.round(
      Math.max(0, Math.min(1, distanceFactor * 0.7 + accuracyFactor * 0.3)) * 100
    );

    return {
      ...geo,
      geofence: {
        enabled: true,
        inside,
        distanceMeters: Math.round(distanceMeters),
        radiusMeters: geofence.radiusMeters,
        confidenceScore,
        evaluatedAt: new Date().toISOString(),
        baseLatitude: geofence.baseLatitude,
        baseLongitude: geofence.baseLongitude,
        accuracyMeters: accuracy
      }
    };
  }

  normalizeDateOnlyValue(value: unknown, message: string): Date {
    return normalizeDateOnlyValue(value, message);
  }

  normalizeDateTimeValue(value: unknown, message: string): Date {
    return normalizeDateTimeValue(value, message);
  }

  normalizeDateKeyValue(value: unknown, message: string): string {
    return normalizeDateKeyValue(value, message);
  }

  toDateOnlyString(value: Date): string {
    return toDateOnlyString(value);
  }

  buildDateTimeFromDateKey(dateKey: string, time: string): Date {
    return buildDateTimeFromDateKey(
      dateKey,
      time,
      "Data da jornada invalida.",
      "Horario da jornada invalido."
    );
  }

  buildDayRangeUtc(dateKey: string): { start: Date; end: Date } {
    return buildDayRangeUtc(dateKey, "Data de apuracao invalida.");
  }

  buildRangeUtc(fromDateKey: string, toDateKey: string): { start: Date; end: Date } {
    return buildRangeUtc(fromDateKey, toDateKey, "Data inicial invalida.", "Data final invalida.");
  }

  resolveWeekdayFromDateKey(dateKey: string): number {
    return resolveWeekdayFromDateKey(dateKey, "Data de apuracao invalida.");
  }

  toPeriodKeyFromDateKey(dateKey: string): string {
    return toPeriodKeyFromDateKey(dateKey, "Data de apuracao invalida.");
  }

  resolvePeriodDateKeys(periodKey: string): {
    startDateKey: string;
    endDateKey: string;
    dateKeys: string[];
  } {
    return resolvePeriodDateKeys(periodKey);
  }

  applyDailyTolerance(input: {
    rawLatenessMinutes: number;
    rawEarlyLeaveMinutes: number;
    toleranceMarkingMinutes: number;
    toleranceDailyMaxMinutes: number;
  }): { latenessMinutes: number; earlyLeaveMinutes: number } {
    const rawLateness = Math.max(0, Math.round(input.rawLatenessMinutes));
    const rawEarlyLeave = Math.max(0, Math.round(input.rawEarlyLeaveMinutes));
    const toleranceMarking = Math.max(0, Math.round(input.toleranceMarkingMinutes));
    const toleranceDaily = Math.max(0, Math.round(input.toleranceDailyMaxMinutes));

    let latenessAfterMarking = rawLateness > 0 ? Math.max(0, rawLateness - toleranceMarking) : 0;
    let earlyAfterMarking = rawEarlyLeave > 0 ? Math.max(0, rawEarlyLeave - toleranceMarking) : 0;
    const totalAfterMarking = latenessAfterMarking + earlyAfterMarking;

    if (totalAfterMarking <= 0 || totalAfterMarking <= toleranceDaily) {
      return {
        latenessMinutes: 0,
        earlyLeaveMinutes: 0
      };
    }

    let remainingDailyTolerance = toleranceDaily;
    if (remainingDailyTolerance > 0) {
      const lateReduction = Math.min(
        latenessAfterMarking,
        Math.floor((remainingDailyTolerance * latenessAfterMarking) / totalAfterMarking)
      );
      latenessAfterMarking -= lateReduction;
      remainingDailyTolerance -= lateReduction;
    }
    if (remainingDailyTolerance > 0) {
      const earlyReduction = Math.min(earlyAfterMarking, remainingDailyTolerance);
      earlyAfterMarking -= earlyReduction;
      remainingDailyTolerance -= earlyReduction;
    }
    if (remainingDailyTolerance > 0) {
      const lateReduction = Math.min(latenessAfterMarking, remainingDailyTolerance);
      latenessAfterMarking -= lateReduction;
    }

    return {
      latenessMinutes: Math.max(0, latenessAfterMarking),
      earlyLeaveMinutes: Math.max(0, earlyAfterMarking)
    };
  }

  resolveFixedJourneyExpectation(input: {
    dateKey: string;
    fixedConfig: WorkJourneyFixedConfig;
    journeyCreatedAt: Date;
  }): {
    weekday: WorkJourneyDay;
    isWorkday: boolean;
    expectedMinutes: number;
    expectedStartAt?: Date;
    expectedEndAt?: Date;
  } {
    const weekday = this.resolveWorkJourneyWeekdayFromDateKey(input.dateKey);
    let isWorkday = input.fixedConfig.activeDays.includes(weekday);

    if (input.fixedConfig.scaleType === "TWELVE_THIRTY_SIX") {
      const cycleWorkDays = input.fixedConfig.cycleWorkDays ?? 1;
      const cycleOffDays = input.fixedConfig.cycleOffDays ?? 1;
      const cycleTotal = Math.max(1, cycleWorkDays + cycleOffDays);
      const anchorDateKey = input.journeyCreatedAt.toISOString().slice(0, 10);
      const anchorDate = this.buildDayRangeUtc(anchorDateKey).start;
      const currentDate = this.buildDayRangeUtc(input.dateKey).start;
      const diffDays = Math.floor((currentDate.getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000));
      const cyclePosition = ((diffDays % cycleTotal) + cycleTotal) % cycleTotal;
      isWorkday = cyclePosition < cycleWorkDays;
    }

    if (!isWorkday) {
      return {
        weekday,
        isWorkday: false,
        expectedMinutes: 0
      };
    }

    const expectedMinutes = Math.max(0, Math.round((input.fixedConfig.dailyHours ?? 0) * 60));
    let expectedStartAt: Date | undefined;
    let expectedEndAt: Date | undefined;
    if (input.fixedConfig.startTime && input.fixedConfig.endTime) {
      expectedStartAt = this.buildDateTimeFromDateKey(input.dateKey, input.fixedConfig.startTime);
      expectedEndAt = this.buildDateTimeFromDateKey(input.dateKey, input.fixedConfig.endTime);
      if (expectedEndAt.getTime() <= expectedStartAt.getTime()) {
        expectedEndAt = new Date(expectedEndAt.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    return {
      weekday,
      isWorkday: true,
      expectedMinutes,
      expectedStartAt,
      expectedEndAt
    };
  }

  resolveWorkProfileTemplateIdFromContract(driverContract: unknown): string | undefined {
    const contract = this.toRecordUnknown(driverContract);
    if (typeof contract?.workProfileTemplateId !== "string") {
      return undefined;
    }
    const normalized = contract.workProfileTemplateId.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  resolveExpectedJourneyFromTemplates(input: {
    dateKey: string;
    companyToleranceMarkingMinutes: number;
    companyToleranceDailyMaxMinutes: number;
    workProfileTemplateId?: string;
    workProfileToleranceMarkingMinutes?: number | null;
    workProfileToleranceDailyMaxMinutes?: number | null;
    journeyTemplateId?: string;
    journeyType?: string;
    journeyCreatedAt?: Date;
    fixedConfig?: WorkJourneyFixedConfig;
  }): {
    workProfileTemplateId?: string;
    journeyTemplateId?: string;
    expectedMinutes: number;
    isWorkday: boolean;
    expectedStartAt?: Date;
    expectedEndAt?: Date;
    toleranceMarkingMinutes: number;
    toleranceDailyMaxMinutes: number;
    meta: Record<string, unknown>;
  } {
    const toleranceMarkingMinutes =
      input.workProfileToleranceMarkingMinutes ?? input.companyToleranceMarkingMinutes;
    const toleranceDailyMaxMinutes =
      input.workProfileToleranceDailyMaxMinutes ?? input.companyToleranceDailyMaxMinutes;

    if (!input.workProfileTemplateId) {
      return {
        expectedMinutes: 0,
        isWorkday: false,
        toleranceMarkingMinutes,
        toleranceDailyMaxMinutes,
        meta: {
          source: "NO_WORK_PROFILE"
        }
      };
    }

    if (!input.journeyTemplateId) {
      return {
        workProfileTemplateId: input.workProfileTemplateId,
        expectedMinutes: 0,
        isWorkday: false,
        toleranceMarkingMinutes,
        toleranceDailyMaxMinutes,
        meta: {
          source: "NO_JOURNEY_LINKED"
        }
      };
    }

    if (!input.journeyType) {
      return {
        workProfileTemplateId: input.workProfileTemplateId,
        journeyTemplateId: input.journeyTemplateId,
        expectedMinutes: 0,
        isWorkday: false,
        toleranceMarkingMinutes,
        toleranceDailyMaxMinutes,
        meta: {
          source: "JOURNEY_NOT_FOUND"
        }
      };
    }

    if (input.journeyType !== "FIXED" || !input.fixedConfig) {
      return {
        workProfileTemplateId: input.workProfileTemplateId,
        journeyTemplateId: input.journeyTemplateId,
        expectedMinutes: 0,
        isWorkday: false,
        toleranceMarkingMinutes,
        toleranceDailyMaxMinutes,
        meta: {
          source: "UNSUPPORTED_JOURNEY_TYPE",
          journeyType: input.journeyType
        }
      };
    }

    const fixedExpectation = this.resolveFixedJourneyExpectation({
      dateKey: input.dateKey,
      fixedConfig: input.fixedConfig,
      journeyCreatedAt: input.journeyCreatedAt ?? new Date(`${input.dateKey}T00:00:00.000Z`)
    });
    const { weekday, isWorkday, expectedMinutes, expectedStartAt, expectedEndAt } = fixedExpectation;

    if (!isWorkday) {
      return {
        workProfileTemplateId: input.workProfileTemplateId,
        journeyTemplateId: input.journeyTemplateId,
        expectedMinutes: 0,
        isWorkday: false,
        toleranceMarkingMinutes,
        toleranceDailyMaxMinutes,
        meta: {
          source: "REST_DAY",
          weekday
        }
      };
    }

    return {
      workProfileTemplateId: input.workProfileTemplateId,
      journeyTemplateId: input.journeyTemplateId,
      expectedMinutes,
      isWorkday: true,
      expectedStartAt,
      expectedEndAt,
      toleranceMarkingMinutes,
      toleranceDailyMaxMinutes,
      meta: {
        source: "FIXED_JOURNEY",
        weekday,
        scaleType: input.fixedConfig.scaleType,
        expectedStartTime: input.fixedConfig.startTime,
        expectedEndTime: input.fixedConfig.endTime,
        toleranceSource:
          input.workProfileToleranceMarkingMinutes !== null ||
          input.workProfileToleranceDailyMaxMinutes !== null
            ? "WORK_PROFILE"
            : "COMPANY_DEFAULT"
      }
    };
  }

  detectTimeEntryIssues(
    entries: Array<{
      id: string;
      driverId: string;
      occurredAt: Date;
      kind: string;
    }>
  ): DetectedTimeEntryIssue[] {
    const issues: DetectedTimeEntryIssue[] = [];
    const grouped = new Map<string, Array<{ id: string; driverId: string; occurredAt: Date; kind: TimeEntryKind }>>();

    for (const entry of entries) {
      const kind = this.normalizeTimeEntryKind(entry.kind);
      const dayKey = entry.occurredAt.toISOString().slice(0, 10);
      const key = `${entry.driverId}:${dayKey}`;
      const list = grouped.get(key) ?? [];
      list.push({
        id: entry.id,
        driverId: entry.driverId,
        occurredAt: entry.occurredAt,
        kind
      });
      grouped.set(key, list);
    }

    const canFollow: Record<TimeEntryKind, TimeEntryKind[]> = {
      IN: ["BREAK_START", "OUT"],
      BREAK_START: ["BREAK_END"],
      BREAK_END: ["BREAK_START", "OUT"],
      OUT: ["IN"]
    };

    for (const [groupKey, dayEntries] of grouped) {
      if (dayEntries.length === 0) continue;
      const [driverId, date] = groupKey.split(":");

      const first = dayEntries[0];
      if (first.kind !== "IN") {
        issues.push({
          externalKey: `${groupKey}:unexpected-first`,
          driverId,
          date,
          code: "UNEXPECTED_FIRST_ENTRY",
          severity: "ERROR",
          message: "A primeira batida do dia deveria ser entrada.",
          entryIds: [first.id],
          createdAt: first.occurredAt.toISOString()
        });
      }

      let previous = first;
      for (let index = 1; index < dayEntries.length; index += 1) {
        const current = dayEntries[index];
        const allowedNext = canFollow[previous.kind] ?? [];
        if (!allowedNext.includes(current.kind)) {
          issues.push({
            externalKey: `${groupKey}:invalid-seq:${index}`,
            driverId,
            date,
            code: "INVALID_SEQUENCE",
            severity: "ERROR",
            message: `Sequencia invalida: ${previous.kind} seguido de ${current.kind}.`,
            entryIds: [previous.id, current.id],
            createdAt: current.occurredAt.toISOString()
          });
        }
        previous = current;
      }

      const last = dayEntries[dayEntries.length - 1];
      if (last.kind === "BREAK_START") {
        issues.push({
          externalKey: `${groupKey}:missing-break-end`,
          driverId,
          date,
          code: "MISSING_BREAK_END",
          severity: "WARNING",
          message: "Intervalo iniciado sem batida de retorno.",
          entryIds: [last.id],
          createdAt: last.occurredAt.toISOString()
        });
        issues.push({
          externalKey: `${groupKey}:missing-out-after-break`,
          driverId,
          date,
          code: "MISSING_OUT",
          severity: "WARNING",
          message: "Dia encerrado sem batida de saida.",
          entryIds: [last.id],
          createdAt: last.occurredAt.toISOString()
        });
      } else if (last.kind === "IN" || last.kind === "BREAK_END") {
        issues.push({
          externalKey: `${groupKey}:missing-out`,
          driverId,
          date,
          code: "MISSING_OUT",
          severity: "WARNING",
          message: "Dia encerrado sem batida de saida.",
          entryIds: [last.id],
          createdAt: last.occurredAt.toISOString()
        });
      }
    }

    return issues.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async assertTimesheetPeriodOpen(
    driverId: string,
    dateKey: string,
    message: string
  ): Promise<void> {
    const periodKey = this.toPeriodKeyFromDateKey(dateKey);
    const current = await this.prisma.timeSheetPeriod.findUnique({
      where: {
        driverId_periodKey: {
          driverId,
          periodKey
        }
      },
      select: {
        id: true,
        status: true
      }
    });

    if (current?.status === "CLOSED") {
      throw new BadRequestException(`${message} Competencia ${periodKey} esta fechada.`);
    }
  }

  private normalizeOptionalText(value: unknown, maxLength: number, message: string): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }
    const normalized = value.trim();
    if (!normalized) return undefined;
    if (normalized.length > maxLength) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private toOptionalNumber(value: unknown, min: number, max: number, message: string): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return Number(parsed.toFixed(2));
  }

  private toRecordUnknown(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private calculateDistanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number
  ): number {
    const earthRadiusMeters = 6371000;
    const latRadA = (latitudeA * Math.PI) / 180;
    const latRadB = (latitudeB * Math.PI) / 180;
    const deltaLat = ((latitudeB - latitudeA) * Math.PI) / 180;
    const deltaLon = ((longitudeB - longitudeA) * Math.PI) / 180;

    const sinHalfLat = Math.sin(deltaLat / 2);
    const sinHalfLon = Math.sin(deltaLon / 2);
    const a =
      sinHalfLat * sinHalfLat +
      Math.cos(latRadA) * Math.cos(latRadB) * sinHalfLon * sinHalfLon;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private normalizeTimeEntryKind(value: string): TimeEntryKind {
    if (value === "OUT" || value === "BREAK_START" || value === "BREAK_END") {
      return value;
    }
    return "IN";
  }

  private resolveWorkJourneyWeekdayFromDateKey(dateKey: string): WorkJourneyDay {
    const value = this.resolveWeekdayFromDateKey(dateKey);
    if (value === 0) return "SUN";
    if (value === 1) return "MON";
    if (value === 2) return "TUE";
    if (value === 3) return "WED";
    if (value === 4) return "THU";
    if (value === 5) return "FRI";
    return "SAT";
  }
}
