import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { RideCustomerProfile, RideStatus } from "../rides/types";
import { RidesService } from "../rides/rides.service";
import { CreateBenefitDto } from "./dto/create-benefit.dto";
import { CreateOvertimeTemplateDto } from "./dto/create-overtime-template.dto";
import { CreateRemunerationTemplateDto } from "./dto/create-remuneration-template.dto";
import { CreateTripTypeDto } from "./dto/create-trip-type.dto";
import { CreateWorkProfileDto } from "./dto/create-work-profile.dto";
import { CreatePricingRuleDto } from "./dto/create-pricing-rule.dto";
import { SaveCustomerFavoriteAddressDto } from "./dto/save-customer-favorite-address.dto";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { UpdateBenefitDto } from "./dto/update-benefit.dto";
import { UpdateOvertimeTemplateDto } from "./dto/update-overtime-template.dto";
import { UpdatePricingConfigDto } from "./dto/update-pricing-config.dto";
import { UpdatePricingRuleDto } from "./dto/update-pricing-rule.dto";
import { UpdateRemunerationTemplateDto } from "./dto/update-remuneration-template.dto";
import { UpdateTripTypeDto } from "./dto/update-trip-type.dto";
import { UpdateWorkProfileDto } from "./dto/update-work-profile.dto";
import {
  BenefitApplicationMode,
  BenefitContractProfile,
  BenefitDiscountBase,
  BenefitDiscountMode,
  BenefitFrequency,
  BenefitPercentageBase,
  BenefitSummary,
  BenefitType,
  BenefitValueConfig,
  CompanyProfileSummary,
  CustomerConversationLog,
  CustomerConversationLogMessage,
  CustomerFavoriteAddressSummary,
  CustomerProfile,
  CustomerRideHistoryItem,
  CustomerSummary,
  OvertimeTemplateSummary,
  PricingConfigSummary,
  PricingRuleSummary,
  RemunerationTemplateSummary,
  TripTypeSummary,
  WorkProfileBenefitRef,
  WorkProfileContractType,
  WorkProfileRemunerationSettings,
  WorkProfileSummary
} from "./types";

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
const WORK_PROFILE_CONTRACT_TYPE_VALUES = [
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

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ridesService: RidesService,
    private readonly pricingService: PricingService
  ) {}

  async getMetrics() {
    return {
      ridesByStatus: await this.ridesService.getMetrics(),
      generatedAt: new Date().toISOString()
    };
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
    return this.toCompanyProfileSummary(profile);
  }

  async updateCompanyProfile(input: UpdateCompanyProfileDto): Promise<CompanyProfileSummary> {
    const current = await this.ensureDefaultCompanyProfile();

    const profile = await this.prisma.companyProfileConfig.update({
      where: { id: current.id },
      data: {
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
          input.contractSignatureCity === undefined ? undefined : input.contractSignatureCity.trim() || null
      }
    });

    return this.toCompanyProfileSummary(profile);
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

  async listOvertimeTemplates(): Promise<OvertimeTemplateSummary[]> {
    const templates = await this.prisma.overtimeTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }]
    });

    return templates.map((template) => this.toOvertimeTemplateSummary(template));
  }

  async getOvertimeTemplate(id: string): Promise<OvertimeTemplateSummary> {
    const template = await this.prisma.overtimeTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new NotFoundException(`Template de hora extra ${id} nao encontrado.`);
    }

    return this.toOvertimeTemplateSummary(template);
  }

  async createOvertimeTemplate(input: CreateOvertimeTemplateDto): Promise<OvertimeTemplateSummary> {
    const template = await this.prisma.overtimeTemplate.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true,
        workProfiles: this.normalizeWorkProfiles(input.workProfiles),
        settings: this.normalizeOvertimeTemplateSettings(input.settings)
      }
    });

    return this.toOvertimeTemplateSummary(template);
  }

  async updateOvertimeTemplate(id: string, input: UpdateOvertimeTemplateDto): Promise<OvertimeTemplateSummary> {
    const current = await this.prisma.overtimeTemplate.findUnique({
      where: { id }
    });

    if (!current) {
      throw new NotFoundException(`Template de hora extra ${id} nao encontrado.`);
    }

    const template = await this.prisma.overtimeTemplate.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        description: input.description === undefined ? undefined : input.description.trim() || null,
        isActive: input.isActive,
        workProfiles:
          input.workProfiles === undefined ? undefined : this.normalizeWorkProfiles(input.workProfiles),
        settings:
          input.settings === undefined ? undefined : this.normalizeOvertimeTemplateSettings(input.settings)
      }
    });

    return this.toOvertimeTemplateSummary(template);
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
    const overtimeTemplates = await this.prisma.overtimeTemplate.findMany({
      select: { workProfiles: true }
    });

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
    const normalized = this.normalizeWorkProfilePayload(input);

    const profile = await this.prisma.workProfileTemplate.create({
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        cargoName: normalized.cargoName,
        contractType: normalized.contractType,
        journeyTemplateId: normalized.journeyTemplateId ?? null,
        journeyTemplateName: normalized.journeyTemplateName ?? null,
        journeySummary: normalized.journeySummary ?? null,
        remuneration: normalized.remuneration as unknown as Prisma.InputJsonValue,
        usesOvertime: normalized.usesOvertime,
        overtimeTemplateId: normalized.overtimeTemplateId ?? null,
        overtimeTemplateName: normalized.overtimeTemplateName ?? null,
        overtimeSummary: normalized.overtimeSummary ?? null,
        benefits: normalized.benefits as unknown as Prisma.InputJsonValue,
        allowContractEditing: normalized.allowContractEditing,
        allowJourneyCustomization: normalized.allowJourneyCustomization,
        allowBenefitsCustomization: normalized.allowBenefitsCustomization
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
    const normalized = this.normalizeWorkProfilePayload({
      name: input.name ?? currentPayload.name,
      description: input.description === undefined ? currentPayload.description : input.description,
      isActive: input.isActive ?? currentPayload.isActive,
      cargoName: input.cargoName ?? currentPayload.cargoName,
      cargoLevel: input.cargoLevel === undefined ? currentPayload.cargoLevel : input.cargoLevel,
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
      benefits: input.benefits ?? currentPayload.benefits,
      allowContractEditing:
        input.allowContractEditing ?? currentPayload.allowContractEditing,
      allowJourneyCustomization:
        input.allowJourneyCustomization ?? currentPayload.allowJourneyCustomization,
      allowBenefitsCustomization:
        input.allowBenefitsCustomization ?? currentPayload.allowBenefitsCustomization
    });

    const profile = await this.prisma.workProfileTemplate.update({
      where: { id },
      data: {
        name: normalized.name,
        description: normalized.description ?? null,
        isActive: normalized.isActive,
        cargoName: normalized.cargoName,
        contractType: normalized.contractType,
        journeyTemplateId: normalized.journeyTemplateId ?? null,
        journeyTemplateName: normalized.journeyTemplateName ?? null,
        journeySummary: normalized.journeySummary ?? null,
        remuneration: normalized.remuneration as unknown as Prisma.InputJsonValue,
        usesOvertime: normalized.usesOvertime,
        overtimeTemplateId: normalized.overtimeTemplateId ?? null,
        overtimeTemplateName: normalized.overtimeTemplateName ?? null,
        overtimeSummary: normalized.overtimeSummary ?? null,
        benefits: normalized.benefits as unknown as Prisma.InputJsonValue,
        allowContractEditing: normalized.allowContractEditing,
        allowJourneyCustomization: normalized.allowJourneyCustomization,
        allowBenefitsCustomization: normalized.allowBenefitsCustomization
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
    createdAt: Date;
    updatedAt: Date;
  }): CompanyProfileSummary {
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
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
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

    const destination = this.toEnum(
      overtime.destination,
      ["PAYMENT", "BANK_HOURS", "BOTH"] as const,
      "Destino de hora extra invalido.",
      "PAYMENT"
    );
    const overtimeEnabled = this.toBoolean(overtime.enabled, true);

    const overtime50 = this.toNumber(percentages.overtime50, 50, 0, 500, "Percentual de hora extra 50% invalido.");
    const overtime100 = this.toNumber(percentages.overtime100, 100, 0, 500, "Percentual de hora extra 100% invalido.");
    const nightAdditionalPercent = this.toNumber(
      percentages.nightAdditionalPercent,
      20,
      0,
      500,
      "Percentual de adicional noturno invalido."
    );

    const nightEnabled = this.toBoolean(night.enabled, true);
    const bankHoursEnabled = this.toBoolean(
      bankHours.enabled,
      destination === "BANK_HOURS" || destination === "BOTH"
    );

    const settings = {
      policyCategory,
      overtime: {
        enabled: overtimeEnabled,
        afterDailyHours: this.toNumber(
          overtime.afterDailyHours,
          8,
          0,
          24,
          "Horas para gerar hora extra diaria invalidas."
        ),
        afterWeeklyHours: this.toNumber(
          overtime.afterWeeklyHours,
          44,
          0,
          168,
          "Horas para gerar hora extra semanal invalidas."
        ),
        destination
      },
      percentages: {
        overtime50,
        overtime100,
        nightAdditionalPercent
      },
      rules: {
        maxExtraHoursPerDay: this.toOptionalNumber(
          rules.maxExtraHoursPerDay,
          0,
          24,
          "Quantidade maxima diaria de hora extra invalida."
        ),
        requiresApproval: this.toBoolean(rules.requiresApproval, false),
        compensateDelayWithOvertime: this.toBoolean(rules.compensateDelayWithOvertime, false),
        toleranceMinutes: this.toInteger(
          rules.toleranceMinutes,
          0,
          0,
          240,
          "Tolerancia de minutos invalida."
        )
      },
      rounding: {
        type: this.toEnum(
          rounding.type,
          ["UP", "DOWN", "NEAREST"] as const,
          "Tipo de arredondamento invalido.",
          "NEAREST"
        ),
        intervalMinutes: this.toInteger(
          rounding.intervalMinutes,
          15,
          1,
          120,
          "Intervalo de arredondamento invalido."
        )
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
        startTime: nightEnabled
          ? this.normalizeClockTime(night.startTime, "22:00", "Horario inicial de adicional noturno invalido.")
          : undefined,
        endTime: nightEnabled
          ? this.normalizeClockTime(night.endTime, "05:00", "Horario final de adicional noturno invalido.")
          : undefined,
        percent: nightEnabled
          ? this.toNumber(night.percent, nightAdditionalPercent, 0, 500, "Percentual noturno invalido.")
          : undefined,
        accumulatesWithOvertime: nightEnabled ? this.toBoolean(night.accumulatesWithOvertime, true) : false
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

  private toWorkProfilePayload(template: {
    name: string;
    description: string | null;
    isActive: boolean;
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
    benefits: Prisma.JsonValue | null;
    allowContractEditing: boolean;
    allowJourneyCustomization: boolean;
    allowBenefitsCustomization: boolean;
  }) {
    return this.normalizeWorkProfilePayload({
      name: template.name,
      description: template.description ?? undefined,
      isActive: template.isActive,
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
    const isLaborContract = contractType === "CLT" || contractType === "CLT_INTERMITENTE";
    const allowsOvertimePolicy = contractType === "CLT";
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
    if (isLaborContract && (!journeyTemplateId || !journeyTemplateName)) {
      throw new BadRequestException("Selecione uma jornada de trabalho cadastrada.");
    }

    const remuneration = this.normalizeWorkProfileRemuneration(input.remuneration);
    if (contractType === "CLT_INTERMITENTE" && remuneration.model === "COMMISSION_ONLY") {
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

    if (usesOvertime && (!overtimeTemplateId || !overtimeTemplateName)) {
      throw new BadRequestException(
        "Selecione uma politica de hora extra ou marque que o perfil nao utiliza hora extra."
      );
    }

    const benefits = this.normalizeWorkProfileBenefits(input.benefits);

    return {
      name,
      description,
      isActive: this.toBoolean(input.isActive, true),
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
      benefits,
      allowContractEditing: this.toBoolean(input.allowContractEditing, true),
      allowJourneyCustomization: this.toBoolean(input.allowJourneyCustomization, true),
      allowBenefitsCustomization: this.toBoolean(input.allowBenefitsCustomization, true)
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
    benefits: WorkProfileBenefitRef[];
    allowContractEditing: boolean;
    allowJourneyCustomization: boolean;
    allowBenefitsCustomization: boolean;
  }): string {
    const parts: string[] = [];

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
      if (payload.contractType === "CLT_INTERMITENTE") {
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
      if (payload.contractType === "CLT_INTERMITENTE") {
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

    if (payload.benefits.length > 0) {
      parts.push(`Beneficios: ${payload.benefits.map((item) => item.name).join(", ")}`);
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

  private toOptionalNumber(value: unknown, min: number, max: number, message: string): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(message);
    }
    return Number(parsed.toFixed(2));
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
