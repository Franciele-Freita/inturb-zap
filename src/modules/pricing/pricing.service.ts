import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreatePricingRuleDto } from "../admin/dto/create-pricing-rule.dto";
import { UpdatePricingRuleDto } from "../admin/dto/update-pricing-rule.dto";
import { PricingRuleSummary } from "../admin/types";
import { PrismaService } from "../prisma/prisma.service";

export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surchargeFare: number;
  pricingRuleFare: number;
  appliedPricingRule?: {
    id: string;
    name: string;
    adjustmentType: "FLAT" | "PERCENT";
    adjustmentValue: number;
  };
  total: number;
  currency: string;
}

export interface PricingConfigSnapshot {
  id: string;
  currency: string;
  baseFare: number;
  distanceRatePerKm: number;
  timeRatePerMinute: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<PricingConfigSnapshot> {
    const config = await this.ensureDefaultConfig();
    return this.toConfigSnapshot(config);
  }

  async updateConfig(input: {
    currency?: string;
    baseFare?: number;
    distanceRatePerKm?: number;
    timeRatePerMinute?: number;
  }): Promise<PricingConfigSnapshot> {
    const current = await this.ensureDefaultConfig();

    const config = await this.prisma.pricingConfig.update({
      where: { id: current.id },
      data: {
        currency: input.currency?.trim().toUpperCase() || undefined,
        baseFare: input.baseFare,
        distanceRatePerKm: input.distanceRatePerKm,
        timeRatePerMinute: input.timeRatePerMinute
      }
    });

    return this.toConfigSnapshot(config);
  }

  async listRules(): Promise<PricingRuleSummary[]> {
    const rules = await this.prisma.pricingRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
    });

    return rules.map((rule) => this.toRuleSummary(rule));
  }

  async getRule(id: string): Promise<PricingRuleSummary> {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id }
    });

    if (!rule) {
      throw new NotFoundException(`Regra tarifaria ${id} nao encontrada.`);
    }

    return this.toRuleSummary(rule);
  }

  async createRule(input: CreatePricingRuleDto): Promise<PricingRuleSummary> {
    const rule = await this.prisma.pricingRule.create({
      data: this.buildRuleData(input)
    });

    return this.toRuleSummary(rule);
  }

  async updateRule(id: string, input: UpdatePricingRuleDto): Promise<PricingRuleSummary> {
    const current = await this.prisma.pricingRule.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Regra tarifaria ${id} nao encontrada.`);
    }

    const rule = await this.prisma.pricingRule.update({
      where: { id },
      data: this.buildRuleData(input, current)
    });

    return this.toRuleSummary(rule);
  }

  async deleteRule(id: string): Promise<void> {
    const current = await this.prisma.pricingRule.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Regra tarifaria ${id} nao encontrada.`);
    }

    await this.prisma.pricingRule.delete({
      where: { id }
    });
  }

  async calculate(
    distanceKm: number,
    durationMinutes: number,
    surchargeFare = 0,
    scheduledAt?: Date
  ): Promise<PriceBreakdown> {
    const config = await this.ensureDefaultConfig();
    const baseFare = Number(config.baseFare);
    const distanceFare = distanceKm * Number(config.distanceRatePerKm);
    const timeFare = durationMinutes * Number(config.timeRatePerMinute);
    const normalizedSurcharge = Number(surchargeFare.toFixed(2));
    const subtotal = Number((baseFare + distanceFare + timeFare + normalizedSurcharge).toFixed(2));
    const matchedRule = scheduledAt ? await this.findMatchingRule(scheduledAt) : null;
    const pricingRuleFare = matchedRule
      ? this.calculateRuleAdjustment(subtotal, matchedRule.adjustmentType, Number(matchedRule.adjustmentValue))
      : 0;
    const total = Number((subtotal + pricingRuleFare).toFixed(2));

    return {
      baseFare,
      distanceFare: Number(distanceFare.toFixed(2)),
      timeFare: Number(timeFare.toFixed(2)),
      surchargeFare: normalizedSurcharge,
      pricingRuleFare,
      appliedPricingRule: matchedRule
        ? {
            id: matchedRule.id,
            name: matchedRule.name,
            adjustmentType: matchedRule.adjustmentType,
            adjustmentValue: Number(matchedRule.adjustmentValue)
          }
        : undefined,
      total,
      currency: config.currency
    };
  }

  private async ensureDefaultConfig() {
    const existing = await this.prisma.pricingConfig.findFirst({
      orderBy: { createdAt: "asc" }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.pricingConfig.create({
      data: {}
    });
  }

  private toConfigSnapshot(config: {
    id: string;
    currency: string;
    baseFare: { toNumber(): number } | number;
    distanceRatePerKm: { toNumber(): number } | number;
    timeRatePerMinute: { toNumber(): number } | number;
    createdAt: Date;
    updatedAt: Date;
  }): PricingConfigSnapshot {
    return {
      id: config.id,
      currency: config.currency,
      baseFare: typeof config.baseFare === "number" ? config.baseFare : config.baseFare.toNumber(),
      distanceRatePerKm:
        typeof config.distanceRatePerKm === "number"
          ? config.distanceRatePerKm
          : config.distanceRatePerKm.toNumber(),
      timeRatePerMinute:
        typeof config.timeRatePerMinute === "number"
          ? config.timeRatePerMinute
          : config.timeRatePerMinute.toNumber(),
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString()
    };
  }

  private buildRuleData(
    input: CreatePricingRuleDto | UpdatePricingRuleDto,
    current?: {
      name: string;
      description: string | null;
      scheduleType: "WEEKLY_WINDOW" | "DATE_RANGE";
      adjustmentType: "FLAT" | "PERCENT";
      adjustmentValue: { toNumber(): number } | number;
      isActive: boolean;
      priority: number;
      daysOfWeek: string | null;
      startMinutes: number | null;
      endMinutes: number | null;
      startDate: Date | null;
      endDate: Date | null;
    }
  ) {
    const nextName = input.name?.trim() ?? current?.name ?? "";
    const nextDescription =
      input.description === undefined ? current?.description ?? null : input.description.trim() || null;
    const nextScheduleType = input.scheduleType ?? current?.scheduleType;
    const nextAdjustmentType = input.adjustmentType ?? current?.adjustmentType ?? "FLAT";
    const nextAdjustmentValue = input.adjustmentValue ?? (current ? Number(current.adjustmentValue) : 0);
    const nextIsActive = input.isActive ?? current?.isActive ?? true;
    const nextPriority = input.priority ?? current?.priority ?? 100;

    if (!nextName) {
      throw new BadRequestException("Informe o nome da regra tarifaria.");
    }

    if (!nextScheduleType) {
      throw new BadRequestException("Informe o tipo da regra tarifaria.");
    }

    const baseData = {
      name: nextName,
      description: nextDescription,
      scheduleType: nextScheduleType,
      adjustmentType: nextAdjustmentType,
      adjustmentValue: nextAdjustmentValue,
      isActive: nextIsActive,
      priority: nextPriority
    };

    if (nextScheduleType === "WEEKLY_WINDOW") {
      const normalizedDays = this.normalizeDaysOfWeek(input.daysOfWeek ?? current?.daysOfWeek ?? "");
      const startMinutes = input.startMinutes ?? current?.startMinutes ?? null;
      const endMinutes = input.endMinutes ?? current?.endMinutes ?? null;

      if (!normalizedDays) {
        throw new BadRequestException("Selecione pelo menos um dia da semana.");
      }

      if (startMinutes === null || endMinutes === null) {
        throw new BadRequestException("Informe inicio e fim da janela semanal.");
      }

      if (endMinutes <= startMinutes) {
        throw new BadRequestException("O horario final deve ser maior que o inicial.");
      }

      return {
        ...baseData,
        daysOfWeek: normalizedDays,
        startMinutes,
        endMinutes,
        startDate: null,
        endDate: null
      };
    }

    const startDate = this.normalizeDate(input.startDate, current?.startDate);
    const endDate = this.normalizeDate(input.endDate, current?.endDate);

    if (!startDate || !endDate) {
      throw new BadRequestException("Informe a data inicial e final do periodo.");
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException("A data final deve ser igual ou posterior a data inicial.");
    }

    return {
      ...baseData,
      daysOfWeek: null,
      startMinutes: null,
      endMinutes: null,
      startDate,
      endDate
    };
  }

  private normalizeDaysOfWeek(value: string): string {
    const uniqueDays = [
      ...new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "" && /^[0-6]$/.test(item))
      )
    ].sort();

    return uniqueDays.join(",");
  }

  private normalizeDate(nextValue: string | undefined, currentValue?: Date | null): Date | null {
    if (nextValue === undefined) {
      return currentValue ?? null;
    }

    if (!nextValue.trim()) {
      return null;
    }

    const parsed = new Date(`${nextValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Data invalida na regra tarifaria.");
    }

    return parsed;
  }

  private async findMatchingRule(scheduledAt: Date) {
    const rules = await this.prisma.pricingRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
    });

    return rules.find((rule) => this.ruleMatches(rule, scheduledAt)) ?? null;
  }

  private ruleMatches(
    rule: {
      scheduleType: "WEEKLY_WINDOW" | "DATE_RANGE";
      daysOfWeek: string | null;
      startMinutes: number | null;
      endMinutes: number | null;
      startDate: Date | null;
      endDate: Date | null;
    },
    scheduledAt: Date
  ): boolean {
    if (rule.scheduleType === "WEEKLY_WINDOW") {
      const day = scheduledAt.getDay();
      const minuteOfDay = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
      const days = (rule.daysOfWeek ?? "").split(",").filter(Boolean);

      return (
        days.includes(String(day)) &&
        rule.startMinutes !== null &&
        rule.endMinutes !== null &&
        minuteOfDay >= rule.startMinutes &&
        minuteOfDay < rule.endMinutes
      );
    }

    if (!rule.startDate || !rule.endDate) {
      return false;
    }

    const target = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate()).getTime();
    const start = new Date(rule.startDate.getFullYear(), rule.startDate.getMonth(), rule.startDate.getDate()).getTime();
    const end = new Date(rule.endDate.getFullYear(), rule.endDate.getMonth(), rule.endDate.getDate()).getTime();

    return target >= start && target <= end;
  }

  private calculateRuleAdjustment(
    subtotal: number,
    adjustmentType: "FLAT" | "PERCENT",
    adjustmentValue: number
  ): number {
    if (adjustmentType === "PERCENT") {
      return Number(((subtotal * adjustmentValue) / 100).toFixed(2));
    }

    return Number(adjustmentValue.toFixed(2));
  }

  private toRuleSummary(rule: {
    id: string;
    name: string;
    description: string | null;
    scheduleType: "WEEKLY_WINDOW" | "DATE_RANGE";
    adjustmentType: "FLAT" | "PERCENT";
    adjustmentValue: { toNumber(): number } | number;
    isActive: boolean;
    priority: number;
    daysOfWeek: string | null;
    startMinutes: number | null;
    endMinutes: number | null;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PricingRuleSummary {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description ?? undefined,
      scheduleType: rule.scheduleType,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: typeof rule.adjustmentValue === "number" ? rule.adjustmentValue : rule.adjustmentValue.toNumber(),
      isActive: rule.isActive,
      priority: rule.priority,
      daysOfWeek: rule.daysOfWeek ?? undefined,
      startMinutes: rule.startMinutes ?? undefined,
      endMinutes: rule.endMinutes ?? undefined,
      startDate: rule.startDate?.toISOString(),
      endDate: rule.endDate?.toISOString(),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString()
    };
  }
}
