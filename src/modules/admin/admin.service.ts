import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { RideCustomerProfile, RideStatus } from "../rides/types";
import { RidesService } from "../rides/rides.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateBenefitDto } from "./dto/create-benefit.dto";
import { CreateCargoDto } from "./dto/create-cargo.dto";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { CreateFinancialCategoryDto } from "./dto/create-financial-category.dto";
import { CreateOvertimeTemplateDto } from "./dto/create-overtime-template.dto";
import { CreateEmploymentLinkageRuleDto } from "./dto/create-employment-linkage-rule.dto";
import { CreateRemunerationTemplateDto } from "./dto/create-remuneration-template.dto";
import { CreateTimeAdjustmentDto } from "./dto/create-time-adjustment.dto";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { CreateTripTypeDto } from "./dto/create-trip-type.dto";
import { CreateWorkJourneyDto } from "./dto/create-work-journey.dto";
import { CreateWorkProfileDto } from "./dto/create-work-profile.dto";
import { CreatePricingRuleDto } from "./dto/create-pricing-rule.dto";
import { CancelTimeAdjustmentDto } from "./dto/cancel-time-adjustment.dto";
import { SaveCustomerFavoriteAddressDto } from "./dto/save-customer-favorite-address.dto";
import {
  UpdateCompanyEmploymentLinkageDto,
  UpdateCompanyProfileDto
} from "./dto/update-company-profile.dto";
import { UpdateBenefitDto } from "./dto/update-benefit.dto";
import { UpdateCargoDto } from "./dto/update-cargo.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";
import { UpdateFinancialCategoryDto } from "./dto/update-financial-category.dto";
import { UpdateOvertimeTemplateDto } from "./dto/update-overtime-template.dto";
import { UpdateEmploymentLinkageRuleDto } from "./dto/update-employment-linkage-rule.dto";
import { UpdatePricingConfigDto } from "./dto/update-pricing-config.dto";
import { UpdatePricingRuleDto } from "./dto/update-pricing-rule.dto";
import { UpdateRemunerationTemplateDto } from "./dto/update-remuneration-template.dto";
import { UpdateTimeAdjustmentDto } from "./dto/update-time-adjustment.dto";
import { UpdateFinancialTransactionDto } from "./dto/update-financial-transaction.dto";
import { UpdateTripTypeDto } from "./dto/update-trip-type.dto";
import { UpdateWorkJourneyDto } from "./dto/update-work-journey.dto";
import { UpdateWorkProfileDto } from "./dto/update-work-profile.dto";
import { ReviewTimeAdjustmentDto } from "./dto/review-time-adjustment.dto";
import {
  BenefitApplicationMode,
  BenefitContractProfile,
  BenefitDiscountBase,
  BenefitDiscountMode,
  BenefitFrequency,
  BenefitPercentageBase,
  BenefitSummary,
  CargoPageSummary,
  CargoOptionSummary,
  BenefitType,
  BenefitValueConfig,
  CargoSummary,
  CompanyEmploymentLinkageSummary,
  CompanyEmploymentLinkageRuleSummary,
  CompanyProfileSummary,
  CboImportSummary,
  CboOccupationPageSummary,
  DsrWeeklyRestDay,
  HolidayScopeType,
  HolidaySummary,
  CustomerConversationLog,
  CustomerConversationLogMessage,
  CustomerFavoriteAddressSummary,
  CustomerProfile,
  CustomerRideHistoryItem,
  CustomerSummary,
  CboOccupationSummary,
  FinancialCashflowDaySummary,
  FinancialCashflowSummary,
  FinancialEntriesSummary,
  FinancialEntrySummary,
  FinancialTransactionSource,
  FinancialTransactionCategorySummary,
  FinancialTransactionCategoryType,
  FinancialTransactionStatus,
  FinancialTransactionSummary,
  FinancialTransactionType,
  FinancialOverviewSummary,
  OvertimeTemplateSummary,
  PricingConfigSummary,
  PricingRuleSummary,
  RemunerationTemplateSummary,
  TimeAdjustmentStatus,
  TimeAdjustmentSummary,
  TimeEntryKind,
  TimeEntryIssueStatus,
  TimeEntryIssueSummary,
  TimeEntrySource,
  TimeEntryStatus,
  TimeEntrySummary,
  TimekeepingCostProjectionDriverSummary,
  TimekeepingCostProjectionSummary,
  TimekeepingDashboardDriverSummary,
  TimekeepingDashboardSummary,
  TimesheetDaySummary,
  TimesheetPeriodSummary,
  TripTypeSummary,
  WorkJourneyBreakType,
  WorkJourneyDay,
  WorkJourneyDsrPolicySnapshot,
  WorkJourneyFixedConfig,
  WorkJourneyFlexibleConfig,
  WorkJourneyIntermittentConfig,
  WorkJourneySummary,
  WorkJourneyType,
  WorkProfileBenefitRef,
  WorkProfileContractType,
  WorkProfileRemunerationSettings,
  WorkProfileSummary
} from "./types";
import {
  getWorkProfileContractCapabilities,
  WORK_PROFILE_CONTRACT_TYPE_VALUES
} from "./work-profile-contract-capabilities";
import { LaborPolicyService } from "./labor-policy.service";
import { DetectedTimeEntryIssue, TimekeepingService } from "./timekeeping.service";

const CUSTOMER_SCORE_BASE = 50;
const ACTIVE_MONTH_LOOKBACK_DAYS = 30;
const CUSTOMER_AGE_BONUS_DAYS = 60;
const BENEFIT_CONTRACT_PROFILE_VALUES = [
  "CLT",
  "CLT_INTERMITENTE",
  "MEI",
  "PJ",
  "AUTONOMO"
] as const;
const WORK_PROFILE_REMUNERATION_MODEL_VALUES = [
  "FIXED",
  "FIXED_PLUS_COMMISSION",
  "COMMISSION_ONLY"
] as const;
const WORK_PROFILE_BASE_REMUNERATION_TYPE_VALUES = ["HOUR", "DAILY", "EVENT"] as const;
const WORK_PROFILE_COMMISSION_TYPE_VALUES = ["PERCENT", "PER_RIDE"] as const;
const HOLIDAY_SCOPE_TYPE_VALUES = ["NATIONAL", "STATE", "CITY"] as const;
const DSR_WEEKLY_REST_DAY_VALUES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const WORK_JOURNEY_TYPE_VALUES = ["FIXED", "FLEXIBLE", "INTERMITTENT"] as const;
const WORK_JOURNEY_BREAK_TYPE_VALUES = ["NONE", "FIXED", "FLEXIBLE"] as const;
const TIME_ENTRY_KIND_VALUES = ["IN", "OUT", "BREAK_START", "BREAK_END"] as const;
const TIME_ENTRY_SOURCE_VALUES = ["APP", "WEB", "ADMIN", "IMPORT"] as const;
const TIME_ENTRY_STATUS_VALUES = ["REGISTERED", "ADJUSTED", "CANCELLED"] as const;
const TIME_ENTRY_ISSUE_CODE_VALUES = [
  "UNEXPECTED_FIRST_ENTRY",
  "INVALID_SEQUENCE",
  "MISSING_BREAK_END",
  "MISSING_OUT"
] as const;
const TIME_ENTRY_ISSUE_SEVERITY_VALUES = ["WARNING", "ERROR"] as const;
const TIME_ENTRY_ISSUE_STATUS_VALUES = ["OPEN", "RESOLVED", "AUTO_RESOLVED"] as const;
const TIME_ADJUSTMENT_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;
const TIMESHEET_PERIOD_STATUS_VALUES = ["OPEN", "CLOSED"] as const;
const TIMESHEET_PERIOD_EXPORT_FORMAT_VALUES = ["CSV", "PDF"] as const;

const DEFAULT_COMPANY_EMPLOYMENT_LINKAGES: CompanyEmploymentLinkageSummary[] = [
  {
    key: "CLT",
    label: "CLT",
    description: "Regime celetista com jornada fixa e beneficios completos.",
    isActive: true,
    sortOrder: 1
  },
  {
    key: "CLT_INTERMITENTE",
    label: "CLT Intermitente",
    description: "Regime por convocacao com pagamento por periodo trabalhado.",
    isActive: true,
    sortOrder: 2
  },
  {
    key: "MEI",
    label: "MEI",
    description: "Prestador microempreendedor individual com emissao fiscal.",
    isActive: true,
    sortOrder: 3
  },
  {
    key: "PJ",
    label: "PJ",
    description: "Prestador pessoa juridica com contrato de servicos.",
    isActive: true,
    sortOrder: 4
  },
  {
    key: "AUTONOMO",
    label: "Autonomo",
    description: "Prestacao eventual sem vinculo empregaticio formal.",
    isActive: true,
    sortOrder: 5
  }
];

const DEFAULT_FINANCIAL_TRANSACTION_CATEGORIES: Array<{
  code: string;
  name: string;
  type: FinancialTransactionCategoryType;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}> = [
  { code: "RIDE_REVENUE", name: "Receita de corrida", type: "REVENUE", color: "#10926F", icon: "route", sortOrder: 10, isActive: true },
  { code: "RIDE_COMMISSION", name: "Comissao", type: "REVENUE", color: "#1D4ED8", icon: "wallet", sortOrder: 20, isActive: true },
  { code: "RIDE_BONUS", name: "Bonus", type: "REVENUE", color: "#2563EB", icon: "gift", sortOrder: 30, isActive: true },
  { code: "PAYROLL_PROJECTION", name: "Folha projetada", type: "EXPENSE", color: "#F59E0B", icon: "users", sortOrder: 40, isActive: true },
  { code: "FLEET_MAINTENANCE", name: "Manutencao", type: "EXPENSE", color: "#DB4367", icon: "tool", sortOrder: 50, isActive: true },
  { code: "FLEET_FUEL", name: "Combustivel", type: "EXPENSE", color: "#EA580C", icon: "droplet", sortOrder: 60, isActive: true },
  { code: "MANUAL_ADJUSTMENT", name: "Ajuste manual", type: "BOTH", color: "#6B7280", icon: "edit", sortOrder: 70, isActive: true }
];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ridesService: RidesService,
    private readonly pricingService: PricingService,
    private readonly timekeepingService: TimekeepingService,
    private readonly laborPolicyService: LaborPolicyService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getMetrics() {
    return {
      ridesByStatus: await this.ridesService.getMetrics(),
      generatedAt: new Date().toISOString()
    };
  }

  async searchCboOccupations(query?: string, limitRaw?: number): Promise<CboOccupationSummary[]> {
    const normalizedQuery = (query ?? "").trim();
    if (normalizedQuery.length < 2) {
      return [];
    }

    const parsedLimit = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 20;
    const limit = Math.min(Math.max(parsedLimit, 1), 50);
    const rows = await this.prisma.cboOccupation.findMany({
      where: {
        isActive: true,
        OR: [
          {
            code: {
              contains: normalizedQuery,
              mode: "insensitive"
            }
          },
          {
            title: {
              contains: normalizedQuery,
              mode: "insensitive"
            }
          }
        ]
      },
      orderBy: [{ code: "asc" }],
      take: limit
    });

    return rows.map((item) => this.toCboOccupationSummary(item));
  }

  async listCboOccupations(options?: {
    page?: number;
    pageSize?: number;
    query?: string;
  }): Promise<CboOccupationPageSummary> {
    const parsedPage =
      typeof options?.page === "number" && Number.isFinite(options.page) ? Math.trunc(options.page) : 1;
    const page = Math.max(parsedPage, 1);
    const parsedPageSize =
      typeof options?.pageSize === "number" && Number.isFinite(options.pageSize)
        ? Math.trunc(options.pageSize)
        : 10;
    const pageSize = Math.min(Math.max(parsedPageSize, 1), 200);
    const normalizedQuery = (options?.query ?? "").trim();

    const where: Prisma.CboOccupationWhereInput = {
      isActive: true
    };

    if (normalizedQuery.length > 0) {
      where.OR = [
        {
          code: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          title: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        }
      ];
    }

    const totalItems = await this.prisma.cboOccupation.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const rows = await this.prisma.cboOccupation.findMany({
      where,
      orderBy: [{ code: "asc" }],
      skip,
      take: pageSize
    });

    return {
      items: rows.map((item) => this.toCboOccupationSummary(item)),
      page: safePage,
      pageSize,
      totalItems,
      totalPages
    };
  }

  async listCargos(): Promise<CargoSummary[]> {
    const cargos = await this.prisma.cargo.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { updatedAt: "desc" }]
    });
    return cargos.map((cargo) => this.toCargoSummary(cargo));
  }

  async listCargoOptions(query?: string, limitRaw?: number): Promise<CargoOptionSummary[]> {
    const normalizedQuery = (query ?? "").trim();
    const parsedLimit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 500;
    const limit = Math.min(Math.max(parsedLimit, 1), 2000);

    const where: Prisma.CargoWhereInput = { isActive: true };
    if (normalizedQuery.length > 0) {
      where.OR = [
        {
          name: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          department: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          level: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          cboCode: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          cboTitle: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        }
      ];
    }

    const cargos = await this.prisma.cargo.findMany({
      where,
      select: {
        id: true,
        name: true,
        level: true,
        levels: true
      },
      orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
      take: limit
    });

    return cargos.map((cargo) => ({
      id: cargo.id,
      name: cargo.name,
      level: this.normalizeCargoCategoryLevel(cargo.level),
      levels: this.normalizeCargoLevels(cargo.levels, cargo.level)
    }));
  }

  async listCargosPage(options?: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: "ALL" | "ACTIVE" | "INACTIVE";
  }): Promise<CargoPageSummary> {
    const parsedPage =
      typeof options?.page === "number" && Number.isFinite(options.page) ? Math.trunc(options.page) : 1;
    const page = Math.max(parsedPage, 1);
    const parsedPageSize =
      typeof options?.pageSize === "number" && Number.isFinite(options.pageSize)
        ? Math.trunc(options.pageSize)
        : 10;
    const pageSize = Math.min(Math.max(parsedPageSize, 1), 200);
    const normalizedQuery = (options?.query ?? "").trim();
    const normalizedStatus = options?.status ?? "ALL";

    const where: Prisma.CargoWhereInput = {};
    if (normalizedStatus === "ACTIVE") {
      where.isActive = true;
    } else if (normalizedStatus === "INACTIVE") {
      where.isActive = false;
    }

    if (normalizedQuery.length > 0) {
      where.OR = [
        {
          name: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          department: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          level: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          cboCode: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        },
        {
          cboTitle: {
            contains: normalizedQuery,
            mode: "insensitive"
          }
        }
      ];
    }

    const totalItems = await this.prisma.cargo.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const cargos = await this.prisma.cargo.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { updatedAt: "desc" }],
      skip,
      take: pageSize
    });

    return {
      items: cargos.map((cargo) => this.toCargoSummary(cargo)),
      page: safePage,
      pageSize,
      totalItems,
      totalPages
    };
  }

  async getCargo(id: string): Promise<CargoSummary> {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id }
    });
    if (!cargo) {
      throw new NotFoundException(`Cargo ${id} nao encontrado.`);
    }
    return this.toCargoSummary(cargo);
  }

  async createCargo(input: CreateCargoDto): Promise<CargoSummary> {
    const normalized = this.normalizeCargoPayload(input, { requireCbo: true });

    try {
      const cargo = await this.prisma.cargo.create({
        data: {
          name: normalized.name,
          description: normalized.description ?? null,
          department: normalized.department,
          level: normalized.level,
          levels: normalized.levels as Prisma.InputJsonValue,
          cboCode: normalized.cbo!.codigo,
          cboTitle: normalized.cbo!.titulo,
          unhealthyAllowance: normalized.unhealthyAllowance,
          hazardousAllowance: normalized.hazardousAllowance,
          isActive: normalized.isActive
        }
      });
      return this.toCargoSummary(cargo);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Ja existe cargo "${normalized.name}" no departamento "${normalized.department}".`
        );
      }
      throw error;
    }
  }

  async updateCargo(id: string, input: UpdateCargoDto): Promise<CargoSummary> {
    const current = await this.prisma.cargo.findUnique({
      where: { id }
    });
    if (!current) {
      throw new NotFoundException(`Cargo ${id} nao encontrado.`);
    }

    const currentPayload = this.toCargoPayload(current);
    const mergedCbo = input.cbo === undefined ? currentPayload.cbo : input.cbo;
    const normalized = this.normalizeCargoPayload({
      name: input.name ?? currentPayload.name,
      description: input.description === undefined ? currentPayload.description : input.description,
      department: input.department ?? currentPayload.department,
      level: input.level ?? currentPayload.level,
      levels: input.levels ?? currentPayload.levels,
      cbo: mergedCbo,
      unhealthyAllowance: input.unhealthyAllowance ?? currentPayload.unhealthyAllowance,
      hazardousAllowance: input.hazardousAllowance ?? currentPayload.hazardousAllowance,
      isActive: input.isActive ?? currentPayload.isActive
    }, {
      requireCbo: Boolean(mergedCbo)
    });

    try {
      const cargo = await this.prisma.cargo.update({
        where: { id },
        data: {
          name: normalized.name,
          description: normalized.description ?? null,
          department: normalized.department,
          level: normalized.level,
          levels: normalized.levels as Prisma.InputJsonValue,
          cboCode: normalized.cbo?.codigo ?? null,
          cboTitle: normalized.cbo?.titulo ?? null,
          unhealthyAllowance: normalized.unhealthyAllowance,
          hazardousAllowance: normalized.hazardousAllowance,
          isActive: normalized.isActive
        }
      });
      return this.toCargoSummary(cargo);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Ja existe cargo "${normalized.name}" no departamento "${normalized.department}".`
        );
      }
      throw error;
    }
  }

  async deleteCargo(id: string): Promise<void> {
    const existing = await this.prisma.cargo.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      throw new NotFoundException(`Cargo ${id} nao encontrado.`);
    }

    const linkedProfiles = await this.prisma.workProfileTemplate.count({
      where: { cargoId: id }
    });
    if (linkedProfiles > 0) {
      throw new BadRequestException(
        "Nao e possivel excluir este cargo porque ele esta vinculado a perfis de trabalho."
      );
    }

    await this.prisma.cargo.delete({
      where: { id }
    });
  }

  async importCboCsv(
    csvContent: string | Buffer,
    options?: {
      delimiter?: string;
      source?: string;
      encoding?: string;
      filename?: string;
    }
  ): Promise<CboImportSummary> {
    const decodedCsvContent = this.decodeCboCsvContent(csvContent, options?.encoding);
    if (!decodedCsvContent.trim()) {
      throw new BadRequestException("Arquivo CSV vazio ou invalido.");
    }

    const source = this.normalizeOptionalText(options?.source, 60, "Fonte de importacao invalida.") ?? "CBO";
    const rows = this.parseCboCsvRows(decodedCsvContent, options?.delimiter);
    const allCodes = rows.map((row) => row.code);
    const existingCodes = new Set<string>();

    for (let index = 0; index < allCodes.length; index += 1000) {
      const chunk = allCodes.slice(index, index + 1000);
      const existing = await this.prisma.cboOccupation.findMany({
        where: {
          code: {
            in: chunk
          }
        },
        select: {
          code: true
        }
      });
      for (const entry of existing) {
        existingCodes.add(entry.code);
      }
    }

    const created = rows.filter((row) => !existingCodes.has(row.code)).length;
    const updated = rows.length - created;

    for (let index = 0; index < rows.length; index += 300) {
      const chunk = rows.slice(index, index + 300);
      await this.prisma.$transaction(
        chunk.map((row) =>
          this.prisma.cboOccupation.upsert({
            where: {
              code: row.code
            },
            create: {
              code: row.code,
              title: row.title,
              description: row.description ?? null,
              source,
              isActive: true
            },
            update: {
              title: row.title,
              description: row.description ?? null,
              source,
              isActive: true
            }
          })
        )
      );
    }

    return {
      processed: rows.length,
      created,
      updated,
      source,
      filename: options?.filename?.trim() || "cbo.csv"
    };
  }

  private decodeCboCsvContent(content: string | Buffer, encodingHint?: string): string {
    if (typeof content === "string") {
      return content.replace(/^\uFEFF/, "");
    }

    if (content.length === 0) {
      return "";
    }

    const resolvedEncoding = this.resolveCboCsvEncoding(encodingHint);
    if (resolvedEncoding) {
      return content.toString(resolvedEncoding).replace(/^\uFEFF/, "");
    }

    const hasUtf8Bom =
      content.length >= 3 &&
      content[0] === 0xef &&
      content[1] === 0xbb &&
      content[2] === 0xbf;

    if (hasUtf8Bom) {
      return content.toString("utf8").replace(/^\uFEFF/, "");
    }

    const utf8Decoded = content.toString("utf8");
    if (!utf8Decoded.includes("\uFFFD")) {
      return utf8Decoded.replace(/^\uFEFF/, "");
    }

    return content.toString("latin1").replace(/^\uFEFF/, "");
  }

  private resolveCboCsvEncoding(value?: string): BufferEncoding | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    if (normalized === "utf8" || normalized === "utf-8") {
      return "utf8";
    }

    if (
      normalized === "latin1" ||
      normalized === "iso-8859-1" ||
      normalized === "iso8859-1" ||
      normalized === "windows-1252" ||
      normalized === "win1252" ||
      normalized === "cp1252"
    ) {
      return "latin1";
    }

    throw new BadRequestException(
      "Encoding invalido. Use utf8/utf-8 ou latin1/iso-8859-1/windows-1252."
    );
  }

  async listTripTypes(): Promise<TripTypeSummary[]> {
    await this.ensureDefaultTripType();

    const types = await this.prisma.tripType.findMany({
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }]
    });

    return types.map((type) => this.toTripTypeSummary(type));
  }

  async getTripType(id: string): Promise<TripTypeSummary> {
    await this.ensureDefaultTripType();

    const tripType = await this.prisma.tripType.findUnique({
      where: { id }
    });

    if (!tripType) {
      throw new NotFoundException(`Tipo de viagem ${id} nao encontrado.`);
    }

    return this.toTripTypeSummary(tripType);
  }

  async getPricingConfig(): Promise<PricingConfigSummary> {
    return this.pricingService.getConfig();
  }

  async updatePricingConfig(input: UpdatePricingConfigDto): Promise<PricingConfigSummary> {
    return this.pricingService.updateConfig(input);
  }

  async getCompanyProfile(): Promise<CompanyProfileSummary> {
    const profile = await this.ensureDefaultCompanyProfile();
    const employmentLinkages = await this.resolveCompanyEmploymentLinkagesForCompany(this.prisma, profile.id);
    return this.toCompanyProfileSummary(profile, employmentLinkages);
  }

  async updateCompanyProfile(input: UpdateCompanyProfileDto): Promise<CompanyProfileSummary> {
    const current = await this.ensureDefaultCompanyProfile();
    const normalizedEmploymentLinkages =
      input.employmentLinkages !== undefined
        ? this.normalizeCompanyEmploymentLinkagesInput(input.employmentLinkages)
        : undefined;
    const finalGeofenceEnabled = input.geofenceEnabled ?? current.geofenceEnabled;
    const finalGeofenceBaseLatitude =
      input.geofenceBaseLatitude === undefined
        ? current.geofenceBaseLatitude === null
          ? undefined
          : Number(current.geofenceBaseLatitude)
        : this.toOptionalNumber(
            input.geofenceBaseLatitude,
            -90,
            90,
            "Latitude da base para geofence invalida."
          );
    const finalGeofenceBaseLongitude =
      input.geofenceBaseLongitude === undefined
        ? current.geofenceBaseLongitude === null
          ? undefined
          : Number(current.geofenceBaseLongitude)
        : this.toOptionalNumber(
            input.geofenceBaseLongitude,
            -180,
            180,
            "Longitude da base para geofence invalida."
          );
    if (finalGeofenceEnabled && (finalGeofenceBaseLatitude === undefined || finalGeofenceBaseLongitude === undefined)) {
      throw new BadRequestException("Geofence habilitada exige latitude e longitude da base.");
    }
    const updateData: Record<string, unknown> = {
      legalName: input.legalName?.trim() || undefined,
      tradeName: input.tradeName?.trim() || undefined,
      cnpj: input.cnpj === undefined ? undefined : input.cnpj.trim() || null,
      phone: input.phone === undefined ? undefined : input.phone.trim() || null,
      email: input.email?.trim() || undefined,
      website: input.website === undefined ? undefined : input.website.trim() || null,
      zipCode: input.zipCode === undefined ? undefined : input.zipCode.trim() || null,
      street: input.street === undefined ? undefined : input.street.trim() || null,
      number: input.number === undefined ? undefined : input.number.trim() || null,
      neighborhood: input.neighborhood === undefined ? undefined : input.neighborhood.trim() || null,
      city: input.city === undefined ? undefined : input.city.trim() || null,
      state: input.state === undefined ? undefined : input.state.trim().toUpperCase().slice(0, 2) || null,
      legalRepresentativeName:
        input.legalRepresentativeName === undefined
          ? undefined
          : input.legalRepresentativeName.trim() || null,
      legalRepresentativeCpf:
        input.legalRepresentativeCpf === undefined ? undefined : input.legalRepresentativeCpf.trim() || null,
      legalRepresentativeRole:
        input.legalRepresentativeRole === undefined ? undefined : input.legalRepresentativeRole.trim() || null,
      contractSignatureCity:
        input.contractSignatureCity === undefined ? undefined : input.contractSignatureCity.trim() || null,
      geofenceEnabled:
        input.geofenceEnabled === undefined ? undefined : this.toBoolean(input.geofenceEnabled, false),
      geofenceBaseLatitude:
        input.geofenceBaseLatitude === undefined
          ? undefined
          : this.toOptionalNumber(
              input.geofenceBaseLatitude,
              -90,
              90,
              "Latitude da base para geofence invalida."
            ),
      geofenceBaseLongitude:
        input.geofenceBaseLongitude === undefined
          ? undefined
          : this.toOptionalNumber(
              input.geofenceBaseLongitude,
              -180,
              180,
              "Longitude da base para geofence invalida."
            ),
      geofenceRadiusMeters:
        input.geofenceRadiusMeters === undefined
          ? undefined
          : this.toInteger(
              input.geofenceRadiusMeters,
              150,
              20,
              5000,
              "Raio da geofence invalido."
            ),
      toleranceMarkingMinutes:
        input.toleranceMarkingMinutes === undefined
          ? undefined
          : this.toInteger(
              input.toleranceMarkingMinutes,
              5,
              0,
              180,
              "Tolerancia de marcacao invalida."
            ),
      toleranceDailyMaxMinutes:
        input.toleranceDailyMaxMinutes === undefined
          ? undefined
          : this.toInteger(
              input.toleranceDailyMaxMinutes,
              10,
              0,
              600,
              "Tolerancia diaria maxima invalida."
            )
    };

    const { profile, employmentLinkages } = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.companyProfileConfig.update({
        where: { id: current.id },
        data: updateData as Prisma.CompanyProfileConfigUpdateInput
      });

      if (normalizedEmploymentLinkages !== undefined) {
        for (const item of normalizedEmploymentLinkages) {
          await tx.companyEmploymentLinkage.upsert({
            where: {
              companyProfileId_key: {
                companyProfileId: profile.id,
                key: item.key
              }
            },
            create: {
              companyProfileId: profile.id,
              key: item.key,
              label: item.label,
              description: item.description,
              isActive: item.isActive,
              sortOrder: item.sortOrder
            },
            update: {
              label: item.label,
              description: item.description,
              isActive: item.isActive,
              sortOrder: item.sortOrder
            }
          });
        }
      }

      const employmentLinkages = await this.resolveCompanyEmploymentLinkagesForCompany(tx, profile.id);
      return { profile, employmentLinkages };
    });

    return this.toCompanyProfileSummary(profile, employmentLinkages);
  }

  async listEmploymentLinkageRules(
    linkageKeyRaw: string
  ): Promise<CompanyEmploymentLinkageRuleSummary[]> {
    const profile = await this.ensureDefaultCompanyProfile();
    const linkage = await this.ensureCompanyEmploymentLinkage(this.prisma, profile.id, linkageKeyRaw);
    const rules = await this.prisma.companyEmploymentLinkageRule.findMany({
      where: { companyEmploymentLinkageId: linkage.id },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
    });

    return rules.map((rule) => this.toCompanyEmploymentLinkageRuleSummary(rule, linkage.key));
  }

  async getEmploymentLinkageRule(
    linkageKeyRaw: string,
    ruleId: string
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    const profile = await this.ensureDefaultCompanyProfile();
    const linkage = await this.ensureCompanyEmploymentLinkage(this.prisma, profile.id, linkageKeyRaw);
    const rule = await this.prisma.companyEmploymentLinkageRule.findFirst({
      where: {
        id: ruleId,
        companyEmploymentLinkageId: linkage.id
      }
    });

    if (!rule) {
      throw new NotFoundException(`Regra ${ruleId} nao encontrada para o vinculo ${linkage.key}.`);
    }

    return this.toCompanyEmploymentLinkageRuleSummary(rule, linkage.key);
  }

  async createEmploymentLinkageRule(
    linkageKeyRaw: string,
    input: CreateEmploymentLinkageRuleDto
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    const profile = await this.ensureDefaultCompanyProfile();
    const linkage = await this.ensureCompanyEmploymentLinkage(this.prisma, profile.id, linkageKeyRaw);

    const code = this.normalizeEmploymentLinkageRuleCode(input.code);
    const name = this.normalizeEmploymentLinkageRuleName(input.name);
    const description = this.normalizeOptionalText(
      input.description,
      400,
      "Descricao da regra de vinculo invalida."
    );
    const isActive = this.toBoolean(input.isActive, true);
    const priority = this.toInteger(
      input.priority,
      100,
      1,
      9999,
      "Prioridade da regra de vinculo invalida."
    );
    const settings = this.normalizeEmploymentLinkageRuleSettings(input.settings);

    try {
      const rule = await this.prisma.companyEmploymentLinkageRule.create({
        data: {
          companyEmploymentLinkageId: linkage.id,
          code,
          name,
          description: description ?? null,
          isActive,
          priority,
          settings
        }
      });

      return this.toCompanyEmploymentLinkageRuleSummary(rule, linkage.key);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(
          `Ja existe uma regra com codigo "${code}" para o vinculo ${linkage.key}.`
        );
      }
      throw error;
    }
  }

  async updateEmploymentLinkageRule(
    linkageKeyRaw: string,
    ruleId: string,
    input: UpdateEmploymentLinkageRuleDto
  ): Promise<CompanyEmploymentLinkageRuleSummary> {
    const profile = await this.ensureDefaultCompanyProfile();
    const linkage = await this.ensureCompanyEmploymentLinkage(this.prisma, profile.id, linkageKeyRaw);
    const current = await this.prisma.companyEmploymentLinkageRule.findFirst({
      where: {
        id: ruleId,
        companyEmploymentLinkageId: linkage.id
      }
    });

    if (!current) {
      throw new NotFoundException(`Regra ${ruleId} nao encontrada para o vinculo ${linkage.key}.`);
    }

    const updateData: Prisma.CompanyEmploymentLinkageRuleUpdateInput = {};

    if (input.code !== undefined) {
      updateData.code = this.normalizeEmploymentLinkageRuleCode(input.code);
    }

    if (input.name !== undefined) {
      updateData.name = this.normalizeEmploymentLinkageRuleName(input.name);
    }

    if (input.description !== undefined) {
      updateData.description =
        this.normalizeOptionalText(input.description, 400, "Descricao da regra de vinculo invalida.") ?? null;
    }

    if (input.isActive !== undefined) {
      updateData.isActive = this.toBoolean(input.isActive, current.isActive);
    }

    if (input.priority !== undefined) {
      updateData.priority = this.toInteger(
        input.priority,
        current.priority,
        1,
        9999,
        "Prioridade da regra de vinculo invalida."
      );
    }

    if (input.settings !== undefined) {
      updateData.settings = this.normalizeEmploymentLinkageRuleSettings(input.settings);
    }

    try {
      const updated = await this.prisma.companyEmploymentLinkageRule.update({
        where: { id: current.id },
        data: updateData
      });

      return this.toCompanyEmploymentLinkageRuleSummary(updated, linkage.key);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        const normalizedCode = typeof updateData.code === "string" ? updateData.code : current.code;
        throw new BadRequestException(
          `Ja existe uma regra com codigo "${normalizedCode}" para o vinculo ${linkage.key}.`
        );
      }
      throw error;
    }
  }

  async deleteEmploymentLinkageRule(linkageKeyRaw: string, ruleId: string): Promise<void> {
    const profile = await this.ensureDefaultCompanyProfile();
    const linkage = await this.ensureCompanyEmploymentLinkage(this.prisma, profile.id, linkageKeyRaw);
    const deleted = await this.prisma.companyEmploymentLinkageRule.deleteMany({
      where: {
        id: ruleId,
        companyEmploymentLinkageId: linkage.id
      }
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Regra ${ruleId} nao encontrada para o vinculo ${linkage.key}.`);
    }
  }

  async listPricingRules(): Promise<PricingRuleSummary[]> {
    return this.pricingService.listRules();
  }

  async getPricingRule(id: string): Promise<PricingRuleSummary> {
    return this.pricingService.getRule(id);
  }

  async createPricingRule(input: CreatePricingRuleDto): Promise<PricingRuleSummary> {
    return this.pricingService.createRule(input);
  }

  async updatePricingRule(id: string, input: UpdatePricingRuleDto): Promise<PricingRuleSummary> {
    return this.pricingService.updateRule(id, input);
  }

  async deletePricingRule(id: string): Promise<void> {
    await this.pricingService.deleteRule(id);
  }

  async listRemunerationTemplates(): Promise<RemunerationTemplateSummary[]> {
    const templates = await this.prisma.remunerationTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
    });

    return templates.map((template) => this.toRemunerationTemplateSummary(template));
  }

  async getRemunerationTemplate(id: string): Promise<RemunerationTemplateSummary> {
    const template = await this.prisma.remunerationTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new NotFoundException(`Template de remuneracao ${id} nao encontrado.`);
    }

    return this.toRemunerationTemplateSummary(template);
  }

  async createRemunerationTemplate(
    input: CreateRemunerationTemplateDto
  ): Promise<RemunerationTemplateSummary> {
    const template = await this.prisma.remunerationTemplate.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        workerType: input.workerType ?? "DRIVER",
        contractProfile: input.contractProfile ?? null,
        isActive: input.isActive ?? true,
        settings: this.normalizeRemunerationTemplateSettings(input.settings)
      }
    });

    return this.toRemunerationTemplateSummary(template);
  }

  async updateRemunerationTemplate(
    id: string,
    input: UpdateRemunerationTemplateDto
  ): Promise<RemunerationTemplateSummary> {
    const current = await this.prisma.remunerationTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Template de remuneracao ${id} nao encontrado.`);
    }

    const template = await this.prisma.remunerationTemplate.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        description: input.description === undefined ? undefined : input.description.trim() || null,
        workerType: input.workerType,
        contractProfile: input.contractProfile === undefined ? undefined : input.contractProfile || null,
        isActive: input.isActive,
        settings:
          input.settings === undefined
            ? undefined
            : this.normalizeRemunerationTemplateSettings(input.settings)
      }
    });

    return this.toRemunerationTemplateSummary(template);
  }

  async deleteRemunerationTemplate(id: string): Promise<void> {
    const current = await this.prisma.remunerationTemplate.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!current) {
      throw new NotFoundException(`Template de remuneracao ${id} nao encontrado.`);
    }

    await this.prisma.remunerationTemplate.delete({
      where: { id }
    });
  }

  async listOvertimeTemplates(category?: string): Promise<OvertimeTemplateSummary[]> {
    let normalizedCategory: "OVERTIME" | "NIGHT" | undefined;
    if (typeof category === "string" && category.trim().length > 0) {
      const value = category.trim().toUpperCase();
      if (value !== "OVERTIME" && value !== "NIGHT") {
        throw new BadRequestException("Categoria de politica invalida. Use OVERTIME ou NIGHT.");
      }
      normalizedCategory = value;
    }

    let templates: Array<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workProfiles: Prisma.JsonValue | null;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    try {
      templates = await this.prisma.overtimeTemplate.findMany({
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
      });
    } catch (error) {
      if (this.isMissingOvertimeTemplateTableError(error)) {
        throw new BadRequestException(
          "Tabela de politicas de hora extra nao encontrada. Sincronize o banco com `pnpm prisma migrate dev`."
        );
      }
      throw error;
    }

    const filteredTemplates =
      normalizedCategory === undefined
        ? templates
        : templates.filter(
            (template) =>
              this.resolveOvertimeTemplatePolicyCategory(template.settings) === normalizedCategory
          );

    return filteredTemplates.map((template) => this.toOvertimeTemplateSummary(template));
  }

  async getOvertimeTemplate(id: string): Promise<OvertimeTemplateSummary> {
    let template: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workProfiles: Prisma.JsonValue | null;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;

    try {
      template = await this.prisma.overtimeTemplate.findUnique({
        where: { id }
      });
    } catch (error) {
      if (this.isMissingOvertimeTemplateTableError(error)) {
        throw new BadRequestException(
          "Tabela de politicas de hora extra nao encontrada. Sincronize o banco com `pnpm prisma migrate dev`."
        );
      }
      throw error;
    }

    if (!template) {
      throw new NotFoundException(`Template de hora extra ${id} nao encontrado.`);
    }

    return this.toOvertimeTemplateSummary(template);
  }

  async createOvertimeTemplate(input: CreateOvertimeTemplateDto): Promise<OvertimeTemplateSummary> {
    let template: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workProfiles: Prisma.JsonValue | null;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    };

    try {
      template = await this.prisma.overtimeTemplate.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          isActive: input.isActive ?? true,
          workProfiles: this.normalizeWorkProfiles(input.workProfiles),
          settings: this.normalizeOvertimeTemplateSettings(input.settings)
        }
      });
    } catch (error) {
      if (this.isMissingOvertimeTemplateTableError(error)) {
        throw new BadRequestException(
          "Tabela de politicas de hora extra nao encontrada. Sincronize o banco com `pnpm prisma migrate dev`."
        );
      }
      throw error;
    }

    return this.toOvertimeTemplateSummary(template);
  }

  async updateOvertimeTemplate(id: string, input: UpdateOvertimeTemplateDto): Promise<OvertimeTemplateSummary> {
    let current: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workProfiles: Prisma.JsonValue | null;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;

    try {
      current = await this.prisma.overtimeTemplate.findUnique({
        where: { id }
      });
    } catch (error) {
      if (this.isMissingOvertimeTemplateTableError(error)) {
        throw new BadRequestException(
          "Tabela de politicas de hora extra nao encontrada. Sincronize o banco com `pnpm prisma migrate dev`."
        );
      }
      throw error;
    }

    if (!current) {
      throw new NotFoundException(`Template de hora extra ${id} nao encontrado.`);
    }

    const currentPolicyCategory = this.resolveOvertimeTemplatePolicyCategory(current.settings);
    const normalizedSettings =
      input.settings === undefined ? undefined : this.normalizeOvertimeTemplateSettings(input.settings);
    const nextPolicyCategory =
      normalizedSettings === undefined
        ? currentPolicyCategory
        : this.resolveOvertimeTemplatePolicyCategory(normalizedSettings);

    if (nextPolicyCategory !== currentPolicyCategory) {
      throw new BadRequestException(
        "Nao e permitido alterar a categoria da politica. Crie uma nova politica no modulo correto."
      );
    }

    if (input.isActive === false && current.isActive) {
      const linkedProfilesCount = await this.prisma.workProfileTemplate.count({
        where:
          nextPolicyCategory === "OVERTIME"
            ? {
                isActive: true,
                usesOvertime: true,
                overtimeTemplateId: id
              }
            : {
                isActive: true,
                usesNightPolicy: true,
                nightTemplateId: id
              }
      });

      if (linkedProfilesCount > 0) {
        throw new BadRequestException(
          `Nao foi possivel inativar a politica. Existem ${linkedProfilesCount} perfil(is) de trabalho ativo(s) vinculados a ela.`
        );
      }
    }

    let template: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      workProfiles: Prisma.JsonValue | null;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    };

    try {
      template = await this.prisma.overtimeTemplate.update({
        where: { id },
        data: {
          name: input.name?.trim() || undefined,
          description: input.description === undefined ? undefined : input.description.trim() || null,
          isActive: input.isActive,
          workProfiles:
            input.workProfiles === undefined ? undefined : this.normalizeWorkProfiles(input.workProfiles),
          settings: normalizedSettings
        }
      });
    } catch (error) {
      if (this.isMissingOvertimeTemplateTableError(error)) {
        throw new BadRequestException(
          "Tabela de politicas de hora extra nao encontrada. Sincronize o banco com `pnpm prisma migrate dev`."
        );
      }
      throw error;
    }

    return this.toOvertimeTemplateSummary(template);
  }

  async listHolidays(options?: {
    year?: number;
    scopeType?: string;
    onlyActive?: boolean;
  }): Promise<HolidaySummary[]> {
    let normalizedScopeType: HolidayScopeType | undefined;
    if (typeof options?.scopeType === "string" && options.scopeType.trim().length > 0) {
      normalizedScopeType = this.toEnum(
        options.scopeType,
        HOLIDAY_SCOPE_TYPE_VALUES,
        "Escopo de feriado invalido.",
        "NATIONAL"
      ) as HolidayScopeType;
    }

    const where: Prisma.HolidayWhereInput = {};
    if (normalizedScopeType) {
      where.scopeType = normalizedScopeType;
    }
    if (options?.onlyActive !== undefined) {
      where.isActive = options.onlyActive;
    }

    if (typeof options?.year === "number" && Number.isFinite(options.year)) {
      const year = Math.trunc(options.year);
      if (year < 1970 || year > 9999) {
        throw new BadRequestException("Ano de filtro de feriado invalido.");
      }
      where.date = {
        gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
        lt: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
      };
    }

    const holidays = await this.prisma.holiday.findMany({
      where,
      orderBy: [{ date: "asc" }, { name: "asc" }]
    });

    return holidays.map((item) => this.toHolidaySummary(item));
  }

  async getHoliday(id: string): Promise<HolidaySummary> {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id }
    });

    if (!holiday) {
      throw new NotFoundException(`Feriado ${id} nao encontrado.`);
    }

    return this.toHolidaySummary(holiday);
  }

  async createHoliday(input: CreateHolidayDto): Promise<HolidaySummary> {
    const normalized = this.normalizeHolidayPayload({
      name: input.name,
      date: input.date,
      scopeType: input.scopeType,
      stateCode: input.stateCode,
      cityCode: input.cityCode,
      isActive: input.isActive
    });
    await this.ensureHolidayUniqueness(normalized);

    const holiday = await this.prisma.holiday.create({
      data: {
        name: normalized.name,
        date: normalized.date,
        scopeType: normalized.scopeType,
        stateCode: normalized.stateCode ?? null,
        cityCode: normalized.cityCode ?? null,
        isActive: normalized.isActive
      }
    });

    return this.toHolidaySummary(holiday);
  }

  async updateHoliday(id: string, input: UpdateHolidayDto): Promise<HolidaySummary> {
    const current = await this.prisma.holiday.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Feriado ${id} nao encontrado.`);
    }

    const normalized = this.normalizeHolidayPayload({
      name: input.name ?? current.name,
      date: input.date ?? this.timekeepingService.toDateOnlyString(current.date),
      scopeType: input.scopeType ?? current.scopeType,
      stateCode: input.stateCode === undefined ? current.stateCode ?? undefined : input.stateCode,
      cityCode: input.cityCode === undefined ? current.cityCode ?? undefined : input.cityCode,
      isActive: input.isActive ?? current.isActive
    });
    await this.ensureHolidayUniqueness(normalized, current.id);

    const holiday = await this.prisma.holiday.update({
      where: { id: current.id },
      data: {
        name: normalized.name,
        date: normalized.date,
        scopeType: normalized.scopeType,
        stateCode: normalized.stateCode ?? null,
        cityCode: normalized.cityCode ?? null,
        isActive: normalized.isActive
      }
    });

    return this.toHolidaySummary(holiday);
  }

  async deleteHoliday(id: string): Promise<void> {
    const deleted = await this.prisma.holiday.deleteMany({
      where: { id }
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Feriado ${id} nao encontrado.`);
    }
  }

  async listBenefits(): Promise<BenefitSummary[]> {
    let benefits: Array<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      type: BenefitType;
      frequency: BenefitFrequency;
      applicationMode: BenefitApplicationMode;
      valueConfig: Prisma.JsonValue;
      deductFromSalary: boolean;
      incursCharges: boolean;
      isMandatory: boolean;
      editableInContract: boolean;
      workProfiles: Prisma.JsonValue | null;
      contractProfiles: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    try {
      benefits = await this.prisma.benefitTemplate.findMany({
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
      });
    } catch (error) {
      if (this.isMissingBenefitTableError(error)) {
        throw new BadRequestException(
          "Tabela de beneficios nao encontrada. Sincronize o banco com `pnpm prisma db push`."
        );
      }
      throw error;
    }

    return benefits.map((benefit) => this.toBenefitSummary(benefit));
  }

  async listWorkProfileOptions(): Promise<string[]> {
    let overtimeTemplates: Array<{ workProfiles: Prisma.JsonValue | null }> = [];
    try {
      overtimeTemplates = await this.prisma.overtimeTemplate.findMany({
        select: { workProfiles: true }
      });
    } catch (error) {
      if (!this.isMissingOvertimeTemplateTableError(error)) {
        throw error;
      }
    }

    let benefitTemplates: Array<{ workProfiles: Prisma.JsonValue | null }> = [];
    try {
      benefitTemplates = await this.prisma.benefitTemplate.findMany({
        select: { workProfiles: true }
      });
    } catch (error) {
      if (!this.isMissingBenefitTableError(error)) {
        throw error;
      }
    }

    const options = [
      ...overtimeTemplates.flatMap((template) => this.normalizeStringList(template.workProfiles, 200)),
      ...benefitTemplates.flatMap((template) => this.normalizeStringList(template.workProfiles, 200))
    ];

    return [...new Set(options)].sort((left, right) => left.localeCompare(right, "pt-BR"));
  }

  async listWorkJourneys(onlyActive?: boolean): Promise<WorkJourneySummary[]> {
    const items = await this.prisma.workJourneyTemplate.findMany({
      where: onlyActive === undefined ? undefined : { isActive: onlyActive },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
    });

    return items.map((item) => this.toWorkJourneySummary(item));
  }

  async getWorkJourney(id: string): Promise<WorkJourneySummary> {
    const item = await this.prisma.workJourneyTemplate.findUnique({
      where: { id }
    });

    if (!item) {
      throw new NotFoundException(`Jornada ${id} nao encontrada.`);
    }

    return this.toWorkJourneySummary(item);
  }

  async listTimeEntries(input?: {
    driverId?: string;
    from?: string;
    to?: string;
    kind?: string;
    source?: string;
    limit?: number;
  }): Promise<TimeEntrySummary[]> {
    const driverId = this.normalizeOptionalText(
      input?.driverId,
      120,
      "Identificador do motorista invalido."
    );
    const from =
      input?.from === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.from, "Data inicial invalida.");
    const to =
      input?.to === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.to, "Data final invalida.");
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException("Periodo invalido. A data inicial deve ser menor que a data final.");
    }
    const kind =
      input?.kind === undefined
        ? undefined
        : (this.toEnum(
            input.kind,
            TIME_ENTRY_KIND_VALUES,
            "Tipo de batida invalido.",
            "IN"
          ) as TimeEntryKind);
    const source =
      input?.source === undefined
        ? undefined
        : (this.toEnum(
            input.source,
            TIME_ENTRY_SOURCE_VALUES,
            "Origem de batida invalida.",
            "APP"
          ) as TimeEntrySource);
    const limit = this.toInteger(input?.limit, 200, 1, 2000, "Limite de consulta invalido.");

    const where: Prisma.TimeEntryWhereInput = {};
    if (driverId) {
      where.driverId = driverId;
    }
    if (kind) {
      where.kind = kind;
    }
    if (source) {
      where.source = source;
    }
    if (from || to) {
      where.occurredAt = {
        gte: from,
        lte: to
      };
    }

    const items = await this.prisma.timeEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit
    });
    return items.map((item) => this.toTimeEntrySummary(item));
  }

  async createTimeEntry(
    input: CreateTimeEntryDto,
    createdByUserId?: string
  ): Promise<TimeEntrySummary> {
    const driverId = this.normalizeOptionalText(
      input.driverId,
      120,
      "Identificador do motorista invalido."
    );
    if (!driverId) {
      throw new BadRequestException("Motorista da batida e obrigatorio.");
    }
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        isActive: true
      }
    });
    if (!driver) {
      throw new NotFoundException(`Motorista ${driverId} nao encontrado.`);
    }
    if (!driver.isActive) {
      throw new BadRequestException("Nao e possivel registrar ponto para motorista inativo.");
    }

    const kind = this.toEnum(input.kind, TIME_ENTRY_KIND_VALUES, "Tipo de batida invalido.", "IN") as TimeEntryKind;
    const source = this.toEnum(
      input.source,
      TIME_ENTRY_SOURCE_VALUES,
      "Origem de batida invalida.",
      "APP"
    ) as TimeEntrySource;
    const occurredAt =
      input.occurredAt === undefined
        ? new Date()
        : this.timekeepingService.normalizeDateTimeValue(input.occurredAt, "Data/hora da batida invalida.");
    await this.timekeepingService.assertTimesheetPeriodOpen(
      driverId,
      occurredAt.toISOString().slice(0, 10),
      "Nao e possivel registrar batida em competencia fechada."
    );
    const timezone = this.normalizeOptionalText(input.timezone, 80, "Timezone invalida.");
    const notes = this.normalizeOptionalText(input.notes, 500, "Observacao da batida invalida.");
    const changeReason = this.normalizeOptionalText(
      input.changeReason,
      500,
      "Motivo da alteracao invalido."
    );
    const normalizedCreatedByUserId = this.normalizeOptionalText(
      createdByUserId,
      120,
      "Identificador do usuario invalido."
    );
    const deviceMeta = this.normalizeTimeEntryMetadata(input.deviceMeta);
    const auditedDeviceMeta = this.timekeepingService.withAuditMetadata(deviceMeta, {
      action: "TIME_ENTRY_CREATE",
      actorUserId: normalizedCreatedByUserId,
      changeReason
    });
    const geo = this.timekeepingService.normalizeTimeEntryGeo(input.geo);
    const geofence = await this.resolveCompanyGeofenceConfig();
    const evaluatedGeo = this.timekeepingService.applyGeofenceToTimeEntryGeo(geo, geofence);

    const item = await this.prisma.timeEntry.create({
      data: {
        driverId,
        createdByUserId: normalizedCreatedByUserId ?? null,
        updatedByUserId: normalizedCreatedByUserId ?? null,
        occurredAt,
        kind,
        source,
        status: "REGISTERED",
        timezone: timezone ?? null,
        deviceMeta: auditedDeviceMeta as Prisma.InputJsonValue | undefined,
        geo: evaluatedGeo as Prisma.InputJsonValue | undefined,
        notes: notes ?? null
      }
    });
    await this.syncTimeEntryIssuesForDriverDate(driverId, occurredAt);
    await this.recalculateTimesheetDay(driverId, occurredAt.toISOString().slice(0, 10));
    return this.toTimeEntrySummary(item);
  }

  async listTimeEntryIssues(input?: {
    driverId?: string;
    from?: string;
    to?: string;
    status?: string;
    limit?: number;
  }): Promise<TimeEntryIssueSummary[]> {
    const driverId = this.normalizeOptionalText(
      input?.driverId,
      120,
      "Identificador do motorista invalido."
    );
    const from =
      input?.from === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.from, "Data inicial invalida.");
    const to =
      input?.to === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.to, "Data final invalida.");
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException("Periodo invalido. A data inicial deve ser menor que a data final.");
    }
    const status =
      input?.status === undefined
        ? undefined
        : (this.toEnum(
            input.status,
            TIME_ENTRY_ISSUE_STATUS_VALUES,
            "Status de pendencia invalido.",
            "OPEN"
          ) as TimeEntryIssueStatus);
    const limit = this.toInteger(input?.limit, 500, 1, 5000, "Limite de consulta invalido.");

    const syncWhere: Prisma.TimeEntryWhereInput = {
      status: {
        not: "CANCELLED"
      }
    };
    if (driverId) {
      syncWhere.driverId = driverId;
    }
    if (from || to) {
      syncWhere.occurredAt = {
        gte: from,
        lte: to
      };
    }
    if (driverId || from || to) {
      const syncRows = await this.prisma.timeEntry.findMany({
        where: syncWhere,
        select: {
          id: true,
          driverId: true,
          occurredAt: true,
          kind: true
        },
        orderBy: [{ driverId: "asc" }, { occurredAt: "asc" }, { id: "asc" }],
        take: 10000
      });
      await this.syncDetectedTimeEntryIssues(syncRows);
    }

    const issueWhere: Prisma.TimeEntryIssueWhereInput = {};
    if (driverId) {
      issueWhere.driverId = driverId;
    }
    if (status) {
      issueWhere.status = status;
    }
    if (from || to) {
      issueWhere.dateKey = {
        gte: from ? from.toISOString().slice(0, 10) : undefined,
        lte: to ? to.toISOString().slice(0, 10) : undefined
      };
    }

    const items = await this.prisma.timeEntryIssue.findMany({
      where: issueWhere,
      orderBy: [{ dateKey: "desc" }, { createdAt: "desc" }],
      take: limit
    });
    return items.map((item) => this.toTimeEntryIssueSummary(item));
  }

  async resolveTimeEntryIssue(issueId: string): Promise<TimeEntryIssueSummary> {
    const normalizedIssueId = this.normalizeOptionalText(issueId, 120, "Identificador da pendencia invalido.");
    if (!normalizedIssueId) {
      throw new BadRequestException("Identificador da pendencia e obrigatorio.");
    }

    const current = await this.prisma.timeEntryIssue.findUnique({
      where: { id: normalizedIssueId }
    });
    if (!current) {
      throw new NotFoundException(`Pendencia ${normalizedIssueId} nao encontrada.`);
    }
    await this.timekeepingService.assertTimesheetPeriodOpen(
      current.driverId,
      current.dateKey,
      "Nao e possivel resolver pendencia em competencia fechada."
    );

    const item = await this.prisma.timeEntryIssue.update({
      where: { id: current.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });
    await this.recalculateTimesheetDay(current.driverId, current.dateKey);
    return this.toTimeEntryIssueSummary(item);
  }

  async listTimeAdjustments(input?: {
    driverId?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<TimeAdjustmentSummary[]> {
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    const status =
      input?.status === undefined
        ? undefined
        : (this.toEnum(
            input.status,
            TIME_ADJUSTMENT_STATUS_VALUES,
            "Status de ajuste invalido.",
            "PENDING"
          ) as TimeAdjustmentStatus);
    const from =
      input?.from === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.from, "Data inicial invalida.");
    const to =
      input?.to === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.to, "Data final invalida.");
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException("Periodo invalido. A data inicial deve ser menor que a data final.");
    }
    const limit = this.toInteger(input?.limit, 200, 1, 2000, "Limite de consulta invalido.");

    const where: Prisma.TimeAdjustmentRequestWhereInput = {};
    if (driverId) {
      where.driverId = driverId;
    }
    if (status) {
      where.status = status;
    }
    if (from || to) {
      where.createdAt = {
        gte: from,
        lte: to
      };
    }

    const items = await this.prisma.timeAdjustmentRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit
    });

    return items.map((item) => this.toTimeAdjustmentSummary(item));
  }

  async createTimeAdjustment(
    input: CreateTimeAdjustmentDto,
    requestedByUserId?: string
  ): Promise<TimeAdjustmentSummary> {
    const driverId = this.normalizeOptionalText(input.driverId, 120, "Identificador do motorista invalido.");
    if (!driverId) {
      throw new BadRequestException("Motorista do ajuste e obrigatorio.");
    }
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, isActive: true }
    });
    if (!driver) {
      throw new NotFoundException(`Motorista ${driverId} nao encontrado.`);
    }
    if (!driver.isActive) {
      throw new BadRequestException("Nao e possivel solicitar ajuste para motorista inativo.");
    }

    const timeEntryId = this.normalizeOptionalText(input.timeEntryId, 120, "Identificador da batida invalido.");
    const reason = this.normalizeOptionalText(input.reason, 500, "Motivo do ajuste invalido.");
    if (!reason) {
      throw new BadRequestException("Motivo do ajuste e obrigatorio.");
    }

    const requestedKind =
      input.requestedKind === undefined
        ? undefined
        : (this.toEnum(
            input.requestedKind,
            TIME_ENTRY_KIND_VALUES,
            "Tipo de batida solicitado invalido.",
            "IN"
          ) as TimeEntryKind);
    const requestedOccurredAt =
      input.requestedOccurredAt === undefined
        ? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.requestedOccurredAt, "Data/hora solicitada invalida.");
    const requestedTimezone = this.normalizeOptionalText(
      input.requestedTimezone,
      80,
      "Timezone solicitada invalida."
    );
    const requestedGeo = this.timekeepingService.normalizeTimeEntryGeo(input.requestedGeo);
    const requestedNotes = this.normalizeOptionalText(
      input.requestedNotes,
      500,
      "Observacao solicitada invalida."
    );
    const changeReason = this.normalizeOptionalText(
      input.changeReason,
      500,
      "Motivo da alteracao invalido."
    );
    const normalizedRequestedByUserId = this.normalizeOptionalText(
      requestedByUserId,
      120,
      "Identificador do usuario invalido."
    );

    let originalSnapshot: Record<string, unknown> | undefined;
    if (timeEntryId) {
      const entry = await this.prisma.timeEntry.findUnique({
        where: { id: timeEntryId }
      });
      if (!entry) {
        throw new NotFoundException(`Batida ${timeEntryId} nao encontrada.`);
      }
      if (entry.driverId !== driverId) {
        throw new BadRequestException("A batida informada nao pertence ao motorista selecionado.");
      }
      if (entry.status === "CANCELLED") {
        throw new BadRequestException("Nao e possivel ajustar uma batida cancelada.");
      }
      await this.timekeepingService.assertTimesheetPeriodOpen(
        driverId,
        entry.occurredAt.toISOString().slice(0, 10),
        "Nao e possivel solicitar ajuste para batida de competencia fechada."
      );
      if (requestedOccurredAt) {
        await this.timekeepingService.assertTimesheetPeriodOpen(
          driverId,
          requestedOccurredAt.toISOString().slice(0, 10),
          "Nao e possivel solicitar ajuste para competencia fechada."
        );
      }

      originalSnapshot = {
        id: entry.id,
        occurredAt: entry.occurredAt.toISOString(),
        kind: entry.kind,
        source: entry.source,
        status: entry.status
      };
      if (entry.timezone) {
        originalSnapshot.timezone = entry.timezone;
      }
      const originalGeo = this.toRecordOrUndefined(entry.geo);
      if (originalGeo) {
        originalSnapshot.geo = originalGeo;
      }
      if (entry.notes) {
        originalSnapshot.notes = entry.notes;
      }

      if (
        requestedKind === undefined &&
        requestedOccurredAt === undefined &&
        requestedTimezone === undefined &&
        requestedGeo === undefined &&
        requestedNotes === undefined
      ) {
        throw new BadRequestException("Informe ao menos uma alteracao para ajustar a batida.");
      }
    } else if (!requestedKind || !requestedOccurredAt) {
      throw new BadRequestException(
        "Para criar ajuste sem batida vinculada, informe pelo menos tipo e data/hora da batida solicitada."
      );
    } else {
      await this.timekeepingService.assertTimesheetPeriodOpen(
        driverId,
        requestedOccurredAt.toISOString().slice(0, 10),
        "Nao e possivel solicitar ajuste para competencia fechada."
      );
    }

    const requestedSnapshot: Record<string, unknown> = {};
    if (requestedKind !== undefined) {
      requestedSnapshot.requestedKind = requestedKind;
    }
    if (requestedOccurredAt !== undefined) {
      requestedSnapshot.requestedOccurredAt = requestedOccurredAt.toISOString();
    }
    if (requestedTimezone !== undefined) {
      requestedSnapshot.requestedTimezone = requestedTimezone;
    }
    if (requestedGeo !== undefined) {
      requestedSnapshot.requestedGeo = requestedGeo;
    }
    if (requestedNotes !== undefined) {
      requestedSnapshot.requestedNotes = requestedNotes;
    }
    this.timekeepingService.appendAdjustmentAudit(requestedSnapshot, {
      action: "TIME_ADJUSTMENT_CREATE",
      actorUserId: normalizedRequestedByUserId,
      changeReason
    });

    const item = await this.prisma.timeAdjustmentRequest.create({
      data: {
        driverId,
        timeEntryId: timeEntryId ?? null,
        requestedByUserId: normalizedRequestedByUserId ?? null,
        updatedByUserId: normalizedRequestedByUserId ?? null,
        reason,
        requestedKind: requestedKind ?? null,
        requestedOccurredAt: requestedOccurredAt ?? null,
        requestedTimezone: requestedTimezone ?? null,
        requestedGeo: requestedGeo as Prisma.InputJsonValue | undefined,
        requestedNotes: requestedNotes ?? null,
        originalSnapshot: originalSnapshot as Prisma.InputJsonValue | undefined,
        requestedSnapshot: requestedSnapshot as Prisma.InputJsonValue,
        status: "PENDING"
      }
    });

    return this.toTimeAdjustmentSummary(item);
  }

  async updateTimeAdjustment(
    adjustmentId: string,
    input: UpdateTimeAdjustmentDto,
    requestedByUserId?: string
  ): Promise<TimeAdjustmentSummary> {
    const normalizedAdjustmentId = this.normalizeOptionalText(
      adjustmentId,
      120,
      "Identificador do ajuste invalido."
    );
    if (!normalizedAdjustmentId) {
      throw new BadRequestException("Identificador do ajuste e obrigatorio.");
    }

    const current = await this.prisma.timeAdjustmentRequest.findUnique({
      where: { id: normalizedAdjustmentId }
    });
    if (!current) {
      throw new NotFoundException(`Ajuste ${normalizedAdjustmentId} nao encontrado.`);
    }
    if (current.status !== "PENDING") {
      throw new BadRequestException("Somente ajustes pendentes podem ser editados.");
    }

    const hasAnyUpdate =
      input.timeEntryId !== undefined ||
      input.reason !== undefined ||
      input.requestedKind !== undefined ||
      input.requestedOccurredAt !== undefined ||
      input.requestedTimezone !== undefined ||
      input.requestedGeo !== undefined ||
      input.requestedNotes !== undefined;
    if (!hasAnyUpdate) {
      throw new BadRequestException("Informe ao menos um campo para atualizar o ajuste.");
    }

    const reason =
      input.reason === undefined
        ? current.reason
        : this.normalizeOptionalText(input.reason, 500, "Motivo do ajuste invalido.");
    if (!reason) {
      throw new BadRequestException("Motivo do ajuste e obrigatorio.");
    }

    const timeEntryId =
      input.timeEntryId === undefined
        ? current.timeEntryId ?? undefined
        : this.normalizeOptionalText(input.timeEntryId, 120, "Identificador da batida invalido.");

    const requestedKind =
      input.requestedKind === undefined
        ? ((current.requestedKind ?? undefined) as TimeEntryKind | undefined)
        : (this.toEnum(
            input.requestedKind,
            TIME_ENTRY_KIND_VALUES,
            "Tipo de batida solicitado invalido.",
            "IN"
          ) as TimeEntryKind);
    const requestedOccurredAt =
      input.requestedOccurredAt === undefined
        ? current.requestedOccurredAt ?? undefined
        : this.timekeepingService.normalizeDateTimeValue(input.requestedOccurredAt, "Data/hora solicitada invalida.");
    const requestedTimezone =
      input.requestedTimezone === undefined
        ? current.requestedTimezone ?? undefined
        : this.normalizeOptionalText(input.requestedTimezone, 80, "Timezone solicitada invalida.");
    const requestedGeo =
      input.requestedGeo === undefined
        ? this.toRecordOrUndefined(current.requestedGeo)
        : this.timekeepingService.normalizeTimeEntryGeo(input.requestedGeo);
    const requestedNotes =
      input.requestedNotes === undefined
        ? current.requestedNotes ?? undefined
        : this.normalizeOptionalText(input.requestedNotes, 500, "Observacao solicitada invalida.");
    const changeReason = this.normalizeOptionalText(
      input.changeReason,
      500,
      "Motivo da alteracao invalido."
    );
    const normalizedRequestedByUserId = this.normalizeOptionalText(
      requestedByUserId,
      120,
      "Identificador do usuario invalido."
    );

    let originalSnapshot: Record<string, unknown> | undefined;
    if (timeEntryId) {
      const entry = await this.prisma.timeEntry.findUnique({
        where: { id: timeEntryId }
      });
      if (!entry) {
        throw new NotFoundException(`Batida ${timeEntryId} nao encontrada.`);
      }
      if (entry.driverId !== current.driverId) {
        throw new BadRequestException("A batida informada nao pertence ao motorista selecionado.");
      }
      if (entry.status === "CANCELLED") {
        throw new BadRequestException("Nao e possivel ajustar uma batida cancelada.");
      }
      await this.timekeepingService.assertTimesheetPeriodOpen(
        current.driverId,
        entry.occurredAt.toISOString().slice(0, 10),
        "Nao e possivel solicitar ajuste para batida de competencia fechada."
      );
      if (requestedOccurredAt) {
        await this.timekeepingService.assertTimesheetPeriodOpen(
          current.driverId,
          requestedOccurredAt.toISOString().slice(0, 10),
          "Nao e possivel solicitar ajuste para competencia fechada."
        );
      }

      originalSnapshot = {
        id: entry.id,
        occurredAt: entry.occurredAt.toISOString(),
        kind: entry.kind,
        source: entry.source,
        status: entry.status
      };
      if (entry.timezone) {
        originalSnapshot.timezone = entry.timezone;
      }
      const originalGeo = this.toRecordOrUndefined(entry.geo);
      if (originalGeo) {
        originalSnapshot.geo = originalGeo;
      }
      if (entry.notes) {
        originalSnapshot.notes = entry.notes;
      }
    } else {
      if (!requestedKind || !requestedOccurredAt) {
        throw new BadRequestException(
          "Para criar ajuste sem batida vinculada, informe pelo menos tipo e data/hora da batida solicitada."
        );
      }
      await this.timekeepingService.assertTimesheetPeriodOpen(
        current.driverId,
        requestedOccurredAt.toISOString().slice(0, 10),
        "Nao e possivel solicitar ajuste para competencia fechada."
      );
    }

    const requestedSnapshot: Record<string, unknown> = {};
    if (requestedKind !== undefined) {
      requestedSnapshot.requestedKind = requestedKind;
    }
    if (requestedOccurredAt !== undefined) {
      requestedSnapshot.requestedOccurredAt = requestedOccurredAt.toISOString();
    }
    if (requestedTimezone !== undefined) {
      requestedSnapshot.requestedTimezone = requestedTimezone;
    }
    if (requestedGeo !== undefined) {
      requestedSnapshot.requestedGeo = requestedGeo;
    }
    if (requestedNotes !== undefined) {
      requestedSnapshot.requestedNotes = requestedNotes;
    }
    this.timekeepingService.appendAdjustmentAudit(requestedSnapshot, {
      action: "TIME_ADJUSTMENT_UPDATE",
      actorUserId: normalizedRequestedByUserId,
      changeReason
    });

    const item = await this.prisma.timeAdjustmentRequest.update({
      where: { id: current.id },
      data: {
        timeEntryId: timeEntryId ?? null,
        updatedByUserId: normalizedRequestedByUserId ?? current.updatedByUserId ?? null,
        reason,
        requestedKind: requestedKind ?? null,
        requestedOccurredAt: requestedOccurredAt ?? null,
        requestedTimezone: requestedTimezone ?? null,
        requestedGeo:
          requestedGeo === undefined
            ? Prisma.DbNull
            : (requestedGeo as Prisma.InputJsonValue),
        requestedNotes: requestedNotes ?? null,
        originalSnapshot:
          originalSnapshot === undefined
            ? Prisma.DbNull
            : (originalSnapshot as Prisma.InputJsonValue),
        requestedSnapshot:
          Object.keys(requestedSnapshot).length === 0
            ? Prisma.DbNull
            : (requestedSnapshot as Prisma.InputJsonValue)
      }
    });

    return this.toTimeAdjustmentSummary(item);
  }

  async cancelTimeAdjustment(
    adjustmentId: string,
    input: CancelTimeAdjustmentDto,
    cancelledByUserId?: string
  ): Promise<TimeAdjustmentSummary> {
    const normalizedAdjustmentId = this.normalizeOptionalText(
      adjustmentId,
      120,
      "Identificador do ajuste invalido."
    );
    if (!normalizedAdjustmentId) {
      throw new BadRequestException("Identificador do ajuste e obrigatorio.");
    }

    const current = await this.prisma.timeAdjustmentRequest.findUnique({
      where: { id: normalizedAdjustmentId }
    });
    if (!current) {
      throw new NotFoundException(`Ajuste ${normalizedAdjustmentId} nao encontrado.`);
    }
    if (current.status !== "PENDING") {
      throw new BadRequestException("Somente ajustes pendentes podem ser cancelados.");
    }

    const note = this.normalizeOptionalText(input.note, 500, "Observacao de cancelamento invalida.");
    const changeReason = this.normalizeOptionalText(
      input.changeReason,
      500,
      "Motivo da alteracao invalido."
    );
    const normalizedCancelledByUserId = this.normalizeOptionalText(
      cancelledByUserId,
      120,
      "Identificador do usuario invalido."
    );

    const requestedSnapshotForCancel = this.toRecordOrUndefined(current.requestedSnapshot) ?? {};
    this.timekeepingService.appendAdjustmentAudit(requestedSnapshotForCancel, {
      action: "TIME_ADJUSTMENT_CANCEL",
      actorUserId: normalizedCancelledByUserId,
      changeReason
    });

    const item = await this.prisma.timeAdjustmentRequest.update({
      where: { id: current.id },
      data: {
        status: "REJECTED",
        updatedByUserId: normalizedCancelledByUserId ?? current.updatedByUserId ?? null,
        reviewedByUserId: normalizedCancelledByUserId ?? null,
        reviewerNote: note ?? changeReason ?? "Ajuste cancelado.",
        requestedSnapshot: requestedSnapshotForCancel as Prisma.InputJsonValue,
        reviewedAt: new Date()
      }
    });

    return this.toTimeAdjustmentSummary(item);
  }

  async reviewTimeAdjustment(
    adjustmentId: string,
    review: ReviewTimeAdjustmentDto,
    reviewedByUserId?: string
  ): Promise<TimeAdjustmentSummary> {
    const normalizedAdjustmentId = this.normalizeOptionalText(
      adjustmentId,
      120,
      "Identificador do ajuste invalido."
    );
    if (!normalizedAdjustmentId) {
      throw new BadRequestException("Identificador do ajuste e obrigatorio.");
    }
    const current = await this.prisma.timeAdjustmentRequest.findUnique({
      where: { id: normalizedAdjustmentId }
    });
    if (!current) {
      throw new NotFoundException(`Ajuste ${normalizedAdjustmentId} nao encontrado.`);
    }
    if (current.status !== "PENDING") {
      throw new BadRequestException("Somente ajustes pendentes podem ser revisados.");
    }

    const reviewerNote = this.normalizeOptionalText(
      review.reviewerNote,
      500,
      "Observacao do revisor invalida."
    );
    const changeReason = this.normalizeOptionalText(
      review.changeReason,
      500,
      "Motivo da alteracao invalido."
    );
    const normalizedReviewedByUserId = this.normalizeOptionalText(
      reviewedByUserId,
      120,
      "Identificador do revisor invalido."
    );
    const requestedSnapshotForReview = this.toRecordOrUndefined(current.requestedSnapshot) ?? {};
    this.timekeepingService.appendAdjustmentAudit(requestedSnapshotForReview, {
      action: review.decision === "REJECT" ? "TIME_ADJUSTMENT_REJECT" : "TIME_ADJUSTMENT_APPROVE",
      actorUserId: normalizedReviewedByUserId,
      changeReason
    });

    if (review.decision === "REJECT") {
      const item = await this.prisma.timeAdjustmentRequest.update({
        where: { id: current.id },
        data: {
          status: "REJECTED",
          updatedByUserId: normalizedReviewedByUserId ?? current.updatedByUserId ?? null,
          reviewedByUserId: normalizedReviewedByUserId ?? null,
          reviewerNote: reviewerNote ?? changeReason ?? null,
          requestedSnapshot: requestedSnapshotForReview as Prisma.InputJsonValue,
          reviewedAt: new Date()
        }
      });
      return this.toTimeAdjustmentSummary(item);
    }

    if (current.timeEntryId) {
      const targetEntry = await this.prisma.timeEntry.findUnique({
        where: { id: current.timeEntryId }
      });
      if (!targetEntry) {
        throw new NotFoundException("Batida vinculada ao ajuste nao foi encontrada.");
      }
      if (targetEntry.driverId !== current.driverId) {
        throw new BadRequestException("A batida vinculada nao pertence ao motorista do ajuste.");
      }
      if (targetEntry.status === "CANCELLED") {
        throw new BadRequestException("Nao e possivel aplicar ajuste em batida cancelada.");
      }

      const oldOccurredAt = targetEntry.occurredAt;
      const nextKind = (current.requestedKind ?? targetEntry.kind) as TimeEntryKind;
      const nextOccurredAt = current.requestedOccurredAt ?? targetEntry.occurredAt;
      const nextTimezone = current.requestedTimezone ?? targetEntry.timezone ?? undefined;
      const nextNotes = current.requestedNotes ?? targetEntry.notes ?? undefined;
      const nextGeo = this.toRecordOrUndefined(current.requestedGeo) ?? this.toRecordOrUndefined(targetEntry.geo);
      const geofence = await this.resolveCompanyGeofenceConfig();
      const evaluatedGeo = this.timekeepingService.applyGeofenceToTimeEntryGeo(nextGeo, geofence);
      await this.timekeepingService.assertTimesheetPeriodOpen(
        current.driverId,
        oldOccurredAt.toISOString().slice(0, 10),
        "Nao e possivel aprovar ajuste de competencia fechada."
      );
      if (oldOccurredAt.toISOString().slice(0, 10) !== nextOccurredAt.toISOString().slice(0, 10)) {
        await this.timekeepingService.assertTimesheetPeriodOpen(
          current.driverId,
          nextOccurredAt.toISOString().slice(0, 10),
          "Nao e possivel mover batida para competencia fechada."
        );
      }

      await this.prisma.timeEntry.update({
        where: { id: targetEntry.id },
        data: {
          kind: nextKind,
          occurredAt: nextOccurredAt,
          source: "ADMIN",
          status: "ADJUSTED",
          updatedByUserId: normalizedReviewedByUserId ?? targetEntry.updatedByUserId ?? null,
          timezone: nextTimezone ?? null,
          notes: nextNotes ?? null,
          geo: evaluatedGeo as Prisma.InputJsonValue | undefined
        }
      });

      const updatedAdjustment = await this.prisma.timeAdjustmentRequest.update({
        where: { id: current.id },
        data: {
          status: "APPROVED",
          updatedByUserId: normalizedReviewedByUserId ?? current.updatedByUserId ?? null,
          reviewedByUserId: normalizedReviewedByUserId ?? null,
          reviewerNote: reviewerNote ?? changeReason ?? null,
          requestedSnapshot: requestedSnapshotForReview as Prisma.InputJsonValue,
          reviewedAt: new Date()
        }
      });

      await this.syncTimeEntryIssuesForDriverDate(current.driverId, oldOccurredAt);
      await this.recalculateTimesheetDay(current.driverId, oldOccurredAt.toISOString().slice(0, 10));
      if (oldOccurredAt.toISOString().slice(0, 10) !== nextOccurredAt.toISOString().slice(0, 10)) {
        await this.syncTimeEntryIssuesForDriverDate(current.driverId, nextOccurredAt);
        await this.recalculateTimesheetDay(current.driverId, nextOccurredAt.toISOString().slice(0, 10));
      }

      return this.toTimeAdjustmentSummary(updatedAdjustment);
    }

    if (!current.requestedKind || !current.requestedOccurredAt) {
      throw new BadRequestException(
        "Ajuste sem batida vinculada exige tipo e data/hora solicitados para aprovacao."
      );
    }
    await this.timekeepingService.assertTimesheetPeriodOpen(
      current.driverId,
      current.requestedOccurredAt.toISOString().slice(0, 10),
      "Nao e possivel aprovar ajuste para competencia fechada."
    );

    const createdEntry = await this.prisma.timeEntry.create({
      data: {
        driverId: current.driverId,
        createdByUserId: normalizedReviewedByUserId ?? null,
        updatedByUserId: normalizedReviewedByUserId ?? null,
        kind: current.requestedKind as TimeEntryKind,
        occurredAt: current.requestedOccurredAt,
        source: "ADMIN",
        status: "ADJUSTED",
        timezone: current.requestedTimezone ?? null,
        notes: current.requestedNotes ?? null,
        geo: this.timekeepingService.applyGeofenceToTimeEntryGeo(
          this.toRecordOrUndefined(current.requestedGeo),
          await this.resolveCompanyGeofenceConfig()
        ) as Prisma.InputJsonValue | undefined
      }
    });

    const updatedAdjustment = await this.prisma.timeAdjustmentRequest.update({
      where: { id: current.id },
      data: {
        timeEntryId: createdEntry.id,
        status: "APPROVED",
        updatedByUserId: normalizedReviewedByUserId ?? current.updatedByUserId ?? null,
        reviewedByUserId: normalizedReviewedByUserId ?? null,
        reviewerNote: reviewerNote ?? changeReason ?? null,
        requestedSnapshot: requestedSnapshotForReview as Prisma.InputJsonValue,
        reviewedAt: new Date()
      }
    });

    await this.syncTimeEntryIssuesForDriverDate(current.driverId, createdEntry.occurredAt);
    await this.recalculateTimesheetDay(current.driverId, createdEntry.occurredAt.toISOString().slice(0, 10));
    return this.toTimeAdjustmentSummary(updatedAdjustment);
  }

  async listTimesheetDays(input?: {
    driverId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<TimesheetDaySummary[]> {
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    const fromDateKey =
      input?.from === undefined
        ? undefined
        : this.timekeepingService.normalizeDateKeyValue(input.from, "Data inicial invalida.");
    const toDateKey =
      input?.to === undefined
        ? undefined
        : this.timekeepingService.normalizeDateKeyValue(input.to, "Data final invalida.");
    if (fromDateKey && toDateKey && fromDateKey > toDateKey) {
      throw new BadRequestException("Periodo invalido. A data inicial deve ser menor que a data final.");
    }
    const limit = this.toInteger(input?.limit, 200, 1, 5000, "Limite de consulta invalido.");

    const where: Prisma.TimeSheetDayWhereInput = {};
    if (driverId) {
      where.driverId = driverId;
    }
    if (fromDateKey || toDateKey) {
      where.dateKey = {
        gte: fromDateKey,
        lte: toDateKey
      };
    }

    const items = await this.prisma.timeSheetDay.findMany({
      where,
      orderBy: [{ dateKey: "desc" }, { calculatedAt: "desc" }],
      take: limit
    });
    return items.map((item) => this.toTimesheetDaySummary(item));
  }

  async recalculateTimesheetDays(input?: {
    driverId?: string;
    date?: string;
    from?: string;
    to?: string;
  }): Promise<TimesheetDaySummary[]> {
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    if (!driverId) {
      throw new BadRequestException("Motorista e obrigatorio para recalculo da apuracao.");
    }

    const normalizedDate =
      input?.date === undefined
        ? undefined
        : this.timekeepingService.normalizeDateKeyValue(input.date, "Data de apuracao invalida.");
    const fromDateKey =
      input?.from === undefined
        ? undefined
        : this.timekeepingService.normalizeDateKeyValue(input.from, "Data inicial invalida.");
    const toDateKey =
      input?.to === undefined
        ? undefined
        : this.timekeepingService.normalizeDateKeyValue(input.to, "Data final invalida.");

    if (fromDateKey && toDateKey && fromDateKey > toDateKey) {
      throw new BadRequestException("Periodo invalido. A data inicial deve ser menor que a data final.");
    }

    const targetDateKeys = new Set<string>();
    if (normalizedDate) {
      targetDateKeys.add(normalizedDate);
    } else {
      const effectiveFrom = fromDateKey ?? toDateKey ?? this.timekeepingService.toDateOnlyString(new Date());
      const effectiveTo = toDateKey ?? fromDateKey ?? effectiveFrom;
      const effectiveRange = this.timekeepingService.buildRangeUtc(effectiveFrom, effectiveTo);
      const rows = await this.prisma.timeEntry.findMany({
        where: {
          driverId,
          status: {
            not: "CANCELLED"
          },
          occurredAt: {
            gte: effectiveRange.start,
            lte: effectiveRange.end
          }
        },
        select: {
          occurredAt: true
        }
      });
      for (const row of rows) {
        targetDateKeys.add(row.occurredAt.toISOString().slice(0, 10));
      }
      if (targetDateKeys.size === 0) {
        targetDateKeys.add(effectiveFrom);
      }
    }

    const recalculated: TimesheetDaySummary[] = [];
    const sortedDates = [...targetDateKeys].sort((a, b) => a.localeCompare(b));
    for (const dateKey of sortedDates) {
      await this.timekeepingService.assertTimesheetPeriodOpen(
        driverId,
        dateKey,
        "Nao e possivel recalcular dia em competencia fechada."
      );
      const result = await this.recalculateTimesheetDay(driverId, dateKey);
      recalculated.push(result);
    }

    return recalculated.sort((a, b) => b.date.localeCompare(a.date));
  }

  async listTimesheetPeriods(input?: {
    driverId?: string;
    period?: string;
    limit?: number;
  }): Promise<TimesheetPeriodSummary[]> {
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    const periodKey =
      input?.period === undefined ? undefined : this.normalizePeriodKeyValue(input.period, "Competencia invalida.");
    const limit = this.toInteger(input?.limit, 200, 1, 5000, "Limite de consulta invalido.");

    const where: Prisma.TimeSheetPeriodWhereInput = {};
    if (driverId) {
      where.driverId = driverId;
    }
    if (periodKey) {
      where.periodKey = periodKey;
    }

    const items = await this.prisma.timeSheetPeriod.findMany({
      where,
      orderBy: [{ periodKey: "desc" }, { calculatedAt: "desc" }],
      take: limit
    });
    return items.map((item) => this.toTimesheetPeriodSummary(item));
  }

  async getTimekeepingDashboard(input?: { date?: string }): Promise<TimekeepingDashboardSummary> {
    const dateKey =
      input?.date === undefined
        ? this.timekeepingService.toDateOnlyString(new Date())
        : this.timekeepingService.normalizeDateKeyValue(input.date, "Data do monitor invalida.");
    const { start: dayStart, end: dayEnd } = this.timekeepingService.buildDayRangeUtc(dateKey);

    const drivers = await this.prisma.driver.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        contract: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (drivers.length === 0) {
      return {
        date: dateKey,
        generatedAt: new Date().toISOString(),
        totalDrivers: 0,
        inJourneyCount: 0,
        onBreakCount: 0,
        delayedCount: 0,
        overtimeAlertCount: 0,
        pendingIssueDriversCount: 0,
        notStartedCount: 0,
        finishedCount: 0,
        drivers: []
      };
    }

    const driverIds = drivers.map((driver) => driver.id);
    const [entries, openIssues, dayRows] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: {
          driverId: {
            in: driverIds
          },
          status: {
            not: "CANCELLED"
          },
          occurredAt: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        orderBy: [{ driverId: "asc" }, { occurredAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          driverId: true,
          kind: true,
          occurredAt: true
        }
      }),
      this.prisma.timeEntryIssue.findMany({
        where: {
          driverId: {
            in: driverIds
          },
          dateKey,
          status: "OPEN"
        },
        select: {
          driverId: true
        }
      }),
      this.prisma.timeSheetDay.findMany({
        where: {
          driverId: {
            in: driverIds
          },
          dateKey
        },
        select: {
          driverId: true,
          expectedMinutes: true,
          workedMinutes: true,
          breakMinutes: true,
          overtimeMinutes: true,
          openIssueCount: true
        }
      })
    ]);

    const entriesByDriver = new Map<
      string,
      Array<{
        id: string;
        driverId: string;
        kind: string;
        occurredAt: Date;
      }>
    >();
    for (const entry of entries) {
      const list = entriesByDriver.get(entry.driverId) ?? [];
      list.push(entry);
      entriesByDriver.set(entry.driverId, list);
    }

    const openIssueCountByDriver = new Map<string, number>();
    for (const issue of openIssues) {
      openIssueCountByDriver.set(issue.driverId, (openIssueCountByDriver.get(issue.driverId) ?? 0) + 1);
    }

    const dayByDriver = new Map<string, (typeof dayRows)[number]>();
    for (const row of dayRows) {
      dayByDriver.set(row.driverId, row);
    }

    const todayDateKey = this.timekeepingService.toDateOnlyString(new Date());
    const now = new Date();

    let inJourneyCount = 0;
    let onBreakCount = 0;
    let delayedCount = 0;
    let overtimeAlertCount = 0;
    let pendingIssueDriversCount = 0;
    let notStartedCount = 0;
    let finishedCount = 0;

    const driverSummaries: TimekeepingDashboardDriverSummary[] = [];
    for (const driver of drivers) {
      const timeline = entriesByDriver.get(driver.id) ?? [];
      const firstEntry = timeline[0];
      const lastEntry = timeline[timeline.length - 1];
      const day = dayByDriver.get(driver.id);

      const sequenceState = this.resolveDriverTimelineState(lastEntry?.kind);
      let delayed = false;
      let expectedMinutes = day?.expectedMinutes ?? 0;
      let workedMinutes = day?.workedMinutes ?? 0;
      let breakMinutes = day?.breakMinutes ?? 0;
      let overtimeMinutes = day?.overtimeMinutes ?? 0;

      if (!day && timeline.length > 0) {
        const computed = this.calculateWorkedAndBreakMinutes(
          timeline.map((item) => ({
            kind: item.kind,
            occurredAt: item.occurredAt
          }))
        );
        workedMinutes = computed.workedMinutes;
        breakMinutes = computed.breakMinutes;
      }

      if (timeline.length > 0 && (sequenceState === "IN_JOURNEY" || sequenceState === "ON_BREAK")) {
        const live = this.calculateLiveWorkedAndBreakMinutes(
          timeline.map((item) => ({
            kind: item.kind,
            occurredAt: item.occurredAt
          })),
          now
        );
        workedMinutes = Math.max(workedMinutes, live.workedMinutes);
        breakMinutes = Math.max(breakMinutes, live.breakMinutes);
      }

      if (sequenceState === "NOT_STARTED" || expectedMinutes === 0) {
        try {
          const expectation = await this.resolveExpectedJourneyForDate(driver.contract, dateKey);
          if (expectedMinutes === 0) {
            expectedMinutes = expectation.expectedMinutes;
          }
          if (
            sequenceState === "NOT_STARTED" &&
            expectation.isWorkday &&
            expectation.expectedStartAt &&
            dateKey === todayDateKey
          ) {
            const delayLimit = new Date(
              expectation.expectedStartAt.getTime() + Math.max(0, expectation.toleranceMarkingMinutes) * 60_000
            );
            delayed = now.getTime() > delayLimit.getTime();
          }
        } catch {
          // Dashboard should remain resilient even if a contract snapshot is incomplete.
        }
      }

      overtimeMinutes = Math.max(overtimeMinutes, Math.max(0, workedMinutes - expectedMinutes));
      const overtimeAlertMinutes =
        expectedMinutes > 0 ? Math.max(0, expectedMinutes - workedMinutes) : undefined;
      const overtimeAlertActive =
        expectedMinutes > 0 &&
        (sequenceState === "IN_JOURNEY" || sequenceState === "ON_BREAK") &&
        (overtimeAlertMinutes ?? 0) <= 60;
      if (overtimeAlertActive) {
        overtimeAlertCount += 1;
      }

      const issueCount = Math.max(day?.openIssueCount ?? 0, openIssueCountByDriver.get(driver.id) ?? 0);
      if (issueCount > 0) {
        pendingIssueDriversCount += 1;
      }

      if (sequenceState === "IN_JOURNEY") inJourneyCount += 1;
      if (sequenceState === "ON_BREAK") onBreakCount += 1;
      if (sequenceState === "NOT_STARTED") notStartedCount += 1;
      if (sequenceState === "FINISHED") finishedCount += 1;
      if (delayed) delayedCount += 1;

      driverSummaries.push({
        driverId: driver.id,
        driverName: driver.user.name,
        state: sequenceState,
        delayed,
        firstEntryAt: firstEntry?.occurredAt.toISOString(),
        lastEntryAt: lastEntry?.occurredAt.toISOString(),
        expectedMinutes,
        workedMinutes,
        breakMinutes,
        overtimeMinutes,
        overtimeAlertMinutes,
        overtimeAlertActive,
        openIssueCount: issueCount
      });
    }

    const statePriority: Record<TimekeepingDashboardDriverSummary["state"], number> = {
      ON_BREAK: 1,
      IN_JOURNEY: 2,
      NOT_STARTED: 3,
      FINISHED: 4
    };

    driverSummaries.sort((left, right) => {
      if (left.delayed !== right.delayed) {
        return left.delayed ? -1 : 1;
      }
      const stateDiff = statePriority[left.state] - statePriority[right.state];
      if (stateDiff !== 0) return stateDiff;
      if (left.openIssueCount !== right.openIssueCount) {
        return right.openIssueCount - left.openIssueCount;
      }
      return left.driverName.localeCompare(right.driverName);
    });

    this.notificationsService.queueTimekeepingMissingPunchAlerts({
      date: dateKey,
      drivers: driverSummaries.map((driver) => ({
        driverId: driver.driverId,
        driverName: driver.driverName,
        delayed: driver.delayed,
        state: driver.state,
        expectedMinutes: driver.expectedMinutes,
        firstEntryAt: driver.firstEntryAt
      }))
    });

    return {
      date: dateKey,
      generatedAt: new Date().toISOString(),
      totalDrivers: drivers.length,
      inJourneyCount,
      onBreakCount,
      delayedCount,
      overtimeAlertCount,
      pendingIssueDriversCount,
      notStartedCount,
      finishedCount,
      drivers: driverSummaries
    };
  }

  async getTimekeepingCostProjection(input?: {
    date?: string;
    driverId?: string;
  }): Promise<TimekeepingCostProjectionSummary> {
    const dateKey =
      input?.date === undefined
        ? this.timekeepingService.toDateOnlyString(new Date())
        : this.timekeepingService.normalizeDateKeyValue(input.date, "Data da projecao invalida.");
    const normalizedDriverId = this.normalizeOptionalText(
      input?.driverId,
      120,
      "Identificador do motorista invalido."
    );
    const { start: dayStart, end: dayEnd } = this.timekeepingService.buildDayRangeUtc(dateKey);
    const now = new Date();
    const referenceTime = dateKey === this.timekeepingService.toDateOnlyString(now) ? now : dayEnd;

    const drivers = await this.prisma.driver.findMany({
      where: {
        isActive: true,
        id: normalizedDriverId ?? undefined
      },
      select: {
        id: true,
        contract: true,
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ createdAt: "asc" }]
    });

    if (drivers.length === 0) {
      return {
        date: dateKey,
        generatedAt: new Date().toISOString(),
        totalBaseCost: 0,
        totalOvertimeCost: 0,
        totalNightCost: 0,
        totalProjectedCost: 0,
        drivers: []
      };
    }

    const driverIds = drivers.map((driver) => driver.id);
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        driverId: { in: driverIds },
        status: {
          not: "CANCELLED"
        },
        occurredAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: [{ driverId: "asc" }, { occurredAt: "asc" }, { id: "asc" }],
      select: {
        driverId: true,
        kind: true,
        occurredAt: true
      }
    });

    const entriesByDriver = new Map<string, Array<{ kind: string; occurredAt: Date }>>();
    for (const entry of entries) {
      const list = entriesByDriver.get(entry.driverId) ?? [];
      list.push({ kind: entry.kind, occurredAt: entry.occurredAt });
      entriesByDriver.set(entry.driverId, list);
    }

    const workProfileIds = new Set<string>();
    const driverWorkProfileId = new Map<string, string | undefined>();
    for (const driver of drivers) {
      const workProfileTemplateId = this.resolveDriverWorkProfileTemplateId(driver.contract);
      driverWorkProfileId.set(driver.id, workProfileTemplateId);
      if (workProfileTemplateId) {
        workProfileIds.add(workProfileTemplateId);
      }
    }

    const workProfiles = await this.prisma.workProfileTemplate.findMany({
      where: {
        id: {
          in: [...workProfileIds]
        }
      },
      select: {
        id: true,
        remuneration: true,
        usesOvertime: true,
        overtimeTemplateId: true,
        usesNightPolicy: true,
        nightTemplateId: true
      }
    });
    const workProfileById = new Map(workProfiles.map((item) => [item.id, item]));

    const overtimeTemplateIds = new Set<string>();
    const nightTemplateIds = new Set<string>();
    for (const profile of workProfiles) {
      if (profile.usesOvertime && profile.overtimeTemplateId) {
        overtimeTemplateIds.add(profile.overtimeTemplateId);
      }
      if (profile.usesNightPolicy && profile.nightTemplateId) {
        nightTemplateIds.add(profile.nightTemplateId);
      }
    }

    const policyTemplates = await this.prisma.overtimeTemplate.findMany({
      where: {
        id: {
          in: [...new Set([...overtimeTemplateIds, ...nightTemplateIds])]
        }
      },
      select: {
        id: true,
        settings: true
      }
    });
    const policyTemplateById = new Map(policyTemplates.map((item) => [item.id, item.settings]));

    let totalBaseCost = 0;
    let totalOvertimeCost = 0;
    let totalNightCost = 0;

    const driversProjection: TimekeepingCostProjectionDriverSummary[] = [];
    for (const driver of drivers) {
      const timeline = entriesByDriver.get(driver.id) ?? [];
      const expectation = await this.resolveExpectedJourneyForDate(driver.contract, dateKey);
      const worked = this.calculateLiveWorkedAndBreakMinutes(timeline, referenceTime);
      const workedMinutes = Math.max(0, worked.workedMinutes);
      const expectedMinutes = Math.max(0, expectation.expectedMinutes);
      const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
      const baseMinutes = expectedMinutes > 0 ? Math.min(workedMinutes, expectedMinutes) : workedMinutes;
      const workProfileTemplateId = driverWorkProfileId.get(driver.id);
      const workProfile = workProfileTemplateId ? workProfileById.get(workProfileTemplateId) : undefined;

      const overtimePercent = workProfile?.usesOvertime
        ? this.resolveOvertimePercent(policyTemplateById.get(workProfile.overtimeTemplateId ?? ""))
        : 0;
      const nightPolicy = workProfile?.usesNightPolicy
        ? this.resolveNightPolicy(policyTemplateById.get(workProfile.nightTemplateId ?? ""))
        : {
            enabled: false,
            percent: 0,
            startTime: "22:00",
            endTime: "05:00"
          };
      const nightMinutes = nightPolicy.enabled
        ? this.calculateNightMinutesFromEntries(timeline, referenceTime, nightPolicy.startTime, nightPolicy.endTime)
        : 0;

      const rateDetails = this.resolveWorkProfileHourlyRate(workProfile?.remuneration, expectedMinutes);
      const hourlyRate = rateDetails.hourlyRate;
      const baseCost = (baseMinutes / 60) * hourlyRate;
      const overtimeCost = (overtimeMinutes / 60) * hourlyRate * (1 + overtimePercent / 100);
      const nightCost = (nightMinutes / 60) * hourlyRate * (nightPolicy.percent / 100);
      const totalCost = baseCost + overtimeCost + nightCost;

      totalBaseCost += baseCost;
      totalOvertimeCost += overtimeCost;
      totalNightCost += nightCost;

      driversProjection.push({
        driverId: driver.id,
        driverName: driver.user.name,
        workProfileTemplateId,
        hourlyRate: Number(hourlyRate.toFixed(2)),
        expectedMinutes,
        workedMinutes,
        overtimeMinutes,
        nightMinutes,
        overtimePercent,
        nightPercent: nightPolicy.percent,
        baseCost: Number(baseCost.toFixed(2)),
        overtimeCost: Number(overtimeCost.toFixed(2)),
        nightCost: Number(nightCost.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        auditMemory: [
          `Modelo remuneracao: ${rateDetails.remunerationModel}`,
          `Base valor/hora: R$ ${hourlyRate.toFixed(2)} (${rateDetails.rateSource})`,
          `Base calculo normal: (${baseMinutes} / 60) * ${hourlyRate.toFixed(2)}`,
          `Base calculo extra: (${overtimeMinutes} / 60) * ${hourlyRate.toFixed(2)} * (1 + ${overtimePercent}/100)`,
          `Base calculo noturno: (${nightMinutes} / 60) * ${hourlyRate.toFixed(2)} * (${nightPolicy.percent}/100)`
        ]
      });
    }

    driversProjection.sort((left, right) => right.totalCost - left.totalCost);

    return {
      date: dateKey,
      generatedAt: new Date().toISOString(),
      totalBaseCost: Number(totalBaseCost.toFixed(2)),
      totalOvertimeCost: Number(totalOvertimeCost.toFixed(2)),
      totalNightCost: Number(totalNightCost.toFixed(2)),
      totalProjectedCost: Number((totalBaseCost + totalOvertimeCost + totalNightCost).toFixed(2)),
      drivers: driversProjection
    };
  }

  async listFinancialTransactionCategories(): Promise<FinancialTransactionCategorySummary[]> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    return this.resolveFinancialTransactionCategoriesForCompany(this.prisma, companyProfile.id);
  }

  async createFinancialTransactionCategory(
    input: CreateFinancialCategoryDto
  ): Promise<FinancialTransactionCategorySummary> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const defaults = this.getDefaultFinancialTransactionCategories();
    await this.ensureFinancialTransactionCategoryRows(this.prisma, companyProfile.id, defaults);

    const code = this.normalizeFinancialCategoryCode(input.code);
    const name = this.normalizeFinancialCategoryName(input.name);
    const type = this.normalizeFinancialCategoryType(input.type);
    const color = this.normalizeOptionalText(input.color, 20, "Cor da categoria financeira invalida.");
    const icon = this.normalizeOptionalText(input.icon, 40, "Icone da categoria financeira invalido.");
    const sortOrder = this.toInteger(
      input.sortOrder,
      this.resolveNextFinancialCategorySortOrder(defaults),
      1,
      9999,
      "Ordem da categoria financeira invalida."
    );
    const isActive = this.toBoolean(input.isActive, true);

    try {
      const created = await this.prisma.financialTransactionCategory.create({
        data: {
          companyProfileId: companyProfile.id,
          code,
          name,
          type,
          color: color ?? null,
          icon: icon ?? null,
          sortOrder,
          isActive
        }
      });
      return this.toFinancialTransactionCategorySummary(created);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(`Categoria financeira ${code} ja cadastrada.`);
      }
      throw error;
    }
  }

  async updateFinancialTransactionCategory(
    categoryId: string,
    input: UpdateFinancialCategoryDto
  ): Promise<FinancialTransactionCategorySummary> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const normalizedCategoryId = this.normalizeOptionalText(
      categoryId,
      120,
      "Identificador da categoria financeira invalido."
    );
    if (!normalizedCategoryId) {
      throw new BadRequestException("Identificador da categoria financeira e obrigatorio.");
    }

    const current = await this.prisma.financialTransactionCategory.findFirst({
      where: {
        id: normalizedCategoryId,
        companyProfileId: companyProfile.id
      }
    });
    if (!current) {
      throw new NotFoundException(`Categoria financeira ${normalizedCategoryId} nao encontrada.`);
    }

    const code = input.code !== undefined ? this.normalizeFinancialCategoryCode(input.code) : current.code;
    const name = input.name !== undefined ? this.normalizeFinancialCategoryName(input.name) : current.name;
    const type = input.type !== undefined ? this.normalizeFinancialCategoryType(input.type) : current.type;
    const color =
      input.color !== undefined
        ? this.normalizeOptionalText(input.color, 20, "Cor da categoria financeira invalida.")
        : current.color;
    const icon =
      input.icon !== undefined
        ? this.normalizeOptionalText(input.icon, 40, "Icone da categoria financeira invalido.")
        : current.icon;
    const sortOrder =
      input.sortOrder !== undefined
        ? this.toInteger(input.sortOrder, current.sortOrder, 1, 9999, "Ordem da categoria financeira invalida.")
        : current.sortOrder;
    const isActive =
      input.isActive !== undefined ? this.toBoolean(input.isActive, current.isActive) : current.isActive;

    try {
      const updated = await this.prisma.financialTransactionCategory.update({
        where: { id: current.id },
        data: {
          code,
          name,
          type,
          color: color ?? null,
          icon: icon ?? null,
          sortOrder,
          isActive
        }
      });
      return this.toFinancialTransactionCategorySummary(updated);
    } catch (error) {
      if (this.isPrismaUniqueConstraintError(error)) {
        throw new BadRequestException(`Categoria financeira ${code} ja cadastrada.`);
      }
      throw error;
    }
  }

  async deleteFinancialTransactionCategory(categoryId: string): Promise<void> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const normalizedCategoryId = this.normalizeOptionalText(
      categoryId,
      120,
      "Identificador da categoria financeira invalido."
    );
    if (!normalizedCategoryId) {
      throw new BadRequestException("Identificador da categoria financeira e obrigatorio.");
    }

    const current = await this.prisma.financialTransactionCategory.findFirst({
      where: {
        id: normalizedCategoryId,
        companyProfileId: companyProfile.id
      }
    });
    if (!current) {
      throw new NotFoundException(`Categoria financeira ${normalizedCategoryId} nao encontrada.`);
    }

    await this.prisma.financialTransactionCategory.update({
      where: { id: current.id },
      data: {
        isActive: false
      }
    });
  }

  async updateFinancialTransaction(
    transactionId: string,
    input: UpdateFinancialTransactionDto,
    actorUserId?: string
  ): Promise<FinancialTransactionSummary> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const manualTransactionId = this.parseManualTransactionId(transactionId);

    const current = await this.prisma.financialManualTransaction.findFirst({
      where: {
        id: manualTransactionId,
        companyProfileId: companyProfile.id
      }
    });
    if (!current) {
      throw new NotFoundException(`Transacao financeira ${transactionId} nao encontrada.`);
    }

    const categories = await this.resolveFinancialTransactionCategoriesForCompany(this.prisma, companyProfile.id);
    const categoriesByCode = new Map(categories.map((item) => [item.code, item]));

    const nextDescription =
      input.description !== undefined
        ? this.normalizeOptionalText(input.description, 200, "Descricao da transacao invalida.")
        : current.description;
    if (!nextDescription) {
      throw new BadRequestException("Descricao da transacao e obrigatoria.");
    }

    const nextCategoryCode =
      input.category !== undefined ? this.normalizeFinancialCategoryCode(input.category) : current.categoryCode;
    if (!categoriesByCode.has(nextCategoryCode)) {
      throw new BadRequestException(`Categoria financeira ${nextCategoryCode} nao encontrada.`);
    }

    const nextAmount =
      input.amount !== undefined
        ? this.toNumber(input.amount, 0, -100000000, 100000000, "Valor da transacao invalido.")
        : this.decimalToNumber(current.amount);

    const nextOccurredAt =
      input.occurredAt !== undefined
        ? this.parseRequiredDateTime(input.occurredAt, "Data/hora da transacao invalida.")
        : current.occurredAt;
    const nextReferenceId =
      input.referenceId !== undefined
        ? this.normalizeOptionalText(input.referenceId, 120, "Referencia da transacao invalida.")
        : current.referenceId;
    const nextNotes =
      input.notes !== undefined
        ? this.normalizeOptionalText(input.notes, 500, "Observacao da transacao invalida.")
        : current.notes;
    const normalizedActorUserId = this.normalizeOptionalText(
      actorUserId,
      120,
      "Identificador do usuario invalido."
    );

    const updated = await this.prisma.financialManualTransaction.update({
      where: { id: current.id },
      data: {
        description: nextDescription,
        categoryCode: nextCategoryCode,
        amount: nextAmount,
        occurredAt: nextOccurredAt,
        referenceId: nextReferenceId ?? null,
        notes: nextNotes ?? null,
        updatedByUserId: normalizedActorUserId ?? null
      }
    });

    const categoryName = categoriesByCode.get(updated.categoryCode)?.name;
    return this.toFinancialTransactionSummaryFromManualTransaction(updated, categoryName);
  }

  async reverseFinancialTransaction(
    transactionId: string,
    actorUserId?: string,
    reason?: string
  ): Promise<FinancialTransactionSummary> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const manualTransactionId = this.parseManualTransactionId(transactionId);
    const normalizedActorUserId = this.normalizeOptionalText(
      actorUserId,
      120,
      "Identificador do usuario invalido."
    );
    const normalizedReason = this.normalizeOptionalText(reason, 300, "Motivo do estorno invalido.");

    const current = await this.prisma.financialManualTransaction.findFirst({
      where: {
        id: manualTransactionId,
        companyProfileId: companyProfile.id
      }
    });
    if (!current) {
      throw new NotFoundException(`Transacao financeira ${transactionId} nao encontrada.`);
    }

    if (current.status === "CANCELLED") {
      throw new BadRequestException("Nao e possivel estornar transacao cancelada.");
    }

    const existingReversal = await this.prisma.financialManualTransaction.findFirst({
      where: {
        companyProfileId: companyProfile.id,
        reversalOfManualTransactionId: current.id,
        status: {
          not: "CANCELLED"
        }
      },
      select: { id: true }
    });
    if (existingReversal) {
      throw new BadRequestException("Esta transacao ja possui estorno registrado.");
    }

    const created = await this.prisma.financialManualTransaction.create({
      data: {
        companyProfileId: companyProfile.id,
        driverId: current.driverId ?? null,
        type: current.type,
        status: "COMPLETED",
        categoryCode: current.categoryCode,
        description: `Estorno: ${current.description}`.slice(0, 200),
        amount: Number((-this.decimalToNumber(current.amount)).toFixed(2)),
        occurredAt: new Date(),
        referenceId: current.referenceId ?? null,
        notes: normalizedReason ?? null,
        metadata: {
          reason: normalizedReason,
          reversedTransactionId: current.id
        } as Prisma.InputJsonValue,
        isReversal: true,
        reversalOfManualTransactionId: current.id,
        createdByUserId: normalizedActorUserId ?? null,
        updatedByUserId: normalizedActorUserId ?? null
      }
    });

    const categories = await this.resolveFinancialTransactionCategoriesForCompany(this.prisma, companyProfile.id);
    const categoryName = categories.find((item) => item.code === created.categoryCode)?.name;
    return this.toFinancialTransactionSummaryFromManualTransaction(created, categoryName);
  }

  async getFinancialTransactions(input?: {
    period?: string;
    driverId?: string;
    type?: string;
    status?: string;
    source?: string;
    search?: string;
    offset?: number;
    limit?: number;
  }): Promise<FinancialTransactionSummary[]> {
    const periodKey = this.normalizePeriodKeyValue(input?.period, "Competencia invalida. Use YYYY-MM.");
    const typeFilter = this.toOptionalFinancialTransactionType(input?.type);
    const statusFilter = this.toOptionalFinancialTransactionStatus(input?.status);
    const sourceFilter = this.toOptionalFinancialTransactionSource(input?.source);
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    const search = (input?.search ?? "").trim().toLowerCase();
    const offset = this.toInteger(input?.offset, 0, 0, 1000000, "Offset de transacoes invalido.");
    const limit = this.toInteger(input?.limit, 500, 1, 5000, "Limite de transacoes invalido.");

    const transactions = await this.collectFinancialTransactions(periodKey);
    const filtered = transactions
      .filter((transaction) => (typeFilter ? transaction.type === typeFilter : true))
      .filter((transaction) => (statusFilter ? transaction.status === statusFilter : true))
      .filter((transaction) => (sourceFilter ? transaction.source === sourceFilter : true))
      .filter((transaction) => (driverId ? transaction.driverId === driverId : true))
      .filter((transaction) => {
        if (!search) return true;
        const base = `${transaction.description} ${transaction.category} ${transaction.categoryLabel ?? ""} ${transaction.source} ${transaction.referenceId ?? ""} ${transaction.driverName ?? ""}`.toLowerCase();
        return base.includes(search);
      })
      .sort((left, right) => {
        const dateDiff = +new Date(right.occurredAt) - +new Date(left.occurredAt);
        if (dateDiff !== 0) return dateDiff;
        return right.amount - left.amount;
      });

    return filtered.slice(offset, offset + limit);
  }

  async getFinancialCashflow(input?: { period?: string }): Promise<FinancialCashflowSummary> {
    const periodKey = this.normalizePeriodKeyValue(input?.period, "Competencia invalida. Use YYYY-MM.");
    const { dateKeys } = this.timekeepingService.resolvePeriodDateKeys(periodKey);
    const transactions = await this.getFinancialTransactions({
      period: periodKey,
      status: "COMPLETED",
      limit: 5000
    });

    const days: FinancialCashflowDaySummary[] = dateKeys.map((dateKey) => {
      const dayTransactions = transactions.filter(
        (transaction) => transaction.occurredAt.slice(0, 10) === dateKey
      );

      const revenueAmount = Number(
        dayTransactions
          .filter((transaction) => transaction.type === "EARNING")
          .reduce((total, transaction) => total + transaction.amount, 0)
          .toFixed(2)
      );
      const payrollCostAmount = Number(
        dayTransactions
          .filter(
            (transaction) =>
              transaction.source === "PAYROLL" && transaction.type !== "EARNING"
          )
          .reduce((total, transaction) => total + transaction.amount, 0)
          .toFixed(2)
      );
      const fleetCostAmount = Number(
        dayTransactions
          .filter(
            (transaction) =>
              (transaction.source === "FLEET_MAINTENANCE" || transaction.source === "FLEET_REFUEL") &&
              transaction.type !== "EARNING"
          )
          .reduce((total, transaction) => total + transaction.amount, 0)
          .toFixed(2)
      );
      const totalCostAmount = Number((payrollCostAmount + fleetCostAmount).toFixed(2));
      const netAmount = Number((revenueAmount - totalCostAmount).toFixed(2));

      return {
        date: dateKey,
        revenueAmount,
        payrollCostAmount,
        fleetCostAmount,
        totalCostAmount,
        netAmount
      };
    });

    const totals = days.reduce(
      (acc, day) => {
        acc.revenueAmount += day.revenueAmount;
        acc.payrollCostAmount += day.payrollCostAmount;
        acc.fleetCostAmount += day.fleetCostAmount;
        acc.totalCostAmount += day.totalCostAmount;
        acc.netAmount += day.netAmount;
        return acc;
      },
      {
        revenueAmount: 0,
        payrollCostAmount: 0,
        fleetCostAmount: 0,
        totalCostAmount: 0,
        netAmount: 0
      }
    );

    return {
      period: periodKey,
      generatedAt: new Date().toISOString(),
      totals: {
        revenueAmount: Number(totals.revenueAmount.toFixed(2)),
        payrollCostAmount: Number(totals.payrollCostAmount.toFixed(2)),
        fleetCostAmount: Number(totals.fleetCostAmount.toFixed(2)),
        totalCostAmount: Number(totals.totalCostAmount.toFixed(2)),
        netAmount: Number(totals.netAmount.toFixed(2))
      },
      days
    };
  }

  async getFinancialOverview(input?: { period?: string }): Promise<FinancialOverviewSummary> {
    const periodKey = this.normalizePeriodKeyValue(input?.period, "Competencia invalida. Use YYYY-MM.");
    const { startDateKey, endDateKey } = this.timekeepingService.resolvePeriodDateKeys(periodKey);

    const [cashflow, transactions, periodIssuesCount, periodRows] = await Promise.all([
      this.getFinancialCashflow({ period: periodKey }),
      this.getFinancialTransactions({ period: periodKey, status: "COMPLETED", limit: 5000 }),
      this.prisma.timeEntryIssue.count({
        where: {
          status: "OPEN",
          dateKey: {
            gte: startDateKey,
            lte: endDateKey
          }
        }
      }),
      this.prisma.timeSheetPeriod.findMany({
        where: {
          periodKey
        },
        select: {
          status: true
        }
      })
    ]);

    const topRevenueEntries = transactions
      .filter((transaction) => transaction.type === "EARNING")
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10)
      .map((transaction) => this.toFinancialEntrySummaryFromTransaction(transaction));

    const topCostEntries = transactions
      .filter((transaction) => transaction.type !== "EARNING")
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10)
      .map((transaction) => this.toFinancialEntrySummaryFromTransaction(transaction));

    const openTimesheetPeriods = periodRows.filter((item) => item.status === "OPEN").length;
    const closedTimesheetPeriods = periodRows.filter((item) => item.status === "CLOSED").length;
    const completedRides = transactions.filter((transaction) => transaction.source === "RIDE").length;

    return {
      period: periodKey,
      generatedAt: new Date().toISOString(),
      totals: {
        revenueAmount: cashflow.totals.revenueAmount,
        payrollCostAmount: cashflow.totals.payrollCostAmount,
        fleetCostAmount: cashflow.totals.fleetCostAmount,
        totalCostAmount: cashflow.totals.totalCostAmount,
        netAmount: cashflow.totals.netAmount
      },
      indicators: {
        completedRides,
        pendingTimekeepingIssues: periodIssuesCount,
        openTimesheetPeriods,
        closedTimesheetPeriods
      },
      topRevenueEntries,
      topCostEntries
    };
  }

  async getFinancialEntries(input?: {
    period?: string;
    type?: string;
    limit?: number;
  }): Promise<FinancialEntriesSummary> {
    const periodKey = this.normalizePeriodKeyValue(input?.period, "Competencia invalida. Use YYYY-MM.");
    const typeFilter = input?.type === "REVENUE" || input?.type === "COST" ? input.type : undefined;
    const limit = this.toInteger(input?.limit, 200, 1, 1000, "Limite de movimentacoes invalido.");
    const transactions = await this.getFinancialTransactions({
      period: periodKey,
      status: "COMPLETED",
      limit: 5000
    });

    const entries = transactions
      .map((transaction) => this.toFinancialEntrySummaryFromTransaction(transaction))
      .filter((entry) => (typeFilter ? entry.type === typeFilter : true))
      .sort((left, right) => {
        const dateDiff = +new Date(right.date) - +new Date(left.date);
        if (dateDiff !== 0) return dateDiff;
        return right.amount - left.amount;
      })
      .slice(0, limit);

    return {
      period: periodKey,
      generatedAt: new Date().toISOString(),
      totalRevenueAmount: Number(
        entries
          .filter((entry) => entry.type === "REVENUE")
          .reduce((total, entry) => total + entry.amount, 0)
          .toFixed(2)
      ),
      totalCostAmount: Number(
        entries
          .filter((entry) => entry.type === "COST")
          .reduce((total, entry) => total + entry.amount, 0)
          .toFixed(2)
      ),
      entries
    };
  }

  private async collectFinancialTransactions(periodKey: string): Promise<FinancialTransactionSummary[]> {
    const { startDateKey, endDateKey, dateKeys } = this.timekeepingService.resolvePeriodDateKeys(periodKey);
    const periodRange = this.timekeepingService.buildRangeUtc(startDateKey, endDateKey);
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const categories = await this.resolveFinancialTransactionCategoriesForCompany(
      this.prisma,
      companyProfile.id
    );
    const categoriesByCode = new Map(categories.map((item) => [item.code, item.name]));

    const [rides, fleetTasks, manualTransactions, payrollDailyProjection] = await Promise.all([
      this.prisma.ride.findMany({
        where: {
          status: "COMPLETED",
          completedAt: {
            gte: periodRange.start,
            lte: periodRange.end
          },
          quoteAmount: {
            not: null
          }
        },
        orderBy: [{ completedAt: "desc" }, { quoteAmount: "desc" }],
        take: 5000,
        select: {
          id: true,
          customerName: true,
          origin: true,
          destination: true,
          quoteAmount: true,
          completedAt: true,
          assignedDriverId: true,
          assignedDriver: {
            select: {
              id: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      this.prisma.fleetVehicleMaintenanceTask.findMany({
        where: {
          status: "COMPLETED",
          completedAt: {
            gte: periodRange.start,
            lte: periodRange.end
          },
          actualCost: {
            not: null
          }
        },
        orderBy: [{ completedAt: "desc" }, { actualCost: "desc" }],
        take: 5000,
        select: {
          id: true,
          fleetVehicleId: true,
          title: true,
          completedAt: true,
          actualCost: true,
          fleetVehicle: {
            select: {
              label: true,
              plate: true
            }
          }
        }
      }),
      this.prisma.financialManualTransaction.findMany({
        where: {
          companyProfileId: companyProfile.id,
          occurredAt: {
            gte: periodRange.start,
            lte: periodRange.end
          }
        },
        include: {
          driver: {
            select: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 5000
      }),
      Promise.all(
        dateKeys.map(async (dateKey) => {
          const projection = await this.getTimekeepingCostProjection({ date: dateKey });
          return {
            dateKey,
            projection
          };
        })
      )
    ]);

    const transactions: FinancialTransactionSummary[] = [];

    for (const ride of rides) {
      if (!ride.completedAt) continue;
      const driverName = ride.assignedDriver?.user?.name;

      transactions.push({
        id: `txn-ride-${ride.id}`,
        occurredAt: ride.completedAt.toISOString(),
        type: "EARNING",
        status: "COMPLETED",
        source: "RIDE",
        category: "RIDE_REVENUE",
        categoryLabel: categoriesByCode.get("RIDE_REVENUE") ?? "Receita de corrida",
        description: `${ride.customerName} - ${ride.origin} -> ${ride.destination}`,
        amount: Number(this.decimalToNumber(ride.quoteAmount).toFixed(2)),
        driverId: ride.assignedDriverId ?? undefined,
        driverName,
        rideId: ride.id,
        referenceId: ride.id,
        referencePath: `/rides/${ride.id}`,
        isEditable: false,
        isReversible: false,
        metadata: {
          origin: ride.origin,
          destination: ride.destination
        }
      });
    }

    for (const task of fleetTasks) {
      if (!task.completedAt) continue;
      transactions.push({
        id: `txn-fleet-maintenance-${task.id}`,
        occurredAt: task.completedAt.toISOString(),
        type: "EXPENSE",
        status: "COMPLETED",
        source: "FLEET_MAINTENANCE",
        category: "FLEET_MAINTENANCE",
        categoryLabel: categoriesByCode.get("FLEET_MAINTENANCE") ?? "Manutencao",
        description: task.title,
        amount: Number(this.decimalToNumber(task.actualCost).toFixed(2)),
        vehicleId: task.fleetVehicleId,
        vehicleLabel: `${task.fleetVehicle.label} | ${task.fleetVehicle.plate}`,
        referenceId: task.id,
        referencePath: `/fleet/veiculos/${task.fleetVehicleId}/manutencao`,
        isEditable: false,
        isReversible: false,
        metadata: {
          taskId: task.id
        }
      });
    }

    for (const payrollDay of payrollDailyProjection) {
      const dateKey = payrollDay.dateKey;
      payrollDay.projection.drivers.forEach((driver: TimekeepingCostProjectionDriverSummary) => {
        if (driver.totalCost <= 0) return;
        transactions.push({
          id: `txn-payroll-${dateKey}-${driver.driverId}`,
          occurredAt: `${dateKey}T23:59:59.999Z`,
          type: "PAYMENT",
          status: "COMPLETED",
          source: "PAYROLL",
          category: "PAYROLL_PROJECTION",
          categoryLabel: categoriesByCode.get("PAYROLL_PROJECTION") ?? "Folha projetada",
          description: `Folha projetada ${dateKey} - ${driver.driverName}`,
          amount: Number(driver.totalCost.toFixed(2)),
          driverId: driver.driverId,
          driverName: driver.driverName,
          referenceId: driver.driverId,
          referencePath: `/administrative/timekeeping/mirror?driverId=${encodeURIComponent(driver.driverId)}&date=${encodeURIComponent(dateKey)}`,
          isEditable: false,
          isReversible: false,
          metadata: {
            expectedMinutes: driver.expectedMinutes,
            workedMinutes: driver.workedMinutes,
            overtimeMinutes: driver.overtimeMinutes,
            nightMinutes: driver.nightMinutes
          }
        });
      });
    }

    for (const manualTransaction of manualTransactions) {
      transactions.push(
        this.toFinancialTransactionSummaryFromManualTransaction(
          manualTransaction,
          categoriesByCode.get(manualTransaction.categoryCode)
        )
      );
    }

    return transactions;
  }

  private toFinancialEntrySummaryFromTransaction(
    transaction: FinancialTransactionSummary
  ): FinancialEntrySummary {
    return {
      id: `entry-${transaction.id}`,
      transactionId: transaction.id,
      date: transaction.occurredAt,
      type: transaction.type === "EARNING" ? "REVENUE" : "COST",
      source:
        transaction.source === "RIDE"
          ? "RIDE"
          : transaction.source === "PAYROLL"
            ? "PAYROLL"
            : transaction.source === "MANUAL"
              ? "MANUAL"
              : "FLEET",
      category: transaction.category,
      categoryLabel: transaction.categoryLabel,
      description: transaction.description,
      amount: Number(transaction.amount.toFixed(2)),
      referenceId: transaction.referenceId,
      referencePath: transaction.referencePath,
      sourceEntityLabel:
        transaction.driverName ??
        transaction.vehicleLabel ??
        (transaction.rideId ? `Corrida ${transaction.rideId}` : undefined)
    };
  }

  private toOptionalFinancialTransactionType(
    value?: string
  ): FinancialTransactionType | undefined {
    if (!value) return undefined;
    if (
      value === "EARNING" ||
      value === "EXPENSE" ||
      value === "PAYMENT" ||
      value === "ADJUSTMENT"
    ) {
      return value;
    }
    return undefined;
  }

  private toOptionalFinancialTransactionStatus(
    value?: string
  ): FinancialTransactionStatus | undefined {
    if (!value) return undefined;
    if (value === "PENDING" || value === "COMPLETED" || value === "CANCELLED") {
      return value;
    }
    return undefined;
  }

  private toOptionalFinancialTransactionSource(
    value?: string
  ): FinancialTransactionSource | undefined {
    if (!value) return undefined;
    if (
      value === "RIDE" ||
      value === "PAYROLL" ||
      value === "FLEET_MAINTENANCE" ||
      value === "FLEET_REFUEL" ||
      value === "MANUAL"
    ) {
      return value;
    }
    return undefined;
  }

  async calculateTimesheetPeriods(input?: {
    period?: string;
    driverId?: string;
  }): Promise<TimesheetPeriodSummary[]> {
    const periodKey = this.normalizePeriodKeyValue(input?.period, "Competencia invalida. Use YYYY-MM.");
    const driverId = this.normalizeOptionalText(input?.driverId, 120, "Identificador do motorista invalido.");
    const { startDateKey, endDateKey, dateKeys } = this.timekeepingService.resolvePeriodDateKeys(periodKey);

    let targetDrivers: string[] = [];
    if (driverId) {
      const exists = await this.prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true }
      });
      if (!exists) {
        throw new NotFoundException(`Motorista ${driverId} nao encontrado.`);
      }
      targetDrivers = [driverId];
    } else {
      const rows = await this.prisma.driver.findMany({
        where: { isActive: true },
        select: { id: true },
        orderBy: { createdAt: "asc" }
      });
      targetDrivers = rows.map((row) => row.id);
    }

    const results: TimesheetPeriodSummary[] = [];
    for (const currentDriverId of targetDrivers) {
      const existingPeriod = await this.prisma.timeSheetPeriod.findUnique({
        where: {
          driverId_periodKey: {
            driverId: currentDriverId,
            periodKey
          }
        }
      });
      if (existingPeriod?.status === "CLOSED") {
        throw new BadRequestException(
          `Competencia ${periodKey} do motorista ${currentDriverId} esta fechada. Reabra para recalcular.`
        );
      }
      for (const currentDateKey of dateKeys) {
        await this.recalculateTimesheetDay(currentDriverId, currentDateKey);
      }

      const dailyRows = await this.prisma.timeSheetDay.findMany({
        where: {
          driverId: currentDriverId,
          dateKey: {
            gte: startDateKey,
            lte: endDateKey
          }
        },
        orderBy: [{ dateKey: "asc" }]
      });

      const aggregated = this.aggregateTimesheetPeriodRows(dailyRows);
      const item = await this.prisma.timeSheetPeriod.upsert({
        where: {
          driverId_periodKey: {
            driverId: currentDriverId,
            periodKey
          }
        },
        create: {
          driverId: currentDriverId,
          periodKey,
          expectedMinutes: aggregated.expectedMinutes,
          workedMinutes: aggregated.workedMinutes,
          normalMinutes: aggregated.normalMinutes,
          overtimeMinutes: aggregated.overtimeMinutes,
          nightMinutes: aggregated.nightMinutes,
          breakMinutes: aggregated.breakMinutes,
          latenessMinutes: aggregated.latenessMinutes,
          earlyLeaveMinutes: aggregated.earlyLeaveMinutes,
          absenceDays: aggregated.absenceDays,
          workedDays: aggregated.workedDays,
          openIssueDays: aggregated.openIssueDays,
          openIssueCount: aggregated.openIssueCount,
          rulesSnapshot: aggregated.rulesSnapshot as Prisma.InputJsonValue,
          calculatedAt: new Date()
        },
        update: {
          expectedMinutes: aggregated.expectedMinutes,
          workedMinutes: aggregated.workedMinutes,
          normalMinutes: aggregated.normalMinutes,
          overtimeMinutes: aggregated.overtimeMinutes,
          nightMinutes: aggregated.nightMinutes,
          breakMinutes: aggregated.breakMinutes,
          latenessMinutes: aggregated.latenessMinutes,
          earlyLeaveMinutes: aggregated.earlyLeaveMinutes,
          absenceDays: aggregated.absenceDays,
          workedDays: aggregated.workedDays,
          openIssueDays: aggregated.openIssueDays,
          openIssueCount: aggregated.openIssueCount,
          rulesSnapshot: aggregated.rulesSnapshot as Prisma.InputJsonValue,
          calculatedAt: new Date()
        }
      });
      results.push(this.toTimesheetPeriodSummary(item));
    }

    return results.sort((a, b) => {
      const periodSort = b.period.localeCompare(a.period);
      if (periodSort !== 0) return periodSort;
      return a.driverId.localeCompare(b.driverId);
    });
  }

  async closeTimesheetPeriod(
    periodId: string,
    actorUserId?: string,
    note?: string
  ): Promise<TimesheetPeriodSummary> {
    const normalizedPeriodId = this.normalizeOptionalText(
      periodId,
      120,
      "Identificador da competencia invalido."
    );
    if (!normalizedPeriodId) {
      throw new BadRequestException("Identificador da competencia e obrigatorio.");
    }
    const normalizedActorUserId = this.normalizeOptionalText(
      actorUserId,
      120,
      "Identificador do usuario invalido."
    );
    const normalizedNote = this.normalizeOptionalText(note, 500, "Observacao invalida.");
    const current = await this.prisma.timeSheetPeriod.findUnique({
      where: { id: normalizedPeriodId }
    });
    if (!current) {
      throw new NotFoundException(`Competencia ${normalizedPeriodId} nao encontrada.`);
    }
    if (current.status === "CLOSED") {
      throw new BadRequestException("Competencia ja esta fechada.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.timeSheetPeriod.update({
        where: { id: current.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByUserId: normalizedActorUserId ?? null,
          lockNote: normalizedNote ?? current.lockNote
        }
      });
      await tx.timeSheetPeriodEvent.create({
        data: {
          periodId: current.id,
          action: "CLOSE",
          actorUserId: normalizedActorUserId ?? null,
          note: normalizedNote ?? null
        }
      });
      return next;
    });

    return this.toTimesheetPeriodSummary(updated);
  }

  async reopenTimesheetPeriod(
    periodId: string,
    actorUserId?: string,
    note?: string
  ): Promise<TimesheetPeriodSummary> {
    const normalizedPeriodId = this.normalizeOptionalText(
      periodId,
      120,
      "Identificador da competencia invalido."
    );
    if (!normalizedPeriodId) {
      throw new BadRequestException("Identificador da competencia e obrigatorio.");
    }
    const normalizedActorUserId = this.normalizeOptionalText(
      actorUserId,
      120,
      "Identificador do usuario invalido."
    );
    const normalizedNote = this.normalizeOptionalText(note, 500, "Observacao invalida.");
    const current = await this.prisma.timeSheetPeriod.findUnique({
      where: { id: normalizedPeriodId }
    });
    if (!current) {
      throw new NotFoundException(`Competencia ${normalizedPeriodId} nao encontrada.`);
    }
    if (current.status !== "CLOSED") {
      throw new BadRequestException("Competencia ja esta aberta.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.timeSheetPeriod.update({
        where: { id: current.id },
        data: {
          status: "OPEN",
          reopenedAt: new Date(),
          reopenedByUserId: normalizedActorUserId ?? null,
          lockNote: normalizedNote ?? current.lockNote
        }
      });
      await tx.timeSheetPeriodEvent.create({
        data: {
          periodId: current.id,
          action: "REOPEN",
          actorUserId: normalizedActorUserId ?? null,
          note: normalizedNote ?? null
        }
      });
      return next;
    });

    return this.toTimesheetPeriodSummary(updated);
  }

  async exportTimesheetPeriod(
    periodId: string,
    formatInput?: string
  ): Promise<{ fileName: string; contentType: string; content: string | Buffer }> {
    const normalizedPeriodId = this.normalizeOptionalText(
      periodId,
      120,
      "Identificador da competencia invalido."
    );
    if (!normalizedPeriodId) {
      throw new BadRequestException("Identificador da competencia e obrigatorio.");
    }
    const format = this.toEnum(
      formatInput ?? "CSV",
      TIMESHEET_PERIOD_EXPORT_FORMAT_VALUES,
      "Formato de exportacao invalido. Use CSV ou PDF.",
      "CSV"
    ) as "CSV" | "PDF";

    const period = await this.prisma.timeSheetPeriod.findUnique({
      where: { id: normalizedPeriodId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        events: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
    if (!period) {
      throw new NotFoundException(`Competencia ${normalizedPeriodId} nao encontrada.`);
    }

    const { startDateKey, endDateKey } = this.timekeepingService.resolvePeriodDateKeys(period.periodKey);
    const periodRange = this.timekeepingService.buildRangeUtc(startDateKey, endDateKey);
    const periodStartAt = periodRange.start;
    const periodEndAt = periodRange.end;

    const [days, entries, adjustments, issues] = await Promise.all([
      this.prisma.timeSheetDay.findMany({
        where: {
          driverId: period.driverId,
          dateKey: {
            gte: startDateKey,
            lte: endDateKey
          }
        },
        orderBy: [{ dateKey: "asc" }]
      }),
      this.prisma.timeEntry.findMany({
        where: {
          driverId: period.driverId,
          occurredAt: {
            gte: periodStartAt,
            lte: periodEndAt
          }
        },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
      }),
      this.prisma.timeAdjustmentRequest.findMany({
        where: {
          driverId: period.driverId,
          OR: [
            {
              createdAt: {
                gte: periodStartAt,
                lte: periodEndAt
              }
            },
            {
              requestedOccurredAt: {
                gte: periodStartAt,
                lte: periodEndAt
              }
            },
            {
              timeEntry: {
                occurredAt: {
                  gte: periodStartAt,
                  lte: periodEndAt
                }
              }
            }
          ]
        },
        include: {
          timeEntry: {
            select: {
              id: true,
              occurredAt: true,
              kind: true,
              status: true
            }
          }
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      }),
      this.prisma.timeEntryIssue.findMany({
        where: {
          driverId: period.driverId,
          dateKey: {
            gte: startDateKey,
            lte: endDateKey
          }
        },
        orderBy: [{ dateKey: "asc" }, { createdAt: "asc" }]
      })
    ]);

    const safeDriverName = period.driver.user.name || "Motorista";
    const generatedAt = new Date();
    const baseFileName = `espelho_ponto_${this.toSafeFileToken(safeDriverName)}_${period.periodKey}`;

    if (format === "CSV") {
      const csv = this.buildTimesheetPeriodCsvExport({
        period,
        days,
        entries,
        adjustments,
        issues,
        generatedAt,
        driverName: safeDriverName
      });
      return {
        fileName: `${baseFileName}.csv`,
        contentType: "text/csv; charset=utf-8",
        content: csv
      };
    }

    const pdf = this.buildTimesheetPeriodPdfExport({
      period,
      days,
      entries,
      adjustments,
      issues,
      generatedAt,
      driverName: safeDriverName
    });
    return {
      fileName: `${baseFileName}.pdf`,
      contentType: "application/pdf",
      content: pdf
    };
  }

  private async recalculateTimesheetDay(driverId: string, dateKey: string): Promise<TimesheetDaySummary> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        contract: true
      }
    });
    if (!driver) {
      throw new NotFoundException(`Motorista ${driverId} nao encontrado.`);
    }

    const { start: dayStart, end: dayEnd } = this.timekeepingService.buildDayRangeUtc(dateKey);
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        driverId,
        status: {
          not: "CANCELLED"
        },
        occurredAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
    });

    const openIssueCount = await this.prisma.timeEntryIssue.count({
      where: {
        driverId,
        dateKey,
        status: "OPEN"
      }
    });
    const hasOpenIssues = openIssueCount > 0;

    const minutes = this.calculateWorkedAndBreakMinutes(entries);
    const expectation = await this.resolveExpectedJourneyForDate(driver.contract, dateKey);
    const nightPolicy = await this.resolveNightPolicyForWorkProfile(expectation.workProfileTemplateId);
    const nightCalculation = nightPolicy.enabled
      ? this.laborPolicyService.calculateNightMinutesFromEntries(
          entries.map((entry) => ({ occurredAt: entry.occurredAt, kind: entry.kind })),
          dayEnd,
          nightPolicy.startTime,
          nightPolicy.endTime,
          { applyReducedNightHour: true }
        )
      : { clockMinutes: 0, reducedMinutes: 0 };
    const firstIn = entries.find((item) => item.kind === "IN");
    const lastOut = [...entries].reverse().find((item) => item.kind === "OUT");

    let latenessMinutes = 0;
    let earlyLeaveMinutes = 0;
    let rawLatenessMinutes = 0;
    let rawEarlyLeaveMinutes = 0;
    if (expectation.isWorkday && expectation.expectedMinutes > 0) {
      if (firstIn && expectation.expectedStartAt) {
        rawLatenessMinutes = Math.max(0, this.diffMinutes(expectation.expectedStartAt, firstIn.occurredAt));
      }
      if (lastOut && expectation.expectedEndAt) {
        rawEarlyLeaveMinutes = Math.max(0, this.diffMinutes(lastOut.occurredAt, expectation.expectedEndAt));
      }
      const toleranceApplied = this.timekeepingService.applyDailyTolerance({
        rawLatenessMinutes,
        rawEarlyLeaveMinutes,
        toleranceMarkingMinutes: expectation.toleranceMarkingMinutes,
        toleranceDailyMaxMinutes: expectation.toleranceDailyMaxMinutes
      });
      latenessMinutes = toleranceApplied.latenessMinutes;
      earlyLeaveMinutes = toleranceApplied.earlyLeaveMinutes;
    }

    const overtimeMinutes = Math.max(0, minutes.workedMinutes - expectation.expectedMinutes);
    const payloadMeta: Record<string, unknown> = {
      ...expectation.meta,
      entriesCount: entries.length,
      rawLatenessMinutes,
      rawEarlyLeaveMinutes,
      toleranceMarkingMinutes: expectation.toleranceMarkingMinutes,
      toleranceDailyMaxMinutes: expectation.toleranceDailyMaxMinutes,
      toleranceAbsorbedMinutes: Math.max(0, rawLatenessMinutes - latenessMinutes) + Math.max(0, rawEarlyLeaveMinutes - earlyLeaveMinutes),
      nightMinutes: nightCalculation.reducedMinutes,
      nightClockMinutes: nightCalculation.clockMinutes,
      nightReducedHourApplied: true,
      nightPolicyStartTime: nightPolicy.startTime,
      nightPolicyEndTime: nightPolicy.endTime
    };
    const item = await this.prisma.timeSheetDay.upsert({
      where: {
        driverId_dateKey: {
          driverId,
          dateKey
        }
      },
      create: {
        driverId,
        dateKey,
        workProfileTemplateId: expectation.workProfileTemplateId ?? null,
        journeyTemplateId: expectation.journeyTemplateId ?? null,
        expectedMinutes: expectation.expectedMinutes,
        workedMinutes: minutes.workedMinutes,
        breakMinutes: minutes.breakMinutes,
        latenessMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        hasOpenIssues,
        openIssueCount,
        calculationMeta: payloadMeta as Prisma.InputJsonValue,
        calculatedAt: new Date()
      },
      update: {
        workProfileTemplateId: expectation.workProfileTemplateId ?? null,
        journeyTemplateId: expectation.journeyTemplateId ?? null,
        expectedMinutes: expectation.expectedMinutes,
        workedMinutes: minutes.workedMinutes,
        breakMinutes: minutes.breakMinutes,
        latenessMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        hasOpenIssues,
        openIssueCount,
        calculationMeta: payloadMeta as Prisma.InputJsonValue,
        calculatedAt: new Date()
      }
    });

    return this.toTimesheetDaySummary(item);
  }

  async createWorkJourney(input: CreateWorkJourneyDto): Promise<WorkJourneySummary> {
    const normalized = this.normalizeWorkJourneyPayload(input);

    const item = await this.prisma.workJourneyTemplate.create({
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        type: normalized.type,
        allowedDays: normalized.allowedDays as unknown as Prisma.InputJsonValue,
        breakType: normalized.breakType,
        breakDurationMinutes: normalized.breakDurationMinutes ?? null,
        maxHoursPerDay: normalized.maxHoursPerDay,
        notes: normalized.notes ?? null,
        fixedConfig: normalized.fixedConfig as unknown as Prisma.InputJsonValue,
        flexibleConfig: normalized.flexibleConfig as unknown as Prisma.InputJsonValue,
        intermittentConfig: normalized.intermittentConfig as unknown as Prisma.InputJsonValue,
        dsrEnabled: normalized.dsrPolicy.enabled,
        dsrWeeklyRestDay: normalized.dsrPolicy.enabled ? normalized.dsrPolicy.weeklyRestDay ?? null : null,
        dsrReflectOvertime: normalized.dsrPolicy.reflectOvertime,
        dsrReflectNight: normalized.dsrPolicy.reflectNight,
        dsrLoseOnUnjustifiedAbsence: normalized.dsrPolicy.loseOnUnjustifiedAbsence,
        dsrDescription: normalized.dsrPolicy.enabled
          ? normalized.dsrPolicy.description ?? null
          : null
      }
    });

    return this.toWorkJourneySummary(item);
  }

  async updateWorkJourney(id: string, input: UpdateWorkJourneyDto): Promise<WorkJourneySummary> {
    const current = await this.prisma.workJourneyTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Jornada ${id} nao encontrada.`);
    }

    const normalized = this.normalizeWorkJourneyPayload({
      name: input.name ?? current.name,
      description: input.description === undefined ? current.description ?? undefined : input.description,
      isActive: input.isActive ?? current.isActive,
      type: (input.type ?? current.type) as CreateWorkJourneyDto["type"],
      allowedDays:
        input.allowedDays === undefined
          ? this.normalizeWorkJourneyDays(current.allowedDays)
          : input.allowedDays,
      breakType: (input.breakType ?? current.breakType) as CreateWorkJourneyDto["breakType"],
      breakDurationMinutes:
        input.breakDurationMinutes === undefined
          ? current.breakDurationMinutes ?? undefined
          : input.breakDurationMinutes,
      maxHoursPerDay:
        input.maxHoursPerDay === undefined ? Number(current.maxHoursPerDay) : input.maxHoursPerDay,
      notes: input.notes === undefined ? current.notes ?? undefined : input.notes,
      dsrEnabled: input.dsrEnabled === undefined ? current.dsrEnabled : input.dsrEnabled,
      dsrWeeklyRestDay:
        input.dsrWeeklyRestDay === undefined
          ? current.dsrWeeklyRestDay ?? undefined
          : input.dsrWeeklyRestDay,
      dsrReflectOvertime:
        input.dsrReflectOvertime === undefined
          ? current.dsrReflectOvertime
          : input.dsrReflectOvertime,
      dsrReflectNight:
        input.dsrReflectNight === undefined
          ? current.dsrReflectNight
          : input.dsrReflectNight,
      dsrLoseOnUnjustifiedAbsence:
        input.dsrLoseOnUnjustifiedAbsence === undefined
          ? current.dsrLoseOnUnjustifiedAbsence
          : input.dsrLoseOnUnjustifiedAbsence,
      dsrDescription:
        input.dsrDescription === undefined ? current.dsrDescription ?? undefined : input.dsrDescription,
      fixedConfig:
        input.fixedConfig === undefined
          ? this.toRecordOrUndefined(current.fixedConfig)
          : input.fixedConfig,
      flexibleConfig:
        input.flexibleConfig === undefined
          ? this.toRecordOrUndefined(current.flexibleConfig)
          : input.flexibleConfig,
      intermittentConfig:
        input.intermittentConfig === undefined
          ? this.toRecordOrUndefined(current.intermittentConfig)
          : input.intermittentConfig
    });

    if (current.isActive && !normalized.isActive) {
      const linkedProfiles = await this.prisma.workProfileTemplate.count({
        where: {
          isActive: true,
          journeyTemplateId: current.id
        }
      });
      if (linkedProfiles > 0) {
        throw new BadRequestException(
          `Nao foi possivel inativar a jornada. Existem ${linkedProfiles} perfil(is) de trabalho ativo(s) vinculados a ela.`
        );
      }
    }

    const item = await this.prisma.workJourneyTemplate.update({
      where: { id: current.id },
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        type: normalized.type,
        allowedDays: normalized.allowedDays as unknown as Prisma.InputJsonValue,
        breakType: normalized.breakType,
        breakDurationMinutes: normalized.breakDurationMinutes ?? null,
        maxHoursPerDay: normalized.maxHoursPerDay,
        notes: normalized.notes ?? null,
        fixedConfig: normalized.fixedConfig as unknown as Prisma.InputJsonValue,
        flexibleConfig: normalized.flexibleConfig as unknown as Prisma.InputJsonValue,
        intermittentConfig: normalized.intermittentConfig as unknown as Prisma.InputJsonValue,
        dsrEnabled: normalized.dsrPolicy.enabled,
        dsrWeeklyRestDay: normalized.dsrPolicy.enabled ? normalized.dsrPolicy.weeklyRestDay ?? null : null,
        dsrReflectOvertime: normalized.dsrPolicy.reflectOvertime,
        dsrReflectNight: normalized.dsrPolicy.reflectNight,
        dsrLoseOnUnjustifiedAbsence: normalized.dsrPolicy.loseOnUnjustifiedAbsence,
        dsrDescription: normalized.dsrPolicy.enabled
          ? normalized.dsrPolicy.description ?? null
          : null
      }
    });

    return this.toWorkJourneySummary(item);
  }

  async deleteWorkJourney(id: string): Promise<void> {
    const current = await this.prisma.workJourneyTemplate.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!current) {
      throw new NotFoundException(`Jornada ${id} nao encontrada.`);
    }

    const linkedProfiles = await this.prisma.workProfileTemplate.count({
      where: { journeyTemplateId: id }
    });
    if (linkedProfiles > 0) {
      throw new BadRequestException(
        `Nao foi possivel remover a jornada. Existem ${linkedProfiles} perfil(is) de trabalho vinculados a ela.`
      );
    }

    await this.prisma.workJourneyTemplate.delete({
      where: { id }
    });
  }

  private isMissingBenefitTableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const code = (error as { code?: unknown }).code;
    const meta = (error as { meta?: unknown }).meta;
    const modelName =
      meta && typeof meta === "object"
        ? (meta as { modelName?: unknown }).modelName
        : undefined;
    return code === "P2021" && modelName === "BenefitTemplate";
  }

  private isMissingOvertimeTemplateTableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const code = (error as { code?: unknown }).code;
    const meta = (error as { meta?: unknown }).meta;
    const modelName =
      meta && typeof meta === "object"
        ? (meta as { modelName?: unknown }).modelName
        : undefined;
    const table =
      meta && typeof meta === "object"
        ? (meta as { table?: unknown }).table
        : undefined;

    return (
      code === "P2021" &&
      (modelName === "OvertimeTemplate" || table === "OvertimeTemplate" || table === "public.OvertimeTemplate")
    );
  }

  async getBenefit(id: string): Promise<BenefitSummary> {
    const benefit = await this.prisma.benefitTemplate.findUnique({
      where: { id }
    });

    if (!benefit) {
      throw new NotFoundException(`Beneficio ${id} nao encontrado.`);
    }

    return this.toBenefitSummary(benefit);
  }

  async createBenefit(input: CreateBenefitDto): Promise<BenefitSummary> {
    const normalized = this.normalizeBenefitPayload(input);

    const benefit = await this.prisma.benefitTemplate.create({
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        type: normalized.type,
        frequency: normalized.frequency,
        applicationMode: normalized.applicationMode,
        valueConfig: normalized.valueConfig as Prisma.InputJsonValue,
        deductFromSalary: normalized.deductFromSalary,
        incursCharges: normalized.incursCharges,
        isMandatory: normalized.isMandatory,
        editableInContract: normalized.editableInContract,
        workProfiles: normalized.workProfiles as Prisma.InputJsonValue,
        contractProfiles: normalized.contractProfiles as Prisma.InputJsonValue
      }
    });

    return this.toBenefitSummary(benefit);
  }

  async updateBenefit(id: string, input: UpdateBenefitDto): Promise<BenefitSummary> {
    const current = await this.prisma.benefitTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Beneficio ${id} nao encontrado.`);
    }

    const currentPayload = this.toBenefitPayload(current);
    const normalized = this.normalizeBenefitPayload({
      name: input.name ?? currentPayload.name,
      description: input.description === undefined ? currentPayload.description : input.description,
      isActive: input.isActive ?? currentPayload.isActive,
      type: input.type ?? currentPayload.type,
      frequency: input.frequency ?? currentPayload.frequency,
      applicationMode: input.applicationMode ?? currentPayload.applicationMode,
      valueConfig: input.valueConfig === undefined ? currentPayload.valueConfig : input.valueConfig,
      deductFromSalary: input.deductFromSalary ?? currentPayload.deductFromSalary,
      incursCharges: input.incursCharges ?? currentPayload.incursCharges,
      isMandatory: input.isMandatory ?? currentPayload.isMandatory,
      editableInContract: input.editableInContract ?? currentPayload.editableInContract,
      workProfiles: input.workProfiles ?? currentPayload.workProfiles,
      contractProfiles: input.contractProfiles ?? currentPayload.contractProfiles
    });

    const benefit = await this.prisma.benefitTemplate.update({
      where: { id },
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        type: normalized.type,
        frequency: normalized.frequency,
        applicationMode: normalized.applicationMode,
        valueConfig: normalized.valueConfig as Prisma.InputJsonValue,
        deductFromSalary: normalized.deductFromSalary,
        incursCharges: normalized.incursCharges,
        isMandatory: normalized.isMandatory,
        editableInContract: normalized.editableInContract,
        workProfiles: normalized.workProfiles as Prisma.InputJsonValue,
        contractProfiles: normalized.contractProfiles as Prisma.InputJsonValue
      }
    });

    return this.toBenefitSummary(benefit);
  }

  async deleteBenefit(id: string): Promise<void> {
    const current = await this.prisma.benefitTemplate.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!current) {
      throw new NotFoundException(`Beneficio ${id} nao encontrado.`);
    }

    await this.prisma.benefitTemplate.delete({
      where: { id }
    });
  }

  async listWorkProfiles(): Promise<WorkProfileSummary[]> {
    const profiles = await this.prisma.workProfileTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
    });

    return profiles.map((profile) => this.toWorkProfileSummary(profile));
  }

  async getWorkProfile(id: string): Promise<WorkProfileSummary> {
    const profile = await this.prisma.workProfileTemplate.findUnique({
      where: { id }
    });

    if (!profile) {
      throw new NotFoundException(`Perfil de trabalho ${id} nao encontrado.`);
    }

    return this.toWorkProfileSummary(profile);
  }

  async createWorkProfile(input: CreateWorkProfileDto): Promise<WorkProfileSummary> {
    const cargoSnapshot = await this.resolveWorkProfileCargoSnapshot({
      cargoId: input.cargoId,
      cargoLevel: input.cargoLevel
    });
    const normalized = this.normalizeWorkProfilePayload({
      ...input,
      cargoId: cargoSnapshot.cargoId,
      cargoName: cargoSnapshot.cargoName,
      cargoLevel: cargoSnapshot.cargoLevel
    });
    const contractCapabilities = getWorkProfileContractCapabilities(normalized.contractType);
    const journeyReference = await this.resolveWorkProfileJourneyTemplateReference({
      journeyTemplateId: normalized.journeyTemplateId,
      requireDsrPolicy: contractCapabilities.isLaborRegime
    });
    const overtimeReference = await this.resolveWorkProfileOvertimeTemplateReference({
      usesOvertime: normalized.usesOvertime,
      overtimeTemplateId: normalized.overtimeTemplateId
    });
    const nightReference = await this.resolveWorkProfileNightTemplateReference({
      usesNightPolicy: normalized.usesNightPolicy,
      nightTemplateId: normalized.nightTemplateId
    });

    const profile = await this.prisma.workProfileTemplate.create({
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        cargoId: normalized.cargoId ?? null,
        cargoName: normalized.cargoName,
        cargoLevel: normalized.cargoLevel ?? null,
        contractType: normalized.contractType,
        journeyTemplateId: journeyReference.journeyTemplateId ?? null,
        journeyTemplateName: journeyReference.journeyTemplateName ?? null,
        journeySummary: journeyReference.journeySummary ?? null,
        remuneration: normalized.remuneration as unknown as Prisma.InputJsonValue,
        usesOvertime: normalized.usesOvertime,
        overtimeTemplateId: overtimeReference.overtimeTemplateId ?? null,
        overtimeTemplateName: overtimeReference.overtimeTemplateName ?? null,
        overtimeSummary: overtimeReference.overtimeSummary ?? null,
        usesNightPolicy: normalized.usesNightPolicy,
        nightTemplateId: nightReference.nightTemplateId ?? null,
        nightTemplateName: nightReference.nightTemplateName ?? null,
        nightSummary: nightReference.nightSummary ?? null,
        holidayScopeType: normalized.holidayScopeType ?? null,
        holidayStateCode: normalized.holidayStateCode ?? null,
        holidayCityCode: normalized.holidayCityCode ?? null,
        holidaySummary: normalized.holidaySummary ?? null,
        benefits: normalized.benefits as unknown as Prisma.InputJsonValue,
        allowContractEditing: normalized.allowContractEditing,
        allowJourneyCustomization: normalized.allowJourneyCustomization,
        allowBenefitsCustomization: normalized.allowBenefitsCustomization,
        toleranceMarkingMinutes: normalized.toleranceMarkingMinutes ?? null,
        toleranceDailyMaxMinutes: normalized.toleranceDailyMaxMinutes ?? null
      }
    });

    return this.toWorkProfileSummary(profile);
  }

  async updateWorkProfile(id: string, input: UpdateWorkProfileDto): Promise<WorkProfileSummary> {
    const current = await this.prisma.workProfileTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Perfil de trabalho ${id} nao encontrado.`);
    }

    const currentPayload = this.toWorkProfilePayload(current);
    const cargoSnapshot = await this.resolveWorkProfileCargoSnapshot({
      cargoId: input.cargoId ?? currentPayload.cargoId,
      cargoNameFallback: currentPayload.cargoName,
      cargoLevel: input.cargoLevel === undefined ? currentPayload.cargoLevel : input.cargoLevel
    });
    const normalized = this.normalizeWorkProfilePayload({
      name: input.name ?? currentPayload.name,
      description: input.description === undefined ? currentPayload.description : input.description,
      isActive: input.isActive ?? currentPayload.isActive,
      cargoId: cargoSnapshot.cargoId,
      cargoName: cargoSnapshot.cargoName,
      cargoLevel: cargoSnapshot.cargoLevel,
      contractType: input.contractType ?? currentPayload.contractType,
      journeyTemplateId:
        input.journeyTemplateId === undefined
          ? currentPayload.journeyTemplateId
          : input.journeyTemplateId,
      journeyTemplateName:
        input.journeyTemplateName === undefined
          ? currentPayload.journeyTemplateName
          : input.journeyTemplateName,
      journeySummary:
        input.journeySummary === undefined ? currentPayload.journeySummary : input.journeySummary,
      remuneration: input.remuneration ?? currentPayload.remuneration,
      usesOvertime: input.usesOvertime ?? currentPayload.usesOvertime,
      overtimeTemplateId:
        input.overtimeTemplateId === undefined
          ? currentPayload.overtimeTemplateId
          : input.overtimeTemplateId,
      overtimeTemplateName:
        input.overtimeTemplateName === undefined
          ? currentPayload.overtimeTemplateName
          : input.overtimeTemplateName,
      overtimeSummary:
        input.overtimeSummary === undefined
          ? currentPayload.overtimeSummary
          : input.overtimeSummary,
      usesNightPolicy:
        input.usesNightPolicy === undefined
          ? currentPayload.usesNightPolicy
          : input.usesNightPolicy,
      nightTemplateId:
        input.nightTemplateId === undefined
          ? currentPayload.nightTemplateId
          : input.nightTemplateId,
      nightTemplateName:
        input.nightTemplateName === undefined
          ? currentPayload.nightTemplateName
          : input.nightTemplateName,
      nightSummary:
        input.nightSummary === undefined
          ? currentPayload.nightSummary
          : input.nightSummary,
      holidayScopeType:
        input.holidayScopeType === undefined
          ? currentPayload.holidayScopeType
          : input.holidayScopeType,
      holidayStateCode:
        input.holidayStateCode === undefined
          ? currentPayload.holidayStateCode
          : input.holidayStateCode,
      holidayCityCode:
        input.holidayCityCode === undefined
          ? currentPayload.holidayCityCode
          : input.holidayCityCode,
      holidaySummary:
        input.holidaySummary === undefined
          ? currentPayload.holidaySummary
          : input.holidaySummary,
      benefits: input.benefits ?? currentPayload.benefits,
      allowContractEditing:
        input.allowContractEditing ?? currentPayload.allowContractEditing,
      allowJourneyCustomization:
        input.allowJourneyCustomization ?? currentPayload.allowJourneyCustomization,
      allowBenefitsCustomization:
        input.allowBenefitsCustomization ?? currentPayload.allowBenefitsCustomization,
      toleranceMarkingMinutes:
        input.toleranceMarkingMinutes === undefined
          ? currentPayload.toleranceMarkingMinutes
          : input.toleranceMarkingMinutes,
      toleranceDailyMaxMinutes:
        input.toleranceDailyMaxMinutes === undefined
          ? currentPayload.toleranceDailyMaxMinutes
          : input.toleranceDailyMaxMinutes
    });
    const contractCapabilities = getWorkProfileContractCapabilities(normalized.contractType);
    const journeyReference = await this.resolveWorkProfileJourneyTemplateReference({
      journeyTemplateId: normalized.journeyTemplateId,
      requireDsrPolicy: contractCapabilities.isLaborRegime
    });
    const overtimeReference = await this.resolveWorkProfileOvertimeTemplateReference({
      usesOvertime: normalized.usesOvertime,
      overtimeTemplateId: normalized.overtimeTemplateId
    });
    const nightReference = await this.resolveWorkProfileNightTemplateReference({
      usesNightPolicy: normalized.usesNightPolicy,
      nightTemplateId: normalized.nightTemplateId
    });

    const profile = await this.prisma.workProfileTemplate.update({
      where: { id },
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        cargoId: normalized.cargoId ?? null,
        cargoName: normalized.cargoName,
        cargoLevel: normalized.cargoLevel ?? null,
        contractType: normalized.contractType,
        journeyTemplateId: journeyReference.journeyTemplateId ?? null,
        journeyTemplateName: journeyReference.journeyTemplateName ?? null,
        journeySummary: journeyReference.journeySummary ?? null,
        remuneration: normalized.remuneration as unknown as Prisma.InputJsonValue,
        usesOvertime: normalized.usesOvertime,
        overtimeTemplateId: overtimeReference.overtimeTemplateId ?? null,
        overtimeTemplateName: overtimeReference.overtimeTemplateName ?? null,
        overtimeSummary: overtimeReference.overtimeSummary ?? null,
        usesNightPolicy: normalized.usesNightPolicy,
        nightTemplateId: nightReference.nightTemplateId ?? null,
        nightTemplateName: nightReference.nightTemplateName ?? null,
        nightSummary: nightReference.nightSummary ?? null,
        holidayScopeType: normalized.holidayScopeType ?? null,
        holidayStateCode: normalized.holidayStateCode ?? null,
        holidayCityCode: normalized.holidayCityCode ?? null,
        holidaySummary: normalized.holidaySummary ?? null,
        benefits: normalized.benefits as unknown as Prisma.InputJsonValue,
        allowContractEditing: normalized.allowContractEditing,
        allowJourneyCustomization: normalized.allowJourneyCustomization,
        allowBenefitsCustomization: normalized.allowBenefitsCustomization,
        toleranceMarkingMinutes: normalized.toleranceMarkingMinutes ?? null,
        toleranceDailyMaxMinutes: normalized.toleranceDailyMaxMinutes ?? null
      }
    });

    return this.toWorkProfileSummary(profile);
  }

  async createTripType(input: CreateTripTypeDto): Promise<TripTypeSummary> {
    await this.ensureDefaultTripType();

    const count = await this.prisma.tripType.count();
    const tripType = await this.prisma.tripType.create({
      data: {
        slug: this.buildTripTypeSlug(input.name),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        surchargeAmount: input.surchargeAmount ?? 0,
        isActive: input.isActive ?? true,
        isDefault: false,
        sortOrder: count + 1
      }
    });

    return this.toTripTypeSummary(tripType);
  }

  async updateTripType(id: string, input: UpdateTripTypeDto): Promise<TripTypeSummary> {
    await this.ensureDefaultTripType();

    const current = await this.prisma.tripType.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Tipo de viagem ${id} nao encontrado.`);
    }

    const isDefault = current.isDefault;
    const tripType = await this.prisma.tripType.update({
      where: { id },
      data: {
        name: input.name?.trim() ?? undefined,
        description: input.description === undefined ? undefined : input.description.trim() || null,
        surchargeAmount: isDefault ? 0 : input.surchargeAmount,
        isActive: isDefault ? true : input.isActive
      }
    });

    return this.toTripTypeSummary(tripType);
  }

  async deleteTripType(id: string): Promise<void> {
    await this.ensureDefaultTripType();

    const current = await this.prisma.tripType.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Tipo de viagem ${id} nao encontrado.`);
    }

    if (current.isDefault) {
      throw new BadRequestException("O tipo padrao comum nao pode ser excluido.");
    }

    await this.prisma.tripType.delete({
      where: { id }
    });
  }

  async listCustomers(phone?: string): Promise<CustomerSummary[]> {
    const normalizedPhone = phone?.trim() || undefined;

    const [rides, customers] = await Promise.all([
      this.prisma.ride.findMany({
        where: {
          customerPhone: {
            not: "unknown",
            contains: normalizedPhone
          }
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          status: true,
          origin: true,
          destination: true,
          createdAt: true
        }
      }),
      this.prisma.customer.findMany({
        where: {
          phone: {
            contains: normalizedPhone
          }
        },
        include: {
          favoriteAddresses: {
            orderBy: [{ updatedAt: "desc" }, { label: "asc" }]
          }
        }
      })
    ]);

    const customersByPhone = new Map(customers.map((customer) => [customer.phone, customer]));
    const rideSummaryByPhone = new Map<
      string,
      Omit<CustomerSummary, "favorites">
    >();
    const rideHistoryByPhone = new Map<string, Array<{ status: RideStatus; createdAt: Date }>>();

    for (const ride of rides) {
      const rideHistory = rideHistoryByPhone.get(ride.customerPhone) ?? [];
      rideHistory.push({
        status: ride.status as RideStatus,
        createdAt: ride.createdAt
      });
      rideHistoryByPhone.set(ride.customerPhone, rideHistory);

      const current = rideSummaryByPhone.get(ride.customerPhone);
      if (!current) {
        rideSummaryByPhone.set(ride.customerPhone, {
          phone: ride.customerPhone,
          name: ride.customerName,
          customerProfile: this.calculateCustomerProfile(undefined, []),
          totalRides: 1,
          lastRideId: ride.id,
          lastRideStatus: ride.status,
          lastOrigin: ride.origin,
          lastDestination: ride.destination,
          firstRideAt: ride.createdAt.toISOString(),
          lastRideAt: ride.createdAt.toISOString()
        });
        continue;
      }

      current.totalRides += 1;
      current.firstRideAt = ride.createdAt.toISOString();
    }

    const phones = new Set<string>([...customersByPhone.keys(), ...rideSummaryByPhone.keys()]);

    return [...phones]
      .map((customerPhone) => {
        const customer = customersByPhone.get(customerPhone);
        const rideSummary = rideSummaryByPhone.get(customerPhone);
        const customerProfile = this.calculateCustomerProfile(
          customer?.createdAt,
          rideHistoryByPhone.get(customerPhone) ?? []
        );

        return {
          phone: customerPhone,
          name: customer?.name ?? rideSummary?.name ?? "Cliente sem nome",
          hasReducedMobility: customer?.hasReducedMobility ?? undefined,
          customerProfile,
          totalRides: rideSummary?.totalRides ?? 0,
          lastRideId: rideSummary?.lastRideId,
          lastRideStatus: rideSummary?.lastRideStatus,
          lastOrigin: rideSummary?.lastOrigin,
          lastDestination: rideSummary?.lastDestination,
          firstRideAt: rideSummary?.firstRideAt,
          lastRideAt: rideSummary?.lastRideAt,
          favorites: customer?.favoriteAddresses.map((favorite) => this.toFavoriteSummary(favorite)) ?? []
        } satisfies CustomerSummary;
      })
      .sort((left, right) => {
        const leftTime = left.lastRideAt ?? customersByPhone.get(left.phone)?.updatedAt.toISOString() ?? "";
        const rightTime = right.lastRideAt ?? customersByPhone.get(right.phone)?.updatedAt.toISOString() ?? "";
        return rightTime.localeCompare(leftTime);
      });
  }

  async getCustomerProfile(phone: string): Promise<CustomerProfile> {
    const normalizedPhone = phone.trim();

    const [customer, rides, sessions] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { phone: normalizedPhone },
        include: {
          favoriteAddresses: {
            orderBy: [{ updatedAt: "desc" }, { label: "asc" }]
          }
        }
      }),
      this.prisma.ride.findMany({
        where: { customerPhone: normalizedPhone },
        orderBy: [{ createdAt: "desc" }],
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          events: {
            orderBy: { createdAt: "asc" }
          }
        }
      }),
      this.prisma.conversationSession.findMany({
        where: { customerPhone: normalizedPhone },
        orderBy: [{ updatedAt: "desc" }]
      })
    ]);

    if (!customer && rides.length === 0 && sessions.length === 0) {
      throw new NotFoundException(`Cliente ${normalizedPhone} nao encontrado.`);
    }

    const fallbackName = rides[0]?.customerName ?? customer?.name ?? "Cliente sem nome";
    const profileSummary = (await this.listCustomers(normalizedPhone))[0];

    return {
      phone: normalizedPhone,
      name: customer?.name ?? fallbackName,
      hasReducedMobility: customer?.hasReducedMobility ?? profileSummary?.hasReducedMobility,
      customerProfile:
        profileSummary?.customerProfile ?? this.calculateCustomerProfile(customer?.createdAt, []),
      totalRides: profileSummary?.totalRides ?? rides.length,
      lastRideId: profileSummary?.lastRideId,
      lastRideStatus: profileSummary?.lastRideStatus,
      lastOrigin: profileSummary?.lastOrigin,
      lastDestination: profileSummary?.lastDestination,
      firstRideAt: profileSummary?.firstRideAt,
      lastRideAt: profileSummary?.lastRideAt,
      favorites: customer?.favoriteAddresses.map((favorite) => this.toFavoriteSummary(favorite)) ?? [],
      rides: rides.map((ride) => this.toCustomerRideHistoryItem(ride)),
      conversationLogs: sessions.map((session) => this.toConversationLog(session))
    };
  }

  async saveFavoriteAddress(
    phone: string,
    input: SaveCustomerFavoriteAddressDto
  ): Promise<CustomerFavoriteAddressSummary> {
    const normalizedPhone = phone.trim();
    const normalizedName = input.customerName.trim();
    const normalizedLabel = input.label.trim();
    const normalizedLabelKey = this.normalizeFavoriteLabel(normalizedLabel);
    const normalizedAddress = input.address.trim();

    const favorite = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone: normalizedPhone },
        update: { name: normalizedName },
        create: {
          phone: normalizedPhone,
          name: normalizedName
        }
      });

      const existing = await tx.customerFavoriteAddress.findUnique({
        where: {
          customerId_labelKey: {
            customerId: customer.id,
            labelKey: normalizedLabelKey
          }
        }
      });

      if (existing) {
        return tx.customerFavoriteAddress.update({
          where: { id: existing.id },
          data: {
            label: normalizedLabel,
            address: normalizedAddress
          }
        });
      }

      return tx.customerFavoriteAddress.create({
        data: {
          customerId: customer.id,
          label: normalizedLabel,
          labelKey: normalizedLabelKey,
          address: normalizedAddress
        }
      });
    });

    return this.toFavoriteSummary(favorite);
  }

  async upsertCustomerLead(phone: string, name: string): Promise<void> {
    const normalizedPhone = phone.trim();
    const normalizedName = name.trim();

    if (!normalizedPhone || !normalizedName) {
      return;
    }

    await this.prisma.customer.upsert({
      where: { phone: normalizedPhone },
      update: { name: normalizedName },
      create: {
        phone: normalizedPhone,
        name: normalizedName
      }
    });
  }

  private calculateCustomerProfile(
    customerCreatedAt: Date | undefined,
    rideHistory: Array<{ status: RideStatus; createdAt: Date }>
  ): RideCustomerProfile {
    const now = Date.now();
    const activeMonthThreshold = now - ACTIVE_MONTH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const oldCustomerThreshold = now - CUSTOMER_AGE_BONUS_DAYS * 24 * 60 * 60 * 1000;
    const completedRides = rideHistory.filter((ride) => ride.status === "COMPLETED").length;
    const monthlyCompletedRides = rideHistory.filter(
      (ride) => ride.status === "COMPLETED" && ride.createdAt.getTime() >= activeMonthThreshold
    ).length;
    const cancelledRides = rideHistory.filter((ride) => ride.status === "CANCELLED").length;
    const quoteDropoffs = rideHistory.filter((ride) => ride.status === "EXPIRED" || ride.status === "QUOTED").length;

    let score = CUSTOMER_SCORE_BASE;
    score += Math.min(20, completedRides * 5);
    if (monthlyCompletedRides >= 3) {
      score += 5;
    }
    if (customerCreatedAt && customerCreatedAt.getTime() <= oldCustomerThreshold) {
      score += 5;
    }
    score -= Math.min(30, cancelledRides * 10);
    score -= Math.min(10, quoteDropoffs * 2);
    score = Math.max(0, Math.min(100, score));

    const tier = this.resolveCustomerTier(score, completedRides);
    return {
      score,
      tier,
      tierLabel: this.getCustomerTierLabel(tier),
      tierEmoji: this.getCustomerTierEmoji(tier),
      completedRides,
      totalRides: rideHistory.length
    };
  }

  private resolveCustomerTier(score: number, completedRides: number): RideCustomerProfile["tier"] {
    if (completedRides < 3) {
      return "NEW";
    }
    if (score >= 85) {
      return "DIAMOND";
    }
    if (score >= 70) {
      return "GOLD";
    }
    if (score >= 55) {
      return "SILVER";
    }
    return "BRONZE";
  }

  private getCustomerTierLabel(tier: RideCustomerProfile["tier"]): string {
    switch (tier) {
      case "DIAMOND":
        return "Diamante";
      case "GOLD":
        return "Ouro";
      case "SILVER":
        return "Prata";
      case "BRONZE":
        return "Bronze";
      default:
        return "Novo";
    }
  }

  private getCustomerTierEmoji(tier: RideCustomerProfile["tier"]): string {
    switch (tier) {
      case "DIAMOND":
        return "💎";
      case "GOLD":
        return "🥇";
      case "SILVER":
        return "🥈";
      case "BRONZE":
        return "🥉";
      default:
        return "🆕";
    }
  }

  async updateCustomerAccessibility(phone: string, hasReducedMobility: boolean): Promise<void> {
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      return;
    }

    await this.prisma.customer.update({
      where: { phone: normalizedPhone },
      data: { hasReducedMobility }
    });
  }

  private async ensureDefaultCompanyProfile() {
    const existing = await this.prisma.companyProfileConfig.findFirst({
      orderBy: { createdAt: "asc" }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.companyProfileConfig.create({
      data: {}
    });
  }

  private toCompanyProfileSummary(profile: {
    id: string;
    legalName: string;
    tradeName: string;
    cnpj: string | null;
    phone: string | null;
    email: string;
    website: string | null;
    zipCode: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    legalRepresentativeName: string | null;
    legalRepresentativeCpf: string | null;
    legalRepresentativeRole: string | null;
    contractSignatureCity: string | null;
    geofenceEnabled: boolean;
    geofenceBaseLatitude: Prisma.Decimal | number | null;
    geofenceBaseLongitude: Prisma.Decimal | number | null;
    geofenceRadiusMeters: number;
    toleranceMarkingMinutes: number;
    toleranceDailyMaxMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  }, employmentLinkages: CompanyEmploymentLinkageSummary[]): CompanyProfileSummary {
    return {
      id: profile.id,
      legalName: profile.legalName,
      tradeName: profile.tradeName,
      cnpj: profile.cnpj ?? undefined,
      phone: profile.phone ?? undefined,
      email: profile.email,
      website: profile.website ?? undefined,
      zipCode: profile.zipCode ?? undefined,
      street: profile.street ?? undefined,
      number: profile.number ?? undefined,
      neighborhood: profile.neighborhood ?? undefined,
      city: profile.city ?? undefined,
      state: profile.state ?? undefined,
      legalRepresentativeName: profile.legalRepresentativeName ?? undefined,
      legalRepresentativeCpf: profile.legalRepresentativeCpf ?? undefined,
      legalRepresentativeRole: profile.legalRepresentativeRole ?? undefined,
      contractSignatureCity: profile.contractSignatureCity ?? undefined,
      geofenceEnabled: profile.geofenceEnabled,
      geofenceBaseLatitude:
        profile.geofenceBaseLatitude === null ? undefined : Number(profile.geofenceBaseLatitude),
      geofenceBaseLongitude:
        profile.geofenceBaseLongitude === null ? undefined : Number(profile.geofenceBaseLongitude),
      geofenceRadiusMeters: profile.geofenceRadiusMeters,
      toleranceMarkingMinutes: profile.toleranceMarkingMinutes,
      toleranceDailyMaxMinutes: profile.toleranceDailyMaxMinutes,
      employmentLinkages,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  private normalizeCompanyEmploymentLinkagesInput(
    input: UpdateCompanyEmploymentLinkageDto[]
  ): CompanyEmploymentLinkageSummary[] {
    const defaults = this.getDefaultCompanyEmploymentLinkages();
    const map = new Map(defaults.map((item) => [item.key, item]));

    input.forEach((item) => {
      const defaultItem = map.get(item.key);
      if (!defaultItem) {
        return;
      }

      const label = item.label.trim();
      const description = item.description?.trim();

      map.set(item.key, {
        key: item.key,
        label: label || defaultItem.label,
        description: description || defaultItem.description,
        isActive: item.isActive,
        sortOrder:
          typeof item.sortOrder === "number"
            ? Math.min(Math.max(Math.trunc(item.sortOrder), 1), 99)
            : defaultItem.sortOrder
      });
    });

    return [...map.values()].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private getDefaultCompanyEmploymentLinkages(): CompanyEmploymentLinkageSummary[] {
    return DEFAULT_COMPANY_EMPLOYMENT_LINKAGES.map((item) => ({ ...item }));
  }

  private async resolveCompanyEmploymentLinkagesForCompany(
    db: Prisma.TransactionClient | PrismaService,
    companyProfileId: string
  ): Promise<CompanyEmploymentLinkageSummary[]> {
    const defaults = this.getDefaultCompanyEmploymentLinkages();
    await this.ensureCompanyEmploymentLinkageRows(db, companyProfileId, defaults);

    const rows = await db.companyEmploymentLinkage.findMany({
      where: { companyProfileId },
      select: {
        key: true,
        label: true,
        description: true,
        isActive: true,
        sortOrder: true
      },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }]
    });

    if (!rows.length) {
      return defaults;
    }

    return rows.map((row) => ({
      key: row.key as CompanyEmploymentLinkageSummary["key"],
      label: row.label.trim().slice(0, 80),
      description: row.description?.trim().slice(0, 240),
      isActive: row.isActive,
      sortOrder: Math.min(Math.max(Math.trunc(row.sortOrder), 1), 99)
    }));
  }

  private async ensureCompanyEmploymentLinkageRows(
    db: Prisma.TransactionClient | PrismaService,
    companyProfileId: string,
    seedRows: CompanyEmploymentLinkageSummary[]
  ): Promise<void> {
    for (const item of seedRows) {
      await db.companyEmploymentLinkage.upsert({
        where: {
          companyProfileId_key: {
            companyProfileId,
            key: item.key
          }
        },
        create: {
          companyProfileId,
          key: item.key,
          label: item.label,
          description: item.description,
          isActive: item.isActive,
          sortOrder: item.sortOrder
        },
        update: {}
      });
    }
  }

  private async ensureCompanyEmploymentLinkage(
    db: Prisma.TransactionClient | PrismaService,
    companyProfileId: string,
    linkageKeyRaw: string
  ): Promise<{
    id: string;
    key: CompanyEmploymentLinkageSummary["key"];
  }> {
    const linkageKey = this.resolveCompanyEmploymentLinkageKey(linkageKeyRaw);
    await this.ensureCompanyEmploymentLinkageRows(
      db,
      companyProfileId,
      this.getDefaultCompanyEmploymentLinkages()
    );

    const linkage = await db.companyEmploymentLinkage.findUnique({
      where: {
        companyProfileId_key: {
          companyProfileId,
          key: linkageKey
        }
      },
      select: {
        id: true,
        key: true
      }
    });

    if (!linkage) {
      throw new NotFoundException(`Vinculo ${linkageKey} nao encontrado para a empresa.`);
    }

    return {
      id: linkage.id,
      key: linkage.key as CompanyEmploymentLinkageSummary["key"]
    };
  }

  private resolveCompanyEmploymentLinkageKey(value: string): CompanyEmploymentLinkageSummary["key"] {
    const normalized = value.trim().toUpperCase();
    if (
      normalized === "CLT" ||
      normalized === "CLT_INTERMITENTE" ||
      normalized === "MEI" ||
      normalized === "PJ" ||
      normalized === "AUTONOMO"
    ) {
      return normalized;
    }
    throw new BadRequestException("Tipo de vinculo invalido.");
  }

  private getDefaultFinancialTransactionCategories(): Array<{
    code: string;
    name: string;
    type: FinancialTransactionCategoryType;
    color?: string;
    icon?: string;
    sortOrder: number;
    isActive: boolean;
  }> {
    return DEFAULT_FINANCIAL_TRANSACTION_CATEGORIES.map((item) => ({ ...item }));
  }

  private resolveNextFinancialCategorySortOrder(
    rows: Array<{ sortOrder: number }>
  ): number {
    const max = rows.reduce((acc, row) => Math.max(acc, row.sortOrder), 0);
    return max + 10;
  }

  private normalizeFinancialCategoryCode(value: string): string {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z0-9_]{2,60}$/.test(normalized)) {
      throw new BadRequestException(
        "Codigo da categoria financeira invalido. Use de 2 a 60 caracteres (A-Z, 0-9 e _)."
      );
    }
    return normalized;
  }

  private normalizeFinancialCategoryName(value: string): string {
    const normalized = value.trim();
    if (normalized.length < 2 || normalized.length > 120) {
      throw new BadRequestException("Nome da categoria financeira deve ter entre 2 e 120 caracteres.");
    }
    return normalized;
  }

  private normalizeFinancialCategoryType(
    value?: string
  ): FinancialTransactionCategoryType {
    if (value === "REVENUE" || value === "EXPENSE" || value === "BOTH") {
      return value;
    }
    return "EXPENSE";
  }

  private async resolveFinancialTransactionCategoriesForCompany(
    db: Prisma.TransactionClient | PrismaService,
    companyProfileId: string
  ): Promise<FinancialTransactionCategorySummary[]> {
    const defaults = this.getDefaultFinancialTransactionCategories();
    await this.ensureFinancialTransactionCategoryRows(db, companyProfileId, defaults);

    const rows = await db.financialTransactionCategory.findMany({
      where: {
        companyProfileId
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return rows.map((row) => this.toFinancialTransactionCategorySummary(row));
  }

  private async ensureFinancialTransactionCategoryRows(
    db: Prisma.TransactionClient | PrismaService,
    companyProfileId: string,
    seedRows: Array<{
      code: string;
      name: string;
      type: FinancialTransactionCategoryType;
      color?: string;
      icon?: string;
      sortOrder: number;
      isActive: boolean;
    }>
  ): Promise<void> {
    const codes = seedRows.map((item) => item.code);
    const existingRows = await db.financialTransactionCategory.findMany({
      where: {
        companyProfileId,
        code: {
          in: codes
        }
      },
      select: {
        code: true
      }
    });
    const existingCodes = new Set(existingRows.map((row) => row.code));

    for (const item of seedRows) {
      if (existingCodes.has(item.code)) {
        continue;
      }
      await db.financialTransactionCategory.upsert({
        where: {
          companyProfileId_code: {
            companyProfileId,
            code: item.code
          }
        },
        create: {
          companyProfileId,
          code: item.code,
          name: item.name,
          type: item.type,
          color: item.color ?? null,
          icon: item.icon ?? null,
          sortOrder: item.sortOrder,
          isActive: item.isActive
        },
        update: {}
      });
    }
  }

  private toFinancialTransactionCategorySummary(category: {
    id: string;
    code: string;
    name: string;
    type: string;
    color: string | null;
    icon: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): FinancialTransactionCategorySummary {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      type: category.type as FinancialTransactionCategoryType,
      color: category.color ?? undefined,
      icon: category.icon ?? undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    };
  }

  private parseManualTransactionId(transactionIdRaw: string): string {
    const transactionId = this.normalizeOptionalText(
      transactionIdRaw,
      180,
      "Identificador da transacao financeira invalido."
    );
    if (!transactionId) {
      throw new BadRequestException("Identificador da transacao financeira e obrigatorio.");
    }
    if (!transactionId.startsWith("txn-manual-")) {
      throw new BadRequestException(
        "Apenas transacoes manuais ou de ajuste podem ser editadas/estornadas."
      );
    }
    const manualId = transactionId.slice("txn-manual-".length);
    if (!manualId) {
      throw new BadRequestException("Identificador da transacao manual invalido.");
    }
    return manualId;
  }

  private parseRequiredDateTime(value: string, message: string): Date {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }
    return parsed;
  }

  private toFinancialTransactionSummaryFromManualTransaction(
    transaction: {
      id: string;
      occurredAt: Date;
      type: string;
      status: string;
      categoryCode: string;
      description: string;
      amount: Prisma.Decimal | { toString(): string } | number;
      driverId: string | null;
      driver?: {
        user?: {
          name?: string;
        } | null;
      } | null;
      referenceId: string | null;
      notes: string | null;
      metadata: Prisma.JsonValue | null;
    },
    categoryName?: string
  ): FinancialTransactionSummary {
    return {
      id: `txn-manual-${transaction.id}`,
      occurredAt: transaction.occurredAt.toISOString(),
      type: transaction.type as FinancialTransactionType,
      status: transaction.status as FinancialTransactionStatus,
      source: "MANUAL",
      category: transaction.categoryCode,
      categoryLabel: categoryName,
      description: transaction.description,
      amount: Number(this.decimalToNumber(transaction.amount).toFixed(2)),
      driverId: transaction.driverId ?? undefined,
      driverName: transaction.driver?.user?.name ?? undefined,
      referenceId: transaction.referenceId ?? undefined,
      isEditable: true,
      isReversible: true,
      metadata:
        transaction.notes || transaction.metadata
          ? ({
              notes: transaction.notes ?? undefined,
              payload: transaction.metadata ?? undefined
            } as Record<string, unknown>)
          : undefined
    };
  }

  private normalizeEmploymentLinkageRuleCode(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Codigo da regra de vinculo invalido.");
    }
    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,80}$/.test(normalized)) {
      throw new BadRequestException(
        "Codigo da regra deve conter de 2 a 80 caracteres (A-Z, 0-9, _ ou -)."
      );
    }
    return normalized;
  }

  private normalizeEmploymentLinkageRuleName(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Nome da regra de vinculo invalido.");
    }
    const normalized = value.trim();
    if (normalized.length < 3 || normalized.length > 120) {
      throw new BadRequestException("Nome da regra deve ter entre 3 e 120 caracteres.");
    }
    return normalized;
  }

  private normalizeEmploymentLinkageRuleSettings(value: unknown): Prisma.InputJsonValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Configuracao da regra deve ser um objeto JSON valido.");
    }
    return value as Prisma.InputJsonValue;
  }

  private toCompanyEmploymentLinkageRuleSummary(
    rule: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      isActive: boolean;
      priority: number;
      settings: Prisma.JsonValue;
      createdAt: Date;
      updatedAt: Date;
    },
    linkageKey: CompanyEmploymentLinkageSummary["key"]
  ): CompanyEmploymentLinkageRuleSummary {
    const settings =
      rule.settings && typeof rule.settings === "object" && !Array.isArray(rule.settings)
        ? (rule.settings as Record<string, unknown>)
        : {};

    return {
      id: rule.id,
      linkageKey,
      code: rule.code,
      name: rule.name,
      description: rule.description ?? undefined,
      isActive: rule.isActive,
      priority: rule.priority,
      settings,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString()
    };
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    );
  }

  private normalizeRemunerationTemplateSettings(value: unknown): Prisma.InputJsonValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Configuracao do template deve ser um objeto JSON valido.");
    }

    return value as Prisma.InputJsonValue;
  }

  private toRemunerationTemplateSummary(template: {
    id: string;
    name: string;
    description: string | null;
    workerType: "DRIVER";
    contractProfile: string | null;
    isActive: boolean;
    settings: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): RemunerationTemplateSummary {
    const settings =
      template.settings && typeof template.settings === "object" && !Array.isArray(template.settings)
        ? (template.settings as Record<string, unknown>)
        : {};
    const contractProfile =
      template.contractProfile === "CLT" ||
      template.contractProfile === "INTERMITENTE" ||
      template.contractProfile === "MEI"
        ? template.contractProfile
        : undefined;

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      workerType: template.workerType,
      contractProfile,
      isActive: template.isActive,
      settings,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    };
  }

  private normalizeWorkProfiles(value: unknown): Prisma.InputJsonValue {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = [...new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, 30)
    )];

    return normalized as Prisma.InputJsonValue;
  }

  private resolveOvertimeTemplatePolicyCategory(value: unknown): "OVERTIME" | "NIGHT" {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return "OVERTIME";
    }

    const root = value as Record<string, unknown>;
    return root.policyCategory === "NIGHT" ? "NIGHT" : "OVERTIME";
  }

  private normalizeOvertimeTemplateSettings(value: unknown): Prisma.InputJsonValue {
    const root = this.toRecord(value, "Configuracao de hora extra deve ser um objeto JSON valido.");
    const overtime = this.toRecord(root.overtime, "Secao overtime invalida.");
    const percentages = this.toRecord(root.percentages, "Secao percentages invalida.");
    const rules = this.toRecord(root.rules, "Secao rules invalida.");
    const rounding = this.toRecord(root.rounding, "Secao rounding invalida.");
    const bankHours = this.toRecord(root.bankHours, "Secao bankHours invalida.");
    const night = this.toRecord(root.night, "Secao night invalida.");
    const policyCategory = this.toEnum(
      root.policyCategory,
      ["OVERTIME", "NIGHT"] as const,
      "Categoria da politica invalida.",
      "OVERTIME"
    );
    const isOvertimePolicy = policyCategory === "OVERTIME";
    const isNightPolicy = policyCategory === "NIGHT";

    const destination = isOvertimePolicy
      ? this.toEnum(
          overtime.destination,
          ["PAYMENT", "BANK_HOURS", "BOTH"] as const,
          "Destino de hora extra invalido.",
          "PAYMENT"
        )
      : "PAYMENT";
    const overtimeEnabled = isOvertimePolicy ? this.toBoolean(overtime.enabled, true) : false;

    const overtime50 = isOvertimePolicy
      ? this.toNumber(percentages.overtime50, 50, 0, 500, "Percentual de hora extra 50% invalido.")
      : 50;
    const overtime100 = isOvertimePolicy
      ? this.toNumber(percentages.overtime100, 100, 0, 500, "Percentual de hora extra 100% invalido.")
      : 100;
    const nightAdditionalPercent = isNightPolicy
      ? this.toNumber(
          percentages.nightAdditionalPercent,
          20,
          0,
          500,
          "Percentual de adicional noturno invalido."
        )
      : 20;

    const nightEnabled = isNightPolicy ? this.toBoolean(night.enabled, true) : false;
    const nightStartTime = nightEnabled
      ? this.normalizeClockTime(
          night.startTime,
          "22:00",
          "Horario inicial de adicional noturno invalido."
        )
      : undefined;
    const nightEndTime = nightEnabled
      ? this.normalizeClockTime(
          night.endTime,
          "05:00",
          "Horario final de adicional noturno invalido."
        )
      : undefined;
    if (nightEnabled && nightStartTime === nightEndTime) {
      throw new BadRequestException(
        "Horario inicial e final da faixa de adicional noturno nao podem ser iguais."
      );
    }
    const bankHoursEnabled = isOvertimePolicy
      ? this.toBoolean(bankHours.enabled, destination === "BANK_HOURS" || destination === "BOTH")
      : false;

    const settings = {
      policyCategory,
      overtime: {
        enabled: overtimeEnabled,
        afterDailyHours: isOvertimePolicy
          ? this.toNumber(
              overtime.afterDailyHours,
              8,
              0,
              24,
              "Horas para gerar hora extra diaria invalidas."
            )
          : 8,
        afterWeeklyHours: isOvertimePolicy
          ? this.toNumber(
              overtime.afterWeeklyHours,
              44,
              0,
              168,
              "Horas para gerar hora extra semanal invalidas."
            )
          : 44,
        destination
      },
      percentages: {
        overtime50,
        overtime100,
        nightAdditionalPercent
      },
      rules: {
        maxExtraHoursPerDay: isOvertimePolicy
          ? this.toOptionalNumber(
              rules.maxExtraHoursPerDay,
              0,
              24,
              "Quantidade maxima diaria de hora extra invalida."
            )
          : undefined,
        requiresApproval: isOvertimePolicy ? this.toBoolean(rules.requiresApproval, false) : false,
        compensateDelayWithOvertime: isOvertimePolicy
          ? this.toBoolean(rules.compensateDelayWithOvertime, false)
          : false,
        toleranceMinutes: isOvertimePolicy
          ? this.toInteger(
              rules.toleranceMinutes,
              0,
              0,
              240,
              "Tolerancia de minutos invalida."
            )
          : 0
      },
      rounding: {
        type: isOvertimePolicy
          ? this.toEnum(
              rounding.type,
              ["UP", "DOWN", "NEAREST"] as const,
              "Tipo de arredondamento invalido.",
              "NEAREST"
            )
          : "NEAREST",
        intervalMinutes: isOvertimePolicy
          ? this.toInteger(
              rounding.intervalMinutes,
              15,
              1,
              120,
              "Intervalo de arredondamento invalido."
            )
          : 15
      },
      bankHours: {
        enabled: bankHoursEnabled,
        compensationTermValue: bankHoursEnabled
          ? this.toInteger(
              bankHours.compensationTermValue,
              30,
              1,
              120,
              "Prazo de compensacao do banco de horas invalido."
            )
          : undefined,
        compensationTermUnit: bankHoursEnabled
          ? this.toEnum(
              bankHours.compensationTermUnit,
              ["DAYS", "MONTHS"] as const,
              "Unidade do prazo de compensacao invalida.",
              "DAYS"
            )
          : undefined,
        priority: bankHoursEnabled
          ? this.toEnum(
              bankHours.priority,
              ["COMPENSATE", "PAY"] as const,
              "Prioridade do banco de horas invalida.",
              "COMPENSATE"
            )
          : undefined,
        expirationValue: bankHoursEnabled
          ? this.toOptionalNumber(
              bankHours.expirationValue,
              1,
              120,
              "Expiracao do banco de horas invalida."
            )
          : undefined,
        expirationUnit: bankHoursEnabled
          ? this.toEnum(
              bankHours.expirationUnit,
              ["DAYS", "MONTHS"] as const,
              "Unidade de expiracao do banco de horas invalida.",
              "DAYS"
            )
          : undefined
      },
      night: {
        enabled: nightEnabled,
        startTime: nightStartTime,
        endTime: nightEndTime,
        percent: nightEnabled
          ? this.toNumber(night.percent, nightAdditionalPercent, 0, 500, "Percentual noturno invalido.")
          : undefined,
        accumulatesWithOvertime: nightEnabled ? this.toBoolean(night.accumulatesWithOvertime, true) : false,
        reflectsOnDsr: nightEnabled ? this.toBoolean(night.reflectsOnDsr, true) : false
      }
    };

    return settings as Prisma.InputJsonValue;
  }

  private toOvertimeTemplateSummary(template: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    workProfiles: Prisma.JsonValue | null;
    settings: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): OvertimeTemplateSummary {
    const settings =
      template.settings && typeof template.settings === "object" && !Array.isArray(template.settings)
        ? (template.settings as Record<string, unknown>)
        : {};
    const workProfiles = Array.isArray(template.workProfiles)
      ? template.workProfiles
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    return {
      id: template.id,
      name: template.name,
      description: template.description ?? undefined,
      isActive: template.isActive,
      workProfiles,
      settings,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    };
  }

  private toHolidaySummary(item: {
    id: string;
    date: Date;
    name: string;
    scopeType: HolidayScopeType;
    stateCode: string | null;
    cityCode: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): HolidaySummary {
    return {
      id: item.id,
      date: this.timekeepingService.toDateOnlyString(item.date),
      name: item.name,
      scopeType: item.scopeType,
      stateCode: item.stateCode ?? undefined,
      cityCode: item.cityCode ?? undefined,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private normalizeHolidayPayload(input: {
    name: unknown;
    date: unknown;
    scopeType?: unknown;
    stateCode?: unknown;
    cityCode?: unknown;
    isActive?: unknown;
  }): {
    name: string;
    date: Date;
    scopeType: HolidayScopeType;
    stateCode?: string;
    cityCode?: string;
    isActive: boolean;
  } {
    const name = this.normalizeOptionalText(input.name, 120, "Nome do feriado invalido.");
    if (!name || name.length < 3) {
      throw new BadRequestException("Nome do feriado deve ter ao menos 3 caracteres.");
    }

    const date = this.timekeepingService.normalizeDateOnlyValue(input.date, "Data do feriado invalida.");
    const scopeType = this.toEnum(
      input.scopeType,
      HOLIDAY_SCOPE_TYPE_VALUES,
      "Escopo de feriado invalido.",
      "NATIONAL"
    ) as HolidayScopeType;
    const stateCode = this.normalizeOptionalText(input.stateCode, 2, "UF do feriado invalida.")
      ?.toUpperCase();
    const cityCode = this.normalizeOptionalText(input.cityCode, 120, "Cidade do feriado invalida.");

    if (scopeType === "STATE" && !stateCode) {
      throw new BadRequestException("Para feriado estadual, informe a UF.");
    }
    if (scopeType === "CITY" && (!stateCode || !cityCode)) {
      throw new BadRequestException("Para feriado municipal, informe UF e cidade.");
    }

    return {
      name,
      date,
      scopeType,
      stateCode: scopeType === "NATIONAL" ? undefined : stateCode,
      cityCode: scopeType === "CITY" ? cityCode : undefined,
      isActive: this.toBoolean(input.isActive, true)
    };
  }

  private async ensureHolidayUniqueness(
    input: {
      name: string;
      date: Date;
      scopeType: HolidayScopeType;
      stateCode?: string;
      cityCode?: string;
    },
    excludeId?: string
  ): Promise<void> {
    const existing = await this.prisma.holiday.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        date: input.date,
        scopeType: input.scopeType,
        stateCode: input.stateCode ?? null,
        cityCode: input.cityCode ?? null,
        name: input.name
      },
      select: { id: true }
    });

    if (existing) {
      throw new BadRequestException(
        "Ja existe um feriado com a mesma data, escopo e localizacao."
      );
    }
  }

  private normalizeWorkJourneyPayload(input: {
    name: unknown;
    description?: unknown;
    isActive?: unknown;
    type: unknown;
    allowedDays: unknown;
    breakType: unknown;
    breakDurationMinutes?: unknown;
    maxHoursPerDay: unknown;
    notes?: unknown;
    dsrEnabled?: unknown;
    dsrWeeklyRestDay?: unknown;
    dsrReflectOvertime?: unknown;
    dsrReflectNight?: unknown;
    dsrLoseOnUnjustifiedAbsence?: unknown;
    dsrDescription?: unknown;
    fixedConfig?: unknown;
    flexibleConfig?: unknown;
    intermittentConfig?: unknown;
  }): {
    name: string;
    description?: string;
    isActive: boolean;
    type: WorkJourneyType;
    allowedDays: WorkJourneyDay[];
    breakType: WorkJourneyBreakType;
    breakDurationMinutes?: number;
    maxHoursPerDay: number;
    notes?: string;
    dsrPolicy: {
      enabled: boolean;
      restMode: "WEEKDAY" | "CYCLE";
      weeklyRestDay?: DsrWeeklyRestDay;
      cycleWorkDays?: number;
      cycleOffDays?: number;
      reflectOvertime: boolean;
      reflectNight: boolean;
      loseOnUnjustifiedAbsence: boolean;
      description?: string;
    };
    fixedConfig?: WorkJourneyFixedConfig;
    flexibleConfig?: WorkJourneyFlexibleConfig;
    intermittentConfig?: WorkJourneyIntermittentConfig;
  } {
    const name = this.normalizeOptionalText(input.name, 120, "Nome da jornada invalido.");
    if (!name || name.length < 3) {
      throw new BadRequestException("Nome da jornada deve ter ao menos 3 caracteres.");
    }

    const type = this.toEnum(
      input.type,
      WORK_JOURNEY_TYPE_VALUES,
      "Tipo de jornada invalido.",
      "FIXED"
    ) as WorkJourneyType;
    const allowedDays = this.normalizeWorkJourneyDays(input.allowedDays);
    const breakType = this.toEnum(
      input.breakType,
      WORK_JOURNEY_BREAK_TYPE_VALUES,
      "Tipo de intervalo da jornada invalido.",
      "FIXED"
    ) as WorkJourneyBreakType;
    const breakDurationMinutes =
      breakType === "NONE"
        ? undefined
        : this.toInteger(
            input.breakDurationMinutes,
            60,
            1,
            240,
            "Duracao do intervalo invalida. Informe entre 1 e 240 minutos."
          );
    const maxHoursPerDay = this.toNumber(
      input.maxHoursPerDay,
      8,
      0.5,
      24,
      "Limite maximo de horas por dia invalido."
    );

    const fixedConfig =
      type === "FIXED"
        ? this.normalizeWorkJourneyFixedConfig(input.fixedConfig, allowedDays)
        : undefined;
    const flexibleConfig =
      type === "FLEXIBLE"
        ? this.normalizeWorkJourneyFlexibleConfig(input.flexibleConfig, allowedDays, breakType, breakDurationMinutes)
        : undefined;
    const intermittentConfig =
      type === "INTERMITTENT"
        ? this.normalizeWorkJourneyIntermittentConfig(input.intermittentConfig, allowedDays)
        : undefined;
    const dsrEnabled = this.toBoolean(input.dsrEnabled, false);
    const isFixedCycleScale = type === "FIXED" && fixedConfig?.scaleType === "TWELVE_THIRTY_SIX";
    const dsrRestMode: "WEEKDAY" | "CYCLE" = isFixedCycleScale ? "CYCLE" : "WEEKDAY";
    const dsrWeeklyRestDay =
      dsrEnabled && dsrRestMode === "WEEKDAY"
        ? (this.toEnum(
            input.dsrWeeklyRestDay,
            DSR_WEEKLY_REST_DAY_VALUES,
            "Dia de descanso semanal do DSR invalido.",
            "SUN"
          ) as DsrWeeklyRestDay)
        : undefined;
    const dsrReflectOvertime = this.toBoolean(input.dsrReflectOvertime, true);
    const dsrReflectNight = this.toBoolean(input.dsrReflectNight, true);
    const dsrLoseOnUnjustifiedAbsence = this.toBoolean(input.dsrLoseOnUnjustifiedAbsence, false);
    const dsrDescription = this.normalizeOptionalText(
      input.dsrDescription,
      400,
      "Descricao do DSR invalida."
    );

    return {
      name,
      description: this.normalizeOptionalText(input.description, 600, "Descricao da jornada invalida."),
      isActive: this.toBoolean(input.isActive, true),
      type,
      allowedDays,
      breakType,
      breakDurationMinutes,
      maxHoursPerDay,
      notes: this.normalizeOptionalText(input.notes, 1000, "Observacoes da jornada invalidas."),
      dsrPolicy: {
        enabled: dsrEnabled,
        restMode: dsrRestMode,
        weeklyRestDay: dsrWeeklyRestDay,
        cycleWorkDays: dsrRestMode === "CYCLE" ? fixedConfig?.cycleWorkDays : undefined,
        cycleOffDays: dsrRestMode === "CYCLE" ? fixedConfig?.cycleOffDays : undefined,
        reflectOvertime: dsrReflectOvertime,
        reflectNight: dsrReflectNight,
        loseOnUnjustifiedAbsence: dsrLoseOnUnjustifiedAbsence,
        description: dsrDescription
      },
      fixedConfig,
      flexibleConfig,
      intermittentConfig
    };
  }

  private normalizeWorkJourneyDays(value: unknown): WorkJourneyDay[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException("Dias da jornada invalidos.");
    }

    const days = value
      .filter((item): item is WorkJourneyDay => typeof item === "string" && DSR_WEEKLY_REST_DAY_VALUES.includes(item as WorkJourneyDay))
      .slice(0, 7);
    const unique = [...new Set(days)];
    if (unique.length === 0) {
      throw new BadRequestException("Selecione ao menos um dia para a jornada.");
    }
    return unique;
  }

  private normalizeWorkJourneyFixedConfig(
    value: unknown,
    fallbackDays: WorkJourneyDay[]
  ): WorkJourneyFixedConfig {
    const payload = this.toRecord(
      value,
      "Configuracao da jornada fixa invalida."
    );

    const activeDaysInput =
      payload.activeDays === undefined
        ? fallbackDays
        : this.normalizeWorkJourneyDays(payload.activeDays);
    const defaultScaleType: WorkJourneyFixedConfig["scaleType"] =
      activeDaysInput.length === 6 ? "SIX_ONE" : activeDaysInput.length === 5 ? "FIVE_TWO" : "CUSTOM";
    const scaleType = this.toEnum(
      payload.scaleType,
      ["FIVE_TWO", "SIX_ONE", "TWELVE_THIRTY_SIX", "CUSTOM"] as const,
      "Escala da jornada fixa invalida.",
      defaultScaleType
    ) as WorkJourneyFixedConfig["scaleType"];
    const activeDays =
      scaleType === "TWELVE_THIRTY_SIX"
        ? (["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as WorkJourneyDay[])
        : activeDaysInput;
    const cycleWorkDays =
      scaleType === "TWELVE_THIRTY_SIX"
        ? this.toInteger(
            payload.cycleWorkDays,
            1,
            1,
            7,
            "Dias trabalhados do ciclo da jornada 12x36 invalidos."
          )
        : undefined;
    const cycleOffDays =
      scaleType === "TWELVE_THIRTY_SIX"
        ? this.toInteger(
            payload.cycleOffDays,
            1,
            1,
            7,
            "Dias de descanso do ciclo da jornada 12x36 invalidos."
          )
        : undefined;
    const dailyHours = this.toNumber(
      payload.dailyHours,
      8,
      0.5,
      24,
      "Carga diaria da jornada fixa invalida."
    );

    const weeklyHoursFallback =
      scaleType === "TWELVE_THIRTY_SIX"
        ? Number((dailyHours * (7 * (cycleWorkDays ?? 1)) / ((cycleWorkDays ?? 1) + (cycleOffDays ?? 1))).toFixed(2))
        : Number((dailyHours * activeDays.length).toFixed(2));

    return {
      scaleType,
      activeDays,
      cycleWorkDays,
      cycleOffDays,
      startTime: this.normalizeWorkJourneyClock(payload.startTime, "Hora de entrada da jornada fixa invalida."),
      endTime: this.normalizeWorkJourneyClock(payload.endTime, "Hora de saida da jornada fixa invalida."),
      dailyHours,
      weeklyHours: this.toNumber(
        payload.weeklyHours,
        weeklyHoursFallback,
        0.5,
        168,
        "Carga semanal da jornada fixa invalida."
      )
    };
  }

  private normalizeWorkJourneyFlexibleConfig(
    value: unknown,
    fallbackDays: WorkJourneyDay[],
    breakType: WorkJourneyBreakType,
    breakDurationMinutes?: number
  ): WorkJourneyFlexibleConfig {
    const payload = this.toRecord(
      value,
      "Configuracao da jornada flexivel invalida."
    );

    const days =
      fallbackDays.length > 0 ? fallbackDays : (["MON", "TUE", "WED", "THU", "FRI"] as WorkJourneyDay[]);
    const expectedWeeklyHours = this.toNumber(
      payload.expectedWeeklyHours,
      44,
      0.5,
      168,
      "Carga semanal esperada da jornada flexivel invalida."
    );
    const expectedDailyFallback = Number((expectedWeeklyHours / Math.max(days.length, 1)).toFixed(2));

    return {
      expectedDailyHours: this.toNumber(
        payload.expectedDailyHours,
        expectedDailyFallback,
        0.5,
        24,
        "Carga diaria esperada da jornada flexivel invalida."
      ),
      expectedWeeklyHours,
      entryWindowStart: this.normalizeWorkJourneyClock(
        payload.entryWindowStart,
        "Inicio da faixa de entrada da jornada flexivel invalido."
      ),
      entryWindowEnd: this.normalizeWorkJourneyClock(
        payload.entryWindowEnd,
        "Fim da faixa de entrada da jornada flexivel invalido."
      ),
      exitWindowStart: this.normalizeWorkJourneyClock(
        payload.exitWindowStart,
        "Inicio da faixa de saida da jornada flexivel invalido."
      ),
      exitWindowEnd: this.normalizeWorkJourneyClock(
        payload.exitWindowEnd,
        "Fim da faixa de saida da jornada flexivel invalido."
      ),
      minimumBreakMinutes: this.toInteger(
        payload.minimumBreakMinutes,
        breakType === "NONE" ? 0 : breakDurationMinutes ?? 30,
        0,
        240,
        "Intervalo minimo da jornada flexivel invalido."
      ),
      breakMandatory: this.toBoolean(payload.breakMandatory, breakType !== "NONE"),
      allowSameDayCompensation: this.toBoolean(payload.allowSameDayCompensation, true),
      allowSameWeekCompensation: this.toBoolean(payload.allowSameWeekCompensation, true)
    };
  }

  private normalizeWorkJourneyIntermittentConfig(
    value: unknown,
    fallbackDays: WorkJourneyDay[]
  ): WorkJourneyIntermittentConfig {
    const payload = this.toRecord(
      value,
      "Configuracao da jornada intermitente invalida."
    );

    return {
      minHoursPerCall: this.toNumber(
        payload.minHoursPerCall,
        4,
        0.5,
        24,
        "Minimo de horas por convocacao invalido."
      ),
      maxHoursPerCall: this.toNumber(
        payload.maxHoursPerCall,
        8,
        0.5,
        24,
        "Maximo de horas por convocacao invalido."
      ),
      callDays:
        payload.callDays === undefined
          ? fallbackDays
          : this.normalizeWorkJourneyDays(payload.callDays),
      allowedStartTime: this.normalizeWorkJourneyClock(
        payload.allowedStartTime,
        "Inicio da faixa da jornada intermitente invalido."
      ),
      allowedEndTime: this.normalizeWorkJourneyClock(
        payload.allowedEndTime,
        "Fim da faixa da jornada intermitente invalido."
      ),
      allowMultipleCallsPerDay: this.toBoolean(payload.allowMultipleCallsPerDay, false),
      remunerationType: this.toEnum(
        payload.remunerationType,
        ["HOUR", "SHIFT", "DAILY"] as const,
        "Tipo de remuneracao da jornada intermitente invalido.",
        "HOUR"
      ) as WorkJourneyIntermittentConfig["remunerationType"],
      remunerationValue: this.toOptionalNumber(
        payload.remunerationValue,
        0,
        999999999,
        "Valor de remuneracao da jornada intermitente invalido."
      ),
      requireCallAcceptance: this.toBoolean(payload.requireCallAcceptance, true),
      requirePriorSchedule: this.toBoolean(payload.requirePriorSchedule, false)
    };
  }

  private normalizeWorkJourneyClock(value: unknown, message: string): string {
    const text = this.normalizeOptionalText(value, 5, message);
    if (!text || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) {
      throw new BadRequestException(message);
    }
    return text;
  }

  private toTimeEntrySummary(item: {
    id: string;
    driverId: string;
    createdByUserId: string | null;
    updatedByUserId: string | null;
    occurredAt: Date;
    kind: string;
    source: string;
    status: string;
    timezone: string | null;
    deviceMeta: Prisma.JsonValue | null;
    geo: Prisma.JsonValue | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TimeEntrySummary {
    const kind = this.toEnum(item.kind, TIME_ENTRY_KIND_VALUES, "Tipo de batida invalido.", "IN") as TimeEntryKind;
    const source = this.toEnum(
      item.source,
      TIME_ENTRY_SOURCE_VALUES,
      "Origem de batida invalida.",
      "APP"
    ) as TimeEntrySource;
    const status = this.toEnum(
      item.status,
      TIME_ENTRY_STATUS_VALUES,
      "Status de batida invalido.",
      "REGISTERED"
    ) as TimeEntryStatus;

    return {
      id: item.id,
      driverId: item.driverId,
      createdByUserId: item.createdByUserId ?? undefined,
      updatedByUserId: item.updatedByUserId ?? undefined,
      occurredAt: item.occurredAt.toISOString(),
      kind,
      source,
      status,
      timezone: item.timezone ?? undefined,
      deviceMeta: this.toRecordOrUndefined(item.deviceMeta),
      geo: this.toRecordOrUndefined(item.geo),
      notes: item.notes ?? undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private async syncTimeEntryIssuesForDriverDate(driverId: string, occurredAt: Date): Promise<void> {
    const dateKey = occurredAt.toISOString().slice(0, 10);
    const { start: dayStart, end: dayEnd } = this.timekeepingService.buildDayRangeUtc(dateKey);
    const rows = await this.prisma.timeEntry.findMany({
      where: {
        driverId,
        status: {
          not: "CANCELLED"
        },
        occurredAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      select: {
        id: true,
        driverId: true,
        occurredAt: true,
        kind: true
      },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
    });
    await this.syncDetectedTimeEntryIssues(rows);
  }

  private async syncDetectedTimeEntryIssues(
    rows: Array<{
      id: string;
      driverId: string;
      occurredAt: Date;
      kind: string;
    }>
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const detected = this.timekeepingService.detectTimeEntryIssues(rows);
    const detectedByGroup = new Map<string, DetectedTimeEntryIssue[]>();
    const touchedGroups = new Set<string>();

    for (const row of rows) {
      const dateKey = row.occurredAt.toISOString().slice(0, 10);
      touchedGroups.add(`${row.driverId}:${dateKey}`);
    }
    for (const issue of detected) {
      const key = `${issue.driverId}:${issue.date}`;
      const list = detectedByGroup.get(key) ?? [];
      list.push(issue);
      detectedByGroup.set(key, list);
    }

    for (const groupKey of touchedGroups) {
      const [driverId, dateKey] = groupKey.split(":");
      const issuesForGroup = detectedByGroup.get(groupKey) ?? [];
      const existing = await this.prisma.timeEntryIssue.findMany({
        where: {
          driverId,
          dateKey
        }
      });
      const activeKeys = new Set(issuesForGroup.map((issue) => issue.externalKey));

      for (const issue of issuesForGroup) {
        await this.prisma.timeEntryIssue.upsert({
          where: {
            externalKey: issue.externalKey
          },
          create: {
            externalKey: issue.externalKey,
            driverId: issue.driverId,
            dateKey: issue.date,
            code: issue.code,
            severity: issue.severity,
            status: "OPEN",
            message: issue.message,
            entryIds: issue.entryIds as unknown as Prisma.InputJsonValue,
            createdAt: new Date(issue.createdAt),
            resolvedAt: null
          },
          update: {
            code: issue.code,
            severity: issue.severity,
            status: "OPEN",
            message: issue.message,
            entryIds: issue.entryIds as unknown as Prisma.InputJsonValue,
            resolvedAt: null
          }
        });
      }

      for (const oldIssue of existing) {
        if (activeKeys.has(oldIssue.externalKey)) {
          continue;
        }
        if (oldIssue.status === "OPEN") {
          await this.prisma.timeEntryIssue.update({
            where: { id: oldIssue.id },
            data: {
              status: "AUTO_RESOLVED",
              resolvedAt: new Date()
            }
          });
        }
      }
    }
  }

  private toTimeEntryIssueSummary(item: {
    id: string;
    externalKey: string;
    driverId: string;
    dateKey: string;
    code: string;
    severity: string;
    status: string;
    message: string;
    entryIds: Prisma.JsonValue;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TimeEntryIssueSummary {
    const code = this.toEnum(
      item.code,
      TIME_ENTRY_ISSUE_CODE_VALUES,
      "Codigo de pendencia de ponto invalido.",
      "INVALID_SEQUENCE"
    );
    const severity = this.toEnum(
      item.severity,
      TIME_ENTRY_ISSUE_SEVERITY_VALUES,
      "Severidade de pendencia de ponto invalida.",
      "WARNING"
    );
    const status = this.toEnum(
      item.status,
      TIME_ENTRY_ISSUE_STATUS_VALUES,
      "Status de pendencia de ponto invalido.",
      "OPEN"
    );
    return {
      id: item.id,
      externalKey: item.externalKey,
      driverId: item.driverId,
      date: item.dateKey,
      code,
      severity,
      status,
      message: item.message,
      entryIds: this.normalizeStringList(item.entryIds, 20),
      resolvedAt: item.resolvedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toTimeAdjustmentSummary(item: {
    id: string;
    driverId: string;
    timeEntryId: string | null;
    requestedByUserId: string | null;
    updatedByUserId: string | null;
    reviewedByUserId: string | null;
    reason: string;
    requestedKind: string | null;
    requestedOccurredAt: Date | null;
    requestedTimezone: string | null;
    requestedGeo: Prisma.JsonValue | null;
    requestedNotes: string | null;
    originalSnapshot: Prisma.JsonValue | null;
    requestedSnapshot: Prisma.JsonValue | null;
    status: string;
    reviewerNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TimeAdjustmentSummary {
    const requestedKind =
      item.requestedKind === null
        ? undefined
        : (this.toEnum(
            item.requestedKind,
            TIME_ENTRY_KIND_VALUES,
            "Tipo de batida solicitado invalido.",
            "IN"
          ) as TimeEntryKind);
    const status = this.toEnum(
      item.status,
      TIME_ADJUSTMENT_STATUS_VALUES,
      "Status do ajuste invalido.",
      "PENDING"
    ) as TimeAdjustmentStatus;

    return {
      id: item.id,
      driverId: item.driverId,
      timeEntryId: item.timeEntryId ?? undefined,
      requestedByUserId: item.requestedByUserId ?? undefined,
      updatedByUserId: item.updatedByUserId ?? undefined,
      reviewedByUserId: item.reviewedByUserId ?? undefined,
      reason: item.reason,
      requestedKind,
      requestedOccurredAt: item.requestedOccurredAt?.toISOString(),
      requestedTimezone: item.requestedTimezone ?? undefined,
      requestedGeo: this.toRecordOrUndefined(item.requestedGeo),
      requestedNotes: item.requestedNotes ?? undefined,
      originalSnapshot: this.toRecordOrUndefined(item.originalSnapshot),
      requestedSnapshot: this.toRecordOrUndefined(item.requestedSnapshot),
      status,
      reviewerNote: item.reviewerNote ?? undefined,
      reviewedAt: item.reviewedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toTimesheetDaySummary(item: {
    id: string;
    driverId: string;
    dateKey: string;
    workProfileTemplateId: string | null;
    journeyTemplateId: string | null;
    expectedMinutes: number;
    workedMinutes: number;
    breakMinutes: number;
    latenessMinutes: number;
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
    hasOpenIssues: boolean;
    openIssueCount: number;
    calculationMeta: Prisma.JsonValue | null;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): TimesheetDaySummary {
    return {
      id: item.id,
      driverId: item.driverId,
      date: item.dateKey,
      workProfileTemplateId: item.workProfileTemplateId ?? undefined,
      journeyTemplateId: item.journeyTemplateId ?? undefined,
      expectedMinutes: item.expectedMinutes,
      workedMinutes: item.workedMinutes,
      breakMinutes: item.breakMinutes,
      latenessMinutes: item.latenessMinutes,
      earlyLeaveMinutes: item.earlyLeaveMinutes,
      overtimeMinutes: item.overtimeMinutes,
      hasOpenIssues: item.hasOpenIssues,
      openIssueCount: item.openIssueCount,
      calculationMeta: this.toRecordOrUndefined(item.calculationMeta),
      calculatedAt: item.calculatedAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toTimesheetPeriodSummary(item: {
    id: string;
    driverId: string;
    periodKey: string;
    expectedMinutes: number;
    workedMinutes: number;
    normalMinutes: number;
    overtimeMinutes: number;
    nightMinutes: number;
    breakMinutes: number;
    latenessMinutes: number;
    earlyLeaveMinutes: number;
    absenceDays: number;
    workedDays: number;
    openIssueDays: number;
    openIssueCount: number;
    status: string;
    closedAt: Date | null;
    reopenedAt: Date | null;
    closedByUserId: string | null;
    reopenedByUserId: string | null;
    lockNote: string | null;
    rulesSnapshot: Prisma.JsonValue | null;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): TimesheetPeriodSummary {
    const status = this.toEnum(
      item.status,
      TIMESHEET_PERIOD_STATUS_VALUES,
      "Status da competencia invalido.",
      "OPEN"
    );
    return {
      id: item.id,
      driverId: item.driverId,
      period: item.periodKey,
      expectedMinutes: item.expectedMinutes,
      workedMinutes: item.workedMinutes,
      normalMinutes: item.normalMinutes,
      overtimeMinutes: item.overtimeMinutes,
      nightMinutes: item.nightMinutes,
      breakMinutes: item.breakMinutes,
      latenessMinutes: item.latenessMinutes,
      earlyLeaveMinutes: item.earlyLeaveMinutes,
      absenceDays: item.absenceDays,
      workedDays: item.workedDays,
      openIssueDays: item.openIssueDays,
      openIssueCount: item.openIssueCount,
      status,
      closedAt: item.closedAt?.toISOString(),
      reopenedAt: item.reopenedAt?.toISOString(),
      closedByUserId: item.closedByUserId ?? undefined,
      reopenedByUserId: item.reopenedByUserId ?? undefined,
      lockNote: item.lockNote ?? undefined,
      rulesSnapshot: this.toRecordOrUndefined(item.rulesSnapshot),
      calculatedAt: item.calculatedAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private normalizePeriodKeyValue(value: unknown, message: string): string {
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }
    const normalized = value.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private resolveDriverTimelineState(
    lastKind: string | undefined
  ): TimekeepingDashboardDriverSummary["state"] {
    if (!lastKind) {
      return "NOT_STARTED";
    }
    if (lastKind === "BREAK_START") {
      return "ON_BREAK";
    }
    if (lastKind === "OUT") {
      return "FINISHED";
    }
    return "IN_JOURNEY";
  }

  private resolveDriverWorkProfileTemplateId(driverContract: Prisma.JsonValue | null): string | undefined {
    const contract = this.toRecordOrUndefined(driverContract);
    if (typeof contract?.workProfileTemplateId !== "string") {
      return undefined;
    }
    const normalized = contract.workProfileTemplateId.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private async resolveNightPolicyForWorkProfile(workProfileTemplateId?: string): Promise<{
    enabled: boolean;
    percent: number;
    startTime: string;
    endTime: string;
  }> {
    if (!workProfileTemplateId) {
      return {
        enabled: false,
        percent: 0,
        startTime: "22:00",
        endTime: "05:00"
      };
    }

    const workProfile = await this.prisma.workProfileTemplate.findUnique({
      where: { id: workProfileTemplateId },
      select: {
        usesNightPolicy: true,
        nightTemplateId: true
      }
    });
    if (!workProfile?.usesNightPolicy || !workProfile.nightTemplateId) {
      return {
        enabled: false,
        percent: 0,
        startTime: "22:00",
        endTime: "05:00"
      };
    }

    const template = await this.prisma.overtimeTemplate.findUnique({
      where: { id: workProfile.nightTemplateId },
      select: { settings: true }
    });
    return this.resolveNightPolicy(template?.settings);
  }

  private resolveWorkProfileHourlyRate(
    remuneration: Prisma.JsonValue | null | undefined,
    expectedMinutes: number
  ): {
    hourlyRate: number;
    remunerationModel: string;
    rateSource: string;
  } {
    const payload = this.toRecordOrUndefined(remuneration ?? null);
    const model =
      payload && typeof payload.model === "string" ? payload.model.trim().toUpperCase() : "FIXED";
    const baseType =
      payload && typeof payload.baseType === "string" ? payload.baseType.trim().toUpperCase() : "HOUR";
    const fixedSalaryRaw =
      payload && typeof payload.fixedSalary === "number" && Number.isFinite(payload.fixedSalary)
        ? payload.fixedSalary
        : 0;
    const fixedSalary = Math.max(0, fixedSalaryRaw);

    if (model === "COMMISSION_ONLY") {
      return {
        hourlyRate: 0,
        remunerationModel: model,
        rateSource: "COMMISSION_ONLY"
      };
    }
    if (baseType === "HOUR") {
      return {
        hourlyRate: fixedSalary,
        remunerationModel: model,
        rateSource: "BASE_HOUR"
      };
    }

    const divisorHours = Math.max(1, (expectedMinutes > 0 ? expectedMinutes : 480) / 60);
    return {
      hourlyRate: fixedSalary / divisorHours,
      remunerationModel: model,
      rateSource: baseType === "DAILY" ? "BASE_DAILY" : "BASE_EVENT"
    };
  }

  private resolveOvertimePercent(settings: Prisma.JsonValue | null | undefined): number {
    const payload = this.toRecordUnknown(settings);
    if (!payload || this.resolveOvertimeTemplatePolicyCategory(payload) !== "OVERTIME") {
      return 50;
    }
    const percentages = this.toRecordUnknown(payload.percentages);
    const overtime50 =
      percentages && typeof percentages.overtime50 === "number" && Number.isFinite(percentages.overtime50)
        ? percentages.overtime50
        : 50;
    return Math.max(0, overtime50);
  }

  private resolveNightPolicy(settings: unknown): {
    enabled: boolean;
    percent: number;
    startTime: string;
    endTime: string;
  } {
    return this.laborPolicyService.resolveNightPolicy(settings);
  }

  private calculateNightMinutesFromEntries(
    entries: Array<{ occurredAt: Date; kind: string }>,
    referenceTime: Date,
    nightStartTime: string,
    nightEndTime: string
  ): number {
    return this.laborPolicyService.calculateNightMinutesFromEntries(
      entries,
      referenceTime,
      nightStartTime,
      nightEndTime,
      { applyReducedNightHour: true }
    ).reducedMinutes;
  }

  private buildTimesheetPeriodCsvExport(input: {
    period: {
      id: string;
      periodKey: string;
      driverId: string;
      status: string;
      expectedMinutes: number;
      workedMinutes: number;
      normalMinutes: number;
      overtimeMinutes: number;
      nightMinutes: number;
      breakMinutes: number;
      latenessMinutes: number;
      earlyLeaveMinutes: number;
      absenceDays: number;
      workedDays: number;
      openIssueDays: number;
      openIssueCount: number;
      closedAt: Date | null;
      reopenedAt: Date | null;
      calculatedAt: Date;
      events: Array<{
        action: string;
        actorUserId: string | null;
        note: string | null;
        createdAt: Date;
      }>;
    };
    days: Array<{
      dateKey: string;
      expectedMinutes: number;
      workedMinutes: number;
      breakMinutes: number;
      latenessMinutes: number;
      earlyLeaveMinutes: number;
      overtimeMinutes: number;
      openIssueCount: number;
    }>;
    entries: Array<{
      occurredAt: Date;
      kind: string;
      source: string;
      status: string;
      timezone: string | null;
      notes: string | null;
    }>;
    adjustments: Array<{
      id: string;
      status: string;
      reason: string;
      timeEntryId: string | null;
      requestedKind: string | null;
      requestedOccurredAt: Date | null;
      reviewerNote: string | null;
      reviewedByUserId: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      timeEntry: {
        occurredAt: Date;
      } | null;
    }>;
    issues: Array<{
      dateKey: string;
      code: string;
      severity: string;
      status: string;
      message: string;
      entryIds: Prisma.JsonValue;
    }>;
    generatedAt: Date;
    driverName: string;
  }): string {
    const lines: string[] = [];
    const addCsvRow = (...columns: Array<string | number | undefined | null>) => {
      lines.push(columns.map((column) => this.escapeCsvValue(column)).join(","));
    };

    addCsvRow("tipo", "valor");
    addCsvRow("competencia_id", input.period.id);
    addCsvRow("competencia", input.period.periodKey);
    addCsvRow("motorista_id", input.period.driverId);
    addCsvRow("motorista_nome", input.driverName);
    addCsvRow("status_competencia", input.period.status);
    addCsvRow("gerado_em", input.generatedAt.toISOString());
    addCsvRow("calculado_em", input.period.calculatedAt.toISOString());
    addCsvRow("fechado_em", input.period.closedAt?.toISOString() ?? "");
    addCsvRow("reaberto_em", input.period.reopenedAt?.toISOString() ?? "");
    lines.push("");

    addCsvRow("totais", "minutos");
    addCsvRow("esperado", input.period.expectedMinutes);
    addCsvRow("trabalhado", input.period.workedMinutes);
    addCsvRow("normal", input.period.normalMinutes);
    addCsvRow("extra", input.period.overtimeMinutes);
    addCsvRow("noturno", input.period.nightMinutes);
    addCsvRow("intervalo", input.period.breakMinutes);
    addCsvRow("atraso", input.period.latenessMinutes);
    addCsvRow("saida_antecipada", input.period.earlyLeaveMinutes);
    addCsvRow("dias_falta", input.period.absenceDays);
    addCsvRow("dias_trabalhados", input.period.workedDays);
    addCsvRow("dias_com_pendencia", input.period.openIssueDays);
    addCsvRow("pendencias_abertas", input.period.openIssueCount);
    lines.push("");

    addCsvRow(
      "dia",
      "esperado_min",
      "trabalhado_min",
      "intervalo_min",
      "atraso_min",
      "saida_antecipada_min",
      "extra_min",
      "pendencias_abertas"
    );
    for (const day of input.days) {
      addCsvRow(
        day.dateKey,
        day.expectedMinutes,
        day.workedMinutes,
        day.breakMinutes,
        day.latenessMinutes,
        day.earlyLeaveMinutes,
        day.overtimeMinutes,
        day.openIssueCount
      );
    }
    lines.push("");

    addCsvRow("batida_em", "tipo", "origem", "status", "timezone", "observacao");
    for (const entry of input.entries) {
      addCsvRow(
        entry.occurredAt.toISOString(),
        entry.kind,
        entry.source,
        entry.status,
        entry.timezone ?? "",
        entry.notes ?? ""
      );
    }
    lines.push("");

    addCsvRow(
      "ajuste_id",
      "status",
      "motivo",
      "batida_id",
      "batida_ocorrida_em",
      "tipo_solicitado",
      "ocorrido_solicitado_em",
      "avaliado_por",
      "avaliado_em",
      "nota_revisor",
      "solicitado_em"
    );
    for (const adjustment of input.adjustments) {
      addCsvRow(
        adjustment.id,
        adjustment.status,
        adjustment.reason,
        adjustment.timeEntryId ?? "",
        adjustment.timeEntry?.occurredAt.toISOString() ?? "",
        adjustment.requestedKind ?? "",
        adjustment.requestedOccurredAt?.toISOString() ?? "",
        adjustment.reviewedByUserId ?? "",
        adjustment.reviewedAt?.toISOString() ?? "",
        adjustment.reviewerNote ?? "",
        adjustment.createdAt.toISOString()
      );
    }
    lines.push("");

    addCsvRow("pendencia_dia", "codigo", "severidade", "status", "mensagem", "batidas_relacionadas");
    for (const issue of input.issues) {
      addCsvRow(
        issue.dateKey,
        issue.code,
        issue.severity,
        issue.status,
        issue.message,
        this.normalizeStringList(issue.entryIds, 20).join("|")
      );
    }
    lines.push("");

    addCsvRow("evento_competencia_em", "acao", "ator_usuario_id", "observacao");
    for (const event of input.period.events) {
      addCsvRow(
        event.createdAt.toISOString(),
        event.action,
        event.actorUserId ?? "",
        event.note ?? ""
      );
    }

    return `\uFEFF${lines.join("\n")}`;
  }

  private buildTimesheetPeriodPdfExport(input: {
    period: {
      id: string;
      periodKey: string;
      driverId: string;
      status: string;
      expectedMinutes: number;
      workedMinutes: number;
      normalMinutes: number;
      overtimeMinutes: number;
      nightMinutes: number;
      breakMinutes: number;
      latenessMinutes: number;
      earlyLeaveMinutes: number;
      absenceDays: number;
      workedDays: number;
      openIssueDays: number;
      openIssueCount: number;
      closedAt: Date | null;
      reopenedAt: Date | null;
      calculatedAt: Date;
      events: Array<{
        action: string;
        actorUserId: string | null;
        note: string | null;
        createdAt: Date;
      }>;
    };
    days: Array<{
      dateKey: string;
      expectedMinutes: number;
      workedMinutes: number;
      breakMinutes: number;
      overtimeMinutes: number;
      openIssueCount: number;
    }>;
    entries: Array<{
      occurredAt: Date;
      kind: string;
      source: string;
      status: string;
    }>;
    adjustments: Array<{
      id: string;
      status: string;
      reason: string;
      requestedKind: string | null;
      requestedOccurredAt: Date | null;
      reviewedAt: Date | null;
    }>;
    issues: Array<{
      dateKey: string;
      code: string;
      severity: string;
      status: string;
      message: string;
    }>;
    generatedAt: Date;
    driverName: string;
  }): Buffer {
    const lines: string[] = [];
    lines.push("Espelho de Ponto - Competencia");
    lines.push(`Competencia: ${input.period.periodKey}`);
    lines.push(`Motorista: ${input.driverName} (${input.period.driverId})`);
    lines.push(`Status: ${input.period.status}`);
    lines.push(`Gerado em: ${input.generatedAt.toISOString()}`);
    lines.push(`Calculado em: ${input.period.calculatedAt.toISOString()}`);
    if (input.period.closedAt) {
      lines.push(`Fechado em: ${input.period.closedAt.toISOString()}`);
    }
    if (input.period.reopenedAt) {
      lines.push(`Reaberto em: ${input.period.reopenedAt.toISOString()}`);
    }
    lines.push("");
    lines.push("Totais da competencia");
    lines.push(`Esperado: ${this.toHourMinuteLabel(input.period.expectedMinutes)}`);
    lines.push(`Trabalhado: ${this.toHourMinuteLabel(input.period.workedMinutes)}`);
    lines.push(`Normal: ${this.toHourMinuteLabel(input.period.normalMinutes)}`);
    lines.push(`Extra: ${this.toHourMinuteLabel(input.period.overtimeMinutes)}`);
    lines.push(`Noturno: ${this.toHourMinuteLabel(input.period.nightMinutes)}`);
    lines.push(`Intervalo: ${this.toHourMinuteLabel(input.period.breakMinutes)}`);
    lines.push(`Atraso: ${this.toHourMinuteLabel(input.period.latenessMinutes)}`);
    lines.push(`Saida antecipada: ${this.toHourMinuteLabel(input.period.earlyLeaveMinutes)}`);
    lines.push(`Dias trabalhados: ${input.period.workedDays}`);
    lines.push(`Dias de falta: ${input.period.absenceDays}`);
    lines.push(`Dias com pendencia: ${input.period.openIssueDays}`);
    lines.push(`Pendencias abertas: ${input.period.openIssueCount}`);
    lines.push("");
    lines.push("Dias");
    for (const day of input.days) {
      lines.push(
        `${day.dateKey} | prev ${this.toHourMinuteLabel(day.expectedMinutes)} | trab ${this.toHourMinuteLabel(day.workedMinutes)} | intervalo ${this.toHourMinuteLabel(day.breakMinutes)} | extra ${this.toHourMinuteLabel(day.overtimeMinutes)} | pend ${day.openIssueCount}`
      );
    }
    lines.push("");
    lines.push("Batidas");
    for (const entry of input.entries) {
      lines.push(
        `${entry.occurredAt.toISOString()} | ${entry.kind} | ${entry.source} | ${entry.status}`
      );
    }
    lines.push("");
    lines.push("Ajustes");
    for (const adjustment of input.adjustments) {
      lines.push(
        `${adjustment.id} | ${adjustment.status} | ${adjustment.requestedKind ?? "-"} | ${adjustment.requestedOccurredAt?.toISOString() ?? "-"} | revisado ${adjustment.reviewedAt?.toISOString() ?? "-"}`
      );
      lines.push(`Motivo: ${adjustment.reason}`);
    }
    lines.push("");
    lines.push("Pendencias");
    for (const issue of input.issues) {
      lines.push(
        `${issue.dateKey} | ${issue.code} | ${issue.severity} | ${issue.status} | ${issue.message}`
      );
    }
    lines.push("");
    lines.push("Eventos de competencia");
    for (const event of input.period.events) {
      lines.push(
        `${event.createdAt.toISOString()} | ${event.action} | ${event.actorUserId ?? "-"} | ${event.note ?? "-"}`
      );
    }

    return this.buildSimplePdfFromLines(lines);
  }

  private buildSimplePdfFromLines(lines: string[]): Buffer {
    const maxLineLength = 150;
    const normalizedLines = lines.flatMap((line) => this.wrapTextLine(line, maxLineLength));
    const lineHeight = 14;
    const marginX = 40;
    const marginTop = 40;
    const pageHeight = 792;
    const usableHeight = pageHeight - marginTop * 2;
    const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight));
    const pages: string[][] = [];
    for (let index = 0; index < normalizedLines.length; index += linesPerPage) {
      pages.push(normalizedLines.slice(index, index + linesPerPage));
    }
    if (pages.length === 0) {
      pages.push(["Relatorio vazio."]);
    }

    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

    const pageIds: number[] = [];
    const contentIds: number[] = [];
    const fontObjectId = 3;

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const pageObjectId = 4 + pageIndex * 2;
      const contentObjectId = 5 + pageIndex * 2;
      pageIds.push(pageObjectId);
      contentIds.push(contentObjectId);

      const pageLines = pages[pageIndex];
      const textLines = [
        "BT",
        "/F1 10 Tf",
        `${lineHeight} TL`,
        `${marginX} ${pageHeight - marginTop} Td`
      ];
      for (let index = 0; index < pageLines.length; index += 1) {
        const escaped = this.escapePdfText(pageLines[index]);
        if (index === 0) {
          textLines.push(`(${escaped}) Tj`);
        } else {
          textLines.push("T*");
          textLines.push(`(${escaped}) Tj`);
        }
      }
      textLines.push("ET");
      const stream = textLines.join("\n");

      objects[contentObjectId] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
      objects[pageObjectId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    }

    objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
    objects[fontObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

    const orderedIds = Object.keys(objects)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value))
      .sort((left, right) => left - right);

    const chunks: string[] = ["%PDF-1.4\n"];
    const offsets: number[] = [0];
    for (const objectId of orderedIds) {
      offsets[objectId] = Buffer.byteLength(chunks.join(""), "utf8");
      chunks.push(`${objectId} 0 obj\n${objects[objectId]}\nendobj\n`);
    }

    const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
    const size = Math.max(...orderedIds) + 1;
    const xrefLines = ["xref", `0 ${size}`, "0000000000 65535 f "];
    for (let objectId = 1; objectId < size; objectId += 1) {
      const offset = offsets[objectId] ?? 0;
      xrefLines.push(`${String(offset).padStart(10, "0")} 00000 n `);
    }
    chunks.push(`${xrefLines.join("\n")}\n`);
    chunks.push("trailer\n");
    chunks.push(`<< /Size ${size} /Root 1 0 R >>\n`);
    chunks.push("startxref\n");
    chunks.push(`${xrefOffset}\n`);
    chunks.push("%%EOF");

    return Buffer.from(chunks.join(""), "utf8");
  }

  private wrapTextLine(value: string, limit: number): string[] {
    if (value.length <= limit) {
      return [value];
    }
    const parts: string[] = [];
    let remaining = value;
    while (remaining.length > limit) {
      let split = remaining.lastIndexOf(" ", limit);
      if (split <= 0) split = limit;
      parts.push(remaining.slice(0, split).trimEnd());
      remaining = remaining.slice(split).trimStart();
    }
    if (remaining.length > 0) {
      parts.push(remaining);
    }
    return parts;
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  private escapeCsvValue(value: string | number | undefined | null): string {
    const text = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  }

  private toHourMinuteLabel(minutes: number): string {
    const safe = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
    const hours = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${String(hours).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  private toSafeFileToken(value: string): string {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
    return normalized || "motorista";
  }

  private aggregateTimesheetPeriodRows(
    rows: Array<{
      expectedMinutes: number;
      workedMinutes: number;
      breakMinutes: number;
      latenessMinutes: number;
      earlyLeaveMinutes: number;
      overtimeMinutes: number;
      hasOpenIssues: boolean;
      openIssueCount: number;
      calculationMeta: Prisma.JsonValue | null;
      dateKey: string;
      workProfileTemplateId: string | null;
      journeyTemplateId: string | null;
    }>
  ): {
    expectedMinutes: number;
    workedMinutes: number;
    normalMinutes: number;
    overtimeMinutes: number;
    nightMinutes: number;
    breakMinutes: number;
    latenessMinutes: number;
    earlyLeaveMinutes: number;
    absenceDays: number;
    workedDays: number;
    openIssueDays: number;
    openIssueCount: number;
    rulesSnapshot: Record<string, unknown>;
  } {
    let expectedMinutes = 0;
    let workedMinutes = 0;
    let normalMinutes = 0;
    let overtimeMinutes = 0;
    let nightMinutes = 0;
    let breakMinutes = 0;
    let latenessMinutes = 0;
    let earlyLeaveMinutes = 0;
    let absenceDays = 0;
    let workedDays = 0;
    let openIssueDays = 0;
    let openIssueCount = 0;

    const workProfiles = new Set<string>();
    const journeys = new Set<string>();
    const toleranceSources = new Set<string>();

    for (const row of rows) {
      expectedMinutes += Math.max(0, row.expectedMinutes);
      workedMinutes += Math.max(0, row.workedMinutes);
      normalMinutes += Math.max(0, Math.min(row.expectedMinutes, row.workedMinutes));
      overtimeMinutes += Math.max(0, row.overtimeMinutes);
      breakMinutes += Math.max(0, row.breakMinutes);
      latenessMinutes += Math.max(0, row.latenessMinutes);
      earlyLeaveMinutes += Math.max(0, row.earlyLeaveMinutes);
      openIssueCount += Math.max(0, row.openIssueCount);

      if (row.expectedMinutes > 0 && row.workedMinutes === 0) {
        absenceDays += 1;
      }
      if (row.workedMinutes > 0) {
        workedDays += 1;
      }
      if (row.hasOpenIssues) {
        openIssueDays += 1;
      }

      if (row.workProfileTemplateId) {
        workProfiles.add(row.workProfileTemplateId);
      }
      if (row.journeyTemplateId) {
        journeys.add(row.journeyTemplateId);
      }
      const meta = this.toRecordOrUndefined(row.calculationMeta);
      const toleranceSource = typeof meta?.toleranceSource === "string" ? meta.toleranceSource : undefined;
      if (toleranceSource) {
        toleranceSources.add(toleranceSource);
      }
      const nightlyMinutes = typeof meta?.nightMinutes === "number" ? Math.max(0, Math.round(meta.nightMinutes)) : 0;
      nightMinutes += nightlyMinutes;
    }

    return {
      expectedMinutes,
      workedMinutes,
      normalMinutes,
      overtimeMinutes,
      nightMinutes,
      breakMinutes,
      latenessMinutes,
      earlyLeaveMinutes,
      absenceDays,
      workedDays,
      openIssueDays,
      openIssueCount,
      rulesSnapshot: {
        version: "v1",
        sources: {
          timesheetDay: true
        },
        workProfileTemplateIds: [...workProfiles],
        journeyTemplateIds: [...journeys],
        toleranceSources: [...toleranceSources],
        calculatedDays: rows.length
      }
    };
  }

  private diffMinutes(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  private calculateWorkedAndBreakMinutes(
    entries: Array<{ occurredAt: Date; kind: string }>
  ): { workedMinutes: number; breakMinutes: number } {
    return this.laborPolicyService.calculateWorkedAndBreakMinutes(entries);
  }

  private calculateLiveWorkedAndBreakMinutes(
    entries: Array<{ occurredAt: Date; kind: string }>,
    now: Date
  ): { workedMinutes: number; breakMinutes: number } {
    return this.laborPolicyService.calculateLiveWorkedAndBreakMinutes(entries, now);
  }

  private async resolveExpectedJourneyForDate(
    driverContract: Prisma.JsonValue | null,
    dateKey: string
  ): Promise<{
    workProfileTemplateId?: string;
    journeyTemplateId?: string;
    expectedMinutes: number;
    isWorkday: boolean;
    expectedStartAt?: Date;
    expectedEndAt?: Date;
    toleranceMarkingMinutes: number;
    toleranceDailyMaxMinutes: number;
    meta: Record<string, unknown>;
  }> {
    const companyProfile = await this.ensureDefaultCompanyProfile();
    const companyToleranceMarkingMinutes = this.toInteger(
      companyProfile.toleranceMarkingMinutes,
      5,
      0,
      180,
      "Tolerancia de marcacao da empresa invalida."
    );
    const companyToleranceDailyMaxMinutes = this.toInteger(
      companyProfile.toleranceDailyMaxMinutes,
      10,
      0,
      600,
      "Tolerancia diaria maxima da empresa invalida."
    );
    const workProfileTemplateId = this.timekeepingService.resolveWorkProfileTemplateIdFromContract(driverContract);

    const workProfile = workProfileTemplateId
      ? await this.prisma.workProfileTemplate.findUnique({
          where: { id: workProfileTemplateId },
          select: {
            journeyTemplateId: true,
            toleranceMarkingMinutes: true,
            toleranceDailyMaxMinutes: true
          }
        })
      : null;
    const journeyTemplateId = workProfile?.journeyTemplateId ?? undefined;

    const journey = journeyTemplateId
      ? await this.prisma.workJourneyTemplate.findUnique({
          where: { id: journeyTemplateId },
          select: {
            id: true,
            type: true,
            allowedDays: true,
            fixedConfig: true,
            createdAt: true
          }
        })
      : null;
    const fixedConfig =
      journey?.type === "FIXED"
        ? this.normalizeWorkJourneyFixedConfig(journey.fixedConfig ?? {}, this.normalizeWorkJourneyDays(journey.allowedDays))
        : undefined;

    return this.timekeepingService.resolveExpectedJourneyFromTemplates({
      dateKey,
      companyToleranceMarkingMinutes,
      companyToleranceDailyMaxMinutes,
      workProfileTemplateId,
      workProfileToleranceMarkingMinutes: workProfile?.toleranceMarkingMinutes,
      workProfileToleranceDailyMaxMinutes: workProfile?.toleranceDailyMaxMinutes,
      journeyTemplateId,
      journeyType: journey?.type,
      journeyCreatedAt: journey?.createdAt,
      fixedConfig
    });
  }

  private toWorkJourneySummary(item: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    type: string;
    allowedDays: Prisma.JsonValue;
    breakType: string;
    breakDurationMinutes: number | null;
    maxHoursPerDay: Prisma.Decimal;
    notes: string | null;
    fixedConfig: Prisma.JsonValue | null;
    flexibleConfig: Prisma.JsonValue | null;
    intermittentConfig: Prisma.JsonValue | null;
    dsrEnabled: boolean;
    dsrWeeklyRestDay: DsrWeeklyRestDay | null;
    dsrReflectOvertime: boolean;
    dsrReflectNight: boolean;
    dsrLoseOnUnjustifiedAbsence: boolean;
    dsrDescription: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): WorkJourneySummary {
    const type = this.toEnum(
      item.type,
      WORK_JOURNEY_TYPE_VALUES,
      "Tipo da jornada invalido.",
      "FIXED"
    ) as WorkJourneyType;
    const breakType = this.toEnum(
      item.breakType,
      WORK_JOURNEY_BREAK_TYPE_VALUES,
      "Tipo de intervalo da jornada invalido.",
      "FIXED"
    ) as WorkJourneyBreakType;

    let fixedConfig: WorkJourneyFixedConfig | undefined;
    let flexibleConfig: WorkJourneyFlexibleConfig | undefined;
    let intermittentConfig: WorkJourneyIntermittentConfig | undefined;

    try {
      if (type === "FIXED" && item.fixedConfig) {
        fixedConfig = this.normalizeWorkJourneyFixedConfig(item.fixedConfig, this.normalizeWorkJourneyDays(item.allowedDays));
      }
      if (type === "FLEXIBLE" && item.flexibleConfig) {
        flexibleConfig = this.normalizeWorkJourneyFlexibleConfig(
          item.flexibleConfig,
          this.normalizeWorkJourneyDays(item.allowedDays),
          breakType,
          item.breakDurationMinutes ?? undefined
        );
      }
      if (type === "INTERMITTENT" && item.intermittentConfig) {
        intermittentConfig = this.normalizeWorkJourneyIntermittentConfig(
          item.intermittentConfig,
          this.normalizeWorkJourneyDays(item.allowedDays)
        );
      }
    } catch {
      fixedConfig = undefined;
      flexibleConfig = undefined;
      intermittentConfig = undefined;
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      isActive: item.isActive,
      type,
      allowedDays: this.normalizeWorkJourneyDays(item.allowedDays),
      breakType,
      breakDurationMinutes: item.breakDurationMinutes ?? undefined,
      maxHoursPerDay: Number(item.maxHoursPerDay),
      notes: item.notes ?? undefined,
      dsrPolicy: this.toWorkJourneyDsrPolicySnapshot({
        enabled: item.dsrEnabled,
        fixedConfig: item.fixedConfig,
        weeklyRestDay: item.dsrWeeklyRestDay,
        reflectOvertime: item.dsrReflectOvertime,
        reflectNight: item.dsrReflectNight,
        loseOnUnjustifiedAbsence: item.dsrLoseOnUnjustifiedAbsence,
        description: item.dsrDescription
      }),
      fixedConfig,
      flexibleConfig,
      intermittentConfig,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private toWorkJourneyDsrPolicySnapshot(item: {
    enabled: boolean;
    description: string | null;
    fixedConfig: Prisma.JsonValue | null;
    weeklyRestDay: DsrWeeklyRestDay | null;
    reflectOvertime: boolean;
    reflectNight: boolean;
    loseOnUnjustifiedAbsence: boolean;
  }): WorkJourneyDsrPolicySnapshot | undefined {
    if (!item.enabled) {
      return undefined;
    }
    let fixedConfig: WorkJourneyFixedConfig | undefined;
    try {
      if (item.fixedConfig) {
        fixedConfig = this.normalizeWorkJourneyFixedConfig(item.fixedConfig, [
          "MON",
          "TUE",
          "WED",
          "THU",
          "FRI"
        ]);
      }
    } catch {
      fixedConfig = undefined;
    }
    const isCycleRest = !item.weeklyRestDay && fixedConfig?.scaleType === "TWELVE_THIRTY_SIX";
    if (!isCycleRest && !item.weeklyRestDay) {
      return undefined;
    }
    return this.buildJourneyDsrSettings({
      enabled: true,
      restMode: isCycleRest ? "CYCLE" : "WEEKDAY",
      weeklyRestDay: item.weeklyRestDay ?? undefined,
      cycleWorkDays: isCycleRest ? fixedConfig?.cycleWorkDays : undefined,
      cycleOffDays: isCycleRest ? fixedConfig?.cycleOffDays : undefined,
      reflectOvertime: item.reflectOvertime,
      reflectNight: item.reflectNight,
      loseOnUnjustifiedAbsence: item.loseOnUnjustifiedAbsence,
      description: item.description ?? undefined
    });
  }

  private toRecordOrUndefined(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private toRecordUnknown(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private buildDsrSummaryText(input: {
    description?: string;
    restMode: "WEEKDAY" | "CYCLE";
    weeklyRestDay?: DsrWeeklyRestDay;
    cycleWorkDays?: number;
    cycleOffDays?: number;
    reflectOvertime: boolean;
    reflectNight: boolean;
    loseOnUnjustifiedAbsence: boolean;
  }): string {
    const detail = [
      input.restMode === "CYCLE"
        ? `Descanso em ciclo ${input.cycleWorkDays ?? 1}x${input.cycleOffDays ?? 1}`
        : `Descanso ${this.resolveDsrWeeklyRestDayLabel(input.weeklyRestDay ?? "SUN")}`,
      `Reflete HE: ${input.reflectOvertime ? "sim" : "nao"}`,
      `Reflete noturno: ${input.reflectNight ? "sim" : "nao"}`,
      input.loseOnUnjustifiedAbsence ? "Perde por falta injustificada" : undefined
    ]
      .filter((item): item is string => Boolean(item))
      .join(" | ");

    return [detail, input.description?.trim() || undefined]
      .filter((item): item is string => Boolean(item))
      .join(" | ");
  }

  private buildJourneyDsrSettings(input: {
    enabled: boolean;
    restMode: "WEEKDAY" | "CYCLE";
    weeklyRestDay?: DsrWeeklyRestDay;
    cycleWorkDays?: number;
    cycleOffDays?: number;
    reflectOvertime: boolean;
    reflectNight: boolean;
    loseOnUnjustifiedAbsence: boolean;
    description?: string;
  }): WorkJourneyDsrPolicySnapshot {
    return {
      enabled: input.enabled,
      restMode: input.restMode,
      description: input.description?.trim() || undefined,
      weeklyRestDay: input.restMode === "WEEKDAY" ? input.weeklyRestDay : undefined,
      cycleWorkDays: input.restMode === "CYCLE" ? input.cycleWorkDays ?? 1 : undefined,
      cycleOffDays: input.restMode === "CYCLE" ? input.cycleOffDays ?? 1 : undefined,
      reflectOvertime: input.reflectOvertime,
      reflectNight: input.reflectNight,
      loseOnUnjustifiedAbsence: input.loseOnUnjustifiedAbsence,
      summary: this.buildDsrSummaryText({
        description: input.description,
        restMode: input.restMode,
        weeklyRestDay: input.weeklyRestDay,
        cycleWorkDays: input.cycleWorkDays,
        cycleOffDays: input.cycleOffDays,
        reflectOvertime: input.reflectOvertime,
        reflectNight: input.reflectNight,
        loseOnUnjustifiedAbsence: input.loseOnUnjustifiedAbsence
      })
    };
  }

  private toBenefitPayload(template: {
    name: string;
    description: string | null;
    isActive: boolean;
    type: BenefitType;
    frequency: BenefitFrequency;
    applicationMode: BenefitApplicationMode;
    valueConfig: Prisma.JsonValue;
    deductFromSalary: boolean;
    incursCharges: boolean;
    isMandatory: boolean;
    editableInContract: boolean;
    workProfiles: Prisma.JsonValue | null;
    contractProfiles: Prisma.JsonValue | null;
  }) {
    return this.normalizeBenefitPayload({
      name: template.name,
      description: template.description ?? undefined,
      isActive: template.isActive,
      type: template.type,
      frequency: template.frequency,
      applicationMode: template.applicationMode,
      valueConfig: template.valueConfig,
      deductFromSalary: template.deductFromSalary,
      incursCharges: template.incursCharges,
      isMandatory: template.isMandatory,
      editableInContract: template.editableInContract,
      workProfiles: template.workProfiles,
      contractProfiles: template.contractProfiles
    });
  }

  private toBenefitSummary(template: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    type: BenefitType;
    frequency: BenefitFrequency;
    applicationMode: BenefitApplicationMode;
    valueConfig: Prisma.JsonValue;
    deductFromSalary: boolean;
    incursCharges: boolean;
    isMandatory: boolean;
    editableInContract: boolean;
    workProfiles: Prisma.JsonValue | null;
    contractProfiles: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): BenefitSummary {
    const payload = this.toBenefitPayload(template);
    const summary = this.buildBenefitSummary(payload);

    return {
      id: template.id,
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive,
      type: payload.type,
      valueConfig: payload.valueConfig,
      frequency: payload.frequency,
      applicationMode: payload.applicationMode,
      deductFromSalary: payload.deductFromSalary,
      incursCharges: payload.incursCharges,
      isMandatory: payload.isMandatory,
      editableInContract: payload.editableInContract,
      workProfiles: payload.workProfiles,
      contractProfiles: payload.contractProfiles,
      summary,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    };
  }

  private normalizeBenefitPayload(input: {
    name: string;
    description?: string;
    isActive?: boolean;
    type: BenefitType;
    frequency: BenefitFrequency;
    applicationMode: BenefitApplicationMode;
    valueConfig: unknown;
    deductFromSalary?: boolean;
    incursCharges?: boolean;
    isMandatory?: boolean;
    editableInContract?: boolean;
    workProfiles?: unknown;
    contractProfiles?: unknown;
  }) {
    const name = input.name.trim();
    if (name.length < 3) {
      throw new BadRequestException("Nome do beneficio deve ter ao menos 3 caracteres.");
    }

    const description = this.normalizeOptionalText(
      input.description,
      600,
      "Descricao do beneficio invalida."
    );
    const type = this.toEnum(
      input.type,
      ["FIXED", "PERCENTAGE", "VARIABLE", "INFORMATIVE"] as const,
      "Tipo de beneficio invalido.",
      "FIXED"
    );
    const frequency = this.toEnum(
      input.frequency,
      ["MONTHLY", "DAILY", "PER_USE", "PER_TRIP", "ONE_TIME"] as const,
      "Frequencia de aplicacao invalida.",
      "MONTHLY"
    );
    const applicationMode = this.toEnum(
      input.applicationMode,
      ["PER_EMPLOYEE", "PER_DAY_WORKED", "PER_TRIP"] as const,
      "Forma de aplicacao invalida.",
      "PER_EMPLOYEE"
    );
    const valueConfig = this.normalizeBenefitValueConfig(type, input.valueConfig, description);
    const deductFromSalary = this.toBoolean(input.deductFromSalary, false);
    const incursCharges = this.toBoolean(input.incursCharges, false);
    const isMandatory = this.toBoolean(input.isMandatory, false);
    const editableInContract = this.toBoolean(input.editableInContract, true);
    const workProfiles = this.normalizeStringList(input.workProfiles, 30);
    const contractProfiles = this.normalizeBenefitContractProfiles(input.contractProfiles);

    this.validateBenefitConflicts({
      type,
      frequency,
      applicationMode,
      deductFromSalary,
      incursCharges
    });

    return {
      name,
      description,
      isActive: this.toBoolean(input.isActive, true),
      type,
      frequency,
      applicationMode,
      valueConfig,
      deductFromSalary,
      incursCharges,
      isMandatory,
      editableInContract,
      workProfiles,
      contractProfiles
    };
  }

  private normalizeBenefitContractProfiles(value: unknown): BenefitContractProfile[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const aliasMap: Record<string, BenefitContractProfile> = {
      CLT: "CLT",
      INTERMITENTE: "CLT_INTERMITENTE",
      CLT_INTERMITENTE: "CLT_INTERMITENTE",
      MEI: "MEI",
      PJ: "PJ",
      AUTONOMO: "AUTONOMO",
      "AUTÔNOMO": "AUTONOMO"
    };

    const rawNormalized = value
      .map((item) => {
        if (typeof item !== "string") {
          return "";
        }
        return (
          aliasMap[
            item
              .trim()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toUpperCase()
          ] ?? ""
        );
      })
      .filter((item) => item.length > 0);

    const hasInvalid = value.some((item) => {
      if (typeof item !== "string") {
        return false;
      }
      const normalizedItem = item
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
      return normalizedItem.length > 0 && aliasMap[normalizedItem] === undefined;
    });

    if (hasInvalid) {
      throw new BadRequestException(
        "Perfis de contrato invalidos. Valores permitidos: CLT, CLT_INTERMITENTE, MEI, PJ, AUTONOMO."
      );
    }

    return [...new Set(
      rawNormalized
        .filter((item): item is BenefitContractProfile =>
          BENEFIT_CONTRACT_PROFILE_VALUES.includes(item as BenefitContractProfile)
        )
        .slice(0, 20)
    )];
  }

  private normalizeBenefitValueConfig(
    type: BenefitType,
    value: unknown,
    fallbackDescription?: string
  ): BenefitValueConfig {
    const config = this.toRecord(value, "Configuracao de valor do beneficio invalida.");
    const hasAnyDiscountValue =
      config.discountMode !== undefined ||
      config.discountValue !== undefined ||
      config.discountBase !== undefined ||
      config.discountLimit !== undefined;

    let discountMode: BenefitDiscountMode | undefined;
    let discountValue: number | undefined;
    let discountBase: BenefitDiscountBase | undefined;
    let discountLimit: number | undefined;

    if (hasAnyDiscountValue) {
      discountMode = this.toEnum(
        config.discountMode,
        ["AMOUNT", "PERCENT"] as const,
        "Tipo de desconto invalido.",
        "AMOUNT"
      ) as BenefitDiscountMode;
      discountValue = this.toNumber(
        config.discountValue,
        -1,
        0,
        999999999,
        "Valor de desconto invalido."
      );
      if (discountValue <= 0) {
        throw new BadRequestException("Valor de desconto deve ser maior que zero.");
      }
      if (discountMode === "PERCENT" && discountValue > 100) {
        throw new BadRequestException("Percentual de desconto invalido.");
      }
      discountBase = this.toEnum(
        config.discountBase,
        ["SALARY", "BENEFIT"] as const,
        "Base de desconto invalida.",
        "SALARY"
      ) as BenefitDiscountBase;
      discountLimit = this.toOptionalNumber(
        config.discountLimit,
        0,
        999999999,
        "Limite de desconto invalido."
      );
      if (discountLimit !== undefined && discountLimit <= 0) {
        throw new BadRequestException("Limite de desconto deve ser maior que zero.");
      }
    }

    const appendDiscountConfig = (base: BenefitValueConfig): BenefitValueConfig => ({
      ...base,
      discountMode,
      discountValue,
      discountBase,
      discountLimit
    });

    if (type === "FIXED") {
      const fixedAmount = this.toNumber(
        config.fixedAmount,
        -1,
        0,
        999999999,
        "Valor fixo invalido para o beneficio."
      );
      if (fixedAmount <= 0) {
        throw new BadRequestException("Valor fixo deve ser maior que zero.");
      }
      return appendDiscountConfig({
        fixedAmount
      });
    }

    if (type === "PERCENTAGE") {
      const percentageValue = this.toNumber(
        config.percentageValue,
        -1,
        0,
        1000,
        "Percentual invalido para o beneficio."
      );
      if (percentageValue <= 0) {
        throw new BadRequestException("Percentual deve ser maior que zero.");
      }
      if (typeof config.percentageBase !== "string") {
        throw new BadRequestException("Base de calculo do percentual e obrigatoria.");
      }
      const percentageBase = this.toEnum(
        config.percentageBase,
        ["SALARY", "REVENUE", "OTHER"] as const,
        "Base de calculo do percentual invalida.",
        "SALARY"
      ) as BenefitPercentageBase;
      const percentageBaseOther = this.normalizeOptionalText(
        config.percentageBaseOther,
        120,
        "Base de calculo personalizada invalida."
      );

      if (percentageBase === "OTHER" && !percentageBaseOther) {
        throw new BadRequestException("Informe a base de calculo quando selecionar a opcao outro.");
      }

      return appendDiscountConfig({
        percentageValue,
        percentageBase,
        percentageBaseOther: percentageBase === "OTHER" ? percentageBaseOther : undefined
      });
    }

    if (type === "VARIABLE") {
      const fixedAmount = this.toOptionalNumber(
        config.fixedAmount,
        0,
        999999999,
        "Valor variavel invalido para o beneficio."
      );
      const variableRuleDescription = this.normalizeOptionalText(
        config.variableRuleDescription,
        1200,
        "Descricao da regra variavel invalida."
      );
      if (variableRuleDescription && variableRuleDescription.length < 5) {
        throw new BadRequestException("Descricao da regra variavel deve ter ao menos 5 caracteres.");
      }
      return appendDiscountConfig({
        fixedAmount,
        variableRuleDescription
      });
    }

    const informativeDescription =
      this.normalizeOptionalText(
        config.informativeDescription,
        1200,
        "Descricao informativa do beneficio invalida."
      ) ?? fallbackDescription;
    if (!informativeDescription || informativeDescription.length < 3) {
      throw new BadRequestException("Beneficio informativo exige uma descricao.");
    }

    return appendDiscountConfig({
      informativeDescription
    });
  }

  private validateBenefitConflicts(params: {
    type: BenefitType;
    frequency: BenefitFrequency;
    applicationMode: BenefitApplicationMode;
    deductFromSalary: boolean;
    incursCharges: boolean;
  }): void {
    if (
      params.applicationMode === "PER_TRIP" &&
      params.frequency !== "PER_TRIP" &&
      params.frequency !== "PER_USE"
    ) {
      throw new BadRequestException(
        "Forma por viagem exige frequencia por viagem ou por uso."
      );
    }

    if (params.applicationMode !== "PER_TRIP" && params.frequency === "PER_TRIP") {
      throw new BadRequestException(
        "Frequencia por viagem exige forma de aplicacao por viagem."
      );
    }

    if (params.type === "INFORMATIVE" && (params.deductFromSalary || params.incursCharges)) {
      throw new BadRequestException(
        "Beneficio informativo nao pode descontar salario nem incidir encargos."
      );
    }
  }

  private normalizeStringList(value: unknown, maxItems: number): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
          .slice(0, maxItems)
      )
    ];
  }

  private normalizeOptionalText(value: unknown, maxLength: number, message: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "string") {
      throw new BadRequestException(message);
    }
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    if (normalized.length > maxLength) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private buildBenefitSummary(payload: {
    type: BenefitType;
    valueConfig: BenefitValueConfig;
    frequency: BenefitFrequency;
    applicationMode: BenefitApplicationMode;
    deductFromSalary: boolean;
    incursCharges: boolean;
    isMandatory: boolean;
    editableInContract: boolean;
  }): string {
    const parts: string[] = [];

    if (payload.type === "FIXED" && payload.valueConfig.fixedAmount !== undefined) {
      parts.push(`Valor fixo de ${this.formatCurrency(payload.valueConfig.fixedAmount)}`);
    } else if (
      payload.type === "PERCENTAGE" &&
      payload.valueConfig.percentageValue !== undefined
    ) {
      const baseLabel = this.resolvePercentageBaseLabel(
        payload.valueConfig.percentageBase,
        payload.valueConfig.percentageBaseOther
      );
      parts.push(`Percentual de ${payload.valueConfig.percentageValue}% sobre ${baseLabel}`);
    } else if (
      payload.type === "VARIABLE" &&
      payload.valueConfig.fixedAmount !== undefined
    ) {
      parts.push(`Valor variavel de ${this.formatCurrency(payload.valueConfig.fixedAmount)}`);
    } else if (
      payload.type === "VARIABLE" &&
      payload.valueConfig.variableRuleDescription?.trim()
    ) {
      parts.push(`Regra variavel: ${payload.valueConfig.variableRuleDescription.trim()}`);
    } else if (
      payload.type === "INFORMATIVE" &&
      payload.valueConfig.informativeDescription?.trim()
    ) {
      parts.push(`Informativo: ${payload.valueConfig.informativeDescription.trim()}`);
    }

    parts.push(`Frequencia ${this.resolveBenefitFrequencyLabel(payload.frequency).toLowerCase()}`);
    parts.push(
      `Aplicar por ${this.resolveBenefitApplicationModeLabel(payload.applicationMode).toLowerCase()}`
    );

    if (
      payload.deductFromSalary &&
      payload.valueConfig.discountMode &&
      payload.valueConfig.discountValue !== undefined
    ) {
      const modeLabel = payload.valueConfig.discountMode === "PERCENT" ? "percentual" : "valor";
      const baseLabel = this.resolveDiscountBaseLabel(payload.valueConfig.discountBase);
      const valueLabel =
        payload.valueConfig.discountMode === "PERCENT"
          ? `${payload.valueConfig.discountValue}%`
          : this.formatCurrency(payload.valueConfig.discountValue);
      const limitLabel =
        payload.valueConfig.discountLimit !== undefined
          ? ` com limite ${this.formatCurrency(payload.valueConfig.discountLimit)}`
          : "";
      parts.push(
        `Desconto em folha por ${modeLabel} de ${valueLabel} (${baseLabel})${limitLabel}`
      );
    }

    if (payload.deductFromSalary) {
      parts.push("Desconta do salario");
    }
    if (payload.incursCharges) {
      parts.push("Considera encargos na folha");
    }
    if (payload.isMandatory) {
      parts.push("Obrigatorio");
    }
    if (!payload.editableInContract) {
      parts.push("Nao editavel no contrato");
    }

    return parts.length > 0 ? `${parts.join(" | ")}.` : "Beneficio sem resumo configurado.";
  }

  private resolveBenefitFrequencyLabel(value: BenefitFrequency): string {
    if (value === "DAILY") return "Diaria";
    if (value === "PER_USE") return "Por uso";
    if (value === "PER_TRIP") return "Por viagem";
    if (value === "ONE_TIME") return "Unica";
    return "Mensal";
  }

  private resolveBenefitApplicationModeLabel(value: BenefitApplicationMode): string {
    if (value === "PER_DAY_WORKED") return "Por dia trabalhado";
    if (value === "PER_TRIP") return "Por viagem realizada";
    return "Por colaborador";
  }

  private resolvePercentageBaseLabel(
    value: BenefitPercentageBase | undefined,
    otherValue: string | undefined
  ): string {
    if (value === "SALARY") return "salario";
    if (value === "REVENUE") return "faturamento";
    if (value === "OTHER") return otherValue?.trim() || "base personalizada";
    return "salario";
  }

  private resolveDiscountBaseLabel(value: BenefitDiscountBase | undefined): string {
    if (value === "BENEFIT") return "sobre beneficio";
    return "sobre salario";
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  }

  private toCargoSummary(cargo: {
    id: string;
    name: string;
    description: string | null;
    department: string;
    level: string;
    levels: Prisma.JsonValue;
    cboCode: string | null;
    cboTitle: string | null;
    unhealthyAllowance: string;
    hazardousAllowance: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CargoSummary {
    const levels = this.normalizeCargoLevels(cargo.levels, cargo.level);
    const cboCode = this.normalizeOptionalText(cargo.cboCode, 40, "Codigo CBO invalido.");
    const cboTitle = this.normalizeOptionalText(cargo.cboTitle, 220, "Titulo CBO invalido.");

    return {
      id: cargo.id,
      name: cargo.name,
      description: cargo.description ?? undefined,
      department: this.normalizeCargoDepartment(cargo.department),
      level: this.normalizeCargoCategoryLevel(cargo.level),
      levels,
      cbo:
        cboCode && cboTitle
          ? {
              codigo: cboCode,
              titulo: cboTitle
            }
          : undefined,
      unhealthyAllowance: this.normalizeCargoUnhealthyAllowance(cargo.unhealthyAllowance),
      hazardousAllowance: this.normalizeCargoHazardousAllowance(cargo.hazardousAllowance),
      isActive: cargo.isActive,
      createdAt: cargo.createdAt.toISOString(),
      updatedAt: cargo.updatedAt.toISOString()
    };
  }

  private toCargoPayload(cargo: {
    name: string;
    description: string | null;
    department: string;
    level: string;
    levels: Prisma.JsonValue;
    cboCode: string | null;
    cboTitle: string | null;
    unhealthyAllowance: string;
    hazardousAllowance: string;
    isActive: boolean;
  }) {
    const cboCode = this.normalizeOptionalText(cargo.cboCode, 40, "Codigo CBO invalido.");
    const cboTitle = this.normalizeOptionalText(cargo.cboTitle, 220, "Titulo CBO invalido.");
    return {
      name: cargo.name,
      description: cargo.description ?? undefined,
      department: cargo.department,
      level: cargo.level,
      levels: this.normalizeCargoLevels(cargo.levels, cargo.level),
      cbo:
        cboCode && cboTitle
          ? {
              codigo: cboCode,
              titulo: cboTitle
            }
          : undefined,
      unhealthyAllowance: this.normalizeCargoUnhealthyAllowance(cargo.unhealthyAllowance),
      hazardousAllowance: this.normalizeCargoHazardousAllowance(cargo.hazardousAllowance),
      isActive: cargo.isActive
    };
  }

  private normalizeCargoPayload(input: {
    name: string;
    description?: string;
    department: string;
    level: string;
    levels: unknown;
    cbo?: unknown;
    unhealthyAllowance?: "NONE" | "10" | "20" | "40";
    hazardousAllowance?: "NONE" | "30";
    isActive?: boolean;
  }, options?: { requireCbo?: boolean }) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new BadRequestException("Nome do cargo e obrigatorio.");
    }

    const description = this.normalizeOptionalText(
      input.description,
      600,
      "Descricao do cargo invalida."
    );
    const departmentRaw = this.normalizeOptionalText(
      input.department,
      120,
      "Departamento do cargo invalido."
    );
    if (!departmentRaw || departmentRaw.length < 2) {
      throw new BadRequestException("Selecione um departamento para o cargo.");
    }
    const department = this.normalizeCargoDepartment(departmentRaw);
    const level = this.normalizeCargoCategoryLevel(input.level);
    const levels = this.normalizeCargoLevels(input.levels, level);
    const cbo =
      input.cbo === undefined || input.cbo === null
        ? undefined
        : this.normalizeCargoCbo(input.cbo);
    if ((options?.requireCbo ?? true) && !cbo) {
      throw new BadRequestException("A vinculacao com o CBO e obrigatoria.");
    }
    const unhealthyAllowance = this.toEnum(
      input.unhealthyAllowance,
      ["NONE", "10", "20", "40"] as const,
      "Adicional de insalubridade invalido.",
      "NONE"
    ) as "NONE" | "10" | "20" | "40";
    const hazardousAllowance = this.toEnum(
      input.hazardousAllowance,
      ["NONE", "30"] as const,
      "Adicional de periculosidade invalido.",
      "NONE"
    ) as "NONE" | "30";

    return {
      name,
      description,
      department,
      level,
      levels,
      cbo,
      unhealthyAllowance,
      hazardousAllowance,
      isActive: this.toBoolean(input.isActive, true)
    };
  }

  private normalizeCargoCbo(value: unknown): { codigo: string; titulo: string } {
    const record = this.toRecord(value, "Vinculacao CBO invalida.");
    const codigo = this.normalizeOptionalText(
      record.codigo ?? record.code,
      40,
      "Codigo CBO invalido."
    );
    const titulo = this.normalizeOptionalText(
      record.titulo ?? record.title,
      220,
      "Titulo CBO invalido."
    );
    if (!codigo || !titulo) {
      throw new BadRequestException("A vinculacao com o CBO e obrigatoria.");
    }
    return { codigo, titulo };
  }

  private normalizeCargoUnhealthyAllowance(value?: string): "NONE" | "10" | "20" | "40" {
    if (value === "10" || value === "20" || value === "40") {
      return value;
    }
    return "NONE";
  }

  private normalizeCargoHazardousAllowance(value?: string): "NONE" | "30" {
    if (value === "30") {
      return "30";
    }
    return "NONE";
  }

  private normalizeCargoCategoryLevel(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (
      normalized === "OPERACIONAL" ||
      normalized === "TECNICO" ||
      normalized === "ADMINISTRATIVO" ||
      normalized === "LIDERANCA" ||
      normalized === "GESTAO" ||
      normalized === "ESTRATEGICO"
    ) {
      return normalized;
    }
    if (normalized === "AUXILIAR" || normalized === "AUX" || normalized === "ASSISTENTE") {
      return "OPERACIONAL";
    }
    if (normalized === "ANALISTA" || normalized === "TECNICA") {
      return "TECNICO";
    }
    if (
      normalized === "SUPERVISOR" ||
      normalized === "COORDENADOR" ||
      normalized === "SUPERVISAO" ||
      normalized === "COORDENACAO" ||
      normalized === "TATICO"
    ) {
      return "LIDERANCA";
    }
    if (normalized === "GERENCIA" || normalized === "GERENCIAL" || normalized === "GERENTE") {
      return "GESTAO";
    }
    if (normalized === "DIRETOR" || normalized === "DIRETORIA") {
      return "ESTRATEGICO";
    }
    return "OPERACIONAL";
  }

  private normalizeCargoDepartment(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (normalized === "ADMINISTRATIVO") return "Administrativo";
    if (normalized === "COMERCIAL") return "Comercial";
    if (normalized === "FINANCEIRO") return "Financeiro";
    if (normalized === "RH" || normalized === "RECURSOS HUMANOS") return "RH";
    if (
      normalized === "OPERACOES" ||
      normalized === "OPERACAO" ||
      normalized === "OPERACIONAL" ||
      normalized === "CENTRAL OPERACIONAL"
    ) {
      return "Operacoes";
    }
    return value.trim();
  }

  private normalizeCargoLevels(levelsValue: unknown, fallbackLevel?: string): string[] {
    const values = Array.isArray(levelsValue) ? levelsValue : [];
    const normalized = values
      .filter((item) => typeof item === "string")
      .map((item) => this.normalizeCargoSeniorityLevel(item))
      .filter((item) => item.length > 0);

    const deduped: string[] = [];
    for (const item of normalized) {
      const exists = deduped.some((current) => current.toLowerCase() === item.toLowerCase());
      if (!exists) {
        deduped.push(item);
      }
    }
    if (deduped.length > 0) {
      return deduped.slice(0, 10);
    }

    const fallback = this.normalizeCargoCategoryLevel(fallbackLevel ?? "");
    if (fallback === "LIDERANCA" || fallback === "GESTAO" || fallback === "ESTRATEGICO") {
      return ["Senior"];
    }
    return ["Junior", "Pleno", "Senior"];
  }

  private normalizeCargoSeniorityLevel(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    const normalized = trimmed.toUpperCase();
    if (normalized === "JR" || normalized === "JUNIOR" || normalized === "JUNIOR.") {
      return "Junior";
    }
    if (normalized === "PL" || normalized === "PLENO") {
      return "Pleno";
    }
    if (normalized === "SR" || normalized === "SENIOR" || normalized === "SENIOR.") {
      return "Senior";
    }
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(" ");
  }

  private async resolveWorkProfileCargoSnapshot(params: {
    cargoId?: string;
    cargoNameFallback?: string;
    cargoLevel?: string;
  }): Promise<{ cargoId: string; cargoName: string; cargoLevel?: string }> {
    const cargoId = this.normalizeOptionalText(
      params.cargoId,
      120,
      "Identificador do cargo invalido."
    );
    const fallbackName = this.normalizeOptionalText(
      params.cargoNameFallback,
      120,
      "Nome do cargo invalido."
    );

    const cargo =
      cargoId && cargoId.length > 0
        ? await this.prisma.cargo.findUnique({
            where: { id: cargoId }
          })
        : fallbackName
          ? await this.prisma.cargo.findFirst({
              where: {
                isActive: true,
                name: {
                  equals: fallbackName,
                  mode: "insensitive"
                }
              },
              orderBy: [{ updatedAt: "desc" }]
            })
          : null;

    if (!cargo) {
      throw new BadRequestException("Selecione um cargo ativo para o perfil de trabalho.");
    }
    if (!cargo.isActive) {
      throw new BadRequestException(
        `O cargo "${cargo.name}" esta inativo. Selecione um cargo ativo.`
      );
    }

    const levels = this.normalizeCargoLevels(cargo.levels, cargo.level);
    const requestedLevel = this.normalizeOptionalText(
      params.cargoLevel,
      120,
      "Nivel do cargo invalido."
    );
    const cargoLevel =
      requestedLevel && requestedLevel.length > 0
        ? requestedLevel
        : levels.length > 0
          ? levels[0]
          : undefined;

    if (
      cargoLevel &&
      levels.length > 0 &&
      !levels.some((item) => item.toLowerCase() === cargoLevel.toLowerCase())
    ) {
      throw new BadRequestException("Nivel selecionado nao pertence ao cargo escolhido.");
    }

    return {
      cargoId: cargo.id,
      cargoName: cargo.name,
      cargoLevel
    };
  }

  private toWorkProfilePayload(template: {
    name: string;
    description: string | null;
    isActive: boolean;
    cargoId?: string | null;
    cargoName: string;
    cargoLevel?: string | null;
    contractType: WorkProfileContractType;
    journeyTemplateId: string | null;
    journeyTemplateName: string | null;
    journeySummary: string | null;
    remuneration: Prisma.JsonValue;
    usesOvertime: boolean;
    overtimeTemplateId: string | null;
    overtimeTemplateName: string | null;
    overtimeSummary: string | null;
    usesNightPolicy: boolean;
    nightTemplateId: string | null;
    nightTemplateName: string | null;
    nightSummary: string | null;
    holidayScopeType: HolidayScopeType | null;
    holidayStateCode: string | null;
    holidayCityCode: string | null;
    holidaySummary: string | null;
    toleranceMarkingMinutes: number | null;
    toleranceDailyMaxMinutes: number | null;
    benefits: Prisma.JsonValue | null;
    allowContractEditing: boolean;
    allowJourneyCustomization: boolean;
    allowBenefitsCustomization: boolean;
  }) {
    return this.normalizeWorkProfilePayload({
      name: template.name,
      description: template.description ?? undefined,
      isActive: template.isActive,
      cargoId: template.cargoId ?? undefined,
      cargoName: template.cargoName,
      cargoLevel: template.cargoLevel ?? undefined,
      contractType: template.contractType,
      journeyTemplateId: template.journeyTemplateId ?? undefined,
      journeyTemplateName: template.journeyTemplateName ?? undefined,
      journeySummary: template.journeySummary ?? undefined,
      remuneration: template.remuneration,
      usesOvertime: template.usesOvertime,
      overtimeTemplateId: template.overtimeTemplateId ?? undefined,
      overtimeTemplateName: template.overtimeTemplateName ?? undefined,
      overtimeSummary: template.overtimeSummary ?? undefined,
      usesNightPolicy: template.usesNightPolicy,
      nightTemplateId: template.nightTemplateId ?? undefined,
      nightTemplateName: template.nightTemplateName ?? undefined,
      nightSummary: template.nightSummary ?? undefined,
      holidayScopeType: template.holidayScopeType ?? undefined,
      holidayStateCode: template.holidayStateCode ?? undefined,
      holidayCityCode: template.holidayCityCode ?? undefined,
      holidaySummary: template.holidaySummary ?? undefined,
      toleranceMarkingMinutes: template.toleranceMarkingMinutes ?? undefined,
      toleranceDailyMaxMinutes: template.toleranceDailyMaxMinutes ?? undefined,
      benefits: template.benefits ?? undefined,
      allowContractEditing: template.allowContractEditing,
      allowJourneyCustomization: template.allowJourneyCustomization,
      allowBenefitsCustomization: template.allowBenefitsCustomization
    });
  }

  private toWorkProfileSummary(template: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    cargoId?: string | null;
    cargoName: string;
    cargoLevel?: string | null;
    contractType: WorkProfileContractType;
    journeyTemplateId: string | null;
    journeyTemplateName: string | null;
    journeySummary: string | null;
    remuneration: Prisma.JsonValue;
    usesOvertime: boolean;
    overtimeTemplateId: string | null;
    overtimeTemplateName: string | null;
    overtimeSummary: string | null;
    usesNightPolicy: boolean;
    nightTemplateId: string | null;
    nightTemplateName: string | null;
    nightSummary: string | null;
    holidayScopeType: HolidayScopeType | null;
    holidayStateCode: string | null;
    holidayCityCode: string | null;
    holidaySummary: string | null;
    toleranceMarkingMinutes: number | null;
    toleranceDailyMaxMinutes: number | null;
    benefits: Prisma.JsonValue | null;
    allowContractEditing: boolean;
    allowJourneyCustomization: boolean;
    allowBenefitsCustomization: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): WorkProfileSummary {
    const payload = this.toWorkProfilePayload(template);
    const summary = this.buildWorkProfileSummary(payload);

    return {
      id: template.id,
      name: payload.name,
      description: payload.description,
      isActive: payload.isActive,
      cargoId: payload.cargoId,
      cargoName: payload.cargoName,
      cargoLevel: payload.cargoLevel,
      contractType: payload.contractType,
      journeyTemplateId: payload.journeyTemplateId,
      journeyTemplateName: payload.journeyTemplateName,
      journeySummary: payload.journeySummary,
      remuneration: payload.remuneration,
      usesOvertime: payload.usesOvertime,
      overtimeTemplateId: payload.overtimeTemplateId,
      overtimeTemplateName: payload.overtimeTemplateName,
      overtimeSummary: payload.overtimeSummary,
      usesNightPolicy: payload.usesNightPolicy,
      nightTemplateId: payload.nightTemplateId,
      nightTemplateName: payload.nightTemplateName,
      nightSummary: payload.nightSummary,
      holidayScopeType: payload.holidayScopeType,
      holidayStateCode: payload.holidayStateCode,
      holidayCityCode: payload.holidayCityCode,
      holidaySummary: payload.holidaySummary,
      toleranceMarkingMinutes: payload.toleranceMarkingMinutes,
      toleranceDailyMaxMinutes: payload.toleranceDailyMaxMinutes,
      benefits: payload.benefits,
      allowContractEditing: payload.allowContractEditing,
      allowJourneyCustomization: payload.allowJourneyCustomization,
      allowBenefitsCustomization: payload.allowBenefitsCustomization,
      summary,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    };
  }

  private normalizeWorkProfilePayload(input: {
    name: string;
    description?: string;
    isActive?: boolean;
    cargoId?: string;
    cargoName: string;
    cargoLevel?: string;
    contractType: WorkProfileContractType;
    journeyTemplateId?: string;
    journeyTemplateName?: string;
    journeySummary?: string;
    remuneration: unknown;
    usesOvertime?: boolean;
    overtimeTemplateId?: string;
    overtimeTemplateName?: string;
    overtimeSummary?: string;
    usesNightPolicy?: boolean;
    nightTemplateId?: string;
    nightTemplateName?: string;
    nightSummary?: string;
    holidayScopeType?: HolidayScopeType;
    holidayStateCode?: string;
    holidayCityCode?: string;
    holidaySummary?: string;
    toleranceMarkingMinutes?: number;
    toleranceDailyMaxMinutes?: number;
    benefits?: unknown;
    allowContractEditing?: boolean;
    allowJourneyCustomization?: boolean;
    allowBenefitsCustomization?: boolean;
  }) {
    const name = input.name.trim();
    if (name.length < 3) {
      throw new BadRequestException("Nome do perfil deve ter ao menos 3 caracteres.");
    }

    const cargoName = input.cargoName.trim();
    if (cargoName.length < 2) {
      throw new BadRequestException("Cargo do perfil e obrigatorio.");
    }
    const cargoId = this.normalizeOptionalText(
      input.cargoId,
      120,
      "Identificador do cargo invalido."
    );
    const cargoLevel = this.normalizeOptionalText(
      input.cargoLevel,
      120,
      "Nivel do cargo invalido."
    );

    const contractType = this.toEnum(
      input.contractType,
      WORK_PROFILE_CONTRACT_TYPE_VALUES,
      "Tipo de vinculo invalido.",
      "CLT"
    ) as WorkProfileContractType;
    const capabilities = getWorkProfileContractCapabilities(contractType);
    const isLaborContract = capabilities.requiresJourneyTemplate;
    const allowsOvertimePolicy = capabilities.allowsOvertimePolicy;
    const allowsLaborPolicies = capabilities.isLaborRegime;
    const description = this.normalizeOptionalText(
      input.description,
      600,
      "Descricao do perfil invalida."
    );
    const journeyTemplateId = this.normalizeOptionalText(
      input.journeyTemplateId,
      120,
      "Identificador da jornada invalido."
    );
    const journeyTemplateName = this.normalizeOptionalText(
      input.journeyTemplateName,
      120,
      "Nome da jornada invalido."
    );
    const journeySummary = this.normalizeOptionalText(
      input.journeySummary,
      2000,
      "Resumo da jornada invalido."
    );
    if (isLaborContract && !journeyTemplateId) {
      throw new BadRequestException("Selecione uma jornada de trabalho cadastrada.");
    }

    const remuneration = this.normalizeWorkProfileRemuneration(input.remuneration);
    if (capabilities.usesIntermittentRemunerationFlow && remuneration.model === "COMMISSION_ONLY") {
      throw new BadRequestException(
        "Para CLT Intermitente, selecione remuneracao base com ou sem variavel adicional."
      );
    }
    const usesOvertimeRaw = this.toBoolean(input.usesOvertime, allowsOvertimePolicy);
    const usesOvertime = allowsOvertimePolicy ? usesOvertimeRaw : false;
    const overtimeTemplateId = this.normalizeOptionalText(
      input.overtimeTemplateId,
      120,
      "Identificador da politica de hora extra invalido."
    );
    const overtimeTemplateName = this.normalizeOptionalText(
      input.overtimeTemplateName,
      120,
      "Nome da politica de hora extra invalido."
    );
    const overtimeSummary = this.normalizeOptionalText(
      input.overtimeSummary,
      2000,
      "Resumo da politica de hora extra invalido."
    );

    if (usesOvertime && !overtimeTemplateId) {
      throw new BadRequestException(
        "Selecione uma politica de hora extra ou marque que o perfil nao utiliza hora extra."
      );
    }

    const usesNightPolicyRaw = this.toBoolean(input.usesNightPolicy, false);
    const usesNightPolicy = allowsLaborPolicies ? usesNightPolicyRaw : false;
    const nightTemplateId = this.normalizeOptionalText(
      input.nightTemplateId,
      120,
      "Identificador da politica de adicional noturno invalido."
    );
    const nightTemplateName = this.normalizeOptionalText(
      input.nightTemplateName,
      120,
      "Nome da politica de adicional noturno invalido."
    );
    const nightSummary = this.normalizeOptionalText(
      input.nightSummary,
      2000,
      "Resumo da politica de adicional noturno invalido."
    );
    if (usesNightPolicy && !nightTemplateId) {
      throw new BadRequestException(
        "Selecione uma politica de adicional noturno ou marque que o perfil nao utiliza adicional noturno."
      );
    }

    const holidayScopeType = allowsLaborPolicies
      ? ((input.holidayScopeType
          ? this.toEnum(
              input.holidayScopeType,
              HOLIDAY_SCOPE_TYPE_VALUES,
              "Escopo de feriado invalido.",
              "NATIONAL"
            )
          : undefined) as HolidayScopeType | undefined)
      : undefined;
    const holidayStateCode = this.normalizeOptionalText(
      input.holidayStateCode,
      2,
      "UF da configuracao de feriado invalida."
    )?.toUpperCase();
    const holidayCityCode = this.normalizeOptionalText(
      input.holidayCityCode,
      120,
      "Cidade da configuracao de feriado invalida."
    );
    const holidaySummary = this.normalizeOptionalText(
      input.holidaySummary,
      2000,
      "Resumo da configuracao de feriado invalido."
    );

    if (holidayScopeType === "STATE" && !holidayStateCode) {
      throw new BadRequestException("Selecione a UF para configuracao de feriados estaduais.");
    }
    if (holidayScopeType === "CITY" && (!holidayStateCode || !holidayCityCode)) {
      throw new BadRequestException(
        "Selecione UF e cidade para configuracao de feriados municipais."
      );
    }

    const benefits = this.normalizeWorkProfileBenefits(input.benefits);
    const toleranceMarkingMinutes = this.toOptionalInteger(
      input.toleranceMarkingMinutes,
      0,
      180,
      "Tolerancia de marcacao do perfil invalida."
    );
    const toleranceDailyMaxMinutes = this.toOptionalInteger(
      input.toleranceDailyMaxMinutes,
      0,
      600,
      "Tolerancia diaria maxima do perfil invalida."
    );

    return {
      name,
      description,
      isActive: this.toBoolean(input.isActive, true),
      cargoId,
      cargoName,
      cargoLevel,
      contractType,
      journeyTemplateId,
      journeyTemplateName,
      journeySummary,
      remuneration,
      usesOvertime,
      overtimeTemplateId: usesOvertime ? overtimeTemplateId : undefined,
      overtimeTemplateName: usesOvertime ? overtimeTemplateName : undefined,
      overtimeSummary: usesOvertime ? overtimeSummary : undefined,
      usesNightPolicy,
      nightTemplateId: usesNightPolicy ? nightTemplateId : undefined,
      nightTemplateName: usesNightPolicy ? nightTemplateName : undefined,
      nightSummary: usesNightPolicy ? nightSummary : undefined,
      holidayScopeType: allowsLaborPolicies ? holidayScopeType : undefined,
      holidayStateCode:
        allowsLaborPolicies && holidayScopeType !== "NATIONAL"
          ? holidayStateCode
          : undefined,
      holidayCityCode:
        allowsLaborPolicies && holidayScopeType === "CITY" ? holidayCityCode : undefined,
      holidaySummary: allowsLaborPolicies ? holidaySummary : undefined,
      benefits,
      allowContractEditing: this.toBoolean(input.allowContractEditing, true),
      allowJourneyCustomization: this.toBoolean(input.allowJourneyCustomization, true),
      allowBenefitsCustomization: this.toBoolean(input.allowBenefitsCustomization, true),
      toleranceMarkingMinutes,
      toleranceDailyMaxMinutes
    };
  }

  private async resolveWorkProfileJourneyTemplateReference(input: {
    journeyTemplateId?: string;
    requireDsrPolicy?: boolean;
  }): Promise<{
    journeyTemplateId?: string;
    journeyTemplateName?: string;
    journeySummary?: string;
  }> {
    if (!input.journeyTemplateId) {
      return {};
    }

    const journey = await this.prisma.workJourneyTemplate.findUnique({
      where: { id: input.journeyTemplateId }
    });

    if (!journey || !journey.isActive) {
      throw new BadRequestException(
        "A jornada de trabalho selecionada nao esta disponivel. Selecione uma jornada ativa."
      );
    }
    if (input.requireDsrPolicy && !journey.dsrEnabled) {
      throw new BadRequestException(
        "A jornada selecionada precisa ter politica de DSR configurada para este vinculo."
      );
    }

    const summaryParts: string[] = [];
    summaryParts.push(`Tipo ${this.resolveWorkJourneyTypeLabel(journey.type)}`);
    try {
      summaryParts.push(`Dias ${this.normalizeWorkJourneyDays(journey.allowedDays).join(", ")}`);
    } catch {
      summaryParts.push("Dias nao mapeados");
    }
    summaryParts.push(`Intervalo ${this.resolveWorkJourneyBreakTypeLabel(journey.breakType)}`);
    summaryParts.push(`Limite diario ${Number(journey.maxHoursPerDay)}h`);
    if (journey.notes?.trim()) {
      summaryParts.push(`Obs: ${journey.notes.trim()}`);
    }

    if (journey.dsrEnabled) {
      if (journey.dsrWeeklyRestDay) {
        summaryParts.push(`DSR ${this.resolveDsrWeeklyRestDayLabel(journey.dsrWeeklyRestDay)}`);
      } else {
        const fixedConfig = this.toRecordOrUndefined(journey.fixedConfig);
        const rawScaleType =
          fixedConfig && typeof fixedConfig.scaleType === "string"
            ? fixedConfig.scaleType.trim().toUpperCase()
            : "";
        if (rawScaleType === "TWELVE_THIRTY_SIX") {
          const cycleWorkDaysRaw =
            fixedConfig && typeof fixedConfig.cycleWorkDays === "number"
              ? fixedConfig.cycleWorkDays
              : 1;
          const cycleOffDaysRaw =
            fixedConfig && typeof fixedConfig.cycleOffDays === "number"
              ? fixedConfig.cycleOffDays
              : 1;
          const cycleWorkDays = Number.isFinite(cycleWorkDaysRaw)
            ? Math.min(7, Math.max(1, Math.trunc(cycleWorkDaysRaw)))
            : 1;
          const cycleOffDays = Number.isFinite(cycleOffDaysRaw)
            ? Math.min(7, Math.max(1, Math.trunc(cycleOffDaysRaw)))
            : 1;
          summaryParts.push(`DSR ciclo ${cycleWorkDays}x${cycleOffDays}`);
        }
      }
    }

    return {
      journeyTemplateId: journey.id,
      journeyTemplateName: journey.name,
      journeySummary: summaryParts.join(" | ")
    };
  }

  private async resolveWorkProfileOvertimeTemplateReference(input: {
    usesOvertime: boolean;
    overtimeTemplateId?: string;
  }): Promise<{
    overtimeTemplateId?: string;
    overtimeTemplateName?: string;
    overtimeSummary?: string;
  }> {
    if (!input.usesOvertime || !input.overtimeTemplateId) {
      return {};
    }

    const template = await this.prisma.overtimeTemplate.findUnique({
      where: { id: input.overtimeTemplateId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        settings: true
      }
    });

    if (!template || !template.isActive) {
      throw new BadRequestException(
        "A politica de hora extra selecionada nao esta disponivel. Selecione uma politica ativa."
      );
    }

    if (this.resolveOvertimeTemplatePolicyCategory(template.settings) !== "OVERTIME") {
      throw new BadRequestException(
        "A politica selecionada pertence ao modulo de adicional noturno. Selecione uma politica de hora extra."
      );
    }

    const summary = [template.name, template.description?.trim() || undefined]
      .filter((item): item is string => Boolean(item))
      .join(" | ");

    return {
      overtimeTemplateId: template.id,
      overtimeTemplateName: template.name,
      overtimeSummary: summary || template.name
    };
  }

  private async resolveWorkProfileNightTemplateReference(input: {
    usesNightPolicy: boolean;
    nightTemplateId?: string;
  }): Promise<{
    nightTemplateId?: string;
    nightTemplateName?: string;
    nightSummary?: string;
  }> {
    if (!input.usesNightPolicy || !input.nightTemplateId) {
      return {};
    }

    const template = await this.prisma.overtimeTemplate.findUnique({
      where: { id: input.nightTemplateId },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        settings: true
      }
    });

    if (!template || !template.isActive) {
      throw new BadRequestException(
        "A politica de adicional noturno selecionada nao esta disponivel. Selecione uma politica ativa."
      );
    }

    if (this.resolveOvertimeTemplatePolicyCategory(template.settings) !== "NIGHT") {
      throw new BadRequestException(
        "A politica selecionada pertence ao modulo de hora extra. Selecione uma politica de adicional noturno."
      );
    }

    const summary = [template.name, template.description?.trim() || undefined]
      .filter((item): item is string => Boolean(item))
      .join(" | ");

    return {
      nightTemplateId: template.id,
      nightTemplateName: template.name,
      nightSummary: summary || template.name
    };
  }

  private normalizeWorkProfileRemuneration(value: unknown): WorkProfileRemunerationSettings {
    const payload = this.toRecord(
      value,
      "Configuracao de remuneracao do perfil deve ser um objeto valido."
    );

    const model = this.toEnum(
      payload.model,
      WORK_PROFILE_REMUNERATION_MODEL_VALUES,
      "Modelo de remuneracao invalido.",
      "FIXED"
    ) as WorkProfileRemunerationSettings["model"];
    const baseType = this.toEnum(
      payload.baseType,
      WORK_PROFILE_BASE_REMUNERATION_TYPE_VALUES,
      "Tipo de remuneracao base invalido.",
      "HOUR"
    ) as NonNullable<WorkProfileRemunerationSettings["baseType"]>;
    const hasVariableCompensation =
      payload.hasVariableCompensation === undefined
        ? model !== "FIXED"
        : this.toBoolean(payload.hasVariableCompensation, false);
    const fixedSalary =
      payload.fixedSalary === undefined || payload.fixedSalary === null || payload.fixedSalary === ""
        ? undefined
        : this.toNumber(
            payload.fixedSalary,
            0,
            0,
            999999999,
            "Valor de salario fixo invalido."
          );
    const commissionType =
      payload.commissionType === undefined || payload.commissionType === null || payload.commissionType === ""
        ? undefined
        : (this.toEnum(
            payload.commissionType,
            WORK_PROFILE_COMMISSION_TYPE_VALUES,
            "Tipo de comissao invalido.",
            "PERCENT"
          ) as WorkProfileRemunerationSettings["commissionType"]);
    const commissionValue =
      payload.commissionValue === undefined ||
      payload.commissionValue === null ||
      payload.commissionValue === ""
        ? undefined
        : this.toNumber(
            payload.commissionValue,
            0,
            0,
            999999999,
            "Valor da comissao invalido."
          );
    const commissionRule = this.normalizeOptionalText(
      payload.commissionRule,
      1200,
      "Regra da comissao invalida."
    );
    const contractTemplateKey = this.normalizeOptionalText(
      payload.contractTemplateKey,
      120,
      "Modelo de contrato invalido."
    );
    const contractTemplateName = this.normalizeOptionalText(
      payload.contractTemplateName,
      180,
      "Nome do modelo de contrato invalido."
    );
    const contractTemplateVersion = this.normalizeOptionalText(
      payload.contractTemplateVersion,
      40,
      "Versao do modelo de contrato invalida."
    );
    const contractTemplateContent = this.normalizeOptionalText(
      payload.contractTemplateContent,
      120000,
      "Conteudo do modelo de contrato invalido."
    );

    if (!contractTemplateKey) {
      throw new BadRequestException("Selecione o modelo de contrato do perfil de trabalho.");
    }

    if (model !== "COMMISSION_ONLY" && (fixedSalary === undefined || fixedSalary <= 0)) {
      throw new BadRequestException("Remuneracao com salario exige valor de salario fixo maior que zero.");
    }

    if (model !== "FIXED") {
      if (!commissionType) {
        throw new BadRequestException("Tipo de comissao e obrigatorio para o modelo selecionado.");
      }
      if (commissionValue === undefined || commissionValue <= 0) {
        throw new BadRequestException("Valor de comissao deve ser maior que zero.");
      }
      if (!commissionRule || commissionRule.length < 3) {
        throw new BadRequestException("Informe a regra da comissao com ao menos 3 caracteres.");
      }
    }

    return {
      model,
      baseType,
      hasVariableCompensation,
      fixedSalary: model === "COMMISSION_ONLY" ? undefined : fixedSalary,
      commissionType: model === "FIXED" ? undefined : commissionType,
      commissionValue: model === "FIXED" ? undefined : commissionValue,
      commissionRule: model === "FIXED" ? undefined : commissionRule,
      contractTemplateKey,
      contractTemplateName: contractTemplateName ?? contractTemplateKey,
      contractTemplateVersion: contractTemplateVersion ?? "v1",
      contractTemplateContent
    };
  }

  private normalizeWorkProfileBenefits(value: unknown): WorkProfileBenefitRef[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const record = item as Record<string, unknown>;
        const id = this.normalizeOptionalText(record.id, 120, "Beneficio invalido.") ?? "";
        const name = this.normalizeOptionalText(record.name, 120, "Nome do beneficio invalido.") ?? "";
        const summary = this.normalizeOptionalText(
          record.summary,
          800,
          "Resumo do beneficio invalido."
        );

        return {
          id,
          name,
          summary
        };
      })
      .filter((item) => item.id.length > 0 && item.name.length > 0);

    return [...new Map(normalized.map((item) => [item.id, item])).values()].slice(0, 100);
  }

  private buildWorkProfileSummary(payload: {
    cargoName: string;
    cargoLevel?: string;
    contractType: WorkProfileContractType;
    journeyTemplateName?: string;
    remuneration: WorkProfileRemunerationSettings;
    usesOvertime: boolean;
    overtimeTemplateName?: string;
    usesNightPolicy: boolean;
    nightTemplateName?: string;
    holidayScopeType?: HolidayScopeType;
    holidayStateCode?: string;
    holidayCityCode?: string;
    benefits: WorkProfileBenefitRef[];
    allowContractEditing: boolean;
    allowJourneyCustomization: boolean;
    allowBenefitsCustomization: boolean;
    toleranceMarkingMinutes?: number;
    toleranceDailyMaxMinutes?: number;
  }): string {
    const parts: string[] = [];
    const capabilities = getWorkProfileContractCapabilities(payload.contractType);

    parts.push(`Cargo ${payload.cargoName}`);
    if (payload.cargoLevel) {
      parts.push(`Nivel ${payload.cargoLevel}`);
    }
    parts.push(`Vinculo ${this.resolveWorkProfileContractTypeLabel(payload.contractType)}`);

    if (payload.journeyTemplateName) {
      parts.push(`Jornada ${payload.journeyTemplateName}`);
    }

    const baseTypeLabel = this.resolveWorkProfileBaseRemunerationTypeLabel(
      payload.remuneration.baseType
    );

    if (payload.remuneration.model === "FIXED" && payload.remuneration.fixedSalary !== undefined) {
      if (capabilities.usesIntermittentRemunerationFlow) {
        parts.push(`${baseTypeLabel} ${this.formatCurrency(payload.remuneration.fixedSalary)}`);
      } else {
        parts.push(`Salario fixo ${this.formatCurrency(payload.remuneration.fixedSalary)}`);
      }
    } else if (
      payload.remuneration.model === "FIXED_PLUS_COMMISSION" &&
      payload.remuneration.fixedSalary !== undefined &&
      payload.remuneration.commissionType &&
      payload.remuneration.commissionValue !== undefined
    ) {
      if (capabilities.usesIntermittentRemunerationFlow) {
        parts.push(
          `${baseTypeLabel} ${this.formatCurrency(payload.remuneration.fixedSalary)} + variavel ${this.resolveCommissionTypeLabel(
            payload.remuneration.commissionType
          )} ${payload.remuneration.commissionValue}`
        );
      } else {
        parts.push(
          `Salario ${this.formatCurrency(payload.remuneration.fixedSalary)} + comissao ${this.resolveCommissionTypeLabel(
            payload.remuneration.commissionType
          )} ${payload.remuneration.commissionValue}`
        );
      }
    } else if (
      payload.remuneration.model === "COMMISSION_ONLY" &&
      payload.remuneration.commissionType &&
      payload.remuneration.commissionValue !== undefined
    ) {
      parts.push(
        `Somente comissao ${this.resolveCommissionTypeLabel(payload.remuneration.commissionType)} ${payload.remuneration.commissionValue}`
      );
    }

    if (payload.usesOvertime) {
      parts.push(`Hora extra: ${payload.overtimeTemplateName ?? "politica selecionada"}`);
    } else {
      parts.push("Sem hora extra");
    }

    if (payload.usesNightPolicy) {
      parts.push(`Adicional noturno: ${payload.nightTemplateName ?? "politica selecionada"}`);
    } else if (capabilities.isLaborRegime) {
      parts.push("Sem adicional noturno");
    }

    if (capabilities.isLaborRegime) {
      parts.push("DSR: definido pela jornada de trabalho");
    }

    if (payload.holidayScopeType) {
      if (payload.holidayScopeType === "CITY") {
        parts.push(
          `Feriados: municipal (${payload.holidayCityCode ?? "cidade"}-${payload.holidayStateCode ?? "UF"})`
        );
      } else if (payload.holidayScopeType === "STATE") {
        parts.push(`Feriados: estadual (${payload.holidayStateCode ?? "UF"})`);
      } else {
        parts.push("Feriados: nacional");
      }
    } else if (capabilities.isLaborRegime) {
      parts.push("Feriados: sem escopo configurado");
    }

    if (payload.benefits.length > 0) {
      parts.push(`Beneficios: ${payload.benefits.map((item) => item.name).join(", ")}`);
    }

    if (
      payload.toleranceMarkingMinutes !== undefined ||
      payload.toleranceDailyMaxMinutes !== undefined
    ) {
      parts.push(
        `Tolerancia ponto: marcacao ${payload.toleranceMarkingMinutes ?? 5} min, diaria ${payload.toleranceDailyMaxMinutes ?? 10} min`
      );
    }

    const permissions: string[] = [];
    if (payload.allowContractEditing) permissions.push("editar perfil no contrato");
    if (payload.allowJourneyCustomization) permissions.push("customizar jornada");
    if (payload.allowBenefitsCustomization) permissions.push("customizar beneficios");
    if (permissions.length > 0) {
      parts.push(`Permissoes: ${permissions.join(", ")}`);
    }

    return `${parts.join(" | ")}.`;
  }

  private resolveWorkProfileContractTypeLabel(value: WorkProfileContractType): string {
    if (value === "CLT_INTERMITENTE") return "CLT Intermitente";
    if (value === "MEI") return "MEI";
    if (value === "PJ") return "PJ";
    if (value === "AUTONOMO") return "Autonomo";
    return "CLT";
  }

  private resolveWorkJourneyTypeLabel(value: string): string {
    if (value === "FLEXIBLE") return "Flexivel";
    if (value === "INTERMITTENT") return "Intermitente";
    return "Fixa";
  }

  private resolveWorkJourneyBreakTypeLabel(value: string): string {
    if (value === "NONE") return "Sem intervalo";
    if (value === "FLEXIBLE") return "Flexivel";
    return "Fixo";
  }

  private resolveWorkProfileBaseRemunerationTypeLabel(
    value: WorkProfileRemunerationSettings["baseType"]
  ): string {
    if (value === "DAILY") return "Valor por diaria";
    if (value === "EVENT") return "Valor por evento/servico";
    return "Valor por hora";
  }

  private resolveCommissionTypeLabel(value: WorkProfileRemunerationSettings["commissionType"]): string {
    if (value === "PER_RIDE") return "por corrida";
    return "percentual";
  }

  private toCboOccupationSummary(item: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    source: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CboOccupationSummary {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description ?? undefined,
      source: item.source ?? undefined,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }

  private parseCboCsvRows(
    content: string,
    delimiterOverride?: string
  ): Array<{ code: string; title: string; description?: string }> {
    const rowsByCode = new Map<string, { code: string; title: string; description?: string }>();
    const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);

    let delimiter = delimiterOverride?.trim() || "";
    let headerParsed = false;
    let hasHeader = false;
    let codeIndex = 0;
    let titleIndex = 1;
    let descriptionIndex = -1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      if (!delimiter) {
        delimiter = this.detectCboCsvDelimiter(line);
      }

      const columns = this.parseCboCsvLine(line, delimiter);

      if (!headerParsed) {
        headerParsed = true;
        const normalizedHeaders = columns.map((column) => this.normalizeCboCsvHeader(column));
        const potentialCodeIndex = normalizedHeaders.findIndex((value) =>
          ["codigo", "codigocbo", "cbo", "codocupacao", "codigoocupacao"].includes(value)
        );
        const potentialTitleIndex = normalizedHeaders.findIndex((value) =>
          ["titulo", "ocupacao", "nome", "nomeocupacao", "descricaoocupacao"].includes(value)
        );
        const potentialDescriptionIndex = normalizedHeaders.findIndex((value) =>
          ["descricao", "descricaosumaria", "descricaoanalitica", "detalhe"].includes(value)
        );

        if (potentialCodeIndex >= 0 && potentialTitleIndex >= 0) {
          hasHeader = true;
          codeIndex = potentialCodeIndex;
          titleIndex = potentialTitleIndex;
          descriptionIndex = potentialDescriptionIndex;
          continue;
        }
      }

      const codeValue = columns[codeIndex] ?? "";
      const titleValue = columns[titleIndex] ?? "";
      const descriptionValue = descriptionIndex >= 0 ? columns[descriptionIndex] ?? "" : "";

      const code = this.normalizeCboCode(codeValue);
      const title = this.normalizeCboCsvText(titleValue);
      const description = this.normalizeCboCsvText(descriptionValue);

      if (!code || !title) {
        continue;
      }

      const existing = rowsByCode.get(code);
      if (!existing) {
        rowsByCode.set(code, {
          code,
          title,
          description: description || undefined
        });
        continue;
      }

      const shouldReplace =
        title.length > existing.title.length || (!existing.description && Boolean(description));
      if (shouldReplace) {
        rowsByCode.set(code, {
          code,
          title,
          description: description || existing.description
        });
      }
    }

    const rows = [...rowsByCode.values()].sort((left, right) => left.code.localeCompare(right.code));
    if (rows.length === 0) {
      throw new BadRequestException(
        hasHeader
          ? "Nenhum registro CBO valido encontrado no arquivo."
          : "Arquivo lido, mas nao foi possivel identificar registros CBO validos."
      );
    }

    return rows;
  }

  private normalizeCboCsvHeader(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  private parseCboCsvLine(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = index + 1 < line.length ? line[index + 1] : "";

      if (char === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  private detectCboCsvDelimiter(line: string): string {
    const candidates = [";", ",", "\t", "|"];
    let bestDelimiter = ";";
    let bestColumnsCount = -1;

    for (const candidate of candidates) {
      const count = this.parseCboCsvLine(line, candidate).length;
      if (count > bestColumnsCount) {
        bestColumnsCount = count;
        bestDelimiter = candidate;
      }
    }

    return bestDelimiter;
  }

  private normalizeCboCode(value: string): string {
    const raw = value.trim();
    const digits = raw.replace(/\D/g, "");

    if (digits.length === 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    const normalizedRaw = raw.replace(/\./g, "-").replace(/\//g, "-");
    if (/^\d{4}-\d{2}$/.test(normalizedRaw)) {
      return normalizedRaw;
    }

    return raw;
  }

  private normalizeCboCsvText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private toRecord(value: unknown, message: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException(message);
    }
    return value as Record<string, unknown>;
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
    return fallback;
  }

  private toNumber(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
    message: string
  ): number {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return Number(parsed.toFixed(2));
  }

  private decimalToNumber(value: unknown): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (value && typeof value === "object") {
      const withToNumber = value as { toNumber?: () => number };
      if (typeof withToNumber.toNumber === "function") {
        const parsed = withToNumber.toNumber();
        return Number.isFinite(parsed) ? parsed : 0;
      }

      const withToString = value as { toString?: () => string };
      if (typeof withToString.toString === "function") {
        const parsed = Number(withToString.toString());
        return Number.isFinite(parsed) ? parsed : 0;
      }
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toOptionalNumber(value: unknown, min: number, max: number, message: string): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return Number(parsed.toFixed(2));
  }

  private toOptionalInteger(value: unknown, min: number, max: number, message: string): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return parsed;
  }

  private toInteger(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
    message: string
  ): number {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return parsed;
  }

  private toEnum<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    message: string,
    fallback: T[number]
  ): T[number] {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "string" || !allowed.includes(value as T[number])) {
      throw new BadRequestException(message);
    }
    return value as T[number];
  }

  private normalizeTimeEntryMetadata(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return this.toRecord(value, "Metadados do dispositivo invalidos.");
  }

  private async resolveCompanyGeofenceConfig(): Promise<{
    enabled: boolean;
    baseLatitude?: number;
    baseLongitude?: number;
    radiusMeters: number;
  }> {
    const profile = await this.ensureDefaultCompanyProfile();
    return {
      enabled: profile.geofenceEnabled,
      baseLatitude:
        profile.geofenceBaseLatitude === null ? undefined : Number(profile.geofenceBaseLatitude),
      baseLongitude:
        profile.geofenceBaseLongitude === null ? undefined : Number(profile.geofenceBaseLongitude),
      radiusMeters: Math.max(20, Number(profile.geofenceRadiusMeters) || 150)
    };
  }

  private resolveDsrWeeklyRestDayLabel(value: DsrWeeklyRestDay): string {
    switch (value) {
      case "MON":
        return "segunda-feira";
      case "TUE":
        return "terca-feira";
      case "WED":
        return "quarta-feira";
      case "THU":
        return "quinta-feira";
      case "FRI":
        return "sexta-feira";
      case "SAT":
        return "sabado";
      default:
        return "domingo";
    }
  }

  private normalizeClockTime(value: unknown, fallback: string, message: string): string {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())) {
      throw new BadRequestException(message);
    }
    return value.trim();
  }

  private normalizeFavoriteLabel(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private toFavoriteSummary(favorite: {
    id: string;
    label: string;
    address: string;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerFavoriteAddressSummary {
    return {
      id: favorite.id,
      label: favorite.label,
      address: favorite.address,
      createdAt: favorite.createdAt.toISOString(),
      updatedAt: favorite.updatedAt.toISOString()
    };
  }

  private async ensureDefaultTripType(): Promise<void> {
    const defaultSlug = "comum";
    const existingDefault = await this.prisma.tripType.findUnique({
      where: { slug: defaultSlug }
    });

    if (existingDefault) {
      if (!existingDefault.isDefault || !existingDefault.isActive || Number(existingDefault.surchargeAmount) !== 0) {
        await this.prisma.tripType.update({
          where: { id: existingDefault.id },
          data: {
            isDefault: true,
            isActive: true,
            surchargeAmount: 0,
            sortOrder: 0
          }
        });
      }
      return;
    }

    await this.prisma.tripType.create({
      data: {
        slug: defaultSlug,
        name: "Comum",
        description: "Corrida basica para passageiro sem adicionais especiais.",
        surchargeAmount: 0,
        isActive: true,
        isDefault: true,
        sortOrder: 0
      }
    });
  }

  private buildTripTypeSlug(name: string): string {
    const baseSlug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "tipo-viagem";

    if (!baseSlug) {
      throw new BadRequestException("Nome invalido para tipo de viagem.");
    }

    return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private toTripTypeSummary(type: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    surchargeAmount: { toNumber(): number } | number;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): TripTypeSummary {
    return {
      id: type.id,
      slug: type.slug,
      name: type.name,
      description: type.description ?? undefined,
      surchargeAmount:
        typeof type.surchargeAmount === "number" ? type.surchargeAmount : type.surchargeAmount.toNumber(),
      isActive: type.isActive,
      isDefault: type.isDefault,
      sortOrder: type.sortOrder,
      createdAt: type.createdAt.toISOString(),
      updatedAt: type.updatedAt.toISOString()
    };
  }


  private toCustomerRideHistoryItem(
    ride: Prisma.RideGetPayload<{
      include: {
        quotes: true;
        events: true;
      };
    }>
  ): CustomerRideHistoryItem {
    const baseRide = this.ridesService.toRideResponse({
      ...ride,
      quotes: ride.quotes
    });

    return {
      ...baseRide,
      events: ride.events.map((event) => ({
        id: event.id,
        rideId: event.rideId,
        eventType: event.eventType,
        payload: this.toEventPayload(event.payload),
        createdAt: event.createdAt.toISOString()
      }))
    };
  }

  private toConversationLog(session: {
    id: string;
    channel: string;
    currentStep: string;
    latestRideId: string | null;
    state: Prisma.JsonValue;
    messages: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerConversationLog {
    const messages = this.parseConversationMessages(session.messages);
    const state = this.parseConversationState(session.state);

    return {
      id: session.id,
      channel: session.channel,
      currentStep: session.currentStep,
      latestRideId: session.latestRideId ?? undefined,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      summary: this.buildConversationSummary(state, session.currentStep),
      messages
    };
  }

  private parseConversationMessages(value: Prisma.JsonValue): CustomerConversationLogMessage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const message = item as Record<string, unknown>;
        return {
          id: String(message.id ?? ""),
          role: (message.role === "bot" || message.role === "user" || message.role === "system"
            ? message.role
            : "system") as CustomerConversationLogMessage["role"],
          text: String(message.text ?? "")
        };
      });
  }

  private parseConversationState(value: Prisma.JsonValue): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private buildConversationSummary(state: Record<string, unknown>, currentStep: string): string {
    const draft =
      state.draft && typeof state.draft === "object" && !Array.isArray(state.draft)
        ? (state.draft as Record<string, unknown>)
        : {};

    const lines = [
      draft.customerName ? `Cliente: ${draft.customerName}` : "",
      draft.tripTypeName ? `Tipo: ${draft.tripTypeName}` : "",
      draft.origin ? `Origem: ${draft.origin}` : "",
      draft.destination ? `Destino: ${draft.destination}` : "",
      draft.passengerCount ? `Passageiros: ${draft.passengerCount}` : "",
      draft.baggageCount
        ? `Malas: ${draft.baggageCount}${draft.baggageSize ? ` (${draft.baggageSize})` : ""}`
        : "",
      draft.petType ? `Pet: ${draft.petType}${draft.petSize ? ` (${draft.petSize})` : ""}` : "",
      draft.customerHasReducedMobility ? "Cadastro com mobilidade reduzida" : "",
      draft.companionSpecialAttentionDetails
        ? `Acompanhante: ${draft.companionSpecialAttentionDetails}`
        : "",
      draft.intermediateStopsSummary ? `Paradas: ${draft.intermediateStopsSummary}` : "",
      draft.scheduledAt ? `Horario informado: ${draft.scheduledAt}` : "",
      `Etapa final: ${currentStep}`
    ].filter(Boolean);

    return lines.length > 0 ? lines.join(" | ") : `Etapa final: ${currentStep}`;
  }

  private toEventPayload(payload: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return undefined;
    }

    return payload as Record<string, unknown>;
  }
}
