import { Prisma, UserRole } from "@prisma/client";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { connect as netConnect, Socket } from "node:net";
import { connect as tlsConnect, TLSSocket } from "node:tls";
import { DEFAULT_FLEET_CHECKLIST_TEMPLATES } from "../fleet/types";
import { MapsService } from "../maps/maps.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  DriverEmergencyCancellationReason,
  Ride,
  RideCustomerProfile,
  RideEvent,
  RideMapPreview,
  RideStatus
} from "../rides/types";
import { RidesService } from "../rides/rides.service";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { CreateDriverLeavePeriodDto } from "./dto/create-driver-leave-period.dto";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { hashDriverPassword } from "./password.util";
import { StartFleetVehicleSessionDto } from "./dto/start-fleet-vehicle-session.dto";
import { UpdateDriverDto } from "./dto/update-driver.dto";
import { UpdateDriverLeavePeriodDto } from "./dto/update-driver-leave-period.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import {
  DriverAddress,
  DriverAccessibility,
  DriverComplianceHistoryItem,
  DriverCompensationSettings,
  DriverContract,
  DriverContractProfile,
  DriverEmergencyContact,
  DriverEmploymentContract,
  DriverEmploymentContractEndorsement,
  DriverEmploymentContractEndorsementType,
  DriverEmploymentContractKind,
  DriverEmploymentContractStatus,
  DriverFleetDefaultVehicleSummary,
  DriverFleetChecklistItem,
  DriverFleetVehicleDetails,
  DriverFleetVehicleSummary,
  DriverJourney,
  DriverLicense,
  DriverLeavePeriod,
  DriverLeavePeriodType,
  FleetAssignmentMode,
  DriverOperationalEligibility,
  DriverOperationalStatus,
  DriverOperationalSummary,
  DriverProfile,
  DriverPsychotechnical,
  DriverToxicology,
  DriverVehicle,
  FleetVehicleAssignmentValidationMethod
} from "./types";

const driverInclude = {
  user: true,
  defaultFleetVehicle: true,
  vehicles: {
    orderBy: { createdAt: "desc" }
  },
  fleetAssignments: {
    where: { endedAt: null },
    orderBy: { startedAt: "desc" },
    take: 1,
    include: {
      fleetVehicle: true
    }
  }
} as const;

const CUSTOMER_SCORE_BASE = 50;
const CUSTOMER_AGE_BONUS_DAYS = 60;
const ACTIVE_MONTH_LOOKBACK_DAYS = 30;
const DRIVER_ACTIVE_STATUSES: DriverOperationalStatus[] = ["ACTIVE"];
const CONTRACT_WARNING_WINDOW_DAYS = 30;
type JourneyWeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

type EmploymentContractDraft = {
  profile: "CLT" | "INTERMITENTE" | "MEI";
  templateKey: string;
  templateName?: string;
  templateVersion: string;
  templateContent?: string;
  driverId: string;
  driverName: string;
  driverCpf: string;
  driverPhone: string;
  driverEmail?: string;
  validFrom?: string;
  validTo?: string;
  termDescription: string;
  experienceDescription: string;
  remunerationDescription: string;
  journeyDescription: string;
  benefitsDescription: string;
  notesDescription: string;
  providerCnpj?: string;
  providerLegalName?: string;
  providerTradeName?: string;
  providerMunicipalRegistration?: string;
  generatedAt: string;
  snapshot: Record<string, unknown>;
};

type EmploymentContractEndorsementInput = {
  type?: DriverEmploymentContractEndorsementType;
  effectiveDate?: string;
  notes?: string;
  changes?: Record<string, unknown>;
  applySettings?: boolean;
  contract?: DriverContract;
  journey?: DriverJourney;
};

type EmploymentContractTerminationInput = {
  mode?: "CANCEL" | "FINALIZE";
  reason?: string;
};

type EmploymentContractRenewalInput = {
  templateKey?: string;
  templateName?: string;
  templateVersion?: string;
  templateContent?: string;
  contract?: DriverContract;
  journey?: DriverJourney;
};

type EmploymentTemplateSelectionInput = {
  templateKey?: string;
  templateName?: string;
  templateVersion?: string;
  templateContent?: string;
};

type WorkProfileLookupClient = Pick<PrismaService, "workProfileTemplate" | "workJourneyTemplate" | "overtimeTemplate">;

type EmploymentContractSignatureRequestInput = {
  signerEmail?: string;
};

type EmploymentContractSignatureRequestResult = {
  driver: DriverProfile;
  signerEmail: string;
  signatureUrl: string;
  expiresAt: string;
  emailDeliveryStatus: "SENT" | "SKIPPED" | "FAILED";
  emailDeliveryMessage?: string;
};

type SignatureEmailDeliveryResult = {
  status: "SENT" | "SKIPPED" | "FAILED";
  message?: string;
};

type EmploymentContractSignatureConfirmInput = {
  signerName?: string;
  signerDocument?: string;
  signerIp?: string;
  userAgent?: string;
};

type EmploymentContractPublicSignatureSession = {
  contractId: string;
  driverId: string;
  driverName: string;
  documentCode: string;
  contentHash: string;
  signerEmail: string;
  signerName?: string;
  signerDocument?: string;
  status: DriverEmploymentContractStatus;
  title: string;
  templateName?: string;
  templateVersion: string;
  generatedAt: string;
  validFrom?: string;
  validTo?: string;
  content: string;
  requestedAt?: string;
  expiresAt?: string;
  signedAt?: string;
  auditLogs: Array<{
    createdAt: string;
    event: string;
    source?: string;
    summary: string;
  }>;
  canSign: boolean;
  message?: string;
};

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ridesService: RidesService,
    private readonly mapsService: MapsService
  ) {}

  async createDriver(input: CreateDriverDto): Promise<DriverProfile> {
    const compensationInput = this.resolveCompensationInput({
      compensationModel: input.compensationModel,
      compensationValue: input.compensationValue,
      compensationNotes: input.compensationNotes
    });
    const operationalState = this.resolveOperationalState({
      isActive: input.isActive,
      operationalStatus: input.operationalStatus,
      operationalNotes: input.operationalNotes
    });

    const driver = await this.prisma.$transaction(async (tx) => {
      const fleetConfig = await this.resolveFleetConfigInput(
        tx,
        input.driverType ?? "AGREGADO",
        input.fleetAssignmentMode,
        input.defaultFleetVehicleId
      );
      const user = await tx.user.create({
        data: {
          role: UserRole.DRIVER,
          name: input.name.trim(),
          cpf: this.normalizeCpf(input.cpf),
          phone: this.normalizePhone(input.phone),
          email: this.normalizeOptional(input.email),
          passwordHash: input.password?.trim() ? hashDriverPassword(input.password.trim()) : null,
          birthDate: this.normalizeBirthDate(input.birthDate),
          gender: input.gender
        }
      });

      const requestedContractProfile = input.contractProfile;
      const inheritedSettings = await this.applyWorkProfileInheritance(
        tx,
        requestedContractProfile,
        input.contract === undefined ? undefined : this.parseContract(input.contract),
        input.journey === undefined ? undefined : this.parseJourney(input.journey)
      );
      const nextContractProfile = inheritedSettings.profile ?? requestedContractProfile;

      return tx.driver.create({
        data: ({
          userId: user.id,
          isActive: operationalState.isActive,
          photoUrl: this.normalizeOptional(input.photoUrl),
          bloodType: this.normalizeOptional(input.bloodType),
          emergencyContacts: this.normalizeEmergencyContacts(input.emergencyContacts),
          address: this.normalizeAddress(input.address),
          driverLicense: this.normalizeDriverLicense(input.driverLicense),
          toxicology: this.normalizeToxicology(input.toxicology),
          complianceHistory: this.normalizeComplianceHistory(input.complianceHistory),
          contractProfile: nextContractProfile ?? null,
          journey: this.normalizeJourney(inheritedSettings.journey, nextContractProfile),
          contract: this.normalizeContract(inheritedSettings.contract, nextContractProfile),
          driverType: input.driverType ?? "AGREGADO",
          fleetAssignmentMode: fleetConfig.fleetAssignmentMode,
          defaultFleetVehicleId: fleetConfig.defaultFleetVehicleId,
          operationalStatus: operationalState.operationalStatus,
          operationalNotes: operationalState.operationalNotes,
          ...compensationInput
        } as any),
        include: driverInclude
      });
    });

    const summaries = await this.buildDriverOperationMeta([driver.id]);
    return this.toDriverProfile(driver, summaries.get(driver.id));
  }

  async getDriver(driverId: string): Promise<DriverProfile> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const summaries = await this.buildDriverOperationMeta([driver.id]);
    return this.toDriverProfile(driver, summaries.get(driver.id));
  }

  async listDriverLeavePeriods(driverId: string): Promise<DriverLeavePeriod[]> {
    await this.ensureDriverExists(driverId);
    const periods = await this.prisma.driverLeavePeriod.findMany({
      where: { driverId },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
    });

    return periods.map((period) => this.toDriverLeavePeriod(period));
  }

  async createDriverLeavePeriod(
    driverId: string,
    input: CreateDriverLeavePeriodDto
  ): Promise<DriverLeavePeriod> {
    await this.ensureDriverExists(driverId);
    const normalized = this.normalizeDriverLeavePeriodInput(input);
    await this.ensureNoDriverLeavePeriodOverlap(driverId, normalized.startDate, normalized.endDate);

    const period = await this.prisma.driverLeavePeriod.create({
      data: {
        driverId,
        type: normalized.type,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        reason: normalized.reason ?? null,
        notes: normalized.notes ?? null
      }
    });

    return this.toDriverLeavePeriod(period);
  }

  async updateDriverLeavePeriod(
    driverId: string,
    periodId: string,
    input: UpdateDriverLeavePeriodDto
  ): Promise<DriverLeavePeriod> {
    await this.ensureDriverExists(driverId);
    const current = await this.prisma.driverLeavePeriod.findFirst({
      where: {
        id: periodId,
        driverId
      }
    });

    if (!current) {
      throw new NotFoundException("Periodo nao encontrado para este motorista.");
    }

    const normalized = this.normalizeDriverLeavePeriodInput({
      type: input.type ?? current.type,
      startDate: input.startDate ?? this.toDateOnly(current.startDate),
      endDate: input.endDate ?? this.toDateOnly(current.endDate),
      reason: input.reason === undefined ? current.reason ?? undefined : input.reason,
      notes: input.notes === undefined ? current.notes ?? undefined : input.notes
    });
    await this.ensureNoDriverLeavePeriodOverlap(
      driverId,
      normalized.startDate,
      normalized.endDate,
      current.id
    );

    const period = await this.prisma.driverLeavePeriod.update({
      where: { id: current.id },
      data: {
        type: normalized.type,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        reason: normalized.reason ?? null,
        notes: normalized.notes ?? null
      }
    });

    return this.toDriverLeavePeriod(period);
  }

  async deleteDriverLeavePeriod(driverId: string, periodId: string): Promise<void> {
    await this.ensureDriverExists(driverId);
    const deleted = await this.prisma.driverLeavePeriod.deleteMany({
      where: {
        id: periodId,
        driverId
      }
    });

    if (deleted.count === 0) {
      throw new NotFoundException("Periodo nao encontrado para este motorista.");
    }
  }

  async generateEmploymentContract(
    driverId: string,
    templateSelection?: EmploymentTemplateSelectionInput
  ): Promise<DriverProfile> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException(
        "Geracao automatica de contrato disponivel apenas para perfis CLT, Intermitente ou MEI."
      );
    }

    const contract = this.parseContract(current.contract);
    const journey = this.parseJourney(current.journey);
    const nextContract = await this.buildNextContractWithGeneratedDocument({
      driver: current,
      profile,
      contract,
      journey,
      kind: "NEW",
      templateSelection
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract
      }
    });

    return this.getDriver(driverId);
  }

  async renewEmploymentContract(
    driverId: string,
    contractId: string,
    input?: EmploymentContractRenewalInput
  ): Promise<DriverProfile> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException("Renovacao automatica disponivel apenas para CLT, Intermitente ou MEI.");
    }

    const contract = this.parseContract(current.contract);
    const journey = this.parseJourney(current.journey);
    const mergedContract = this.mergeEmploymentContractSettings(contract, this.parseContract(input?.contract));
    const mergedJourney = this.mergeJourneySettings(journey, this.parseJourney(input?.journey));
    const nextContract = await this.buildNextContractWithGeneratedDocument({
      driver: current,
      profile,
      contract: mergedContract,
      journey: mergedJourney,
      kind: "RENEWAL",
      parentContractId: contractId,
      templateSelection: input
        ? {
            templateKey: input.templateKey,
            templateName: input.templateName,
            templateVersion: input.templateVersion,
            templateContent: input.templateContent
          }
        : undefined
    });

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract,
        ...(input?.journey !== undefined
          ? {
              journey:
                this.normalizeJourney(mergedJourney, profile) ?? Prisma.JsonNull
            }
          : {})
      }
    });

    return this.getDriver(driverId);
  }

  async activateEmploymentContract(driverId: string, contractId: string): Promise<DriverProfile> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException("Ativacao contratual disponivel apenas para CLT, Intermitente ou MEI.");
    }

    const contract = this.parseContract(current.contract);
    if (!contract) {
      throw new BadRequestException("Nenhum contrato configurado para ativacao.");
    }

    const contracts = [...(contract.employmentContracts ?? [])];
    if (contracts.length === 0) {
      throw new BadRequestException("Nenhum documento contratual encontrado para ativacao.");
    }

    const target = contracts.find((item) => item.id === contractId);
    if (!target) {
      throw new NotFoundException("Contrato selecionado para ativacao nao foi encontrado.");
    }

    if (target.status === "ACTIVE" || target.status === "EXPIRING_SOON") {
      return this.getDriver(driverId);
    }

    if (target.status !== "DRAFT" && target.status !== "PENDING_SIGNATURE") {
      throw new BadRequestException("Apenas contratos em rascunho ou pendentes de assinatura podem ser ativados.");
    }

    const activatedAt = new Date().toISOString();
    const nextContracts = contracts.map((item) => {
      if (item.id === contractId) {
        return {
          ...item,
          status: this.resolveActiveLifecycleStatus(item.validTo),
          signedAt: activatedAt,
          terminatedAt: undefined
        };
      }

      if (item.status === "ACTIVE" || item.status === "EXPIRING_SOON") {
        return {
          ...item,
          status: "TERMINATED" as DriverEmploymentContractStatus,
          terminatedAt: activatedAt
        };
      }

      return item;
    });

    if (target.parentContractId) {
      const parentIndex = nextContracts.findIndex((item) => item.id === target.parentContractId);
      if (parentIndex >= 0) {
        const parent = nextContracts[parentIndex];
        if (parent.status !== "EXPIRED" && parent.status !== "TERMINATED") {
          nextContracts[parentIndex] = {
            ...parent,
            status: "TERMINATED",
            terminatedAt: activatedAt
          };
        }
      }
    }

    const nextContract = this.normalizeContract(
      {
        ...contract,
        employmentContracts: nextContracts
      },
      profile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel atualizar o status do contrato.");
    }

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract
      }
    });

    return this.getDriver(driverId);
  }

  async requestEmploymentContractSignature(
    driverId: string,
    contractId: string,
    input?: EmploymentContractSignatureRequestInput
  ): Promise<EmploymentContractSignatureRequestResult> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException("Solicitacao de assinatura disponivel apenas para CLT, Intermitente ou MEI.");
    }

    const contract = this.parseContract(current.contract);
    if (!contract?.employmentContracts || contract.employmentContracts.length === 0) {
      throw new BadRequestException("Nenhum contrato encontrado para solicitacao de assinatura.");
    }

    const target = contract.employmentContracts.find((item) => item.id === contractId);
    if (!target) {
      throw new NotFoundException("Contrato selecionado para assinatura nao foi encontrado.");
    }

    if (target.status !== "DRAFT" && target.status !== "PENDING_SIGNATURE") {
      throw new BadRequestException("Somente contratos em rascunho ou pendentes podem receber solicitacao de assinatura.");
    }

    const signerEmail = (input?.signerEmail ?? current.user.email ?? "").trim().toLowerCase();
    if (!signerEmail) {
      throw new BadRequestException("Defina um e-mail do motorista para enviar a assinatura.");
    }

    const requestedAt = new Date();
    const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const signatureToken = randomUUID().replace(/-/g, "") + randomUUID().slice(0, 8);
    const signatureTokenHash = createHash("sha256").update(signatureToken).digest("hex");
    const signatureUrl = this.buildInternalSignatureUrl(signatureToken);

    const nextContracts = contract.employmentContracts.map((item) => {
      if (item.id !== contractId) {
        return item;
      }

      const currentSnapshot = this.isRecord(item.snapshot) ? item.snapshot : {};
      const previousEvents = Array.isArray(currentSnapshot.auditEvents)
        ? currentSnapshot.auditEvents.filter((entry) => this.isRecord(entry))
        : [];
      const auditEvent = {
        type: "SIGNATURE_REQUESTED",
        createdAt: requestedAt.toISOString(),
        source: "ADMIN_PANEL",
        signerEmail,
        expiresAt: expiresAt.toISOString()
      };

      return {
        ...item,
        status: "PENDING_SIGNATURE" as DriverEmploymentContractStatus,
        snapshot: {
          ...currentSnapshot,
          signatureRequest: {
            signerEmail,
            requestedAt: requestedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            signatureTokenHash,
            signatureUrl
          },
          auditEvents: [auditEvent, ...previousEvents].slice(0, 50)
        }
      };
    });

    const nextContract = this.normalizeContract(
      {
        ...contract,
        employmentContracts: nextContracts
      },
      profile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel registrar a solicitacao de assinatura.");
    }

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract
      }
    });

    const emailDelivery = await this.sendContractSignatureRequestEmail({
      to: signerEmail,
      driverName: current.user.name,
      contractTitle: target.title,
      signatureUrl,
      expiresAt: expiresAt.toISOString()
    });

    return {
      driver: await this.getDriver(driverId),
      signerEmail,
      signatureUrl,
      expiresAt: expiresAt.toISOString(),
      emailDeliveryStatus: emailDelivery.status,
      emailDeliveryMessage: emailDelivery.message
    };
  }

  async getEmploymentContractSignatureSession(
    token: string
  ): Promise<EmploymentContractPublicSignatureSession> {
    const lookup = await this.findContractBySignatureToken(token);
    return this.buildPublicSignatureSession(lookup.driver, lookup.contractEntry);
  }

  async confirmEmploymentContractSignature(
    token: string,
    input?: EmploymentContractSignatureConfirmInput
  ): Promise<EmploymentContractPublicSignatureSession> {
    const lookup = await this.findContractBySignatureToken(token);
    const currentContract = lookup.contractRoot;
    const target = lookup.contractEntry;
    const currentSnapshot = this.isRecord(target.snapshot) ? target.snapshot : {};
    const signatureRequest = this.isRecord(currentSnapshot.signatureRequest)
      ? currentSnapshot.signatureRequest
      : undefined;

    if (!signatureRequest) {
      throw new BadRequestException("Este contrato ainda nao recebeu solicitacao de assinatura.");
    }

    const signatureExpiresAt =
      typeof signatureRequest.expiresAt === "string" && signatureRequest.expiresAt.trim().length > 0
        ? signatureRequest.expiresAt.trim()
        : undefined;
    if (this.isDateTimeExpired(signatureExpiresAt)) {
      throw new BadRequestException("Link de assinatura expirado. Solicite um novo envio.");
    }

    if (target.status !== "DRAFT" && target.status !== "PENDING_SIGNATURE") {
      throw new BadRequestException("Este contrato nao pode mais ser assinado por este link.");
    }

    const signedAt = new Date().toISOString();
    const normalizedSignerName =
      typeof input?.signerName === "string" && input.signerName.trim().length > 0
        ? input.signerName.trim()
        : undefined;
    const normalizedSignerDocument =
      typeof input?.signerDocument === "string" && input.signerDocument.trim().length > 0
        ? input.signerDocument.trim()
        : undefined;
    const normalizedSignerIp =
      typeof input?.signerIp === "string" && input.signerIp.trim().length > 0
        ? input.signerIp.trim()
        : undefined;
    const normalizedUserAgent =
      typeof input?.userAgent === "string" && input.userAgent.trim().length > 0
        ? input.userAgent.trim()
        : undefined;

    const nextContracts = currentContract.employmentContracts?.map((item) => {
      if (item.id === target.id) {
        const snapshot = this.isRecord(item.snapshot) ? item.snapshot : {};
        const previousEvents = Array.isArray(snapshot.auditEvents)
          ? snapshot.auditEvents.filter((entry) => this.isRecord(entry))
          : [];
        const currentSignatureRequest = this.isRecord(snapshot.signatureRequest)
          ? snapshot.signatureRequest
          : {};
        const resolvedSignerEmail =
          typeof currentSignatureRequest.signerEmail === "string" && currentSignatureRequest.signerEmail.trim().length > 0
            ? currentSignatureRequest.signerEmail.trim()
            : lookup.driver.user.email ?? "";

        const auditEvent = {
          type: "SIGNED_VIA_LINK",
          createdAt: signedAt,
          source: "PUBLIC_SIGNATURE_LINK",
          signerEmail: resolvedSignerEmail,
          signerName: normalizedSignerName,
          signerDocument: normalizedSignerDocument,
          signerIp: normalizedSignerIp,
          userAgent: normalizedUserAgent
        };
        const signedContent = this.appendDigitalSignatureEvidence(item.content, {
          signedAt,
          signerEmail: resolvedSignerEmail,
          signerName: normalizedSignerName,
          signerDocument: normalizedSignerDocument,
          signerIp: normalizedSignerIp
        });

        return {
          ...item,
          status: this.resolveActiveLifecycleStatus(item.validTo) as DriverEmploymentContractStatus,
          signedAt,
          terminatedAt: undefined,
          content: signedContent,
          snapshot: {
            ...snapshot,
            signatureRequest: {
              ...currentSignatureRequest,
              signedAt,
              signerName: normalizedSignerName,
              signerDocument: normalizedSignerDocument,
              signerIp: normalizedSignerIp,
              userAgent: normalizedUserAgent
            },
            digitalSignature: {
              status: "SIGNED",
              signedAt,
              signerEmail: resolvedSignerEmail,
              signerName: normalizedSignerName,
              signerDocument: normalizedSignerDocument,
              signerIp: normalizedSignerIp,
              userAgent: normalizedUserAgent
            },
            auditEvents: [auditEvent, ...previousEvents].slice(0, 50)
          }
        };
      }

      if (item.status === "ACTIVE" || item.status === "EXPIRING_SOON") {
        return {
          ...item,
          status: "TERMINATED" as DriverEmploymentContractStatus,
          terminatedAt: signedAt
        };
      }

      return item;
    });

    if (!nextContracts || nextContracts.length === 0) {
      throw new BadRequestException("Nao foi possivel atualizar o contrato para assinatura.");
    }

    if (target.parentContractId) {
      const parentIndex = nextContracts.findIndex((item) => item.id === target.parentContractId);
      if (parentIndex >= 0) {
        const parent = nextContracts[parentIndex];
        if (parent.status !== "EXPIRED" && parent.status !== "TERMINATED") {
          nextContracts[parentIndex] = {
            ...parent,
            status: "TERMINATED",
            terminatedAt: signedAt
          };
        }
      }
    }

    const nextContract = this.normalizeContract(
      {
        ...currentContract,
        employmentContracts: nextContracts
      },
      lookup.profile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel confirmar a assinatura do contrato.");
    }

    await this.prisma.driver.update({
      where: { id: lookup.driver.id },
      data: {
        contract: nextContract
      }
    });

    const refreshedLookup = await this.findContractBySignatureToken(token);
    return this.buildPublicSignatureSession(refreshedLookup.driver, refreshedLookup.contractEntry);
  }

  async endorseEmploymentContract(
    driverId: string,
    contractId: string,
    input: EmploymentContractEndorsementInput
  ): Promise<DriverProfile> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException("Endosso contratual disponivel apenas para CLT, Intermitente ou MEI.");
    }

    const contract = this.parseContract(current.contract);
    if (!contract?.employmentContracts || contract.employmentContracts.length === 0) {
      throw new BadRequestException("Nenhum contrato encontrado para receber endosso.");
    }

    const target = contract.employmentContracts.find((item) => item.id === contractId);
    if (!target) {
      throw new NotFoundException("Contrato selecionado para endosso nao foi encontrado.");
    }

    if (target.status !== "ACTIVE" && target.status !== "EXPIRING_SOON") {
      throw new BadRequestException("Apenas contratos ativos podem receber endosso.");
    }

    const effectiveDateRaw = (input.effectiveDate ?? "").trim();
    const effectiveDate =
      effectiveDateRaw.length > 0 ? effectiveDateRaw : this.toDateOnly(new Date());
    if (Number.isNaN(new Date(`${effectiveDate}T12:00:00.000Z`).getTime())) {
      throw new BadRequestException("Data de vigencia do endosso invalida.");
    }

    const contractPatch = this.parseContract(input.contract);
    const journeyPatch = this.parseJourney(input.journey);
    const hasConfigPatch = Boolean(contractPatch || journeyPatch);
    const applySettings = input.applySettings !== false && hasConfigPatch;
    const mergedContract = this.mergeEmploymentContractSettings(contract, contractPatch) ?? contract;
    const mergedJourney = this.mergeJourneySettings(this.parseJourney(current.journey), journeyPatch);
    const rawChanges = this.isRecord(input.changes) ? input.changes : {};
    const enrichment: Record<string, unknown> = {};
    if (contractPatch) enrichment.contractPatch = contractPatch;
    if (journeyPatch) enrichment.journeyPatch = journeyPatch;

    const endorsement: DriverEmploymentContractEndorsement = {
      id: `endorsement_${randomUUID()}`,
      type: input.type ?? "OTHER",
      status: "ACTIVE",
      effectiveDate,
      notes: typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : undefined,
      changes: {
        ...rawChanges,
        ...enrichment
      },
      createdAt: new Date().toISOString(),
      signedAt: new Date().toISOString()
    };

    const nextContracts = contract.employmentContracts.map((item) =>
      item.id === contractId
        ? {
            ...item,
            endorsements: [endorsement, ...(item.endorsements ?? [])].slice(0, 25)
          }
        : item
    );

    const nextContract = this.normalizeContract(
      {
        ...(applySettings ? mergedContract : contract),
        employmentContracts: nextContracts
      },
      profile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel registrar o endosso.");
    }

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract,
        ...(applySettings && journeyPatch
          ? {
              journey:
                this.normalizeJourney(mergedJourney, profile) ?? Prisma.JsonNull
            }
          : {})
      }
    });

    return this.getDriver(driverId);
  }

  async terminateEmploymentContract(
    driverId: string,
    contractId: string,
    input?: EmploymentContractTerminationInput
  ): Promise<DriverProfile> {
    const current = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: driverInclude
    });

    if (!current) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    const profile = this.parseContractProfile(current.contractProfile);
    if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
      throw new BadRequestException("Operacao de encerramento disponivel apenas para CLT, Intermitente ou MEI.");
    }

    const contract = this.parseContract(current.contract);
    if (!contract?.employmentContracts || contract.employmentContracts.length === 0) {
      throw new BadRequestException("Nenhum contrato encontrado para encerrar/cancelar.");
    }

    const target = contract.employmentContracts.find((item) => item.id === contractId);
    if (!target) {
      throw new NotFoundException("Contrato selecionado nao foi encontrado.");
    }

    if (target.status === "TERMINATED") {
      return this.getDriver(driverId);
    }

    const targetIsCancelable = target.status === "DRAFT" || target.status === "PENDING_SIGNATURE";
    const targetIsTerminable =
      target.status === "ACTIVE" || target.status === "EXPIRING_SOON" || target.status === "EXPIRED";
    const normalizedMode = input?.mode ?? (targetIsCancelable ? "CANCEL" : "FINALIZE");
    const reason = typeof input?.reason === "string" && input.reason.trim().length > 0 ? input.reason.trim() : undefined;

    if (normalizedMode === "CANCEL" && !targetIsCancelable) {
      throw new BadRequestException("Cancelamento permitido apenas para contrato em rascunho ou pendente de assinatura.");
    }

    if (normalizedMode === "FINALIZE" && !targetIsTerminable) {
      throw new BadRequestException("Encerramento permitido apenas para contrato ativo, expirando ou expirado.");
    }

    if (!targetIsCancelable && !targetIsTerminable) {
      throw new BadRequestException("Status atual nao permite encerramento/cancelamento.");
    }

    const terminatedAt = new Date().toISOString();
    const nextContracts = contract.employmentContracts.map((item) => {
      if (item.id !== contractId) {
        return item;
      }

      return {
        ...item,
        status: "TERMINATED" as DriverEmploymentContractStatus,
        terminatedAt,
        snapshot: {
          ...item.snapshot,
          termination: {
            mode: normalizedMode,
            reason,
            terminatedAt
          }
        }
      };
    });

    const nextContract = this.normalizeContract(
      {
        ...contract,
        employmentContracts: nextContracts
      },
      profile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel encerrar/cancelar o contrato.");
    }

    await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contract: nextContract
      }
    });

    return this.getDriver(driverId);
  }

  async getCurrentFleetVehicle(driverId: string): Promise<DriverFleetVehicleDetails> {
    const assignment = await this.ensureCurrentFleetVehicleAssignment(driverId);
    return this.buildDriverFleetVehicleDetails(assignment);
  }

  async startFleetVehicleSession(
    driverId: string,
    input: StartFleetVehicleSessionDto
  ): Promise<DriverProfile> {
    const driver = await this.prisma.$transaction(async (tx) => {
      const current = await tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: {
          user: true,
          defaultFleetVehicle: true,
          vehicles: {
            orderBy: { createdAt: "desc" }
          },
          fleetAssignments: {
            where: { endedAt: null },
            orderBy: { startedAt: "desc" },
            include: {
              fleetVehicle: true
            }
          }
        }
      });

      if (current.driverType !== "FROTA") {
        throw new BadRequestException("Validacao de carro por turno esta disponivel apenas para motorista da frota.");
      }

      if (!current.isActive || !DRIVER_ACTIVE_STATUSES.includes(current.operationalStatus)) {
        throw new BadRequestException("Motorista fora da operacao nao pode validar carro neste momento.");
      }

      if (!current.fleetAssignmentMode) {
        throw new BadRequestException("Defina no painel se esse motorista da frota usa carro fixo ou nao fixo.");
      }

      const qrCodeToken = input.qrCodeToken?.trim();
      const plate = input.plate?.trim().toUpperCase();

      if (!qrCodeToken && !plate) {
        throw new BadRequestException("Informe o codigo do QR ou a placa para validar o carro.");
      }

      const currentAssignment = current.fleetAssignments[0];
      const vehicle = await tx.fleetVehicle.findFirst({
        where: qrCodeToken ? { checkinCode: qrCodeToken } : { plate },
        select: {
          id: true,
          label: true,
          plate: true,
          color: true,
          year: true,
          status: true,
          checkinCode: true
        }
      });

      if (!vehicle) {
        throw new NotFoundException("Carro da frota nao encontrado para a validacao informada.");
      }

      if (current.fleetAssignmentMode === "FIXED") {
        if (!current.defaultFleetVehicleId) {
          throw new BadRequestException("Defina um veiculo padrao para esse motorista antes da validacao.");
        }

        if (vehicle.id !== current.defaultFleetVehicleId) {
          throw new BadRequestException("Esse motorista so pode validar o veiculo fixo definido no cadastro.");
        }
      }

      if (vehicle.status === "MAINTENANCE" || vehicle.status === "INACTIVE") {
        throw new BadRequestException("Esse carro nao esta liberado para operacao no momento.");
      }

      const activeVehicleAssignment = await tx.fleetVehicleAssignment.findFirst({
        where: {
          fleetVehicleId: vehicle.id,
          endedAt: null
        },
        select: {
          id: true,
          driverId: true
        }
      });

      if (currentAssignment) {
        if (currentAssignment.fleetVehicleId === vehicle.id) {
          return tx.driver.findUniqueOrThrow({
            where: { id: driverId },
            include: driverInclude
          });
        }

        throw new BadRequestException("Encerre o carro atual antes de validar outro veiculo da frota.");
      }

      if (activeVehicleAssignment && activeVehicleAssignment.driverId !== driverId) {
        throw new BadRequestException("Esse carro ja esta em uso por outro motorista.");
      }

      await tx.fleetVehicleAssignment.create({
        data: {
          fleetVehicleId: vehicle.id,
          driverId,
          validationMethod: qrCodeToken ? "QR_CODE" : "PLATE",
          notes: qrCodeToken ? "Validado por QR code no app do motorista." : "Validado por placa no app do motorista."
        }
      });

      await tx.fleetVehicle.update({
        where: { id: vehicle.id },
        data: {
          status: "ALLOCATED"
        }
      });

      const checklistDateKey = this.toDateOnly(new Date());
      await this.ensureChecklistEntriesForDate(tx, vehicle.id, checklistDateKey);

      return tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: driverInclude
      });
    });

    const summaries = await this.buildDriverOperationMeta([driver.id]);
    return this.toDriverProfile(driver, summaries.get(driver.id));
  }

  async endFleetVehicleSession(driverId: string): Promise<DriverProfile> {
    const driver = await this.prisma.$transaction(async (tx) => {
      const current = await tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: {
          user: true,
          defaultFleetVehicle: true,
          vehicles: {
            orderBy: { createdAt: "desc" }
          },
          fleetAssignments: {
            where: { endedAt: null },
            orderBy: { startedAt: "desc" },
            include: {
              fleetVehicle: true
            }
          }
        }
      });

      const assignment = current.fleetAssignments[0];

      if (!assignment) {
        throw new NotFoundException("Nenhum carro da frota esta validado para este motorista.");
      }

      const activeAssignedRides = await tx.ride.count({
        where: {
          assignedDriverId: driverId,
          status: "ACCEPTED"
        }
      });

      if (activeAssignedRides > 0) {
        throw new BadRequestException("Resolva as corridas em andamento antes de encerrar o carro da operacao.");
      }

      await tx.fleetVehicleAssignment.update({
        where: { id: assignment.id },
        data: {
          endedAt: new Date(),
          notes: "Sessao encerrada pelo app do motorista."
        }
      });

      await tx.fleetVehicle.update({
        where: { id: assignment.fleetVehicleId },
        data: {
          status: "AVAILABLE"
        }
      });

      return tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: driverInclude
      });
    });

    const summaries = await this.buildDriverOperationMeta([driver.id]);
    return this.toDriverProfile(driver, summaries.get(driver.id));
  }

  async updateCurrentFleetVehicleChecklist(
    driverId: string,
    itemKey: string,
    isChecked?: boolean,
    numericValue?: number
  ): Promise<DriverFleetVehicleDetails> {
    const assignment = await this.ensureCurrentFleetVehicleAssignment(driverId);
    const dateKey = this.toDateOnly(new Date());
    const checklistItem = await this.ensureChecklistTemplateItemByKey(itemKey);

    if (checklistItem.inputType === "ODOMETER" && numericValue === undefined) {
      throw new BadRequestException("Informe a kilometragem para esse item do checklist.");
    }

    const nextChecked =
      checklistItem.inputType === "ODOMETER" || checklistItem.inputType === "NUMBER"
        ? numericValue !== undefined
        : Boolean(isChecked);

    await this.prisma.fleetVehicleChecklistEntry.upsert({
      where: {
        fleetVehicleId_dateKey_itemKey: {
          fleetVehicleId: assignment.fleetVehicle.id,
          dateKey,
          itemKey: checklistItem.itemKey
        }
      },
      create: {
        fleetVehicleId: assignment.fleetVehicle.id,
        dateKey,
        itemKey: checklistItem.itemKey,
        templateId: checklistItem.templateId,
        templateName: checklistItem.template.name,
        label: checklistItem.label,
        description: checklistItem.description,
        category: checklistItem.template.category,
        routine: checklistItem.template.routine,
        inputType: checklistItem.inputType,
        sortOrder: checklistItem.sortOrder,
        isRequired: checklistItem.isRequired,
        isChecked: nextChecked,
        numericValue,
        checkedAt: nextChecked ? new Date() : null
      },
      update: {
        templateId: checklistItem.templateId,
        templateName: checklistItem.template.name,
        label: checklistItem.label,
        description: checklistItem.description,
        category: checklistItem.template.category,
        routine: checklistItem.template.routine,
        inputType: checklistItem.inputType,
        sortOrder: checklistItem.sortOrder,
        isRequired: checklistItem.isRequired,
        isChecked: nextChecked,
        numericValue,
        checkedAt: nextChecked ? new Date() : null
      }
    });

    return this.getCurrentFleetVehicle(driverId);
  }

  async updateDriver(driverId: string, input: UpdateDriverDto): Promise<DriverProfile> {
    await this.ensureDriverExists(driverId);

    const driver = await this.prisma.$transaction(async (tx) => {
      const current = await tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: {
          user: true,
          defaultFleetVehicle: true,
          vehicles: {
            orderBy: { createdAt: "desc" }
          },
          fleetAssignments: {
            where: { endedAt: null },
            orderBy: { startedAt: "desc" },
            include: {
              fleetVehicle: true
            }
          }
        }
      });

      const nextDriverType = input.driverType ?? current.driverType;
      const fleetConfig = await this.resolveFleetConfigInput(
        tx,
        nextDriverType,
        input.fleetAssignmentMode ?? current.fleetAssignmentMode ?? undefined,
        input.defaultFleetVehicleId === undefined ? current.defaultFleetVehicleId : input.defaultFleetVehicleId
      );
      const operationalState = this.resolveOperationalState(
        {
          operationalStatus: input.operationalStatus,
          operationalNotes: input.operationalNotes,
          isActive: input.isActive
        },
        current
      );

      const willBeOutOfOperation =
        !operationalState.isActive || !DRIVER_ACTIVE_STATUSES.includes(operationalState.operationalStatus);

      if (willBeOutOfOperation) {
        const activeAssignedRides = await tx.ride.count({
          where: {
            assignedDriverId: driverId,
            status: "ACCEPTED"
          }
        });

        if (activeAssignedRides > 0) {
          throw new BadRequestException(
            "Resolva as corridas ainda ativas antes de deixar o motorista fora da operacao."
          );
        }
      }

      await tx.user.update({
        where: { id: current.userId },
        data: {
          name: input.name?.trim(),
          cpf: input.cpf ? this.normalizeCpf(input.cpf) : undefined,
          phone: input.phone ? this.normalizePhone(input.phone) : undefined,
          email: input.email !== undefined ? this.normalizeOptional(input.email) : undefined,
          passwordHash: input.password?.trim() ? hashDriverPassword(input.password.trim()) : undefined,
          birthDate: input.birthDate ? this.normalizeBirthDate(input.birthDate) : undefined,
          gender: input.gender
        }
      });

      const compensationInput = this.resolveCompensationInput(
        {
          compensationModel: input.compensationModel,
          compensationValue: input.compensationValue,
          compensationNotes: input.compensationNotes
        },
        current
      );
      const mergedJourney = this.mergeJourneySettings(
        this.parseJourney(current.journey),
        input.journey === undefined ? undefined : this.parseJourney(input.journey)
      );
      const mergedContract = this.mergeEmploymentContractSettings(
        this.parseContract(current.contract),
        input.contract === undefined ? undefined : this.parseContract(input.contract)
      );
      const requestedContractProfile =
        input.contractProfile === undefined
          ? this.parseContractProfile(current.contractProfile)
          : input.contractProfile;
      const inheritedSettings =
        input.contract === undefined
          ? {
              profile: requestedContractProfile,
              contract: mergedContract,
              journey: mergedJourney
            }
          : await this.applyWorkProfileInheritance(tx, requestedContractProfile, mergedContract, mergedJourney);
      const nextContractProfile = inheritedSettings.profile ?? requestedContractProfile;
      const currentContractProfile = this.parseContractProfile(current.contractProfile);
      const shouldPersistDerivedContractProfile =
        input.contractProfile === undefined &&
        input.contract !== undefined &&
        nextContractProfile !== currentContractProfile;

      await tx.driver.update({
        where: { id: driverId },
        data: ({
          isActive: operationalState.isActive,
          photoUrl: input.photoUrl === undefined ? undefined : this.normalizeOptional(input.photoUrl),
          bloodType: input.bloodType === undefined ? undefined : this.normalizeOptional(input.bloodType),
          emergencyContacts:
            input.emergencyContacts === undefined ? undefined : this.normalizeEmergencyContacts(input.emergencyContacts),
          address: input.address === undefined ? undefined : this.normalizeAddress(input.address),
          driverLicense: input.driverLicense === undefined ? undefined : this.normalizeDriverLicense(input.driverLicense),
          toxicology: input.toxicology === undefined ? undefined : this.normalizeToxicology(input.toxicology),
          complianceHistory:
            input.complianceHistory === undefined ? undefined : this.normalizeComplianceHistory(input.complianceHistory),
          contractProfile:
            input.contractProfile === undefined && !shouldPersistDerivedContractProfile
              ? undefined
              : nextContractProfile ?? null,
          journey:
            input.journey === undefined
              ? undefined
              : this.normalizeJourney(inheritedSettings.journey, nextContractProfile),
          contract:
            input.contract === undefined
              ? undefined
              : this.normalizeContract(inheritedSettings.contract, nextContractProfile),
          driverType: nextDriverType,
          fleetAssignmentMode: fleetConfig.fleetAssignmentMode,
          defaultFleetVehicleId: fleetConfig.defaultFleetVehicleId,
          operationalStatus: operationalState.operationalStatus,
          operationalNotes: operationalState.operationalNotes,
          ...compensationInput
        } as any)
      });

      if (current.driverType !== nextDriverType) {
        await this.applyDriverTypeTransition(tx, driverId, current.driverType, nextDriverType);
      }

      await this.applyFleetConfigTransition(
        tx,
        driverId,
        nextDriverType,
        fleetConfig.fleetAssignmentMode,
        fleetConfig.defaultFleetVehicleId
      );

      if (nextDriverType === "AGREGADO") {
        await this.syncDriverVehicleSummary(tx, driverId);
      }

      return tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: driverInclude
      });
    });

    const summaries = await this.buildDriverOperationMeta([driver.id]);
    return this.toDriverProfile(driver, summaries.get(driver.id));
  }

  async addVehicle(driverId: string, input: CreateVehicleDto): Promise<DriverProfile> {
    const driver = await this.ensureDriverExists(driverId);

    if (driver.driverType === "FROTA") {
      throw new BadRequestException("Motorista da frota usa veiculo alocado pela operacao, nao cadastro proprio.");
    }

    const updatedDriver = await this.prisma.$transaction(async (tx) => {
      const shouldActivate = input.isActive ?? true;

      if (shouldActivate) {
        await tx.vehicle.updateMany({
          where: { driverId },
          data: { isActive: false }
        });
      }

      await tx.vehicle.create({
        data: {
          driverId,
          label: input.label.trim(),
          plate: input.plate.trim().toUpperCase(),
          color: input.color?.trim(),
          year: input.year,
          isActive: shouldActivate
        }
      });

      await this.syncDriverVehicleSummary(tx, driverId);

      return tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: driverInclude
      });
    });

    return this.toDriverProfile(updatedDriver);
  }

  async updateVehicle(driverId: string, vehicleId: string, input: UpdateVehicleDto): Promise<DriverProfile> {
    const driver = await this.ensureDriverExists(driverId);

    if (driver.driverType === "FROTA") {
      throw new BadRequestException("Veiculo de motorista da frota deve ser tratado no modulo de frota.");
    }

    await this.ensureVehicleExists(driverId, vehicleId);

    const updatedDriver = await this.prisma.$transaction(async (tx) => {
      if (input.isActive === true) {
        await tx.vehicle.updateMany({
          where: { driverId },
          data: { isActive: false }
        });
      }

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          label: input.label?.trim(),
          plate: input.plate?.trim().toUpperCase(),
          color: input.color === undefined ? undefined : this.normalizeOptional(input.color),
          year: input.year,
          isActive: input.isActive
        }
      });

      await this.syncDriverVehicleSummary(tx, driverId);

      return tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: driverInclude
      });
    });

    return this.toDriverProfile(updatedDriver);
  }

  async listDrivers(): Promise<DriverProfile[]> {
    const drivers = await this.prisma.driver.findMany({
      orderBy: { createdAt: "desc" },
      include: driverInclude
    });

    const summaries = await this.buildDriverOperationMeta(drivers.map((driver) => driver.id));
    return drivers.map((driver) => this.toDriverProfile(driver, summaries.get(driver.id)));
  }

  async listPrebookedRides(): Promise<Ride[]> {
    return this.ridesService.listPrebooked();
  }

  async listAvailableRides(driverId: string, includeScheduleFit = true): Promise<Ride[]> {
    await this.ensureOperationalDriver(driverId);
    await this.ridesService.expireStalePrebookedRides();

    const rides = await this.prisma.ride.findMany({
      where: {
        status: "PREBOOKED",
        decisions: {
          none: {
            driverId
          }
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const rideResponses = rides.map((ride) => this.ridesService.toRideResponse(ride));
    const customerProfiles = await this.buildCustomerProfiles(rideResponses);
    const ridesWithScheduleFit = includeScheduleFit
      ? await this.ridesService.annotateScheduleFitsForAvailableRides(driverId, rideResponses)
      : rideResponses;

    return ridesWithScheduleFit.map((ride) => ({
      ...ride,
      customerProfile: ride.customerPhone ? customerProfiles.get(ride.customerPhone) : undefined
    }));
  }

  async getAvailableRide(driverId: string, rideId: string, includeScheduleFit = true): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    await this.ridesService.expireStalePrebookedRides();

    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        status: "PREBOOKED",
        decisions: {
          none: {
            driverId
          }
        }
      },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found for driver ${driverId}.`);
    }

    const rideResponse = this.ridesService.toRideResponse(ride);
    const customerProfiles = await this.buildCustomerProfiles([rideResponse]);
    const [rideWithScheduleFit] = includeScheduleFit
      ? await this.ridesService.annotateScheduleFitsForAvailableRides(driverId, [rideResponse])
      : [rideResponse];

    return {
      ...rideWithScheduleFit,
      customerProfile: rideResponse.customerPhone ? customerProfiles.get(rideResponse.customerPhone) : undefined
    };
  }

  async listMyRides(driverId: string, includeScheduleFit = true): Promise<Ride[]> {
    await this.ensureDriverExists(driverId);

    const rides = await this.prisma.ride.findMany({
      where: {
        assignedDriverId: driverId
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const rideResponses = rides.map((ride) => this.ridesService.toRideResponse(ride));
    if (!includeScheduleFit) {
      return rideResponses;
    }

    return this.ridesService.annotateScheduleFitsForAssignedRides(rideResponses);
  }

  async decideRide(rideId: string, driverId: string, decision: "ACCEPT" | "REJECT"): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.decideRide(rideId, driverId, decision);
  }

  async markDriverEnRoute(rideId: string, driverId: string): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.markDriverEnRoute(rideId, driverId);
  }

  async markDriverArrived(rideId: string, driverId: string): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.markDriverArrived(rideId, driverId);
  }

  async startRide(rideId: string, driverId: string, pickupCode: string): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.startRide(rideId, driverId, pickupCode);
  }

  async completeRide(rideId: string, driverId: string): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.completeRide(rideId, driverId);
  }

  async markPassengerNoShow(rideId: string, driverId: string): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.markPassengerNoShow(rideId, driverId);
  }

  async emergencyCancelRide(
    rideId: string,
    driverId: string,
    reason: DriverEmergencyCancellationReason
  ): Promise<Ride> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.emergencyCancelAssignedRide(rideId, driverId, reason);
  }

  async emergencyCancelDayRides(
    driverId: string,
    dateKey: string,
    reason: DriverEmergencyCancellationReason
  ): Promise<Ride[]> {
    await this.ensureOperationalDriver(driverId);
    return this.ridesService.emergencyCancelAssignedRidesByDate(driverId, dateKey, reason);
  }

  async getRideMapPreview(driverId: string, rideId: string): Promise<RideMapPreview> {
    await this.ensureOperationalDriver(driverId);

    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          {
            status: "PREBOOKED",
            decisions: {
              none: {
                driverId
              }
            }
          },
          {
            assignedDriverId: driverId
          }
        ]
      },
      select: {
        origin: true,
        destination: true,
        scheduledAt: true
      }
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found for driver ${driverId}.`);
    }

    const routePreview = await this.mapsService.getRoutePreview(ride.origin, ride.destination, ride.scheduledAt);

    if (!routePreview) {
      return {
        available: false,
        provider: "fallback",
        error: "Mapa indisponivel para esta corrida no momento."
      };
    }

    return {
      available: true,
      provider: routePreview.provider,
      origin: {
        lat: routePreview.origin.lat,
        lng: routePreview.origin.lng,
        label: routePreview.origin.formattedAddress
      },
      destination: {
        lat: routePreview.destination.lat,
        lng: routePreview.destination.lng,
        label: routePreview.destination.formattedAddress
      },
      path: routePreview.path
    };
  }

  async getRideEvents(driverId: string, rideId: string): Promise<RideEvent[]> {
    await this.ensureDriverExists(driverId);

    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        assignedDriverId: driverId
      },
      select: { id: true }
    });

    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found for driver ${driverId}.`);
    }

    return this.ridesService.listEvents(rideId);
  }

  private async buildCustomerProfiles(rides: Ride[]): Promise<Map<string, RideCustomerProfile>> {
    const phones = [...new Set(rides.map((ride) => ride.customerPhone).filter((phone): phone is string => !!phone && phone !== "unknown"))];
    if (phones.length === 0) {
      return new Map<string, RideCustomerProfile>();
    }

    const [customers, customerRides] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          phone: { in: phones }
        },
        select: {
          phone: true,
          createdAt: true
        }
      }),
      this.prisma.ride.findMany({
        where: {
          customerPhone: { in: phones }
        },
        select: {
          customerPhone: true,
          status: true,
          createdAt: true
        }
      })
    ]);

    const customersByPhone = new Map(customers.map((customer) => [customer.phone, customer]));
    const rideHistoryByPhone = new Map<string, Array<{ status: RideStatus; createdAt: Date }>>();

    for (const ride of customerRides) {
      const history = rideHistoryByPhone.get(ride.customerPhone) ?? [];
      history.push({
        status: ride.status as RideStatus,
        createdAt: ride.createdAt
      });
      rideHistoryByPhone.set(ride.customerPhone, history);
    }

    return new Map(
      phones.map((phone) => [
        phone,
        this.calculateCustomerProfile(customersByPhone.get(phone)?.createdAt, rideHistoryByPhone.get(phone) ?? [])
      ])
    );
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

  private async ensureDriverExists(driverId: string): Promise<{
    id: string;
    driverType: "AGREGADO" | "FROTA";
    operationalStatus: DriverOperationalStatus;
    isActive: boolean;
  }> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, driverType: true, operationalStatus: true, isActive: true }
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    return driver;
  }

  private async ensureOperationalDriver(driverId: string): Promise<{
    id: string;
    driverType: "AGREGADO" | "FROTA";
  }> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        driverType: true,
        fleetAssignmentMode: true,
        defaultFleetVehicleId: true,
        isActive: true,
        operationalStatus: true,
        vehicles: {
          where: { isActive: true },
          take: 1,
          select: { id: true }
        },
        fleetAssignments: {
          where: { endedAt: null },
          take: 1,
          select: {
            id: true,
            fleetVehicle: {
              select: {
                status: true
              }
            }
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    if (!driver.isActive || !DRIVER_ACTIVE_STATUSES.includes(driver.operationalStatus)) {
      throw new BadRequestException("Motorista fora da operacao nao pode executar corridas neste momento.");
    }

    if (driver.driverType === "AGREGADO" && driver.vehicles.length === 0) {
      throw new BadRequestException("Agregado precisa ter um veiculo proprio ativo para operar.");
    }

    if (driver.driverType === "FROTA") {
      if (!driver.fleetAssignmentMode) {
        throw new BadRequestException("Defina se o motorista da frota opera com carro fixo ou nao fixo.");
      }

      if (driver.fleetAssignmentMode === "FIXED" && !driver.defaultFleetVehicleId) {
        throw new BadRequestException("Defina o veiculo fixo desse motorista antes de liberar a operacao.");
      }

      if (driver.fleetAssignments.length === 0 || driver.fleetAssignments[0].fleetVehicle.status !== "ALLOCATED") {
        throw new BadRequestException("Motorista da frota precisa validar um carro antes de operar.");
      }
    }

    return {
      id: driver.id,
      driverType: driver.driverType
    };
  }

  private async ensureVehicleExists(driverId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId
      },
      select: { id: true }
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found for driver ${driverId}.`);
    }
  }

  private async syncDriverVehicleSummary(
    tx: Prisma.TransactionClient,
    driverId: string
  ): Promise<void> {
    const activeVehicle = await tx.vehicle.findFirst({
      where: {
        driverId,
        isActive: true
      },
      orderBy: { createdAt: "desc" }
    });

    await tx.driver.update({
      where: { id: driverId },
      data: {
        vehicle: activeVehicle ? this.toVehicleSummary(activeVehicle.label, activeVehicle.plate) : null
      }
    });
  }

  private async applyDriverTypeTransition(
    tx: Prisma.TransactionClient,
    driverId: string,
    currentType: "AGREGADO" | "FROTA",
    nextType: "AGREGADO" | "FROTA"
  ): Promise<void> {
    if (currentType === nextType) {
      return;
    }

    if (nextType === "FROTA") {
      await tx.vehicle.updateMany({
        where: { driverId },
        data: { isActive: false }
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { vehicle: null }
      });

      return;
    }

    const activeAssignments = await tx.fleetVehicleAssignment.findMany({
      where: {
        driverId,
        endedAt: null
      },
      select: {
        fleetVehicleId: true
      }
    });

    if (activeAssignments.length === 0) {
      return;
    }

    const activeVehicleIds = activeAssignments.map((assignment) => assignment.fleetVehicleId);

    await tx.fleetVehicleAssignment.updateMany({
      where: {
        driverId,
        endedAt: null
      },
      data: {
        endedAt: new Date(),
        notes: "Encerrada automaticamente por mudanca de vinculo do motorista."
      }
    });

    await tx.fleetVehicle.updateMany({
      where: {
        id: { in: activeVehicleIds }
      },
      data: {
        status: "AVAILABLE"
      }
    });
  }

  private async resolveFleetConfigInput(
    tx: Prisma.TransactionClient,
    driverType: "AGREGADO" | "FROTA",
    fleetAssignmentMode?: FleetAssignmentMode,
    defaultFleetVehicleId?: string | null
  ): Promise<{
    fleetAssignmentMode: FleetAssignmentMode | null;
    defaultFleetVehicleId: string | null;
  }> {
    if (driverType !== "FROTA") {
      return {
        fleetAssignmentMode: null,
        defaultFleetVehicleId: null
      };
    }

    const resolvedMode = fleetAssignmentMode ?? "FLEX";
    const resolvedDefaultFleetVehicleId = resolvedMode === "FIXED" ? defaultFleetVehicleId ?? null : null;

    if (resolvedMode === "FIXED" && !resolvedDefaultFleetVehicleId) {
      throw new BadRequestException("Selecione o veiculo fixo desse motorista da frota.");
    }

    if (!resolvedDefaultFleetVehicleId) {
      return {
        fleetAssignmentMode: resolvedMode,
        defaultFleetVehicleId: null
      };
    }

    const fleetVehicle = await tx.fleetVehicle.findUnique({
      where: { id: resolvedDefaultFleetVehicleId },
      select: {
        id: true
      }
    });

    if (!fleetVehicle) {
      throw new NotFoundException(`Fleet vehicle ${resolvedDefaultFleetVehicleId} not found.`);
    }

    return {
      fleetAssignmentMode: resolvedMode,
      defaultFleetVehicleId: fleetVehicle.id
    };
  }

  private async applyFleetConfigTransition(
    tx: Prisma.TransactionClient,
    driverId: string,
    driverType: "AGREGADO" | "FROTA",
    fleetAssignmentMode: FleetAssignmentMode | null,
    defaultFleetVehicleId: string | null
  ): Promise<void> {
    if (driverType !== "FROTA" || !fleetAssignmentMode) {
      return;
    }

    if (fleetAssignmentMode !== "FIXED" || !defaultFleetVehicleId) {
      return;
    }

    const activeAssignment = await tx.fleetVehicleAssignment.findFirst({
      where: {
        driverId,
        endedAt: null
      },
      select: {
        id: true,
        fleetVehicleId: true
      }
    });

    if (!activeAssignment || activeAssignment.fleetVehicleId === defaultFleetVehicleId) {
      return;
    }

    await tx.fleetVehicleAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        endedAt: new Date(),
        notes: "Sessao encerrada automaticamente por troca do veiculo fixo do motorista."
      }
    });

    await tx.fleetVehicle.update({
      where: { id: activeAssignment.fleetVehicleId },
      data: {
        status: "AVAILABLE"
      }
    });
  }

  private toDriverProfile(driver: {
    id: string;
    userId: string;
    vehicle: string | null;
    isActive: boolean;
    photoUrl?: string | null;
    bloodType?: string | null;
    emergencyContacts?: unknown;
    address?: unknown;
    driverLicense?: unknown;
    toxicology?: unknown;
    complianceHistory?: unknown;
    contractProfile?: string | null;
    journey?: unknown;
    contract?: unknown;
    driverType: "AGREGADO" | "FROTA";
    fleetAssignmentMode: FleetAssignmentMode | null;
    defaultFleetVehicleId: string | null;
    operationalStatus: DriverOperationalStatus;
    operationalNotes: string | null;
    compensationModel: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM" | null;
    compensationValue: { toNumber(): number } | number | null;
    compensationNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      name: string;
      cpf: string | null;
      phone: string | null;
      email: string | null;
      passwordHash: string | null;
      birthDate: Date | null;
      gender: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY" | null;
    };
    defaultFleetVehicle: {
      id: string;
      label: string;
      plate: string;
      color: string | null;
      year: number | null;
      status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
      checkinCode: string;
    } | null;
    vehicles: Array<{
      id: string;
      label: string;
      plate: string;
      color: string | null;
      year: number | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    fleetAssignments: Array<{
      id: string;
      startedAt: Date;
      validationMethod: FleetVehicleAssignmentValidationMethod;
      fleetVehicle: {
        id: string;
        label: string;
        plate: string;
        color: string | null;
        year: number | null;
        status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
      };
    }>;
  },
  operationMeta?: {
    eligibility: DriverOperationalEligibility;
    summary: DriverOperationalSummary;
  }): DriverProfile {
    const defaultFleetVehicle = this.toDefaultFleetVehicle(driver.defaultFleetVehicle);
    const currentFleetVehicle = this.toCurrentFleetVehicle(driver.fleetAssignments[0]);
    const vehicleSummary =
      driver.driverType === "FROTA"
        ? currentFleetVehicle
          ? this.toVehicleSummary(currentFleetVehicle.label, currentFleetVehicle.plate)
          : defaultFleetVehicle
            ? this.toVehicleSummary(defaultFleetVehicle.label, defaultFleetVehicle.plate)
          : undefined
        : driver.vehicle ?? undefined;

    return {
      id: driver.id,
      userId: driver.userId,
      name: driver.user.name,
      cpf: driver.user.cpf ?? "",
      phone: driver.user.phone ?? "",
      email: driver.user.email ?? undefined,
      hasPassword: Boolean(driver.user.passwordHash),
      photoUrl: driver.photoUrl ?? undefined,
      birthDate: driver.user.birthDate ? this.toDateOnly(driver.user.birthDate) : undefined,
      gender: driver.user.gender ?? undefined,
      bloodType: driver.bloodType ?? undefined,
      emergencyContacts: this.parseEmergencyContacts(driver.emergencyContacts),
      address: this.parseAddress(driver.address),
      driverLicense: this.parseDriverLicense(driver.driverLicense),
      toxicology: this.parseToxicology(driver.toxicology),
      complianceHistory: this.parseComplianceHistory(driver.complianceHistory),
      contractProfile: this.parseContractProfile(driver.contractProfile),
      journey: this.parseJourney(driver.journey),
      contract: this.parseContract(driver.contract),
      driverType: driver.driverType,
      fleetAssignmentMode: driver.fleetAssignmentMode ?? undefined,
      defaultFleetVehicle,
      operationalStatus: driver.operationalStatus,
      operationalNotes: driver.operationalNotes ?? undefined,
      vehicle: vehicleSummary,
      vehicles: driver.vehicles.map((vehicle) => this.toVehicle(vehicle)),
      currentFleetVehicle,
      isActive: driver.isActive,
      operationEligibility:
        operationMeta?.eligibility ??
        this.buildDriverOperationalEligibility(
          driver.driverType,
          driver.operationalStatus,
          driver.vehicles,
          currentFleetVehicle,
          driver.fleetAssignmentMode ?? undefined,
          defaultFleetVehicle
        ),
      operationSummary:
        operationMeta?.summary ?? {
          activeAssignedRides: 0,
          completedRides: 0,
          cancelledRides: 0,
          noShowRides: 0,
          emergencyCancellations: 0,
          openExecutionAlerts: 0
        },
      compensation: this.toDriverCompensationSettings(driver),
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString()
    };
  }

  private resolveOperationalState(
    input: {
      operationalStatus?: DriverOperationalStatus;
      operationalNotes?: string;
      isActive?: boolean;
    },
    current?: {
      operationalStatus: DriverOperationalStatus;
      operationalNotes: string | null;
      isActive: boolean;
    }
  ): {
    operationalStatus: DriverOperationalStatus;
    operationalNotes: string | null;
    isActive: boolean;
  } {
    const operationalStatus = input.operationalStatus ?? current?.operationalStatus ?? "ACTIVE";
    const operationalNotes =
      input.operationalNotes === undefined ? current?.operationalNotes ?? null : input.operationalNotes.trim() || null;
    const inferredIsActive = DRIVER_ACTIVE_STATUSES.includes(operationalStatus);
    const isActive =
      input.isActive ?? (input.operationalStatus !== undefined ? inferredIsActive : current?.isActive ?? inferredIsActive);

    return {
      operationalStatus,
      operationalNotes,
      isActive
    };
  }

  private buildDriverOperationalEligibility(
    driverType: "AGREGADO" | "FROTA",
    operationalStatus: DriverOperationalStatus,
    vehicles: Array<{ isActive: boolean }>,
    currentFleetVehicle?: DriverFleetVehicleSummary,
    fleetAssignmentMode?: FleetAssignmentMode,
    defaultFleetVehicle?: DriverFleetDefaultVehicleSummary
  ): DriverOperationalEligibility {
    const blockingIssues: string[] = [];

    if (operationalStatus === "INACTIVE") {
      blockingIssues.push("Motorista marcado como inativo.");
    } else if (operationalStatus === "LEAVE") {
      blockingIssues.push("Motorista em afastamento.");
    } else if (operationalStatus === "SUSPENDED") {
      blockingIssues.push("Motorista suspenso para operacao.");
    }

    if (driverType === "AGREGADO") {
      if (!vehicles.some((vehicle) => vehicle.isActive)) {
        blockingIssues.push("Sem veiculo proprio ativo.");
      }
    } else {
      if (!fleetAssignmentMode) {
        blockingIssues.push("Defina se o motorista da frota opera com carro fixo ou nao fixo.");
      }

      if (fleetAssignmentMode === "FIXED" && !defaultFleetVehicle) {
        blockingIssues.push("Defina o veiculo fixo do motorista da frota.");
      }

      if (!currentFleetVehicle) {
        blockingIssues.push("Motorista precisa validar um carro da frota antes de operar.");
      } else if (currentFleetVehicle.status !== "ALLOCATED") {
        blockingIssues.push("O carro validado nao esta liberado para operacao.");
      }
    }

    return {
      eligible: blockingIssues.length === 0,
      blockingIssues
    };
  }

  private async buildDriverOperationMeta(
    driverIds: string[]
  ): Promise<Map<string, { eligibility: DriverOperationalEligibility; summary: DriverOperationalSummary }>> {
    const meta = new Map<string, { eligibility: DriverOperationalEligibility; summary: DriverOperationalSummary }>();

    if (driverIds.length === 0) {
      return meta;
    }

    const uniqueDriverIds = [...new Set(driverIds)];
    const [drivers, rides, relevantEvents] = await Promise.all([
      this.prisma.driver.findMany({
        where: { id: { in: uniqueDriverIds } },
        select: {
          id: true,
          driverType: true,
          fleetAssignmentMode: true,
          defaultFleetVehicle: {
            select: {
              id: true,
              label: true,
              plate: true,
              color: true,
              year: true,
              status: true,
              checkinCode: true
            }
          },
          operationalStatus: true,
          vehicles: {
            where: { isActive: true },
            select: { isActive: true }
          },
          fleetAssignments: {
            where: { endedAt: null },
            take: 1,
            orderBy: { startedAt: "desc" },
            select: {
              id: true,
              startedAt: true,
              validationMethod: true,
              fleetVehicle: {
                select: {
                  id: true,
                  label: true,
                  plate: true,
                  color: true,
                  year: true,
                  status: true
                }
              }
            }
          }
        }
      }),
      this.prisma.ride.findMany({
        where: {
          assignedDriverId: { in: uniqueDriverIds }
        },
        select: {
          id: true,
          assignedDriverId: true,
          status: true,
          driverStage: true,
          scheduledAt: true,
          startedAt: true,
          arrivedAt: true,
          routeDurationMin: true,
          updatedAt: true,
          completedAt: true
        }
      }),
      this.prisma.rideEvent.findMany({
        where: {
          eventType: {
            in: ["RIDE_NO_SHOW", "DRIVER_EMERGENCY_CANCELLATION"]
          },
          ride: {
            assignedDriverId: { in: uniqueDriverIds }
          }
        },
        select: {
          eventType: true,
          ride: {
            select: {
              assignedDriverId: true
            }
          }
        }
      })
    ]);

    const ridesByDriver = new Map<string, typeof rides>();
    for (const ride of rides) {
      if (!ride.assignedDriverId) {
        continue;
      }

      const items = ridesByDriver.get(ride.assignedDriverId) ?? [];
      items.push(ride);
      ridesByDriver.set(ride.assignedDriverId, items);
    }

    const noShowCounts = new Map<string, number>();
    const emergencyCounts = new Map<string, number>();
    for (const event of relevantEvents) {
      const assignedDriverId = event.ride.assignedDriverId;
      if (!assignedDriverId) {
        continue;
      }

      if (event.eventType === "RIDE_NO_SHOW") {
        noShowCounts.set(assignedDriverId, (noShowCounts.get(assignedDriverId) ?? 0) + 1);
      }

      if (event.eventType === "DRIVER_EMERGENCY_CANCELLATION") {
        emergencyCounts.set(assignedDriverId, (emergencyCounts.get(assignedDriverId) ?? 0) + 1);
      }
    }

    for (const driver of drivers) {
      const defaultFleetVehicle = this.toDefaultFleetVehicle(driver.defaultFleetVehicle);
      const currentFleetVehicle = this.toCurrentFleetVehicle(driver.fleetAssignments[0]);
      const assignedRides = ridesByDriver.get(driver.id) ?? [];
      const lastRideAt = assignedRides.reduce<Date | undefined>((latest, ride) => {
        const reference = ride.completedAt ?? ride.updatedAt ?? ride.scheduledAt;
        if (!latest || reference.getTime() > latest.getTime()) {
          return reference;
        }

        return latest;
      }, undefined);

      meta.set(driver.id, {
        eligibility: this.buildDriverOperationalEligibility(
          driver.driverType,
          driver.operationalStatus,
          driver.vehicles,
          currentFleetVehicle,
          driver.fleetAssignmentMode ?? undefined,
          defaultFleetVehicle
        ),
        summary: {
          activeAssignedRides: assignedRides.filter((ride) => ride.status === "ACCEPTED").length,
          completedRides: assignedRides.filter((ride) => ride.status === "COMPLETED").length,
          cancelledRides: assignedRides.filter((ride) => ride.status === "CANCELLED").length,
          noShowRides: noShowCounts.get(driver.id) ?? 0,
          emergencyCancellations: emergencyCounts.get(driver.id) ?? 0,
          openExecutionAlerts: assignedRides.filter((ride) => this.getRideExecutionAlertCode(ride) !== undefined).length,
          lastRideAt: lastRideAt ? lastRideAt.toISOString() : undefined
        }
      });
    }

    return meta;
  }

  private getRideExecutionAlertCode(ride: {
    status: RideStatus;
    driverStage: "SCHEDULED" | "EN_ROUTE_PICKUP" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | null;
    scheduledAt: Date;
    arrivedAt: Date | null;
    startedAt: Date | null;
    routeDurationMin: number | null;
  }): "LATE_PICKUP" | "WAITING_PASSENGER" | "OVERDUE_COMPLETION" | undefined {
    if (ride.status !== "ACCEPTED") {
      return undefined;
    }

    const nowMs = Date.now();

    if (
      (ride.driverStage === null || ride.driverStage === "SCHEDULED" || ride.driverStage === "EN_ROUTE_PICKUP") &&
      nowMs >= ride.scheduledAt.getTime() + 15 * 60_000
    ) {
      return "LATE_PICKUP";
    }

    if (ride.driverStage === "ARRIVED" && ride.arrivedAt && nowMs >= ride.arrivedAt.getTime() + 5 * 60_000) {
      return "WAITING_PASSENGER";
    }

    if (ride.driverStage === "IN_PROGRESS" && ride.startedAt && ride.routeDurationMin !== null) {
      const overdueAtMs = ride.startedAt.getTime() + (ride.routeDurationMin + 30) * 60_000;
      if (nowMs >= overdueAtMs) {
        return "OVERDUE_COMPLETION";
      }
    }

    return undefined;
  }

  private resolveCompensationInput(
    input: {
      compensationModel?: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";
      compensationValue?: number;
      compensationNotes?: string;
    },
    current?: {
      compensationModel: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM" | null;
      compensationValue: { toNumber(): number } | number | null;
      compensationNotes: string | null;
    }
  ) {
    const compensationModel = input.compensationModel ?? current?.compensationModel ?? "CUSTOM";
    const compensationValue =
      input.compensationValue ?? (current?.compensationValue === null || current?.compensationValue === undefined
        ? null
        : Number(current.compensationValue));
    const compensationNotes =
      input.compensationNotes === undefined ? current?.compensationNotes ?? null : input.compensationNotes.trim() || null;

    const requiresNumericValue = compensationModel !== "INTERMITTENT" && compensationModel !== "CUSTOM";

    if (requiresNumericValue && (compensationValue === null || compensationValue === undefined)) {
      throw new BadRequestException("Informe o valor base da remuneracao do motorista.");
    }

    if (
      compensationModel === "PERCENT" &&
      compensationValue !== null &&
      compensationValue !== undefined &&
      compensationValue > 100
    ) {
      throw new BadRequestException("A remuneracao percentual do motorista nao pode ser maior que 100.");
    }

    return {
      useGlobalCompensation: false,
      compensationModel,
      compensationValue,
      compensationNotes
    };
  }

  private toDriverCompensationSettings(
    driver: {
      compensationModel: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM" | null;
      compensationValue: { toNumber(): number } | number | null;
      compensationNotes: string | null;
    }
  ): DriverCompensationSettings {
    const customValue =
      driver.compensationValue === null || driver.compensationValue === undefined
        ? undefined
        : typeof driver.compensationValue === "number"
          ? driver.compensationValue
          : driver.compensationValue.toNumber();
    const model = driver.compensationModel ?? "CUSTOM";

    return {
      useGlobalConfig: false,
      customModel: model,
      customValue,
      customNotes: driver.compensationNotes ?? undefined,
      globalModel: model,
      globalValue: customValue ?? 0,
      globalIsActive: true,
      globalNotes: undefined,
      effectiveSource: "CUSTOM",
      effectiveModel: model,
      effectiveValue: customValue ?? 0,
      effectiveIsActive: true
    };
  }

  private toVehicle(vehicle: {
    id: string;
    label: string;
    plate: string;
    color: string | null;
    year: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): DriverVehicle {
    return {
      id: vehicle.id,
      label: vehicle.label,
      plate: vehicle.plate,
      color: vehicle.color ?? undefined,
      year: vehicle.year ?? undefined,
      isActive: vehicle.isActive,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString()
    };
  }

  private toVehicleSummary(label: string, plate: string): string {
    return `${label} - ${plate}`;
  }

  private toDefaultFleetVehicle(
    vehicle:
      | {
          id: string;
          label: string;
          plate: string;
          color: string | null;
          year: number | null;
          status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
          checkinCode: string;
        }
      | null
      | undefined
  ): DriverFleetDefaultVehicleSummary | undefined {
    if (!vehicle) {
      return undefined;
    }

    return {
      vehicleId: vehicle.id,
      label: vehicle.label,
      plate: vehicle.plate,
      color: vehicle.color ?? undefined,
      year: vehicle.year ?? undefined,
      status: vehicle.status,
      checkinCode: vehicle.checkinCode
    };
  }

  private toCurrentFleetVehicle(
    assignment:
      | {
          id: string;
          startedAt: Date;
          validationMethod: FleetVehicleAssignmentValidationMethod;
          fleetVehicle: {
            id: string;
            label: string;
            plate: string;
            color: string | null;
            year: number | null;
            status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
          };
        }
      | undefined
  ): DriverFleetVehicleSummary | undefined {
    if (!assignment) {
      return undefined;
    }

    return {
      assignmentId: assignment.id,
      vehicleId: assignment.fleetVehicle.id,
      label: assignment.fleetVehicle.label,
      plate: assignment.fleetVehicle.plate,
      color: assignment.fleetVehicle.color ?? undefined,
      year: assignment.fleetVehicle.year ?? undefined,
      status: assignment.fleetVehicle.status,
      validationMethod: assignment.validationMethod,
      startedAt: assignment.startedAt.toISOString()
    };
  }

  private async ensureCurrentFleetVehicleAssignment(driverId: string): Promise<{
    id: string;
    startedAt: Date;
    validationMethod: FleetVehicleAssignmentValidationMethod;
    fleetVehicle: {
      id: string;
      label: string;
      plate: string;
      color: string | null;
      year: number | null;
      status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
    };
  }> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        driverType: true,
        fleetAssignments: {
          where: { endedAt: null },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            id: true,
            startedAt: true,
            validationMethod: true,
            fleetVehicle: {
              select: {
                id: true,
                label: true,
                plate: true,
                color: true,
                year: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found.`);
    }

    if (driver.driverType !== "FROTA") {
      throw new BadRequestException("Checklist diario do carro esta disponivel apenas para motorista da frota.");
    }

    const assignment = driver.fleetAssignments[0];
    if (!assignment) {
      throw new NotFoundException("Nenhum carro da frota esta validado para este motorista.");
    }

    return assignment;
  }

  private async buildDriverFleetVehicleDetails(assignment: {
    id: string;
    startedAt: Date;
    validationMethod: FleetVehicleAssignmentValidationMethod;
    fleetVehicle: {
      id: string;
      label: string;
      plate: string;
      color: string | null;
      year: number | null;
      status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
    };
  }): Promise<DriverFleetVehicleDetails> {
    const dateKey = this.toDateOnly(new Date());
    await this.ensureChecklistEntriesForDate(this.prisma, assignment.fleetVehicle.id, dateKey);
    const [templates, checklistEntries] = await Promise.all([
      this.getActiveChecklistTemplates(),
      this.prisma.fleetVehicleChecklistEntry.findMany({
        where: {
          fleetVehicleId: assignment.fleetVehicle.id,
          dateKey
        },
        orderBy: [{ routine: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      })
    ]);

    const checklist: DriverFleetChecklistItem[] = templates.flatMap((template) =>
      template.items.map((item) => {
        const entry = checklistEntries.find((candidate) => candidate.itemKey === item.itemKey);

        return {
          itemKey: item.itemKey,
          templateId: entry?.templateId ?? template.id,
          templateName: entry?.templateName ?? template.name,
          label: entry?.label ?? item.label,
          description: entry?.description ?? item.description ?? undefined,
          category: entry?.category ?? template.category,
          routine: entry?.routine ?? template.routine,
          inputType: entry?.inputType ?? item.inputType,
          sortOrder: entry?.sortOrder ?? item.sortOrder,
          isRequired: entry?.isRequired ?? item.isRequired,
          dateKey,
          isChecked: entry?.isChecked ?? false,
          numericValue: entry?.numericValue ?? undefined,
          textValue: entry?.textValue ?? undefined,
          selectedOption: entry?.selectedOption ?? undefined,
          checkedAt: entry?.checkedAt?.toISOString(),
          notes: entry?.notes ?? undefined
        };
      })
    );

    return {
      assignmentId: assignment.id,
      vehicleId: assignment.fleetVehicle.id,
      label: assignment.fleetVehicle.label,
      plate: assignment.fleetVehicle.plate,
      color: assignment.fleetVehicle.color ?? undefined,
      year: assignment.fleetVehicle.year ?? undefined,
      status: assignment.fleetVehicle.status,
      validationMethod: assignment.validationMethod,
      startedAt: assignment.startedAt.toISOString(),
      checklist
    };
  }

  private async ensureChecklistTemplatesSeeded(
    client: Prisma.TransactionClient | PrismaService
  ): Promise<void> {
    const total = await client.fleetChecklistTemplate.count();

    if (total > 0) {
      return;
    }

    for (const template of DEFAULT_FLEET_CHECKLIST_TEMPLATES) {
      await client.fleetChecklistTemplate.create({
        data: {
          name: template.name,
          category: template.category,
          routine: template.routine,
          isActive: true,
          items: {
            create: template.items.map((item) => ({
              itemKey: item.itemKey,
              label: item.label,
              description: item.description ?? null,
              inputType: item.inputType,
              actionType: item.actionType,
              selectOptions: item.selectOptions?.length ? item.selectOptions : Prisma.JsonNull,
              sortOrder: item.sortOrder,
              isRequired: item.isRequired,
              isActive: true
            }))
          }
        }
      });
    }
  }

  private async getActiveChecklistTemplates() {
    await this.ensureChecklistTemplatesSeeded(this.prisma);

    return this.prisma.fleetChecklistTemplate.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ routine: "asc" }, { createdAt: "asc" }]
    });
  }

  private async ensureChecklistTemplateItemByKey(itemKey: string) {
    await this.ensureChecklistTemplatesSeeded(this.prisma);

    const item = await this.prisma.fleetChecklistTemplateItem.findFirst({
      where: {
        itemKey,
        isActive: true
      },
      include: {
        template: true
      }
    });

    if (!item) {
      throw new BadRequestException("Item de checklist invalido para o carro da frota.");
    }

    return item;
  }

  private async ensureChecklistEntriesForDate(
    client: Prisma.TransactionClient | PrismaService,
    fleetVehicleId: string,
    dateKey: string
  ): Promise<void> {
    await this.ensureChecklistTemplatesSeeded(client);

    const [templates, existingEntries] = await Promise.all([
      client.fleetChecklistTemplate.findMany({
        where: { isActive: true },
        include: {
          items: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ routine: "asc" }, { createdAt: "asc" }]
      }),
      client.fleetVehicleChecklistEntry.findMany({
        where: {
          fleetVehicleId,
          dateKey
        },
        select: { itemKey: true }
      })
    ]);

    const existingKeys = new Set(existingEntries.map((entry) => entry.itemKey));
    const missingTemplates = templates.flatMap((template) =>
      template.items
        .filter((item) => !existingKeys.has(item.itemKey))
        .map((item) => ({ template, item }))
    );

    if (missingTemplates.length === 0) {
      return;
    }

    await client.fleetVehicleChecklistEntry.createMany({
      data: missingTemplates.map(({ template, item }) => ({
        fleetVehicleId,
        dateKey,
        itemKey: item.itemKey,
        templateId: template.id,
        templateName: template.name,
        label: item.label,
        description: item.description ?? null,
        category: template.category,
        routine: template.routine,
        inputType: item.inputType,
        sortOrder: item.sortOrder,
        isRequired: item.isRequired,
        isChecked: false,
        numericValue: null,
        checkedAt: null,
        notes: null
      }))
    });
  }

  private normalizeCpf(value: string): string {
    return value.replace(/\D/g, "");
  }

  private normalizeEmergencyContacts(value: unknown): Prisma.InputJsonValue | null {
    const source = Array.isArray(value)
      ? value
      : this.isRecord(value) && Array.isArray(value.contacts)
        ? value.contacts
        : [];

    const contacts = source
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => {
        const name =
          typeof item.name === "string"
            ? item.name.trim()
            : typeof item.fullName === "string"
              ? item.fullName.trim()
              : typeof item.contactName === "string"
                ? item.contactName.trim()
                : "";
        const relation =
          typeof item.relation === "string"
            ? item.relation.trim()
            : typeof item.relationship === "string"
              ? item.relationship.trim()
              : typeof item.kinship === "string"
                ? item.kinship.trim()
                : "";
        const rawPhone =
          typeof item.phone === "string" || typeof item.phone === "number"
            ? String(item.phone)
            : typeof item.phoneNumber === "string" || typeof item.phoneNumber === "number"
              ? String(item.phoneNumber)
              : typeof item.whatsappPhone === "string" || typeof item.whatsappPhone === "number"
                ? String(item.whatsappPhone)
                : "";
        const phone = rawPhone ? this.normalizePhone(rawPhone) : "";
        const notes =
          typeof item.notes === "string"
            ? item.notes.trim()
            : typeof item.observation === "string"
              ? item.observation.trim()
              : "";
        const isWhatsapp =
          item.isWhatsapp !== undefined
            ? Boolean(item.isWhatsapp)
            : item.isWhatsApp !== undefined
              ? Boolean(item.isWhatsApp)
              : false;

        if (!name || !phone) {
          return null;
        }

        return {
          name,
          relation,
          phone,
          isWhatsapp,
          notes: notes || undefined
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return contacts as Prisma.InputJsonValue;
  }

  private normalizeAddress(value: unknown): Prisma.InputJsonValue | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const input = value as Record<string, unknown>;
    const cep = typeof input.cep === "string" ? input.cep.replace(/\D/g, "").slice(0, 8) : "";
    const addressType = input.addressType === "OWN" || input.addressType === "RENTED" ? input.addressType : undefined;
    const street = typeof input.street === "string" ? input.street.trim() : "";
    const number = typeof input.number === "string" ? input.number.trim() : "";
    const neighborhood = typeof input.neighborhood === "string" ? input.neighborhood.trim() : "";
    const complement = typeof input.complement === "string" ? input.complement.trim() : "";
    const city = typeof input.city === "string" ? input.city.trim() : "";
    const state = typeof input.state === "string" ? input.state.trim().toUpperCase().slice(0, 2) : "";

    if (!cep && !addressType && !street && !number && !neighborhood && !complement && !city && !state) {
      return null;
    }

    return {
      cep: cep || undefined,
      addressType,
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      complement: complement || undefined,
      city: city || undefined,
      state: state || undefined
    } as Prisma.InputJsonValue;
  }

  private normalizeDriverLicense(value: unknown): Prisma.InputJsonValue | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const input = value as Record<string, unknown>;
    const number = typeof input.number === "string" ? input.number.trim() : "";
    const category = typeof input.category === "string" ? input.category.trim() : "";
    const expirationDate = typeof input.expirationDate === "string" ? input.expirationDate.trim() : "";
    const firstLicenseDate = typeof input.firstLicenseDate === "string" ? input.firstLicenseDate.trim() : "";
    const issuingState = typeof input.issuingState === "string" ? input.issuingState.trim().toUpperCase() : "";
    const documentPhotoUrl = typeof input.documentPhotoUrl === "string" ? input.documentPhotoUrl.trim() : "";
    const expiryAlertLeadDays = this.normalizeIntegerField(input.expiryAlertLeadDays, 0);
    const expiryAlertRepeatDays = this.normalizeIntegerField(input.expiryAlertRepeatDays, 1);

    if (
      !number &&
      !category &&
      !expirationDate &&
      !firstLicenseDate &&
      !issuingState &&
      !documentPhotoUrl &&
      expiryAlertLeadDays === undefined &&
      expiryAlertRepeatDays === undefined
    ) {
      return null;
    }

    return {
      number,
      category,
      expirationDate,
      firstLicenseDate,
      issuingState,
      documentPhotoUrl: documentPhotoUrl || undefined,
      expiryAlertLeadDays,
      expiryAlertRepeatDays
    } as Prisma.InputJsonValue;
  }

  private normalizeToxicology(value: unknown): Prisma.InputJsonValue | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const input = value as Record<string, unknown>;
    const required = input.required === undefined ? true : Boolean(input.required);
    const examNumber = typeof input.examNumber === "string" ? input.examNumber.trim() : "";
    const examDate = typeof input.examDate === "string" ? input.examDate.trim() : "";
    const expirationDate = typeof input.expirationDate === "string" ? input.expirationDate.trim() : "";
    const expiryAlertLeadDays = this.normalizeIntegerField(input.expiryAlertLeadDays, 0);
    const expiryAlertRepeatDays = this.normalizeIntegerField(input.expiryAlertRepeatDays, 1);
    const clinicName = typeof input.clinicName === "string" ? input.clinicName.trim() : "";
    const clinicCnpj = typeof input.clinicCnpj === "string" ? input.clinicCnpj.trim() : "";
    const reportAttachmentName = typeof input.reportAttachmentName === "string" ? input.reportAttachmentName.trim() : "";
    const reportAttachmentDataUrl =
      typeof input.reportAttachmentDataUrl === "string" ? input.reportAttachmentDataUrl.trim() : "";
    const reportAttachmentMimeType =
      typeof input.reportAttachmentMimeType === "string" ? input.reportAttachmentMimeType.trim() : "";
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";
    const psychotechnical = this.normalizePsychotechnical(input.psychotechnical);

    return {
      required,
      examNumber: examNumber || undefined,
      examDate: examDate || undefined,
      expirationDate: expirationDate || undefined,
      expiryAlertLeadDays,
      expiryAlertRepeatDays,
      clinicName: clinicName || undefined,
      clinicCnpj: clinicCnpj || undefined,
      reportAttachmentName: reportAttachmentName || undefined,
      reportAttachmentDataUrl: reportAttachmentDataUrl || undefined,
      reportAttachmentMimeType: reportAttachmentMimeType || undefined,
      notes: notes || undefined,
      psychotechnical
    } as Prisma.InputJsonValue;
  }

  private normalizePsychotechnical(value: unknown): Prisma.InputJsonValue | undefined {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const required = input.required === undefined ? true : Boolean(input.required);
    const examNumber = typeof input.examNumber === "string" ? input.examNumber.trim() : "";
    const examDate = typeof input.examDate === "string" ? input.examDate.trim() : "";
    const expirationDate = typeof input.expirationDate === "string" ? input.expirationDate.trim() : "";
    const situation =
      input.situation === "APTO" || input.situation === "INAPTO" || input.situation === "APTO_COM_RESTRICOES"
        ? input.situation
        : undefined;
    const restrictionsDescription =
      typeof input.restrictionsDescription === "string" ? input.restrictionsDescription.trim() : "";
    const examType = input.examType === "INICIAL" || input.examType === "RENOVACAO" ? input.examType : undefined;
    const expiryAlertLeadDays = this.normalizeIntegerField(input.expiryAlertLeadDays, 0);
    const expiryAlertRepeatDays = this.normalizeIntegerField(input.expiryAlertRepeatDays, 1);
    const clinicName = typeof input.clinicName === "string" ? input.clinicName.trim() : "";
    const clinicCnpj = typeof input.clinicCnpj === "string" ? input.clinicCnpj.trim() : "";
    const psychologistName = typeof input.psychologistName === "string" ? input.psychologistName.trim() : "";
    const psychologistCrp = typeof input.psychologistCrp === "string" ? input.psychologistCrp.trim() : "";
    const detailedResult = typeof input.detailedResult === "string" ? input.detailedResult.trim() : "";
    const reportAttachmentName = typeof input.reportAttachmentName === "string" ? input.reportAttachmentName.trim() : "";
    const reportAttachmentDataUrl =
      typeof input.reportAttachmentDataUrl === "string" ? input.reportAttachmentDataUrl.trim() : "";
    const reportAttachmentMimeType =
      typeof input.reportAttachmentMimeType === "string" ? input.reportAttachmentMimeType.trim() : "";
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";

    return {
      required,
      examNumber: examNumber || undefined,
      examDate: examDate || undefined,
      expirationDate: expirationDate || undefined,
      situation,
      restrictionsDescription: situation === "APTO_COM_RESTRICOES" ? restrictionsDescription || undefined : undefined,
      examType,
      expiryAlertLeadDays,
      expiryAlertRepeatDays,
      clinicName: clinicName || undefined,
      clinicCnpj: clinicCnpj || undefined,
      psychologistName: psychologistName || undefined,
      psychologistCrp: psychologistCrp || undefined,
      detailedResult: detailedResult || undefined,
      reportAttachmentName: reportAttachmentName || undefined,
      reportAttachmentDataUrl: reportAttachmentDataUrl || undefined,
      reportAttachmentMimeType: reportAttachmentMimeType || undefined,
      notes: notes || undefined
    } as Prisma.InputJsonValue;
  }

  private normalizeComplianceHistory(value: unknown): Prisma.InputJsonValue | null {
    if (!Array.isArray(value)) {
      return [];
    }

    const history = value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item, index) => {
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const detail = typeof item.detail === "string" ? item.detail.trim() : "";
        const meta = typeof item.meta === "string" ? item.meta.trim() : "";
        const createdAt =
          typeof item.createdAt === "string" && item.createdAt.trim()
            ? item.createdAt.trim()
            : new Date().toISOString();
        const id =
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `history-${createdAt}-${index}`;

        if (!title || !detail) {
          return null;
        }

        return {
          id,
          title,
          meta,
          detail,
          createdAt
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return history as Prisma.InputJsonValue;
  }

  private normalizeJourney(value: unknown, profile?: DriverContractProfile): Prisma.InputJsonValue | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const input = value as Record<string, unknown>;
    const shift = typeof input.shift === "string" ? input.shift.trim() : "";
    const scaleType =
      input.scaleType === "FIVE_TWO" ||
      input.scaleType === "SIX_ONE" ||
      input.scaleType === "TWELVE_THIRTY_SIX" ||
      input.scaleType === "CUSTOM"
        ? input.scaleType
        : undefined;
    const customScaleWorkDays = this.normalizeIntegerField(input.customScaleWorkDays, 1);
    const customScaleOffDays = this.normalizeIntegerField(input.customScaleOffDays, 1);
    const fixedSchedule = input.fixedSchedule === undefined ? undefined : Boolean(input.fixedSchedule);
    const fixedScheduleMode =
      input.fixedScheduleMode === "UNIFORM" || input.fixedScheduleMode === "PER_DAY"
        ? input.fixedScheduleMode
        : undefined;
    const rawScale = typeof input.scale === "string" ? input.scale.trim() : "";
    const scale =
      rawScale ||
      (scaleType === "FIVE_TWO"
        ? "5x2"
        : scaleType === "SIX_ONE"
          ? "6x1"
          : scaleType === "TWELVE_THIRTY_SIX"
            ? "12x36"
            : scaleType === "CUSTOM" && customScaleWorkDays && customScaleOffDays
              ? `${customScaleWorkDays}x${customScaleOffDays}`
              : "");
    const startTime = typeof input.startTime === "string" ? input.startTime.trim() : "";
    const endTime = typeof input.endTime === "string" ? input.endTime.trim() : "";
    const availabilityStartTime =
      typeof input.availabilityStartTime === "string" ? input.availabilityStartTime.trim() : "";
    const availabilityEndTime =
      typeof input.availabilityEndTime === "string" ? input.availabilityEndTime.trim() : "";
    const availableDays = Array.isArray(input.availableDays)
      ? input.availableDays
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toUpperCase())
          .filter(
            (item): item is JourneyWeekDay =>
              item === "MON" ||
              item === "TUE" ||
              item === "WED" ||
              item === "THU" ||
              item === "FRI" ||
              item === "SAT" ||
              item === "SUN"
          )
      : [];
    const daySchedules = Array.isArray(input.daySchedules)
      ? input.daySchedules
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => {
            const day =
              item.day === "MON" ||
              item.day === "TUE" ||
              item.day === "WED" ||
              item.day === "THU" ||
              item.day === "FRI" ||
              item.day === "SAT" ||
              item.day === "SUN"
                ? (item.day as JourneyWeekDay)
                : undefined;
            if (!day) {
              return null;
            }
            const enabled = item.enabled === undefined ? true : Boolean(item.enabled);
            const startTime = typeof item.startTime === "string" ? item.startTime.trim() : "";
            const endTime = typeof item.endTime === "string" ? item.endTime.trim() : "";
            return {
              day,
              enabled,
              startTime: enabled ? startTime || undefined : undefined,
              endTime: enabled ? endTime || undefined : undefined
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : [];
    const normalizedAvailableDays: JourneyWeekDay[] =
      availableDays.length > 0
        ? [...new Set(availableDays)]
        : daySchedules.filter((item) => item.enabled).map((item) => item.day as JourneyWeekDay);
    const acceptsOutsideSchedule =
      input.acceptsOutsideSchedule === undefined ? undefined : Boolean(input.acceptsOutsideSchedule);
    const availabilityNotes = typeof input.availabilityNotes === "string" ? input.availabilityNotes.trim() : "";
    const accessibility = this.parseAccessibility(input.accessibility);
    const dsrPolicy = this.parseJourneyDsrPolicy(input.dsrPolicy);

    let normalized: DriverJourney = {
      dsrPolicy,
      shift: shift || undefined,
      scale: scale || undefined,
      scaleType,
      customScaleWorkDays,
      customScaleOffDays,
      fixedSchedule,
      fixedScheduleMode: fixedSchedule ? fixedScheduleMode ?? "UNIFORM" : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      availabilityStartTime: availabilityStartTime || undefined,
      availabilityEndTime: availabilityEndTime || undefined,
      availableDays: normalizedAvailableDays.length > 0 ? normalizedAvailableDays : undefined,
      daySchedules:
        fixedSchedule && (fixedScheduleMode ?? "UNIFORM") === "PER_DAY" && daySchedules.length > 0
          ? daySchedules
          : undefined,
      acceptsOutsideSchedule,
      availabilityNotes: availabilityNotes || undefined,
      accessibility
    };

    if (profile === "MEI") {
      normalized = {
        accessibility: normalized.accessibility
      };
    }

    if (
      !normalized.shift &&
      !normalized.scale &&
      !normalized.scaleType &&
      normalized.customScaleWorkDays === undefined &&
      normalized.customScaleOffDays === undefined &&
      normalized.fixedSchedule === undefined &&
      !normalized.fixedScheduleMode &&
      !normalized.startTime &&
      !normalized.endTime &&
      !normalized.availabilityStartTime &&
      !normalized.availabilityEndTime &&
      (!normalized.availableDays || normalized.availableDays.length === 0) &&
      (!normalized.daySchedules || normalized.daySchedules.length === 0) &&
      normalized.acceptsOutsideSchedule === undefined &&
      !normalized.availabilityNotes &&
      !normalized.accessibility &&
      !normalized.dsrPolicy
    ) {
      return null;
    }

    return normalized as Prisma.InputJsonValue;
  }

  private normalizeContract(value: unknown, profile?: DriverContractProfile): Prisma.InputJsonValue | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const input = value as Record<string, unknown>;
    const hasFixedTermContract =
      input.hasFixedTermContract === undefined ? undefined : Boolean(input.hasFixedTermContract);
    const notifyContractEnd = input.notifyContractEnd === undefined ? undefined : Boolean(input.notifyContractEnd);
    const contractEndNotifyLeadDays = this.normalizeIntegerField(input.contractEndNotifyLeadDays, 0);
    const experienceEnabled = input.experienceEnabled === undefined ? undefined : Boolean(input.experienceEnabled);
    const experienceStartDate = typeof input.experienceStartDate === "string" ? input.experienceStartDate.trim() : "";
    const experienceEndDate = typeof input.experienceEndDate === "string" ? input.experienceEndDate.trim() : "";
    const autoRenewAfterExperience =
      input.autoRenewAfterExperience === undefined ? undefined : Boolean(input.autoRenewAfterExperience);
    const notifyExperienceEnd = input.notifyExperienceEnd === undefined ? undefined : Boolean(input.notifyExperienceEnd);
    const experienceNotifyLeadDays = this.normalizeIntegerField(input.experienceNotifyLeadDays, 0);
    const experienceNotifyRepeatDays = this.normalizeIntegerField(input.experienceNotifyRepeatDays, 1);
    const benefitsList = Array.isArray(input.benefitsList)
      ? input.benefitsList
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];
    const otherBenefits = typeof input.otherBenefits === "string" ? input.otherBenefits.trim() : "";
    const salaryModel =
      input.salaryModel === "FIXED" || input.salaryModel === "FIXED_PLUS_COMMISSION" || input.salaryModel === "COMMISSION"
        ? input.salaryModel
        : undefined;
    const fixedSalary = this.normalizeDecimalField(input.fixedSalary);
    const commissionType =
      input.commissionType === "PERCENT" || input.commissionType === "PER_RIDE" ? input.commissionType : undefined;
    const commissionApplyOn = input.commissionApplyOn === "RIDE" || input.commissionApplyOn === "RATING" ? input.commissionApplyOn : undefined;
    const commissionPercent = this.normalizeDecimalField(input.commissionPercent);
    const commissionPerRide = this.normalizeDecimalField(input.commissionPerRide);
    const startDate = typeof input.startDate === "string" ? input.startDate.trim() : "";
    const endDate = typeof input.endDate === "string" ? input.endDate.trim() : "";
    const benefits = typeof input.benefits === "string" ? input.benefits.trim() : "";
    const intermittentStatus =
      input.intermittentStatus === "ATIVO" || input.intermittentStatus === "PAUSADO"
        ? input.intermittentStatus
        : undefined;
    const intermittentConvocationMode =
      input.intermittentConvocationMode === "ON_DEMAND" ||
      input.intermittentConvocationMode === "ADVANCE_NOTICE" ||
      input.intermittentConvocationMode === "FIXED_WINDOW"
        ? input.intermittentConvocationMode
        : undefined;
    const intermittentNoticeHours = this.normalizeIntegerField(input.intermittentNoticeHours, 0);
    const intermittentConvocationNotes =
      typeof input.intermittentConvocationNotes === "string" ? input.intermittentConvocationNotes.trim() : "";
    const intermittentPaymentMode =
      input.intermittentPaymentMode === "DAILY" ||
      input.intermittentPaymentMode === "PER_RIDE" ||
      input.intermittentPaymentMode === "DAILY_PLUS_RIDE"
        ? input.intermittentPaymentMode
        : undefined;
    const intermittentDailyRate = this.normalizeDecimalField(input.intermittentDailyRate);
    const intermittentRideCompensationType =
      input.intermittentRideCompensationType === "AMOUNT" || input.intermittentRideCompensationType === "PERCENT"
        ? input.intermittentRideCompensationType
        : undefined;
    const intermittentRideAmount = this.normalizeDecimalField(input.intermittentRideAmount);
    const intermittentRidePercent = this.normalizeDecimalField(input.intermittentRidePercent);
    const intermittentPreferredWeekDays = Array.isArray(input.intermittentPreferredWeekDays)
      ? input.intermittentPreferredWeekDays
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toUpperCase())
          .filter(
            (
              item
            ): item is "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" =>
              item === "MON" ||
              item === "TUE" ||
              item === "WED" ||
              item === "THU" ||
              item === "FRI" ||
              item === "SAT" ||
              item === "SUN"
          )
      : [];
    const meiRemunerationModel =
      input.meiRemunerationModel === "COMMISSION_PERCENT" ||
      input.meiRemunerationModel === "PER_RIDE_FIXED" ||
      input.meiRemunerationModel === "RIDE_REVENUE_SHARE" ||
      input.meiRemunerationModel === "FIXED_PLUS_VARIABLE"
        ? input.meiRemunerationModel
        : undefined;
    const meiCommissionBase =
      input.meiCommissionBase === "RIDE" ||
      input.meiCommissionBase === "GROSS_REVENUE" ||
      input.meiCommissionBase === "RATING"
        ? input.meiCommissionBase
        : undefined;
    const meiCommissionPercent = this.normalizeDecimalField(input.meiCommissionPercent);
    const meiPerRideAmount = this.normalizeDecimalField(input.meiPerRideAmount);
    const meiRevenueSharePercent = this.normalizeDecimalField(input.meiRevenueSharePercent);
    const meiRevenueShareBase =
      input.meiRevenueShareBase === "RIDE_GROSS" || input.meiRevenueShareBase === "RIDE_NET"
        ? input.meiRevenueShareBase
        : undefined;
    const meiFixedBaseAmount = this.normalizeDecimalField(input.meiFixedBaseAmount);
    const meiVariableType =
      input.meiVariableType === "PERCENT" || input.meiVariableType === "AMOUNT"
        ? input.meiVariableType
        : undefined;
    const meiVariablePercent = this.normalizeDecimalField(input.meiVariablePercent);
    const meiVariableAmount = this.normalizeDecimalField(input.meiVariableAmount);
    const meiVariableBase =
      input.meiVariableBase === "RIDE" ||
      input.meiVariableBase === "GROSS_REVENUE" ||
      input.meiVariableBase === "RATING"
        ? input.meiVariableBase
        : undefined;
    const meiWorkMode =
      input.meiWorkMode === "ON_DEMAND" || input.meiWorkMode === "SCHEDULED" || input.meiWorkMode === "MIXED"
        ? input.meiWorkMode
        : undefined;
    const meiOperationVehicleMode =
      input.meiOperationVehicleMode === "OWN_VEHICLE" ||
      input.meiOperationVehicleMode === "COMPANY_VEHICLE" ||
      input.meiOperationVehicleMode === "BOTH"
        ? input.meiOperationVehicleMode
        : undefined;
    const meiFuelResponsibility =
      input.meiFuelResponsibility === "DRIVER" ||
      input.meiFuelResponsibility === "COMPANY" ||
      input.meiFuelResponsibility === "SHARED"
        ? input.meiFuelResponsibility
        : undefined;
    const meiMaintenanceResponsibility =
      input.meiMaintenanceResponsibility === "DRIVER" ||
      input.meiMaintenanceResponsibility === "COMPANY" ||
      input.meiMaintenanceResponsibility === "SHARED"
        ? input.meiMaintenanceResponsibility
        : undefined;
    const meiPreferredWeekDays = Array.isArray(input.meiPreferredWeekDays)
      ? input.meiPreferredWeekDays
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toUpperCase())
          .filter(
            (
              item
            ): item is "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" =>
              item === "MON" ||
              item === "TUE" ||
              item === "WED" ||
              item === "THU" ||
              item === "FRI" ||
              item === "SAT" ||
              item === "SUN"
          )
      : [];
    const meiCnpj = typeof input.meiCnpj === "string" ? input.meiCnpj.trim() : "";
    const meiLegalName = typeof input.meiLegalName === "string" ? input.meiLegalName.trim() : "";
    const meiTradeName = typeof input.meiTradeName === "string" ? input.meiTradeName.trim() : "";
    const meiMunicipalRegistration =
      typeof input.meiMunicipalRegistration === "string" ? input.meiMunicipalRegistration.trim() : "";
    const workedPeriods = typeof input.workedPeriods === "string" ? input.workedPeriods.trim() : "";
    const intermittentPreferredDays = typeof input.intermittentPreferredDays === "string" ? input.intermittentPreferredDays.trim() : "";
    const paymentMethod = typeof input.paymentMethod === "string" ? input.paymentMethod.trim() : "";
    const paymentFrequency = typeof input.paymentFrequency === "string" ? input.paymentFrequency.trim() : "";
    const fiscalNotes = typeof input.fiscalNotes === "string" ? input.fiscalNotes.trim() : "";
    const notes = typeof input.notes === "string" ? input.notes.trim() : "";
    const overtimeUseGlobalPolicy =
      input.overtimeUseGlobalPolicy === undefined ? undefined : Boolean(input.overtimeUseGlobalPolicy);
    const overtimeEnabled = input.overtimeEnabled === undefined ? undefined : Boolean(input.overtimeEnabled);
    const overtimePolicyMode =
      input.overtimePolicyMode === "PAID" || input.overtimePolicyMode === "BANK_HOURS"
        ? input.overtimePolicyMode
        : undefined;
    const overtimeDailyLimitHours = this.normalizeDecimalField(input.overtimeDailyLimitHours);
    const overtimeWeeklyLimitHours = this.normalizeDecimalField(input.overtimeWeeklyLimitHours);
    const overtimeAfterDailyHours = this.normalizeDecimalField(input.overtimeAfterDailyHours);
    const overtimeAfterWeeklyHours = this.normalizeDecimalField(input.overtimeAfterWeeklyHours);
    const overtimeMultiplier50 = this.normalizeDecimalField(input.overtimeMultiplier50);
    const overtimeMultiplier100 = this.normalizeDecimalField(input.overtimeMultiplier100);
    const overtimeNightMultiplier = this.normalizeDecimalField(input.overtimeNightMultiplier);
    const overtimeRoundingMinutes = this.normalizeIntegerField(input.overtimeRoundingMinutes, 0);
    const workProfileTemplateId =
      typeof input.workProfileTemplateId === "string" ? input.workProfileTemplateId.trim() : "";
    const workProfileTemplateName =
      typeof input.workProfileTemplateName === "string" ? input.workProfileTemplateName.trim() : "";
    const workProfileSummary =
      typeof input.workProfileSummary === "string" ? input.workProfileSummary.trim() : "";
    const workProfileContractType =
      input.workProfileContractType === "CLT" ||
      input.workProfileContractType === "CLT_INTERMITENTE" ||
      input.workProfileContractType === "MEI" ||
      input.workProfileContractType === "PJ" ||
      input.workProfileContractType === "AUTONOMO"
        ? input.workProfileContractType
        : undefined;
    const employmentTemplateKey =
      typeof input.employmentTemplateKey === "string" ? input.employmentTemplateKey.trim() : "";
    const employmentTemplateName =
      typeof input.employmentTemplateName === "string" ? input.employmentTemplateName.trim() : "";
    const employmentTemplateVersion =
      typeof input.employmentTemplateVersion === "string" ? input.employmentTemplateVersion.trim() : "";
    const employmentContracts = this.normalizeEmploymentContracts(input.employmentContracts);

    if (
      hasFixedTermContract === undefined &&
      notifyContractEnd === undefined &&
      contractEndNotifyLeadDays === undefined &&
      experienceEnabled === undefined &&
      !experienceStartDate &&
      !experienceEndDate &&
      autoRenewAfterExperience === undefined &&
      notifyExperienceEnd === undefined &&
      experienceNotifyLeadDays === undefined &&
      experienceNotifyRepeatDays === undefined &&
      benefitsList.length === 0 &&
      !otherBenefits &&
      !salaryModel &&
      fixedSalary === undefined &&
      !commissionType &&
      !commissionApplyOn &&
      commissionPercent === undefined &&
      commissionPerRide === undefined &&
      !startDate &&
      !endDate &&
      !benefits &&
      !intermittentStatus &&
      !intermittentConvocationMode &&
      intermittentNoticeHours === undefined &&
      !intermittentConvocationNotes &&
      !intermittentPaymentMode &&
      intermittentDailyRate === undefined &&
      !intermittentRideCompensationType &&
      intermittentRideAmount === undefined &&
      intermittentRidePercent === undefined &&
      intermittentPreferredWeekDays.length === 0 &&
      !meiRemunerationModel &&
      !meiCommissionBase &&
      meiCommissionPercent === undefined &&
      meiPerRideAmount === undefined &&
      meiRevenueSharePercent === undefined &&
      !meiRevenueShareBase &&
      meiFixedBaseAmount === undefined &&
      !meiVariableType &&
      meiVariablePercent === undefined &&
      meiVariableAmount === undefined &&
      !meiVariableBase &&
      !meiWorkMode &&
      !meiOperationVehicleMode &&
      !meiFuelResponsibility &&
      !meiMaintenanceResponsibility &&
      meiPreferredWeekDays.length === 0 &&
      !meiCnpj &&
      !meiLegalName &&
      !meiTradeName &&
      !meiMunicipalRegistration &&
      !workedPeriods &&
      !intermittentPreferredDays &&
      !paymentMethod &&
      !paymentFrequency &&
      !fiscalNotes &&
      !notes &&
      overtimeUseGlobalPolicy === undefined &&
      overtimeEnabled === undefined &&
      !overtimePolicyMode &&
      overtimeDailyLimitHours === undefined &&
      overtimeWeeklyLimitHours === undefined &&
      overtimeAfterDailyHours === undefined &&
      overtimeAfterWeeklyHours === undefined &&
      overtimeMultiplier50 === undefined &&
      overtimeMultiplier100 === undefined &&
      overtimeNightMultiplier === undefined &&
      overtimeRoundingMinutes === undefined &&
      !workProfileTemplateId &&
      !workProfileTemplateName &&
      !workProfileSummary &&
      !workProfileContractType &&
      !employmentTemplateKey &&
      !employmentTemplateName &&
      !employmentTemplateVersion &&
      employmentContracts.length === 0
    ) {
      return null;
    }

    const normalizedContract: DriverContract = {
      hasFixedTermContract,
      notifyContractEnd,
      contractEndNotifyLeadDays,
      experienceEnabled,
      experienceStartDate: experienceStartDate || undefined,
      experienceEndDate: experienceEndDate || undefined,
      autoRenewAfterExperience,
      notifyExperienceEnd,
      experienceNotifyLeadDays,
      experienceNotifyRepeatDays,
      benefitsList: benefitsList.length > 0 ? [...new Set(benefitsList)] : undefined,
      otherBenefits: otherBenefits || undefined,
      salaryModel,
      fixedSalary,
      commissionType,
      commissionApplyOn,
      commissionPercent,
      commissionPerRide,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      benefits: benefits || undefined,
      intermittentStatus,
      intermittentConvocationMode,
      intermittentNoticeHours,
      intermittentConvocationNotes: intermittentConvocationNotes || undefined,
      intermittentPaymentMode,
      intermittentDailyRate,
      intermittentRideCompensationType,
      intermittentRideAmount,
      intermittentRidePercent,
      intermittentPreferredWeekDays:
        intermittentPreferredWeekDays.length > 0
          ? [...new Set(intermittentPreferredWeekDays)]
          : undefined,
      meiRemunerationModel,
      meiCommissionBase,
      meiCommissionPercent,
      meiPerRideAmount,
      meiRevenueSharePercent,
      meiRevenueShareBase,
      meiFixedBaseAmount,
      meiVariableType,
      meiVariablePercent,
      meiVariableAmount,
      meiVariableBase,
      meiWorkMode,
      meiOperationVehicleMode,
      meiFuelResponsibility,
      meiMaintenanceResponsibility,
      meiPreferredWeekDays:
        meiPreferredWeekDays.length > 0
          ? [...new Set(meiPreferredWeekDays)]
          : undefined,
      meiCnpj: meiCnpj || undefined,
      meiLegalName: meiLegalName || undefined,
      meiTradeName: meiTradeName || undefined,
      meiMunicipalRegistration: meiMunicipalRegistration || undefined,
      workedPeriods: workedPeriods || undefined,
      intermittentPreferredDays: intermittentPreferredDays || undefined,
      paymentMethod: paymentMethod || undefined,
      paymentFrequency: paymentFrequency || undefined,
      fiscalNotes: fiscalNotes || undefined,
      notes: notes || undefined,
      overtimeUseGlobalPolicy,
      overtimeEnabled,
      overtimePolicyMode,
      overtimeDailyLimitHours,
      overtimeWeeklyLimitHours,
      overtimeAfterDailyHours,
      overtimeAfterWeeklyHours,
      overtimeMultiplier50,
      overtimeMultiplier100,
      overtimeNightMultiplier,
      overtimeRoundingMinutes,
      workProfileTemplateId: workProfileTemplateId || undefined,
      workProfileTemplateName: workProfileTemplateName || undefined,
      workProfileSummary: workProfileSummary || undefined,
      workProfileContractType,
      employmentTemplateKey: employmentTemplateKey || undefined,
      employmentTemplateName: employmentTemplateName || undefined,
      employmentTemplateVersion: employmentTemplateVersion || undefined,
      employmentContracts: employmentContracts.length > 0 ? employmentContracts : undefined
    };

    const profiledContract = this.applyContractProfilePolicy(normalizedContract, profile);
    if (this.isContractEmpty(profiledContract)) {
      return null;
    }

    return profiledContract as Prisma.InputJsonValue;
  }

  private applyContractProfilePolicy(
    contract: DriverContract,
    profile?: DriverContractProfile
  ): DriverContract {
    if (!profile) {
      return contract;
    }

    const next: DriverContract = { ...contract };

    const clearSalaryFields = () => {
      next.salaryModel = undefined;
      next.fixedSalary = undefined;
      next.commissionType = undefined;
      next.commissionApplyOn = undefined;
      next.commissionPercent = undefined;
      next.commissionPerRide = undefined;
    };

    const clearIntermittentFields = () => {
      next.intermittentStatus = undefined;
      next.intermittentConvocationMode = undefined;
      next.intermittentNoticeHours = undefined;
      next.intermittentConvocationNotes = undefined;
      next.intermittentPaymentMode = undefined;
      next.intermittentDailyRate = undefined;
      next.intermittentRideCompensationType = undefined;
      next.intermittentRideAmount = undefined;
      next.intermittentRidePercent = undefined;
      next.intermittentPreferredWeekDays = undefined;
      next.workedPeriods = undefined;
      next.intermittentPreferredDays = undefined;
    };

    const clearMeiFields = () => {
      next.meiRemunerationModel = undefined;
      next.meiCommissionBase = undefined;
      next.meiCommissionPercent = undefined;
      next.meiPerRideAmount = undefined;
      next.meiRevenueSharePercent = undefined;
      next.meiRevenueShareBase = undefined;
      next.meiFixedBaseAmount = undefined;
      next.meiVariableType = undefined;
      next.meiVariablePercent = undefined;
      next.meiVariableAmount = undefined;
      next.meiVariableBase = undefined;
      next.meiWorkMode = undefined;
      next.meiOperationVehicleMode = undefined;
      next.meiFuelResponsibility = undefined;
      next.meiMaintenanceResponsibility = undefined;
      next.meiPreferredWeekDays = undefined;
      next.meiCnpj = undefined;
      next.meiLegalName = undefined;
      next.meiTradeName = undefined;
      next.meiMunicipalRegistration = undefined;
    };

    const clearOvertimeFields = () => {
      next.overtimeUseGlobalPolicy = undefined;
      next.overtimeEnabled = undefined;
      next.overtimePolicyMode = undefined;
      next.overtimeDailyLimitHours = undefined;
      next.overtimeWeeklyLimitHours = undefined;
      next.overtimeAfterDailyHours = undefined;
      next.overtimeAfterWeeklyHours = undefined;
      next.overtimeMultiplier50 = undefined;
      next.overtimeMultiplier100 = undefined;
      next.overtimeNightMultiplier = undefined;
      next.overtimeRoundingMinutes = undefined;
    };

    if (profile === "CLT") {
      clearIntermittentFields();
      clearMeiFields();
      return next;
    }

    if (profile === "INTERMITENTE") {
      clearSalaryFields();
      clearMeiFields();
      clearOvertimeFields();
      return next;
    }

    clearSalaryFields();
    clearIntermittentFields();
    clearOvertimeFields();
    next.employmentTemplateKey = undefined;
    next.employmentTemplateName = undefined;
    next.employmentTemplateVersion = undefined;
    next.benefitsList = undefined;
    next.otherBenefits = undefined;
    next.benefits = undefined;
    return next;
  }

  private isContractEmpty(contract: DriverContract): boolean {
    return Object.values(contract).every(
      (value) => value === undefined || (Array.isArray(value) && value.length === 0)
    );
  }

  private parseEmergencyContacts(value: unknown): DriverEmergencyContact[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => ({
        name:
          typeof item.name === "string"
            ? item.name
            : typeof item.fullName === "string"
              ? item.fullName
              : typeof item.contactName === "string"
                ? item.contactName
                : "",
        relation:
          typeof item.relation === "string"
            ? item.relation
            : typeof item.relationship === "string"
              ? item.relationship
              : typeof item.kinship === "string"
                ? item.kinship
                : "",
        phone:
          typeof item.phone === "string" || typeof item.phone === "number"
            ? this.normalizePhone(String(item.phone))
            : typeof item.phoneNumber === "string" || typeof item.phoneNumber === "number"
              ? this.normalizePhone(String(item.phoneNumber))
              : typeof item.whatsappPhone === "string" || typeof item.whatsappPhone === "number"
                ? this.normalizePhone(String(item.whatsappPhone))
                : "",
        isWhatsapp:
          item.isWhatsapp !== undefined
            ? Boolean(item.isWhatsapp)
            : item.isWhatsApp !== undefined
              ? Boolean(item.isWhatsApp)
              : false,
        notes:
          typeof item.notes === "string"
            ? item.notes
            : typeof item.observation === "string"
              ? item.observation
              : undefined
      }))
      .filter((item) => item.name.trim().length > 0 && item.phone.trim().length > 0);
  }

  private parseAddress(value: unknown): DriverAddress | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const addressType = input.addressType === "OWN" || input.addressType === "RENTED" ? input.addressType : undefined;
    const parsed: DriverAddress = {
      cep: typeof input.cep === "string" ? input.cep : undefined,
      addressType,
      street: typeof input.street === "string" ? input.street : undefined,
      number: typeof input.number === "string" ? input.number : undefined,
      neighborhood: typeof input.neighborhood === "string" ? input.neighborhood : undefined,
      complement: typeof input.complement === "string" ? input.complement : undefined,
      city: typeof input.city === "string" ? input.city : undefined,
      state: typeof input.state === "string" ? input.state : undefined
    };

    if (
      !parsed.cep &&
      !parsed.addressType &&
      !parsed.street &&
      !parsed.number &&
      !parsed.neighborhood &&
      !parsed.complement &&
      !parsed.city &&
      !parsed.state
    ) {
      return undefined;
    }

    return parsed;
  }

  private parseDriverLicense(value: unknown): DriverLicense | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const parsed: DriverLicense = {
      number: typeof input.number === "string" ? input.number : "",
      category: typeof input.category === "string" ? input.category : "",
      expirationDate: typeof input.expirationDate === "string" ? input.expirationDate : "",
      firstLicenseDate: typeof input.firstLicenseDate === "string" ? input.firstLicenseDate : "",
      issuingState: typeof input.issuingState === "string" ? input.issuingState : "",
      documentPhotoUrl: typeof input.documentPhotoUrl === "string" ? input.documentPhotoUrl : undefined,
      expiryAlertLeadDays: this.normalizeIntegerField(input.expiryAlertLeadDays, 0),
      expiryAlertRepeatDays: this.normalizeIntegerField(input.expiryAlertRepeatDays, 1)
    };

    if (
      !parsed.number &&
      !parsed.category &&
      !parsed.expirationDate &&
      !parsed.firstLicenseDate &&
      !parsed.issuingState &&
      !parsed.documentPhotoUrl &&
      parsed.expiryAlertLeadDays === undefined &&
      parsed.expiryAlertRepeatDays === undefined
    ) {
      return undefined;
    }

    return parsed;
  }

  private parseToxicology(value: unknown): DriverToxicology | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    return {
      required: input.required === undefined ? true : Boolean(input.required),
      examNumber: typeof input.examNumber === "string" ? input.examNumber : undefined,
      examDate: typeof input.examDate === "string" ? input.examDate : undefined,
      expirationDate: typeof input.expirationDate === "string" ? input.expirationDate : undefined,
      expiryAlertLeadDays: this.normalizeIntegerField(input.expiryAlertLeadDays, 0),
      expiryAlertRepeatDays: this.normalizeIntegerField(input.expiryAlertRepeatDays, 1),
      clinicName: typeof input.clinicName === "string" ? input.clinicName : undefined,
      clinicCnpj: typeof input.clinicCnpj === "string" ? input.clinicCnpj : undefined,
      reportAttachmentName: typeof input.reportAttachmentName === "string" ? input.reportAttachmentName : undefined,
      reportAttachmentDataUrl:
        typeof input.reportAttachmentDataUrl === "string" ? input.reportAttachmentDataUrl : undefined,
      reportAttachmentMimeType:
        typeof input.reportAttachmentMimeType === "string" ? input.reportAttachmentMimeType : undefined,
      notes: typeof input.notes === "string" ? input.notes : undefined,
      psychotechnical: this.parsePsychotechnical(input.psychotechnical)
    };
  }

  private parsePsychotechnical(value: unknown): DriverPsychotechnical | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    return {
      required: input.required === undefined ? true : Boolean(input.required),
      examNumber: typeof input.examNumber === "string" ? input.examNumber : undefined,
      examDate: typeof input.examDate === "string" ? input.examDate : undefined,
      expirationDate: typeof input.expirationDate === "string" ? input.expirationDate : undefined,
      situation:
        input.situation === "APTO" || input.situation === "INAPTO" || input.situation === "APTO_COM_RESTRICOES"
          ? input.situation
          : undefined,
      restrictionsDescription: typeof input.restrictionsDescription === "string" ? input.restrictionsDescription : undefined,
      examType: input.examType === "INICIAL" || input.examType === "RENOVACAO" ? input.examType : undefined,
      expiryAlertLeadDays: this.normalizeIntegerField(input.expiryAlertLeadDays, 0),
      expiryAlertRepeatDays: this.normalizeIntegerField(input.expiryAlertRepeatDays, 1),
      clinicName: typeof input.clinicName === "string" ? input.clinicName : undefined,
      clinicCnpj: typeof input.clinicCnpj === "string" ? input.clinicCnpj : undefined,
      psychologistName: typeof input.psychologistName === "string" ? input.psychologistName : undefined,
      psychologistCrp: typeof input.psychologistCrp === "string" ? input.psychologistCrp : undefined,
      detailedResult: typeof input.detailedResult === "string" ? input.detailedResult : undefined,
      reportAttachmentName: typeof input.reportAttachmentName === "string" ? input.reportAttachmentName : undefined,
      reportAttachmentDataUrl:
        typeof input.reportAttachmentDataUrl === "string" ? input.reportAttachmentDataUrl : undefined,
      reportAttachmentMimeType:
        typeof input.reportAttachmentMimeType === "string" ? input.reportAttachmentMimeType : undefined,
      notes: typeof input.notes === "string" ? input.notes : undefined
    };
  }

  private parseComplianceHistory(value: unknown): DriverComplianceHistoryItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item, index) => ({
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id
            : `history-${typeof item.createdAt === "string" ? item.createdAt : index}`,
        title: typeof item.title === "string" ? item.title : "",
        meta: typeof item.meta === "string" ? item.meta : "",
        detail: typeof item.detail === "string" ? item.detail : "",
        createdAt:
          typeof item.createdAt === "string" && item.createdAt.trim()
            ? item.createdAt
            : new Date().toISOString()
      }))
      .filter((item) => item.title.trim().length > 0 && item.detail.trim().length > 0);
  }

  private parseContractProfile(value: string | null | undefined): DriverContractProfile | undefined {
    if (value === "CLT" || value === "INTERMITENTE" || value === "MEI") {
      return value;
    }

    return undefined;
  }

  private parseJourney(value: unknown): DriverJourney | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const scaleType =
      input.scaleType === "FIVE_TWO" ||
      input.scaleType === "SIX_ONE" ||
      input.scaleType === "TWELVE_THIRTY_SIX" ||
      input.scaleType === "CUSTOM"
        ? input.scaleType
        : undefined;
    const fixedScheduleMode =
      input.fixedScheduleMode === "UNIFORM" || input.fixedScheduleMode === "PER_DAY"
        ? input.fixedScheduleMode
        : undefined;
    const daySchedules = Array.isArray(input.daySchedules)
      ? input.daySchedules
          .filter((item): item is Record<string, unknown> => this.isRecord(item))
          .map((item) => {
            const day =
              item.day === "MON" ||
              item.day === "TUE" ||
              item.day === "WED" ||
              item.day === "THU" ||
              item.day === "FRI" ||
              item.day === "SAT" ||
              item.day === "SUN"
                ? (item.day as JourneyWeekDay)
                : undefined;
            if (!day) {
              return null;
            }
            return {
              day,
              enabled: item.enabled === undefined ? true : Boolean(item.enabled),
              startTime: typeof item.startTime === "string" ? item.startTime : undefined,
              endTime: typeof item.endTime === "string" ? item.endTime : undefined
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : undefined;
    const accessibility = this.parseAccessibility(input.accessibility);
    const dsrPolicy = this.parseJourneyDsrPolicy(input.dsrPolicy);
    const parsed: DriverJourney = {
      dsrPolicy,
      shift: typeof input.shift === "string" ? input.shift : undefined,
      scale: typeof input.scale === "string" ? input.scale : undefined,
      scaleType,
      fixedScheduleMode,
      customScaleWorkDays: this.normalizeIntegerField(input.customScaleWorkDays, 1),
      customScaleOffDays: this.normalizeIntegerField(input.customScaleOffDays, 1),
      fixedSchedule: input.fixedSchedule === undefined ? undefined : Boolean(input.fixedSchedule),
      startTime: typeof input.startTime === "string" ? input.startTime : undefined,
      endTime: typeof input.endTime === "string" ? input.endTime : undefined,
      availabilityStartTime: typeof input.availabilityStartTime === "string" ? input.availabilityStartTime : undefined,
      availabilityEndTime: typeof input.availabilityEndTime === "string" ? input.availabilityEndTime : undefined,
      availableDays: Array.isArray(input.availableDays)
        ? input.availableDays.filter(
            (item): item is JourneyWeekDay =>
              item === "MON" ||
              item === "TUE" ||
              item === "WED" ||
              item === "THU" ||
              item === "FRI" ||
              item === "SAT" ||
              item === "SUN"
          )
        : undefined,
      daySchedules: daySchedules && daySchedules.length > 0 ? daySchedules : undefined,
      acceptsOutsideSchedule:
        input.acceptsOutsideSchedule === undefined ? undefined : Boolean(input.acceptsOutsideSchedule),
      availabilityNotes: typeof input.availabilityNotes === "string" ? input.availabilityNotes : undefined,
      accessibility
    };

    if (
      !parsed.shift &&
      !parsed.scale &&
      !parsed.scaleType &&
      !parsed.fixedScheduleMode &&
      parsed.customScaleWorkDays === undefined &&
      parsed.customScaleOffDays === undefined &&
      parsed.fixedSchedule === undefined &&
      !parsed.startTime &&
      !parsed.endTime &&
      !parsed.availabilityStartTime &&
      !parsed.availabilityEndTime &&
      (!parsed.availableDays || parsed.availableDays.length === 0) &&
      (!parsed.daySchedules || parsed.daySchedules.length === 0) &&
      parsed.acceptsOutsideSchedule === undefined &&
      !parsed.availabilityNotes &&
      !parsed.accessibility &&
      !parsed.dsrPolicy
    ) {
      return undefined;
    }

    return parsed;
  }

  private parseJourneyDsrPolicy(value: unknown): DriverJourney["dsrPolicy"] | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const id = typeof input.id === "string" ? input.id.trim() : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const weeklyRestDay =
      input.weeklyRestDay === "MON" ||
      input.weeklyRestDay === "TUE" ||
      input.weeklyRestDay === "WED" ||
      input.weeklyRestDay === "THU" ||
      input.weeklyRestDay === "FRI" ||
      input.weeklyRestDay === "SAT" ||
      input.weeklyRestDay === "SUN"
        ? input.weeklyRestDay
        : undefined;
    const restMode =
      input.restMode === "WEEKDAY" || input.restMode === "CYCLE"
        ? input.restMode
        : weeklyRestDay
          ? "WEEKDAY"
          : undefined;
    if (!weeklyRestDay && restMode !== "CYCLE") {
      return undefined;
    }
    const cycleWorkDays =
      typeof input.cycleWorkDays === "number" && Number.isFinite(input.cycleWorkDays)
        ? Math.min(7, Math.max(1, Math.trunc(input.cycleWorkDays)))
        : undefined;
    const cycleOffDays =
      typeof input.cycleOffDays === "number" && Number.isFinite(input.cycleOffDays)
        ? Math.min(7, Math.max(1, Math.trunc(input.cycleOffDays)))
        : undefined;

    const summary =
      typeof input.summary === "string" && input.summary.trim().length > 0
        ? input.summary.trim()
        : undefined;

    return {
      id: id || "journey-dsr",
      name: name || "DSR da jornada",
      summary,
      restMode,
      weeklyRestDay,
      cycleWorkDays: restMode === "CYCLE" ? cycleWorkDays ?? 1 : undefined,
      cycleOffDays: restMode === "CYCLE" ? cycleOffDays ?? 1 : undefined,
      reflectOvertime:
        input.reflectOvertime === undefined ? true : Boolean(input.reflectOvertime),
      reflectNight: input.reflectNight === undefined ? true : Boolean(input.reflectNight),
      loseOnUnjustifiedAbsence:
        input.loseOnUnjustifiedAbsence === undefined
          ? false
          : Boolean(input.loseOnUnjustifiedAbsence)
    };
  }

  private parseAccessibility(value: unknown): DriverAccessibility | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const hasDisability = input.hasDisability === undefined ? undefined : Boolean(input.hasDisability);
    const disabilityType =
      input.disabilityType === "PHYSICAL" ||
      input.disabilityType === "HEARING" ||
      input.disabilityType === "VISUAL" ||
      input.disabilityType === "INTELLECTUAL" ||
      input.disabilityType === "MULTIPLE" ||
      input.disabilityType === "OTHER"
        ? input.disabilityType
        : undefined;
    const otherDisabilityType =
      hasDisability === true && typeof input.otherDisabilityType === "string"
        ? input.otherDisabilityType.trim() || undefined
        : undefined;
    const hasMobilityLimitation =
      hasDisability === true && input.hasMobilityLimitation !== undefined
        ? Boolean(input.hasMobilityLimitation)
        : undefined;
    const mobilityLimitationDescription =
      hasDisability === true && hasMobilityLimitation === true && typeof input.mobilityLimitationDescription === "string"
        ? input.mobilityLimitationDescription.trim() || undefined
        : undefined;
    const needsVehicleAdaptation =
      hasDisability === true && input.needsVehicleAdaptation !== undefined
        ? Boolean(input.needsVehicleAdaptation)
        : undefined;
    const vehicleAdaptationDescription =
      hasDisability === true && needsVehicleAdaptation === true && typeof input.vehicleAdaptationDescription === "string"
        ? input.vehicleAdaptationDescription.trim() || undefined
        : undefined;

    if (
      hasDisability === undefined &&
      !disabilityType &&
      !otherDisabilityType &&
      hasMobilityLimitation === undefined &&
      !mobilityLimitationDescription &&
      needsVehicleAdaptation === undefined &&
      !vehicleAdaptationDescription
    ) {
      return undefined;
    }

    return {
      hasDisability,
      disabilityType: hasDisability ? disabilityType : undefined,
      otherDisabilityType: hasDisability ? otherDisabilityType : undefined,
      hasMobilityLimitation,
      mobilityLimitationDescription,
      needsVehicleAdaptation,
      vehicleAdaptationDescription
    };
  }

  private async buildNextContractWithGeneratedDocument(input: {
    driver: Prisma.DriverGetPayload<{ include: typeof driverInclude }>;
    profile: "CLT" | "INTERMITENTE" | "MEI";
    contract?: DriverContract;
    journey?: DriverJourney;
    kind: DriverEmploymentContractKind;
    parentContractId?: string;
    templateSelection?: EmploymentTemplateSelectionInput;
  }): Promise<Prisma.InputJsonValue> {
    const { driver, profile, contract, journey, kind, parentContractId, templateSelection } = input;

    if (!contract) {
      throw new BadRequestException(
        "Configure os dados de jornada e remuneracao do motorista antes de gerar o contrato."
      );
    }

    const inheritedSettings = await this.applyWorkProfileInheritance(
      this.prisma,
      profile,
      contract,
      journey
    );
    const effectiveProfile = inheritedSettings.profile ?? profile;
    const effectiveContract = inheritedSettings.contract ?? contract;
    const effectiveJourney = inheritedSettings.journey ?? journey;

    const existingDocuments = effectiveContract.employmentContracts ?? [];
    const pendingDocument = existingDocuments.find(
      (item) => item.status === "DRAFT" || item.status === "PENDING_SIGNATURE"
    );
    if (pendingDocument) {
      throw new BadRequestException(
        "Ja existe um contrato em rascunho ou pendente de assinatura. Finalize esse fluxo antes de gerar outro."
      );
    }

    const activeDocument = existingDocuments.find(
      (item) => item.status === "ACTIVE" || item.status === "EXPIRING_SOON"
    );

    if (kind === "NEW" && activeDocument) {
      throw new BadRequestException(
        "Ja existe contrato ativo para este motorista. Use renovacao ou endosso."
      );
    }

    if (kind === "RENEWAL") {
      if (!parentContractId) {
        throw new BadRequestException("Informe o contrato base para gerar a renovacao.");
      }

      const parent = existingDocuments.find((item) => item.id === parentContractId);
      if (!parent) {
        throw new NotFoundException("Contrato base para renovacao nao encontrado.");
      }

      if (
        parent.status !== "ACTIVE" &&
        parent.status !== "EXPIRING_SOON" &&
        parent.status !== "EXPIRED"
      ) {
        throw new BadRequestException(
          "A renovacao so pode partir de contrato ativo, expirando ou expirado."
        );
      }

      const hasOpenRenewal = existingDocuments.some(
        (item) =>
          item.parentContractId === parentContractId &&
          (item.status === "DRAFT" ||
            item.status === "PENDING_SIGNATURE" ||
            item.status === "ACTIVE" ||
            item.status === "EXPIRING_SOON")
      );

      if (hasOpenRenewal) {
        throw new BadRequestException(
          "Ja existe uma renovacao em andamento para este contrato."
        );
      }
    }

    const draft = await this.buildEmploymentContractDraft(
      driver,
      effectiveProfile,
      effectiveContract,
      effectiveJourney,
      templateSelection
    );
    const generated = this.createEmploymentContractDocument(draft, {
      kind,
      parentContractId
    });
    const nextContract = this.normalizeContract(
      {
        ...effectiveContract,
        employmentTemplateKey: generated.templateKey,
        employmentTemplateName: generated.templateName,
        employmentTemplateVersion: generated.templateVersion,
        employmentContracts: [generated, ...existingDocuments].slice(0, 25)
      },
      effectiveProfile
    );

    if (!nextContract) {
      throw new BadRequestException("Nao foi possivel gerar contrato com os dados atuais.");
    }

    return nextContract;
  }

  private async buildEmploymentContractDraft(
    driver: Prisma.DriverGetPayload<{ include: typeof driverInclude }>,
    profile: "CLT" | "INTERMITENTE" | "MEI",
    contract: DriverContract,
    journey?: DriverJourney,
    templateSelection?: EmploymentTemplateSelectionInput
  ): Promise<EmploymentContractDraft> {
    if (!contract.startDate) {
      throw new BadRequestException("Defina a data de inicio do contrato para gerar o documento.");
    }

    if (contract.hasFixedTermContract && !contract.endDate) {
      throw new BadRequestException("Defina a data de termino para contratos com prazo determinado.");
    }

    if (
      profile === "CLT" &&
      (!contract.experienceEnabled || !contract.experienceStartDate || !contract.experienceEndDate)
    ) {
      throw new BadRequestException(
        "Para CLT, configure o periodo de experiencia com inicio e fim antes de gerar o contrato."
      );
    }

    if (
      contract.experienceEnabled &&
      (!contract.experienceStartDate || !contract.experienceEndDate)
    ) {
      throw new BadRequestException(
        "Preencha inicio e fim do periodo de experiencia antes de gerar o contrato."
      );
    }

    if (profile === "CLT") {
      if (!contract.salaryModel) {
        throw new BadRequestException("Defina a estrutura salarial do CLT antes de gerar o contrato.");
      }
      if (contract.salaryModel !== "COMMISSION" && !this.hasPositiveNumber(contract.fixedSalary)) {
        throw new BadRequestException("Informe o valor fixo mensal do CLT antes de gerar o contrato.");
      }
      if (contract.salaryModel !== "FIXED") {
        if (contract.commissionType === "PERCENT" && !this.hasPositiveNumber(contract.commissionPercent)) {
          throw new BadRequestException("Informe o percentual de comissao do CLT antes de gerar o contrato.");
        }
        if (contract.commissionType === "PER_RIDE" && !this.hasPositiveNumber(contract.commissionPerRide)) {
          throw new BadRequestException("Informe o valor de comissao por corrida do CLT antes de gerar o contrato.");
        }
      }
    }

    if (profile === "INTERMITENTE") {
      if (!contract.intermittentPaymentMode) {
        throw new BadRequestException("Defina a forma de pagamento principal do Intermitente.");
      }
      if (!contract.intermittentConvocationMode) {
        throw new BadRequestException("Defina o modelo de convocacao do Intermitente.");
      }
      if (
        (contract.intermittentPaymentMode === "DAILY" || contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
        !this.hasPositiveNumber(contract.intermittentDailyRate)
      ) {
        throw new BadRequestException("Informe o valor da diaria do Intermitente.");
      }
      if (
        (contract.intermittentPaymentMode === "PER_RIDE" ||
          contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
        (contract.intermittentRideCompensationType ?? "AMOUNT") === "PERCENT" &&
        !this.hasPositiveNumber(contract.intermittentRidePercent)
      ) {
        throw new BadRequestException("Informe o percentual por corrida do Intermitente.");
      }
      if (
        (contract.intermittentPaymentMode === "PER_RIDE" ||
          contract.intermittentPaymentMode === "DAILY_PLUS_RIDE") &&
        (contract.intermittentRideCompensationType ?? "AMOUNT") === "AMOUNT" &&
        !this.hasPositiveNumber(contract.intermittentRideAmount)
      ) {
        throw new BadRequestException("Informe o valor por corrida do Intermitente.");
      }
    }

    if (profile === "MEI") {
      if (!contract.meiRemunerationModel) {
        throw new BadRequestException("Defina o modelo de remuneracao do MEI.");
      }
      if (!contract.paymentMethod) {
        throw new BadRequestException("Defina a forma de pagamento do MEI.");
      }
      if (!contract.paymentFrequency) {
        throw new BadRequestException("Defina a frequencia de pagamento do MEI.");
      }
      if (!contract.meiWorkMode) {
        throw new BadRequestException("Defina a forma de atuacao do MEI.");
      }
      if (!contract.meiOperationVehicleMode) {
        throw new BadRequestException("Defina a forma de operacao do MEI.");
      }
      if (!contract.meiFuelResponsibility) {
        throw new BadRequestException("Defina a responsabilidade de combustivel no MEI.");
      }
      if (!contract.meiMaintenanceResponsibility) {
        throw new BadRequestException("Defina a responsabilidade de manutencao no MEI.");
      }
      if (contract.meiRemunerationModel === "COMMISSION_PERCENT") {
        if (!this.hasPositiveNumber(contract.meiCommissionPercent)) {
          throw new BadRequestException("Informe o percentual de comissao do MEI.");
        }
      }
      if (contract.meiRemunerationModel === "PER_RIDE_FIXED" && !this.hasPositiveNumber(contract.meiPerRideAmount)) {
        throw new BadRequestException("Informe o valor por corrida do MEI.");
      }
      if (contract.meiRemunerationModel === "RIDE_REVENUE_SHARE" && !this.hasPositiveNumber(contract.meiRevenueSharePercent)) {
        throw new BadRequestException("Informe o percentual de repasse do MEI.");
      }
      if (contract.meiRemunerationModel === "FIXED_PLUS_VARIABLE") {
        if (!this.hasPositiveNumber(contract.meiFixedBaseAmount)) {
          throw new BadRequestException("Informe o valor base do MEI.");
        }
        if ((contract.meiVariableType ?? "PERCENT") === "PERCENT" && !this.hasPositiveNumber(contract.meiVariablePercent)) {
          throw new BadRequestException("Informe o percentual variavel do MEI.");
        }
        if ((contract.meiVariableType ?? "PERCENT") === "AMOUNT" && !this.hasPositiveNumber(contract.meiVariableAmount)) {
          throw new BadRequestException("Informe o valor variavel do MEI.");
        }
      }
    }

    const address = this.parseAddress(driver.address);
    const validFrom = contract.startDate;
    const validTo = contract.hasFixedTermContract ? contract.endDate : undefined;
    const generatedAt = new Date().toISOString();
    const selectedTemplate = await this.resolveEmploymentTemplateSelection(
      profile,
      contract,
      templateSelection
    );
    const renderedTemplateContent = await this.renderEmploymentTemplateContent(selectedTemplate.templateContent, {
      driver,
      profile,
      contract,
      journey,
      address,
      generatedAt
    });
    const termDescription = contract.hasFixedTermContract
      ? `Contrato por prazo determinado, de ${this.formatDateBr(contract.startDate)} ate ${this.formatDateBr(
          contract.endDate
        )}.`
      : `Contrato por prazo indeterminado, com inicio em ${this.formatDateBr(contract.startDate)}.`;
    const experienceDescription = contract.experienceEnabled
      ? `Periodo de experiencia ativo de ${this.formatDateBr(contract.experienceStartDate)} ate ${this.formatDateBr(
          contract.experienceEndDate
        )}.`
      : "Sem periodo de experiencia configurado.";
    const remunerationDescription =
      profile === "CLT"
        ? this.describeCltRemuneration(contract)
        : profile === "INTERMITENTE"
          ? this.describeIntermittentRemuneration(contract)
          : this.describeMeiRemuneration(contract);
    const journeyDescription =
      profile === "CLT"
        ? this.describeCltJourney(journey)
        : profile === "INTERMITENTE"
          ? this.describeIntermittentJourney(contract, journey)
          : this.describeMeiOperation(contract);
    const benefitsDescription =
      profile === "MEI"
        ? "Nao se aplica ao modelo de prestacao de servicos MEI."
        : contract.benefitsList && contract.benefitsList.length > 0
          ? contract.benefitsList.join(", ")
          : "Sem beneficios adicionais configurados.";
    const notesDescription =
      profile === "MEI"
        ? (contract.fiscalNotes || contract.notes || "").trim() || "Sem observacoes adicionais."
        : (contract.notes || "").trim() || "Sem observacoes adicionais.";
    const snapshot: Record<string, unknown> = {
      profile,
      generatedAt,
      driver: {
        id: driver.id,
        name: driver.user.name,
        cpf: driver.user.cpf ?? "",
        phone: driver.user.phone ?? "",
        email: driver.user.email ?? undefined,
        address,
        driverType: driver.driverType
      },
      contract: this.buildContractSnapshot(contract),
      template: selectedTemplate,
      journey
    };

    return {
      profile,
      templateKey: selectedTemplate.templateKey,
      templateName: selectedTemplate.templateName,
      templateVersion: selectedTemplate.templateVersion,
      templateContent: renderedTemplateContent,
      driverId: driver.id,
      driverName: driver.user.name,
      driverCpf: driver.user.cpf ?? "",
      driverPhone: driver.user.phone ?? "",
      driverEmail: driver.user.email ?? undefined,
      validFrom,
      validTo,
      termDescription,
      experienceDescription,
      remunerationDescription,
      journeyDescription,
      benefitsDescription,
      notesDescription,
      providerCnpj: profile === "MEI" ? contract.meiCnpj : undefined,
      providerLegalName: profile === "MEI" ? contract.meiLegalName : undefined,
      providerTradeName: profile === "MEI" ? contract.meiTradeName : undefined,
      providerMunicipalRegistration: profile === "MEI" ? contract.meiMunicipalRegistration : undefined,
      generatedAt,
      snapshot
    };
  }

  private async resolveEmploymentTemplateSelection(
    profile: "CLT" | "INTERMITENTE" | "MEI",
    contract: DriverContract,
    override?: EmploymentTemplateSelectionInput
  ): Promise<{ templateKey: string; templateName?: string; templateVersion: string; templateContent?: string }> {
    const workProfileTemplateId = contract.workProfileTemplateId?.trim();
    if (!workProfileTemplateId) {
      throw new BadRequestException(
        "Selecione e salve um perfil de trabalho com modelo de contrato antes de gerar o contrato."
      );
    }

    const workProfile = await this.prisma.workProfileTemplate.findUnique({
      where: { id: workProfileTemplateId },
      select: {
        id: true,
        name: true,
        isActive: true,
        remuneration: true
      }
    });

    if (!workProfile || !workProfile.isActive) {
      throw new BadRequestException(
        "O perfil de trabalho selecionado nao esta disponivel para gerar contrato."
      );
    }

    const remuneration = this.isRecord(workProfile.remuneration)
      ? (workProfile.remuneration as Record<string, unknown>)
      : {};
    const profileTemplateKey =
      typeof remuneration.contractTemplateKey === "string" ? remuneration.contractTemplateKey.trim() : "";
    const profileTemplateName =
      typeof remuneration.contractTemplateName === "string" ? remuneration.contractTemplateName.trim() : "";
    const profileTemplateVersion =
      typeof remuneration.contractTemplateVersion === "string" ? remuneration.contractTemplateVersion.trim() : "";
    const profileTemplateContent =
      typeof remuneration.contractTemplateContent === "string" ? remuneration.contractTemplateContent : "";

    if (!profileTemplateKey) {
      throw new BadRequestException(
        `O perfil de trabalho \"${workProfile.name}\" nao possui modelo de contrato configurado.`
      );
    }

    const overrideTemplateKey =
      typeof override?.templateKey === "string" ? override.templateKey.trim() : "";
    if (overrideTemplateKey && overrideTemplateKey !== profileTemplateKey) {
      throw new BadRequestException(
        `O modelo do contrato deve seguir o perfil de trabalho selecionado: ${profileTemplateKey}.`
      );
    }
    const overrideTemplateContent =
      typeof override?.templateContent === "string" ? override.templateContent : "";
    const resolvedTemplateContent =
      overrideTemplateContent.trim().length > 0
        ? overrideTemplateContent
        : profileTemplateContent.trim().length > 0
          ? profileTemplateContent
          : undefined;
    if (!resolvedTemplateContent) {
      throw new BadRequestException(
        `O modelo de contrato ${profileTemplateKey} do perfil de trabalho \"${workProfile.name}\" nao possui conteudo disponivel para geracao.`
      );
    }

    return {
      templateKey: profileTemplateKey.slice(0, 120),
      templateName: (profileTemplateName || profileTemplateKey).slice(0, 160),
      templateVersion: (profileTemplateVersion || "v1").slice(0, 24),
      templateContent: resolvedTemplateContent
    };
  }

  private createEmploymentContractDocument(
    draft: EmploymentContractDraft,
    options: { kind: DriverEmploymentContractKind; parentContractId?: string }
  ): DriverEmploymentContract {
    const { kind, parentContractId } = options;
    const templateKey = draft.templateKey;
    const titlePrefix = kind === "RENEWAL" ? "Renovacao" : "Contrato";
    const profileLabel = this.resolveContractProfileLabel(draft.profile);
    const profileHeader =
      draft.profile === "MEI"
        ? "CONTRATO DE PRESTACAO DE SERVICOS - MEI"
        : `CONTRATO DE TRABALHO - ${draft.profile === "CLT" ? "CLT" : "INTERMITENTE"}`;
    const title = `${titlePrefix} ${profileLabel} - ${draft.driverName}`;
    const defaultContent = [
      profileHeader,
      "",
      "1. PARTES",
      `Empresa contratante: Inturb Plataforma de Mobilidade`,
      `${draft.profile === "MEI" ? "Prestador(a)" : "Colaborador(a)"}: ${draft.driverName}`,
      `CPF: ${draft.driverCpf || "-"}`,
      `Telefone: ${draft.driverPhone || "-"}`,
      `Email: ${draft.driverEmail || "-"}`,
      ...(draft.profile === "MEI"
        ? [
            `CNPJ do prestador: ${draft.providerCnpj || "-"}`,
            `Razao social: ${draft.providerLegalName || "-"}`,
            `Nome fantasia: ${draft.providerTradeName || "-"}`,
            `Inscricao municipal: ${draft.providerMunicipalRegistration || "-"}`
          ]
        : []),
      "",
      "2. VIGENCIA",
      draft.termDescription,
      "",
      "3. PERIODO DE EXPERIENCIA",
      draft.experienceDescription,
      "",
      "4. REMUNERACAO",
      draft.remunerationDescription,
      "",
      `5. ${draft.profile === "MEI" ? "OPERACAO E RESPONSABILIDADES" : "JORNADA E REGRAS OPERACIONAIS"}`,
      draft.journeyDescription,
      "",
      `6. ${draft.profile === "MEI" ? "DETALHES COMERCIAIS E OBSERVACOES" : "BENEFICIOS E OBSERVACOES"}`,
      `${draft.profile === "MEI" ? "Detalhes comerciais" : "Beneficios"}: ${draft.benefitsDescription}`,
      `Observacoes: ${draft.notesDescription}`,
      "",
      "7. GERACAO AUTOMATICA",
      `Documento gerado automaticamente em ${this.formatDateTimeBr(draft.generatedAt)}.`,
      `Tipo do documento: ${kind === "RENEWAL" ? "Renovacao contratual" : "Contrato inicial"}.`,
      `Modelo aplicado: ${draft.templateName || templateKey} (${templateKey}) - ${draft.templateVersion}.`,
      "Emissao por: Sistema Inturb (perfil administrativo).",
      "",
      "ASSINATURAS",
      "Empresa contratante: ____________________________________",
      "Colaborador(a): _________________________________________"
    ].join("\n");
    const content = draft.templateContent && draft.templateContent.trim().length > 0
      ? draft.templateContent
      : defaultContent;

    return {
      id: `contract_${randomUUID()}`,
      profile: draft.profile,
      kind,
      parentContractId: parentContractId || undefined,
      title,
      status: "PENDING_SIGNATURE",
      templateKey,
      templateName: draft.templateName,
      templateVersion: draft.templateVersion,
      generatedAt: draft.generatedAt,
      generatedBy: "SYSTEM",
      validFrom: draft.validFrom,
      validTo: draft.validTo,
      content,
      snapshot: draft.snapshot
    };
  }

  private async renderEmploymentTemplateContent(
    templateContent: string | undefined,
    input: {
      driver: Prisma.DriverGetPayload<{ include: typeof driverInclude }>;
      profile: "CLT" | "INTERMITENTE" | "MEI";
      contract: DriverContract;
      journey?: DriverJourney;
      address?: DriverAddress;
      generatedAt: string;
    }
  ): Promise<string | undefined> {
    if (!templateContent || templateContent.trim().length === 0) {
      return undefined;
    }

    const { driver, profile, contract, journey, address, generatedAt } = input;
    const generatedDate = new Date(generatedAt);
    const hasValidGeneratedDate = !Number.isNaN(generatedDate.getTime());
    const generatedDateOnly = hasValidGeneratedDate ? generatedDate.toLocaleDateString("pt-BR") : "-";
    const generatedTimeOnly = hasValidGeneratedDate
      ? generatedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "-";
    const generatedDay = hasValidGeneratedDate ? String(generatedDate.getDate()).padStart(2, "0") : "-";
    const generatedMonth = hasValidGeneratedDate ? String(generatedDate.getMonth() + 1).padStart(2, "0") : "-";
    const generatedMonthName = hasValidGeneratedDate
      ? generatedDate.toLocaleDateString("pt-BR", { month: "long" })
      : "-";
    const generatedYear = hasValidGeneratedDate ? String(generatedDate.getFullYear()) : "-";

    const companyProfile = await this.prisma.companyProfileConfig.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        legalName: true,
        tradeName: true,
        cnpj: true,
        phone: true,
        email: true,
        website: true,
        zipCode: true,
        street: true,
        number: true,
        neighborhood: true,
        city: true,
        state: true,
        legalRepresentativeName: true,
        legalRepresentativeCpf: true,
        legalRepresentativeRole: true,
        contractSignatureCity: true
      }
    });
    const companyAddressFull = this.buildCompanyAddressFull(companyProfile ?? undefined);
    const driverAddressFull = this.buildDriverAddressFull(address);
    const replacements: Record<string, string> = {
      "{{driver.id}}": driver.id || "-",
      "{{driver.name}}": driver.user.name || "-",
      "{{driver.role}}": this.resolveDriverRoleLabel(profile),
      "{{driver.cpf}}": driver.user.cpf || "-",
      "{{driver.phone}}": driver.user.phone || "-",
      "{{driver.email}}": driver.user.email || "-",
      "{{driver.driverType}}": driver.driverType || "-",
      "{{driver.address.zipCode}}": address?.cep || "-",
      "{{driver.address.street}}": address?.street || "-",
      "{{driver.address.number}}": address?.number || "-",
      "{{driver.address.neighborhood}}": address?.neighborhood || "-",
      "{{driver.address.complement}}": address?.complement || "-",
      "{{driver.address.city}}": address?.city || "-",
      "{{driver.address.state}}": address?.state || "-",
      "{{driver.address.type}}": this.resolveDriverAddressTypeLabel(address?.addressType),
      "{{driver.address.full}}": driverAddressFull,
      "{{contract.startDate}}": this.formatDateBr(contract.startDate),
      "{{contract.endDate}}": this.formatDateBr(contract.endDate),
      "{{contract.profile}}": this.resolveContractProfileLabel(profile),
      "{{contract.salaryModel}}": contract.salaryModel || "-",
      "{{contract.paymentMethod}}": contract.paymentMethod || "-",
      "{{contract.paymentFrequency}}": contract.paymentFrequency || "-",
      "{{contract.intermittentPaymentMode}}": contract.intermittentPaymentMode || "-",
      "{{journey.shift}}": journey?.shift || "-",
      "{{journey.workStart}}": journey?.startTime || journey?.availabilityStartTime || "-",
      "{{journey.workEnd}}": journey?.endTime || journey?.availabilityEndTime || "-",
      "{{company.legalName}}": companyProfile?.legalName || "-",
      "{{company.tradeName}}": companyProfile?.tradeName || companyProfile?.legalName || "-",
      "{{company.cnpj}}": companyProfile?.cnpj || "-",
      "{{company.phone}}": companyProfile?.phone || "-",
      "{{company.email}}": companyProfile?.email || "-",
      "{{company.website}}": companyProfile?.website || "-",
      "{{company.address.zipCode}}": companyProfile?.zipCode || "-",
      "{{company.address.street}}": companyProfile?.street || "-",
      "{{company.address.number}}": companyProfile?.number || "-",
      "{{company.address.neighborhood}}": companyProfile?.neighborhood || "-",
      "{{company.address.city}}": companyProfile?.city || "-",
      "{{company.address.state}}": companyProfile?.state || "-",
      "{{company.address.full}}": companyAddressFull,
      "{{company.representative.name}}": companyProfile?.legalRepresentativeName || "-",
      "{{company.representative.cpf}}": companyProfile?.legalRepresentativeCpf || "-",
      "{{company.representative.role}}": companyProfile?.legalRepresentativeRole || "-",
      "{{company.contractSignatureCity}}":
        companyProfile?.contractSignatureCity || companyProfile?.city || "-",
      "{{generatedAt}}": this.formatDateTimeBr(generatedAt),
      "{{generatedDate}}": generatedDateOnly,
      "{{generatedTime}}": generatedTimeOnly,
      "{{generatedDay}}": generatedDay,
      "{{generatedMonth}}": generatedMonth,
      "{{generatedMonthName}}": generatedMonthName,
      "{{generatedYear}}": generatedYear
    };

    return templateContent.replace(/\{\{[^{}]+\}\}/g, (token) => replacements[token] ?? token);
  }

  private resolveDriverRoleLabel(profile: "CLT" | "INTERMITENTE" | "MEI"): string {
    if (profile === "CLT") return "Motorista CLT";
    if (profile === "INTERMITENTE") return "Motorista Intermitente";
    return "Prestador MEI";
  }

  private resolveDriverAddressTypeLabel(value?: DriverAddress["addressType"]): string {
    if (value === "OWN") return "Proprio";
    if (value === "RENTED") return "Alugado";
    return "-";
  }

  private buildCompanyAddressFull(companyProfile?: {
    zipCode: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
  }): string {
    if (!companyProfile) return "-";
    const lineOne = [companyProfile.street, companyProfile.number].filter((item) => Boolean(item)).join(", ");
    const cityState = [companyProfile.city, companyProfile.state].filter((item) => Boolean(item)).join(" - ");
    const lineTwo = [companyProfile.neighborhood, cityState, companyProfile.zipCode]
      .filter((item) => Boolean(item))
      .join(", ");
    const full = [lineOne, lineTwo].filter((item) => item.length > 0).join(" | ");
    return full || "-";
  }

  private buildDriverAddressFull(address?: DriverAddress): string {
    if (!address) return "-";
    const lineOne = [address.street, address.number].filter((item) => Boolean(item)).join(", ");
    const cityState = [address.city, address.state].filter((item) => Boolean(item)).join(" - ");
    const lineTwo = [address.neighborhood, cityState, address.cep].filter((item) => Boolean(item)).join(", ");
    const full = [lineOne, lineTwo].filter((item) => item.length > 0).join(" | ");
    return full || "-";
  }

  private describeCltRemuneration(contract: DriverContract): string {
    const salaryModel = contract.salaryModel ?? "FIXED";
    if (salaryModel === "FIXED") {
      return `Salario fixo mensal de ${this.formatMoney(contract.fixedSalary)}.`;
    }
    if (salaryModel === "COMMISSION") {
      if (contract.commissionType === "PER_RIDE") {
        return `Comissao por corrida no valor de ${this.formatMoney(contract.commissionPerRide)}.`;
      }
      return `Comissao percentual de ${this.formatPercent(contract.commissionPercent)} por corrida/avaliacao.`;
    }

    const variable =
      contract.commissionType === "PER_RIDE"
        ? `${this.formatMoney(contract.commissionPerRide)} por corrida`
        : `${this.formatPercent(contract.commissionPercent)} de comissao`;
    return `Salario fixo mensal de ${this.formatMoney(contract.fixedSalary)} com variavel de ${variable}.`;
  }

  private describeIntermittentRemuneration(contract: DriverContract): string {
    const mode = contract.intermittentPaymentMode;
    if (mode === "DAILY") {
      return `Pagamento por diaria no valor de ${this.formatMoney(contract.intermittentDailyRate)}.`;
    }
    if (mode === "PER_RIDE") {
      if (contract.intermittentRideCompensationType === "PERCENT") {
        return `Pagamento por corrida com percentual de ${this.formatPercent(
          contract.intermittentRidePercent
        )}.`;
      }
      return `Pagamento por corrida no valor de ${this.formatMoney(contract.intermittentRideAmount)}.`;
    }
    if (mode === "DAILY_PLUS_RIDE") {
      const variable =
        contract.intermittentRideCompensationType === "PERCENT"
          ? this.formatPercent(contract.intermittentRidePercent)
          : this.formatMoney(contract.intermittentRideAmount);
      return `Pagamento combinado: diaria de ${this.formatMoney(
        contract.intermittentDailyRate
      )} + variavel por corrida de ${variable}.`;
    }
    return "Remuneracao intermitente nao configurada.";
  }

  private describeCltJourney(journey?: DriverJourney): string {
    if (!journey) {
      return "Jornada operacional nao configurada.";
    }

    const shift = journey.shift ? `Turno ${journey.shift}.` : "";
    const scale = journey.scale ? `Escala ${journey.scale}.` : "";
    if (journey.fixedSchedule === false) {
      const from = journey.availabilityStartTime || "--:--";
      const to = journey.availabilityEndTime || "--:--";
      return `${shift} ${scale} Jornada variavel, com disponibilidade de ${from} ate ${to}.`.trim();
    }

    if (journey.fixedScheduleMode === "PER_DAY" && Array.isArray(journey.daySchedules) && journey.daySchedules.length > 0) {
      const activeCount = journey.daySchedules.filter((item) => item.enabled).length;
      return `${shift} ${scale} Jornada fixa com horario personalizado por dia (${activeCount} dia(s) ativo(s)).`.trim();
    }

    const start = journey.startTime || "--:--";
    const end = journey.endTime || "--:--";
    return `${shift} ${scale} Jornada fixa de ${start} ate ${end}.`.trim();
  }

  private describeIntermittentJourney(contract: DriverContract, journey?: DriverJourney): string {
    const convocation =
      contract.intermittentConvocationMode === "ADVANCE_NOTICE"
        ? `Convocacao com antecedencia minima de ${contract.intermittentNoticeHours ?? 0} hora(s).`
        : contract.intermittentConvocationMode === "FIXED_WINDOW"
          ? "Convocacao em janela fixa por periodo."
          : "Convocacao sob demanda operacional.";
    const availability =
      journey && (journey.availabilityStartTime || journey.availabilityEndTime)
        ? `Disponibilidade preferencial de ${journey.availabilityStartTime || "--:--"} ate ${
            journey.availabilityEndTime || "--:--"
          }.`
        : "Disponibilidade definida conforme regras internas da operacao.";
    return `${convocation} ${availability}`.trim();
  }

  private describeMeiRemuneration(contract: DriverContract): string {
    if (contract.meiRemunerationModel === "COMMISSION_PERCENT") {
      const base =
        contract.meiCommissionBase === "GROSS_REVENUE"
          ? "sobre faturamento"
          : contract.meiCommissionBase === "RATING"
            ? "por avaliacao"
            : "por corrida";
      return `Comissao de ${this.formatPercent(contract.meiCommissionPercent)} ${base}.`;
    }

    if (contract.meiRemunerationModel === "PER_RIDE_FIXED") {
      return `Valor fixo de ${this.formatMoney(contract.meiPerRideAmount)} por corrida.`;
    }

    if (contract.meiRemunerationModel === "RIDE_REVENUE_SHARE") {
      const base = contract.meiRevenueShareBase === "RIDE_NET" ? "valor liquido da corrida" : "valor bruto da corrida";
      return `Repasse de ${this.formatPercent(contract.meiRevenueSharePercent)} sobre ${base}.`;
    }

    if (contract.meiRemunerationModel === "FIXED_PLUS_VARIABLE") {
      const variable =
        (contract.meiVariableType ?? "PERCENT") === "AMOUNT"
          ? this.formatMoney(contract.meiVariableAmount)
          : this.formatPercent(contract.meiVariablePercent);
      const base =
        contract.meiVariableBase === "GROSS_REVENUE"
          ? "sobre faturamento"
          : contract.meiVariableBase === "RATING"
            ? "por avaliacao"
            : "por corrida";
      return `Valor base de ${this.formatMoney(contract.meiFixedBaseAmount)} + variavel de ${variable} ${base}.`;
    }

    return "Remuneracao MEI nao configurada.";
  }

  private describeMeiOperation(contract: DriverContract): string {
    const workMode =
      contract.meiWorkMode === "SCHEDULED"
        ? "agenda definida"
        : contract.meiWorkMode === "MIXED"
          ? "atuacao mista"
          : "atuacao sob demanda";
    const vehicleMode =
      contract.meiOperationVehicleMode === "COMPANY_VEHICLE"
        ? "veiculo da empresa"
        : contract.meiOperationVehicleMode === "BOTH"
          ? "veiculo proprio ou da empresa"
          : "veiculo proprio";
    const fuel =
      contract.meiFuelResponsibility === "COMPANY"
        ? "combustivel pela empresa"
        : contract.meiFuelResponsibility === "SHARED"
          ? "combustivel dividido"
          : "combustivel pelo prestador";
    const maintenance =
      contract.meiMaintenanceResponsibility === "COMPANY"
        ? "manutencao pela empresa"
        : contract.meiMaintenanceResponsibility === "SHARED"
          ? "manutencao dividida"
          : "manutencao pelo prestador";

    return `Forma de atuacao: ${workMode}. Operacao com ${vehicleMode}, ${fuel} e ${maintenance}.`;
  }

  private resolveContractProfileLabel(profile: DriverEmploymentContract["profile"]): string {
    if (profile === "CLT") return "CLT";
    if (profile === "INTERMITENTE") return "Intermitente";
    return "MEI";
  }

  private formatDateBr(value?: string): string {
    if (!value) {
      return "-";
    }

    const parsed = new Date(`${value}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed);
  }

  private formatDateTimeBr(value?: string): string {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
  }

  private formatMoney(value?: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
  }

  private formatPercent(value?: number): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "0%";
    }
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  private isDateExpired(value?: string): boolean {
    if (!value) {
      return false;
    }
    const parsed = new Date(`${value}T23:59:59.999Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
  }

  private isDateExpiring(value?: string, withinDays = CONTRACT_WARNING_WINDOW_DAYS): boolean {
    if (!value) {
      return false;
    }
    const parsed = new Date(`${value}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }
    const diffMs = parsed.getTime() - Date.now();
    return diffMs >= 0 && diffMs <= withinDays * 24 * 60 * 60 * 1000;
  }

  private resolveActiveLifecycleStatus(validTo?: string): DriverEmploymentContractStatus {
    if (this.isDateExpired(validTo)) {
      return "EXPIRED";
    }
    if (this.isDateExpiring(validTo)) {
      return "EXPIRING_SOON";
    }
    return "ACTIVE";
  }

  private hasPositiveNumber(value?: number): boolean {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }

  private buildInternalSignatureUrl(token: string): string {
    const configuredBase =
      process.env.CONTRACT_SIGNATURE_BASE_URL?.trim() ||
      process.env.ADMIN_PANEL_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "";
    const normalizedBase = configuredBase.replace(/\/$/, "");
    if (!normalizedBase) {
      return `/assinatura/contratos/${token}`;
    }
    return `${normalizedBase}/assinatura/contratos/${token}`;
  }

  private async sendContractSignatureRequestEmail(input: {
    to: string;
    driverName: string;
    contractTitle: string;
    signatureUrl: string;
    expiresAt: string;
  }): Promise<SignatureEmailDeliveryResult> {
    const host = process.env.SMTP_HOST?.trim();
    const fromAddress = process.env.SMTP_FROM_ADDRESS?.trim() || process.env.SMTP_FROM?.trim();
    if (!host || !fromAddress) {
      return {
        status: "SKIPPED",
        message: "SMTP_HOST/SMTP_FROM_ADDRESS nao configurados. Link gerado sem envio automatico."
      };
    }

    const secure = this.parseBooleanEnv(process.env.SMTP_SECURE, true);
    const port = Number(process.env.SMTP_PORT?.trim() || (secure ? "465" : "587"));
    if (!Number.isFinite(port) || port <= 0) {
      return {
        status: "FAILED",
        message: "SMTP_PORT invalida."
      };
    }

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const fromName = process.env.SMTP_FROM_NAME?.trim() || "Inturb";
    const signatureLink = this.resolvePublicSignatureUrl(input.signatureUrl);
    if (!signatureLink) {
      return {
        status: "FAILED",
        message: "Defina ADMIN_PANEL_URL para gerar link absoluto de assinatura."
      };
    }

    const expiresAtBr = this.formatDateTimeBr(input.expiresAt);
    const subject = `Contrato para assinatura - ${input.driverName}`;
    const textBody = [
      `Ola ${input.driverName},`,
      "",
      `Seu contrato "${input.contractTitle}" esta pronto para assinatura digital.`,
      `Assine pelo link: ${signatureLink}`,
      `Validade do link: ${expiresAtBr}`,
      "",
      "Se voce nao reconhece este envio, ignore este e-mail."
    ].join("\n");

    try {
      await this.sendSmtpMail({
        host,
        port,
        secure,
        user,
        pass,
        from: this.buildFromHeader(fromName, fromAddress),
        fromEnvelope: fromAddress,
        to: input.to,
        subject,
        textBody
      });
      return {
        status: "SENT"
      };
    } catch (error) {
      return {
        status: "FAILED",
        message: error instanceof Error ? error.message : "Falha ao enviar e-mail de assinatura."
      };
    }
  }

  private resolvePublicSignatureUrl(signatureUrl: string): string | null {
    if (/^https?:\/\//i.test(signatureUrl)) {
      return signatureUrl;
    }

    const base =
      process.env.CONTRACT_SIGNATURE_BASE_URL?.trim() ||
      process.env.ADMIN_PANEL_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "";
    const normalizedBase = base.replace(/\/$/, "");
    const normalizedPath = signatureUrl.startsWith("/") ? signatureUrl : `/${signatureUrl}`;
    if (!normalizedBase) {
      return null;
    }

    return `${normalizedBase}${normalizedPath}`;
  }

  private parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) {
      return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
      return false;
    }
    return defaultValue;
  }

  private buildFromHeader(name: string, email: string): string {
    const escapedName = name.replace(/"/g, '\\"');
    return `"${escapedName}" <${email}>`;
  }

  private async sendSmtpMail(input: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
    fromEnvelope: string;
    to: string;
    subject: string;
    textBody: string;
  }): Promise<void> {
    const socket = await this.openSmtpSocket(input.host, input.port, input.secure);
    const nextLine = this.createSmtpLineReader(socket);

    try {
      await this.readSmtpResponse(nextLine, [220], "conexao");
      await this.writeSmtpLine(socket, "EHLO inturb.local");
      await this.readSmtpResponse(nextLine, [250], "EHLO");

      if (input.user && input.pass) {
        await this.writeSmtpLine(socket, "AUTH LOGIN");
        await this.readSmtpResponse(nextLine, [334], "AUTH LOGIN");
        await this.writeSmtpLine(socket, Buffer.from(input.user, "utf8").toString("base64"));
        await this.readSmtpResponse(nextLine, [334], "AUTH USER");
        await this.writeSmtpLine(socket, Buffer.from(input.pass, "utf8").toString("base64"));
        await this.readSmtpResponse(nextLine, [235], "AUTH PASS");
      }

      await this.writeSmtpLine(socket, `MAIL FROM:<${input.fromEnvelope}>`);
      await this.readSmtpResponse(nextLine, [250], "MAIL FROM");
      await this.writeSmtpLine(socket, `RCPT TO:<${input.to}>`);
      await this.readSmtpResponse(nextLine, [250, 251], "RCPT TO");
      await this.writeSmtpLine(socket, "DATA");
      await this.readSmtpResponse(nextLine, [354], "DATA");

      const message = this.buildSmtpMessage(input.from, input.to, input.subject, input.textBody);
      socket.write(`${message}\r\n.\r\n`);
      await this.readSmtpResponse(nextLine, [250], "message");

      await this.writeSmtpLine(socket, "QUIT");
      await this.readSmtpResponse(nextLine, [221], "QUIT");
    } finally {
      socket.end();
      socket.destroy();
    }
  }

  private async openSmtpSocket(host: string, port: number, secure: boolean): Promise<Socket | TLSSocket> {
    return new Promise((resolve, reject) => {
      const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS?.trim() || "20000");
      if (secure) {
        const socket = tlsConnect({
          host,
          port,
          servername: host,
          rejectUnauthorized: this.parseBooleanEnv(process.env.SMTP_REJECT_UNAUTHORIZED, true)
        });
        socket.setEncoding("utf8");
        socket.setTimeout(timeoutMs);
        socket.once("secureConnect", () => resolve(socket));
        socket.once("timeout", () => reject(new Error("Timeout na conexao SMTP segura.")));
        socket.once("error", reject);
        return;
      }

      const socket = netConnect({
        host,
        port
      });
      socket.setEncoding("utf8");
      socket.setTimeout(timeoutMs);
      socket.once("connect", () => resolve(socket));
      socket.once("timeout", () => reject(new Error("Timeout na conexao SMTP.")));
      socket.once("error", reject);
    });
  }

  private createSmtpLineReader(socket: Socket | TLSSocket): (timeoutMs?: number) => Promise<string> {
    let buffer = "";
    const queue: string[] = [];
    const waiters: Array<(line: string) => void> = [];

    socket.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      while (true) {
        const separatorIndex = buffer.indexOf("\n");
        if (separatorIndex < 0) {
          break;
        }
        const rawLine = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 1);
        const line = rawLine.replace(/\r$/, "");
        const waiter = waiters.shift();
        if (waiter) {
          waiter(line);
        } else {
          queue.push(line);
        }
      }
    });

    return (timeoutMs = Number(process.env.SMTP_TIMEOUT_MS?.trim() || "20000")) =>
      new Promise((resolve, reject) => {
        if (queue.length > 0) {
          resolve(queue.shift() as string);
          return;
        }

        const onError = (error: Error) => {
          cleanup();
          reject(error);
        };
        const onClose = () => {
          cleanup();
          reject(new Error("Conexao SMTP encerrada."));
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timeout aguardando resposta SMTP."));
        }, timeoutMs);

        const cleanup = () => {
          clearTimeout(timer);
          socket.off("error", onError);
          socket.off("close", onClose);
        };

        waiters.push((line) => {
          cleanup();
          resolve(line);
        });
        socket.on("error", onError);
        socket.on("close", onClose);
      });
  }

  private async readSmtpResponse(
    nextLine: (timeoutMs?: number) => Promise<string>,
    expectedCodes: number[],
    stage: string
  ): Promise<string[]> {
    const lines: string[] = [];
    while (true) {
      const line = await nextLine();
      lines.push(line);
      if (!/^\d{3}[-\s]/.test(line)) {
        continue;
      }

      const code = Number(line.slice(0, 3));
      const isLastLine = line[3] === " ";
      if (!isLastLine) {
        continue;
      }

      if (!expectedCodes.includes(code)) {
        throw new Error(`SMTP ${stage} falhou (${code}): ${lines.join(" | ")}`);
      }

      return lines;
    }
  }

  private async writeSmtpLine(socket: Socket | TLSSocket, value: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      socket.write(`${value}\r\n`, (error?: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private buildSmtpMessage(from: string, to: string, subject: string, textBody: string): string {
    const normalizedBody = textBody.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
    const headers = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      `Date: ${new Date().toUTCString()}`
    ];
    return `${headers.join("\r\n")}\r\n\r\n${normalizedBody}`;
  }

  private async findContractBySignatureToken(token: string): Promise<{
    driver: { id: string; user: { email: string | null; name: string } };
    profile: "CLT" | "INTERMITENTE" | "MEI";
    contractRoot: DriverContract;
    contractEntry: DriverEmploymentContract;
  }> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new BadRequestException("Token de assinatura invalido.");
    }

    const signatureTokenHash = createHash("sha256").update(normalizedToken).digest("hex");
    const drivers = await this.prisma.driver.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    for (const candidate of drivers) {
      const profile = this.parseContractProfile(candidate.contractProfile);
      if (profile !== "CLT" && profile !== "INTERMITENTE" && profile !== "MEI") {
        continue;
      }

      const parsedContract = this.parseContract(candidate.contract);
      const contracts = parsedContract?.employmentContracts ?? [];
      if (contracts.length === 0) {
        continue;
      }

      const matchedContract = contracts.find((item) => {
        const snapshot = this.isRecord(item.snapshot) ? item.snapshot : {};
        const signatureRequest = this.isRecord(snapshot.signatureRequest) ? snapshot.signatureRequest : undefined;
        return signatureRequest?.signatureTokenHash === signatureTokenHash;
      });

      if (matchedContract && parsedContract) {
        return {
          driver: candidate as any,
          profile,
          contractRoot: parsedContract,
          contractEntry: matchedContract
        };
      }
    }

    throw new NotFoundException("Link invalido ou nao encontrado.");
  }

  private buildPublicSignatureSession(
    driver: { id: string; user: { name: string; email: string | null } },
    contract: DriverEmploymentContract
  ): EmploymentContractPublicSignatureSession {
    const snapshot = this.isRecord(contract.snapshot) ? contract.snapshot : {};
    const signatureRequest = this.isRecord(snapshot.signatureRequest) ? snapshot.signatureRequest : undefined;
    const expiresAt =
      typeof signatureRequest?.expiresAt === "string" && signatureRequest.expiresAt.trim().length > 0
        ? signatureRequest.expiresAt.trim()
        : undefined;
    const requestedAt =
      typeof signatureRequest?.requestedAt === "string" && signatureRequest.requestedAt.trim().length > 0
        ? signatureRequest.requestedAt.trim()
        : undefined;
    const signedAt =
      typeof signatureRequest?.signedAt === "string" && signatureRequest.signedAt.trim().length > 0
        ? signatureRequest.signedAt.trim()
        : contract.signedAt;
    const signerEmail =
      typeof signatureRequest?.signerEmail === "string" && signatureRequest.signerEmail.trim().length > 0
        ? signatureRequest.signerEmail.trim()
        : driver.user.email ?? "";
    const signerName =
      typeof signatureRequest?.signerName === "string" && signatureRequest.signerName.trim().length > 0
        ? signatureRequest.signerName.trim()
        : undefined;
    const signerDocument =
      typeof signatureRequest?.signerDocument === "string" && signatureRequest.signerDocument.trim().length > 0
        ? signatureRequest.signerDocument.trim()
        : undefined;
    const auditLogs = (Array.isArray(snapshot.auditEvents) ? snapshot.auditEvents : [])
      .filter((event): event is Record<string, unknown> => this.isRecord(event))
      .map((event) => {
        const createdAt =
          typeof event.createdAt === "string" && event.createdAt.trim().length > 0
            ? event.createdAt.trim()
            : contract.generatedAt;
        const eventType =
          typeof event.type === "string" && event.type.trim().length > 0
            ? event.type.trim()
            : "EVENT";
        const source =
          typeof event.source === "string" && event.source.trim().length > 0
            ? event.source.trim()
            : undefined;
        return {
          createdAt,
          event: eventType,
          source,
          summary: this.describeSignatureAuditEvent(event)
        };
      })
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const isExpired = this.isDateTimeExpired(expiresAt);
    const isPendingStatus = contract.status === "DRAFT" || contract.status === "PENDING_SIGNATURE";
    const canSign = isPendingStatus && !isExpired;

    let message: string | undefined;
    if (canSign) {
      message = "Revise o documento e confirme para concluir a assinatura digital.";
    } else if (isExpired) {
      message = "Este link expirou. Solicite um novo envio de assinatura.";
    } else if (contract.status === "ACTIVE" || contract.status === "EXPIRING_SOON") {
      message = "Contrato ja assinado e ativo.";
    } else if (contract.status === "EXPIRED") {
      message = "Contrato expirado.";
    } else if (contract.status === "TERMINATED") {
      message = "Contrato encerrado/cancelado.";
    } else {
      message = "Este contrato nao pode ser assinado por este link.";
    }

    return {
      contractId: contract.id,
      driverId: driver.id,
      driverName: driver.user.name,
      documentCode: contract.id,
      contentHash: createHash("sha256").update(contract.content).digest("hex"),
      signerEmail,
      signerName,
      signerDocument,
      status: contract.status,
      title: contract.title,
      templateName: contract.templateName,
      templateVersion: contract.templateVersion,
      generatedAt: contract.generatedAt,
      validFrom: contract.validFrom,
      validTo: contract.validTo,
      content: contract.content,
      requestedAt,
      expiresAt,
      signedAt,
      auditLogs,
      canSign,
      message
    };
  }

  private isDateTimeExpired(value?: string): boolean {
    if (!value) {
      return false;
    }
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
  }

  private appendDigitalSignatureEvidence(
    content: string,
    input: {
      signedAt: string;
      signerEmail: string;
      signerName?: string;
      signerDocument?: string;
      signerIp?: string;
    }
  ): string {
    const safeEmail = this.escapeHtmlText(input.signerEmail || "nao informado");
    const safeName = this.escapeHtmlText(input.signerName || "nao informado");
    const safeDocument = this.escapeHtmlText(input.signerDocument || "nao informado");
    const safeIp = this.escapeHtmlText(input.signerIp || "nao informado");
    const signedAtLabel = this.escapeHtmlText(this.formatDateTimeForSignature(input.signedAt));
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);

    if (isHtml) {
      return `${content}
<section style="margin-top:28px;padding:14px 16px;border:1px solid #d7e1f6;border-radius:10px;background:#f8fbff;">
  <h3 style="margin:0 0 8px;font-size:14px;color:#213564;">Assinatura digital</h3>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>Status:</strong> Assinado eletronicamente</p>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>Data/hora:</strong> ${signedAtLabel}</p>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>E-mail:</strong> ${safeEmail}</p>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>Assinante:</strong> ${safeName}</p>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>Documento:</strong> ${safeDocument}</p>
  <p style="margin:2px 0;font-size:13px;color:#213564;"><strong>IP:</strong> ${safeIp}</p>
</section>`;
    }

    return `${content.trimEnd()}

------------------------------------------------------------
ASSINATURA DIGITAL
Status: Assinado eletronicamente
Data/hora: ${this.formatDateTimeForSignature(input.signedAt)}
E-mail: ${input.signerEmail || "nao informado"}
Assinante: ${input.signerName || "nao informado"}
Documento: ${input.signerDocument || "nao informado"}
IP: ${input.signerIp || "nao informado"}
------------------------------------------------------------`;
  }

  private formatDateTimeForSignature(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo"
    }).format(parsed);
  }

  private describeSignatureAuditEvent(event: Record<string, unknown>): string {
    const type = typeof event.type === "string" ? event.type : "EVENT";
    const signerEmail = typeof event.signerEmail === "string" ? event.signerEmail : undefined;
    const signerName = typeof event.signerName === "string" ? event.signerName : undefined;
    const signerDocument = typeof event.signerDocument === "string" ? event.signerDocument : undefined;
    const signerIp = typeof event.signerIp === "string" ? event.signerIp : undefined;
    const expiresAt = typeof event.expiresAt === "string" ? event.expiresAt : undefined;

    if (type === "SIGNATURE_REQUESTED") {
      return `Solicitacao de assinatura enviada para ${signerEmail || "e-mail nao informado"}${expiresAt ? ` com validade ate ${this.formatDateTimeForSignature(expiresAt)}` : ""}.`;
    }
    if (type === "SIGNED_VIA_LINK") {
      return `Assinatura confirmada via link publico por ${signerName || signerEmail || "assinante nao identificado"}${signerDocument ? `, documento ${signerDocument}` : ""}${signerIp ? `, IP ${signerIp}` : ""}.`;
    }
    if (type === "CONTRACT_GENERATED") {
      return "Documento gerado automaticamente pelo sistema.";
    }
    if (type === "CONTRACT_RENEWED") {
      return "Documento renovado com base em ciclo anterior.";
    }
    if (type === "CONTRACT_TERMINATED") {
      return "Contrato encerrado ou cancelado.";
    }
    return "Evento contratual registrado.";
  }

  private escapeHtmlText(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private mergeEmploymentContractSettings(
    base?: DriverContract,
    patch?: DriverContract
  ): DriverContract | undefined {
    if (!base && !patch) {
      return undefined;
    }

    const next: DriverContract = { ...(base ?? {}) };
    if (!patch) {
      return next;
    }

    for (const [key, value] of Object.entries(patch) as Array<[keyof DriverContract, DriverContract[keyof DriverContract]]>) {
      if (key === "employmentContracts") {
        continue;
      }
      if (value !== undefined) {
        (next as any)[key] = value;
      }
    }

    return next;
  }

  private buildContractSnapshot(contract: DriverContract): Record<string, unknown> {
    const { employmentContracts, ...rest } = contract;
    return rest as Record<string, unknown>;
  }

  private mapWorkProfileContractTypeToDriverProfile(value?: string): DriverContractProfile | undefined {
    if (value === "CLT") return "CLT";
    if (value === "CLT_INTERMITENTE") return "INTERMITENTE";
    if (value === "MEI") return "MEI";
    return undefined;
  }

  private mapIntermittentPaymentModeToLegacyPaymentMethod(
    mode?: DriverContract["intermittentPaymentMode"]
  ): string | undefined {
    if (mode === "DAILY") return "DIARIA";
    if (mode === "PER_RIDE") return "CORRIDA";
    if (mode === "DAILY_PLUS_RIDE") return "DIARIA_CORRIDA";
    return undefined;
  }

  private resetWorkProfileDrivenContractFields(contract: DriverContract): void {
    contract.salaryModel = undefined;
    contract.fixedSalary = undefined;
    contract.commissionType = undefined;
    contract.commissionApplyOn = undefined;
    contract.commissionPercent = undefined;
    contract.commissionPerRide = undefined;

    contract.intermittentStatus = undefined;
    contract.intermittentConvocationMode = undefined;
    contract.intermittentNoticeHours = undefined;
    contract.intermittentConvocationNotes = undefined;
    contract.intermittentPaymentMode = undefined;
    contract.intermittentDailyRate = undefined;
    contract.intermittentRideCompensationType = undefined;
    contract.intermittentRideAmount = undefined;
    contract.intermittentRidePercent = undefined;
    contract.intermittentPreferredWeekDays = undefined;
    contract.workedPeriods = undefined;
    contract.intermittentPreferredDays = undefined;

    contract.meiRemunerationModel = undefined;
    contract.meiCommissionBase = undefined;
    contract.meiCommissionPercent = undefined;
    contract.meiPerRideAmount = undefined;
    contract.meiRevenueSharePercent = undefined;
    contract.meiRevenueShareBase = undefined;
    contract.meiFixedBaseAmount = undefined;
    contract.meiVariableType = undefined;
    contract.meiVariablePercent = undefined;
    contract.meiVariableAmount = undefined;
    contract.meiVariableBase = undefined;
    contract.meiWorkMode = undefined;
    contract.meiOperationVehicleMode = undefined;
    contract.meiFuelResponsibility = undefined;
    contract.meiMaintenanceResponsibility = undefined;
    contract.meiPreferredWeekDays = undefined;

    contract.paymentMethod = undefined;
    contract.paymentFrequency = undefined;

    contract.overtimeUseGlobalPolicy = undefined;
    contract.overtimeEnabled = undefined;
    contract.overtimePolicyMode = undefined;
    contract.overtimeDailyLimitHours = undefined;
    contract.overtimeWeeklyLimitHours = undefined;
    contract.overtimeAfterDailyHours = undefined;
    contract.overtimeAfterWeeklyHours = undefined;
    contract.overtimeMultiplier50 = undefined;
    contract.overtimeMultiplier100 = undefined;
    contract.overtimeNightMultiplier = undefined;
    contract.overtimeRoundingMinutes = undefined;

    contract.benefitsList = undefined;
    contract.otherBenefits = undefined;
    contract.benefits = undefined;
  }

  private applyWorkProfileRemunerationToCltContract(
    contract: DriverContract,
    remuneration: Record<string, unknown>
  ): void {
    const model =
      remuneration.model === "FIXED" ||
      remuneration.model === "FIXED_PLUS_COMMISSION" ||
      remuneration.model === "COMMISSION_ONLY"
        ? remuneration.model
        : undefined;
    const fixedSalary = this.normalizeDecimalField(remuneration.fixedSalary);
    const commissionType =
      remuneration.commissionType === "PERCENT" || remuneration.commissionType === "PER_RIDE"
        ? remuneration.commissionType
        : undefined;
    const commissionValue = this.normalizeDecimalField(remuneration.commissionValue);

    if (!model) {
      return;
    }

    contract.salaryModel =
      model === "COMMISSION_ONLY" ? "COMMISSION" : model === "FIXED_PLUS_COMMISSION" ? "FIXED_PLUS_COMMISSION" : "FIXED";
    contract.fixedSalary =
      model === "COMMISSION_ONLY" ? undefined : this.hasPositiveNumber(fixedSalary) ? fixedSalary : undefined;

    if (model === "FIXED") {
      contract.commissionType = undefined;
      contract.commissionApplyOn = undefined;
      contract.commissionPercent = undefined;
      contract.commissionPerRide = undefined;
      return;
    }

    contract.commissionType = commissionType ?? "PERCENT";
    contract.commissionApplyOn = contract.commissionApplyOn ?? "RIDE";
    if (contract.commissionType === "PERCENT") {
      contract.commissionPercent = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
      contract.commissionPerRide = undefined;
    } else {
      contract.commissionPerRide = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
      contract.commissionPercent = undefined;
    }
  }

  private applyWorkProfileRemunerationToIntermittentContract(
    contract: DriverContract,
    remuneration: Record<string, unknown>
  ): void {
    const model =
      remuneration.model === "FIXED" ||
      remuneration.model === "FIXED_PLUS_COMMISSION" ||
      remuneration.model === "COMMISSION_ONLY"
        ? remuneration.model
        : undefined;
    const fixedSalary = this.normalizeDecimalField(remuneration.fixedSalary);
    const commissionType =
      remuneration.commissionType === "PERCENT" || remuneration.commissionType === "PER_RIDE"
        ? remuneration.commissionType
        : undefined;
    const commissionValue = this.normalizeDecimalField(remuneration.commissionValue);

    if (!model) {
      return;
    }

    const paymentMode: DriverContract["intermittentPaymentMode"] =
      model === "FIXED" ? "DAILY" : model === "COMMISSION_ONLY" ? "PER_RIDE" : "DAILY_PLUS_RIDE";
    contract.intermittentPaymentMode = paymentMode;
    contract.paymentMethod = this.mapIntermittentPaymentModeToLegacyPaymentMethod(paymentMode);
    contract.intermittentConvocationMode = contract.intermittentConvocationMode ?? "ON_DEMAND";

    if (paymentMode === "DAILY" || paymentMode === "DAILY_PLUS_RIDE") {
      contract.intermittentDailyRate = this.hasPositiveNumber(fixedSalary) ? fixedSalary : undefined;
    } else {
      contract.intermittentDailyRate = undefined;
    }

    if (paymentMode === "PER_RIDE" || paymentMode === "DAILY_PLUS_RIDE") {
      const rideCompensationType: DriverContract["intermittentRideCompensationType"] =
        commissionType === "PERCENT" ? "PERCENT" : "AMOUNT";
      contract.intermittentRideCompensationType = rideCompensationType;
      if (rideCompensationType === "PERCENT") {
        contract.intermittentRidePercent = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
        contract.intermittentRideAmount = undefined;
      } else {
        contract.intermittentRideAmount = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
        contract.intermittentRidePercent = undefined;
      }
    } else {
      contract.intermittentRideCompensationType = undefined;
      contract.intermittentRideAmount = undefined;
      contract.intermittentRidePercent = undefined;
    }
  }

  private applyWorkProfileRemunerationToMeiContract(
    contract: DriverContract,
    remuneration: Record<string, unknown>
  ): void {
    const model =
      remuneration.model === "FIXED" ||
      remuneration.model === "FIXED_PLUS_COMMISSION" ||
      remuneration.model === "COMMISSION_ONLY"
        ? remuneration.model
        : undefined;
    const fixedSalary = this.normalizeDecimalField(remuneration.fixedSalary);
    const commissionType =
      remuneration.commissionType === "PERCENT" || remuneration.commissionType === "PER_RIDE"
        ? remuneration.commissionType
        : undefined;
    const commissionValue = this.normalizeDecimalField(remuneration.commissionValue);

    contract.paymentMethod = contract.paymentMethod ?? "PIX";
    contract.paymentFrequency = contract.paymentFrequency ?? "SEMANAL";
    contract.meiWorkMode = contract.meiWorkMode ?? "ON_DEMAND";
    contract.meiOperationVehicleMode = contract.meiOperationVehicleMode ?? "OWN_VEHICLE";
    contract.meiFuelResponsibility = contract.meiFuelResponsibility ?? "DRIVER";
    contract.meiMaintenanceResponsibility = contract.meiMaintenanceResponsibility ?? "DRIVER";
    contract.meiCommissionBase = contract.meiCommissionBase ?? "RIDE";
    contract.meiRevenueShareBase = contract.meiRevenueShareBase ?? "RIDE_GROSS";
    contract.meiVariableBase = contract.meiVariableBase ?? "RIDE";

    if (!model) {
      return;
    }

    if (model === "FIXED") {
      contract.meiRemunerationModel = "PER_RIDE_FIXED";
      contract.meiPerRideAmount = this.hasPositiveNumber(fixedSalary) ? fixedSalary : undefined;
      return;
    }

    if (model === "COMMISSION_ONLY") {
      if (commissionType === "PER_RIDE") {
        contract.meiRemunerationModel = "PER_RIDE_FIXED";
        contract.meiPerRideAmount = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
        return;
      }

      contract.meiRemunerationModel = "COMMISSION_PERCENT";
      contract.meiCommissionPercent = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
      return;
    }

    contract.meiRemunerationModel = "FIXED_PLUS_VARIABLE";
    contract.meiFixedBaseAmount = this.hasPositiveNumber(fixedSalary) ? fixedSalary : undefined;
    if (commissionType === "PER_RIDE") {
      contract.meiVariableType = "AMOUNT";
      contract.meiVariableAmount = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
      return;
    }

    contract.meiVariableType = "PERCENT";
    contract.meiVariablePercent = this.hasPositiveNumber(commissionValue) ? commissionValue : undefined;
  }

  private applyOvertimeTemplateSettingsToCltContract(
    contract: DriverContract,
    overtimeSettings: Record<string, unknown>,
    usesOvertime: boolean
  ): void {
    contract.overtimeUseGlobalPolicy = false;

    if (!usesOvertime) {
      contract.overtimeEnabled = false;
      contract.overtimePolicyMode = undefined;
      contract.overtimeDailyLimitHours = undefined;
      contract.overtimeWeeklyLimitHours = undefined;
      contract.overtimeAfterDailyHours = undefined;
      contract.overtimeAfterWeeklyHours = undefined;
      contract.overtimeMultiplier50 = undefined;
      contract.overtimeMultiplier100 = undefined;
      contract.overtimeNightMultiplier = undefined;
      contract.overtimeRoundingMinutes = undefined;
      return;
    }

    const overtime = this.isRecord(overtimeSettings.overtime)
      ? (overtimeSettings.overtime as Record<string, unknown>)
      : {};
    const percentages = this.isRecord(overtimeSettings.percentages)
      ? (overtimeSettings.percentages as Record<string, unknown>)
      : {};
    const rounding = this.isRecord(overtimeSettings.rounding)
      ? (overtimeSettings.rounding as Record<string, unknown>)
      : {};
    const rules = this.isRecord(overtimeSettings.rules)
      ? (overtimeSettings.rules as Record<string, unknown>)
      : {};

    const overtimeEnabled = overtime.enabled === undefined ? true : Boolean(overtime.enabled);
    const destination =
      overtime.destination === "BANK_HOURS" || overtime.destination === "BOTH" ? "BANK_HOURS" : "PAID";
    const overtime50 = this.normalizeDecimalField(percentages.overtime50);
    const overtime100 = this.normalizeDecimalField(percentages.overtime100);

    contract.overtimeEnabled = overtimeEnabled;
    if (!overtimeEnabled) {
      contract.overtimePolicyMode = undefined;
      contract.overtimeDailyLimitHours = undefined;
      contract.overtimeWeeklyLimitHours = undefined;
      contract.overtimeAfterDailyHours = undefined;
      contract.overtimeAfterWeeklyHours = undefined;
      contract.overtimeMultiplier50 = undefined;
      contract.overtimeMultiplier100 = undefined;
      contract.overtimeNightMultiplier = undefined;
      contract.overtimeRoundingMinutes = undefined;
      return;
    }

    contract.overtimePolicyMode = destination;
    contract.overtimeDailyLimitHours = this.normalizeDecimalField(rules.maxExtraHoursPerDay);
    contract.overtimeWeeklyLimitHours = undefined;
    contract.overtimeAfterDailyHours = this.normalizeDecimalField(overtime.afterDailyHours) ?? 8;
    contract.overtimeAfterWeeklyHours = this.normalizeDecimalField(overtime.afterWeeklyHours) ?? 44;
    contract.overtimeMultiplier50 =
      overtime50 === undefined ? 1.5 : Number((1 + overtime50 / 100).toFixed(4));
    contract.overtimeMultiplier100 =
      overtime100 === undefined ? 2 : Number((1 + overtime100 / 100).toFixed(4));
    contract.overtimeNightMultiplier = undefined;
    contract.overtimeRoundingMinutes = this.normalizeIntegerField(rounding.intervalMinutes, 1) ?? 15;
  }

  private async applyWorkProfileInheritance(
    db: WorkProfileLookupClient,
    profile: DriverContractProfile | undefined,
    contract?: DriverContract,
    journey?: DriverJourney
  ): Promise<{
    profile?: DriverContractProfile;
    contract?: DriverContract;
    journey?: DriverJourney;
  }> {
    const workProfileTemplateId = contract?.workProfileTemplateId?.trim();
    if (!contract || !workProfileTemplateId) {
      return { profile, contract, journey };
    }

    const workProfile = await db.workProfileTemplate.findUnique({
      where: { id: workProfileTemplateId },
      select: {
        id: true,
        name: true,
        isActive: true,
        contractType: true,
        journeyTemplateId: true,
        journeySummary: true,
        remuneration: true,
        usesOvertime: true,
        overtimeTemplateId: true,
        benefits: true
      }
    });

    if (!workProfile || !workProfile.isActive) {
      throw new BadRequestException(
        "O perfil de trabalho selecionado nao esta disponivel. Selecione um perfil ativo para continuar."
      );
    }

    const remuneration = this.isRecord(workProfile.remuneration)
      ? (workProfile.remuneration as Record<string, unknown>)
      : {};
    const templateKey =
      typeof remuneration.contractTemplateKey === "string" ? remuneration.contractTemplateKey.trim() : "";
    const templateName =
      typeof remuneration.contractTemplateName === "string" ? remuneration.contractTemplateName.trim() : "";
    const templateVersion =
      typeof remuneration.contractTemplateVersion === "string" ? remuneration.contractTemplateVersion.trim() : "";
    if (!templateKey) {
      throw new BadRequestException(
        `O perfil de trabalho \"${workProfile.name}\" nao possui modelo de contrato configurado.`
      );
    }

    const benefitNames = Array.isArray(workProfile.benefits)
      ? [
          ...new Set(
            workProfile.benefits
              .map((item) => {
                if (!this.isRecord(item)) {
                  return "";
                }
                const rawName = item.name;
                return typeof rawName === "string" ? rawName.trim() : "";
              })
              .filter((item) => item.length > 0)
          )
        ]
      : [];

    let overtimeSettings: Record<string, unknown> = {};
    if (workProfile.usesOvertime) {
      const overtimeTemplateId = workProfile.overtimeTemplateId?.trim();
      if (!overtimeTemplateId) {
        throw new BadRequestException(
          `O perfil de trabalho \"${workProfile.name}\" exige politica de hora extra, mas nao possui template vinculado.`
        );
      }

      const overtimeTemplate = await db.overtimeTemplate.findUnique({
        where: { id: overtimeTemplateId },
        select: {
          id: true,
          name: true,
          isActive: true,
          settings: true
        }
      });

      if (!overtimeTemplate || !overtimeTemplate.isActive) {
        throw new BadRequestException(
          `A politica de hora extra do perfil \"${workProfile.name}\" nao esta disponivel para uso.`
        );
      }
      if (this.resolveOvertimeTemplatePolicyCategory(overtimeTemplate.settings) !== "OVERTIME") {
        throw new BadRequestException(
          `A politica vinculada ao perfil \"${workProfile.name}\" pertence ao modulo de adicional noturno. Selecione uma politica de hora extra.`
        );
      }

      overtimeSettings = this.isRecord(overtimeTemplate.settings)
        ? (overtimeTemplate.settings as Record<string, unknown>)
        : {};
    }

    const inheritedProfile =
      this.mapWorkProfileContractTypeToDriverProfile(workProfile.contractType) ?? profile;
    const nextContract: DriverContract = {
      ...contract,
      workProfileTemplateId: workProfile.id,
      workProfileTemplateName: workProfile.name,
      workProfileSummary:
        typeof contract.workProfileSummary === "string" && contract.workProfileSummary.trim().length > 0
          ? contract.workProfileSummary.trim()
          : typeof workProfile.journeySummary === "string" && workProfile.journeySummary.trim().length > 0
            ? workProfile.journeySummary.trim()
            : undefined,
      workProfileContractType: workProfile.contractType,
      employmentTemplateKey: templateKey.slice(0, 120),
      employmentTemplateName: (templateName || templateKey).slice(0, 160),
      employmentTemplateVersion: (templateVersion || "v1").slice(0, 24),
      benefitsList: benefitNames.length > 0 ? benefitNames : undefined,
      otherBenefits: undefined
    };
    this.resetWorkProfileDrivenContractFields(nextContract);
    nextContract.benefitsList = benefitNames.length > 0 ? benefitNames : undefined;

    if (inheritedProfile === "CLT") {
      this.applyWorkProfileRemunerationToCltContract(nextContract, remuneration);
      this.applyOvertimeTemplateSettingsToCltContract(nextContract, overtimeSettings, workProfile.usesOvertime);
    }

    if (inheritedProfile === "INTERMITENTE") {
      this.applyWorkProfileRemunerationToIntermittentContract(nextContract, remuneration);
    }

    if (inheritedProfile === "MEI") {
      this.applyWorkProfileRemunerationToMeiContract(nextContract, remuneration);
    }

    const inheritedJourney = await this.resolveWorkProfileJourneyFromTemplate(db, {
      workProfileName: workProfile.name,
      journeyTemplateId: workProfile.journeyTemplateId
    });
    const journeyAccessibilityPatch =
      journey?.accessibility !== undefined
        ? ({
            accessibility: journey.accessibility
          } as DriverJourney)
        : undefined;
    const nextJourney = inheritedJourney
      ? this.mergeJourneySettings(inheritedJourney, journeyAccessibilityPatch)
      : journey;

    return {
      profile: inheritedProfile,
      contract: nextContract,
      journey: nextJourney
    };
  }

  private async resolveWorkProfileJourneyFromTemplate(
    db: WorkProfileLookupClient,
    input: {
      workProfileName: string;
      journeyTemplateId?: string | null;
    }
  ): Promise<DriverJourney | undefined> {
    const journeyTemplateId =
      typeof input.journeyTemplateId === "string" ? input.journeyTemplateId.trim() : "";
    if (!journeyTemplateId) {
      return undefined;
    }

    const template = await db.workJourneyTemplate.findUnique({
      where: { id: journeyTemplateId },
      select: {
        id: true,
        name: true,
        isActive: true,
        type: true,
        allowedDays: true,
        fixedConfig: true,
        flexibleConfig: true,
        intermittentConfig: true,
        dsrEnabled: true,
        dsrWeeklyRestDay: true,
        dsrReflectOvertime: true,
        dsrReflectNight: true,
        dsrLoseOnUnjustifiedAbsence: true,
        dsrDescription: true
      }
    });

    if (!template || !template.isActive) {
      throw new BadRequestException(
        `A jornada vinculada ao perfil "${input.workProfileName}" nao esta disponivel para uso.`
      );
    }

    const allowedDays = this.normalizeWorkJourneyTemplateDays(template.allowedDays);
    const journeyType = this.normalizeWorkJourneyTemplateType(template.type);
    const fixedConfigForDsr = this.isRecord(template.fixedConfig)
      ? (template.fixedConfig as Record<string, unknown>)
      : undefined;
    const fixedScaleTypeForDsr =
      fixedConfigForDsr && typeof fixedConfigForDsr.scaleType === "string"
        ? fixedConfigForDsr.scaleType.trim().toUpperCase()
        : "";
    const isCycleDsr = !template.dsrWeeklyRestDay && fixedScaleTypeForDsr === "TWELVE_THIRTY_SIX";
    const cycleWorkDays =
      isCycleDsr && typeof fixedConfigForDsr?.cycleWorkDays === "number" && Number.isFinite(fixedConfigForDsr.cycleWorkDays)
        ? Math.min(7, Math.max(1, Math.trunc(fixedConfigForDsr.cycleWorkDays)))
        : 1;
    const cycleOffDays =
      isCycleDsr && typeof fixedConfigForDsr?.cycleOffDays === "number" && Number.isFinite(fixedConfigForDsr.cycleOffDays)
        ? Math.min(7, Math.max(1, Math.trunc(fixedConfigForDsr.cycleOffDays)))
        : 1;
    const dsrPolicySnapshot = template.dsrEnabled && (template.dsrWeeklyRestDay || isCycleDsr)
      ? {
          id: `journey-dsr-${template.id}`,
          name: "DSR da jornada",
          summary: [
            isCycleDsr
              ? `Descanso ciclo ${cycleWorkDays}x${cycleOffDays}`
              : `Descanso ${template.dsrWeeklyRestDay}`,
            `Reflete HE: ${template.dsrReflectOvertime ? "sim" : "nao"}`,
            `Reflete noturno: ${template.dsrReflectNight ? "sim" : "nao"}`,
            template.dsrLoseOnUnjustifiedAbsence ? "Perde por falta injustificada" : undefined,
            template.dsrDescription?.trim() || undefined
          ]
            .filter((item): item is string => Boolean(item))
            .join(" | "),
          restMode: isCycleDsr ? "CYCLE" : "WEEKDAY",
          weeklyRestDay: template.dsrWeeklyRestDay ?? undefined,
          cycleWorkDays: isCycleDsr ? cycleWorkDays : undefined,
          cycleOffDays: isCycleDsr ? cycleOffDays : undefined,
          reflectOvertime: template.dsrReflectOvertime,
          reflectNight: template.dsrReflectNight,
          loseOnUnjustifiedAbsence: template.dsrLoseOnUnjustifiedAbsence
        }
      : undefined;
    if (!journeyType) {
      throw new BadRequestException(
        `A jornada "${template.name}" vinculada ao perfil "${input.workProfileName}" possui tipo invalido.`
      );
    }

    if (journeyType === "FIXED") {
      const fixedConfig = this.isRecord(template.fixedConfig)
        ? (template.fixedConfig as Record<string, unknown>)
        : {};
      const activeDays = this.normalizeWorkJourneyTemplateDays(
        fixedConfig.activeDays ?? template.allowedDays
      );
      const rawScaleType =
        typeof fixedConfig.scaleType === "string" ? fixedConfig.scaleType.trim().toUpperCase() : "";
      const scaleType: DriverJourney["scaleType"] =
        rawScaleType === "FIVE_TWO" ||
        rawScaleType === "SIX_ONE" ||
        rawScaleType === "TWELVE_THIRTY_SIX" ||
        rawScaleType === "CUSTOM"
          ? rawScaleType
          : undefined;
      const customScaleWorkDays =
        scaleType === "CUSTOM" && activeDays.length > 0 ? activeDays.length : undefined;
      const customScaleOffDays =
        scaleType === "CUSTOM" && activeDays.length > 0 ? Math.max(0, 7 - activeDays.length) : undefined;
      const mapped = this.parseJourney({
        shift: "FIXO",
        scaleType,
        scale: this.resolveJourneyScaleLabel(scaleType, activeDays),
        customScaleWorkDays,
        customScaleOffDays,
        fixedSchedule: true,
        fixedScheduleMode: "UNIFORM",
        startTime: this.normalizeWorkJourneyTemplateClock(fixedConfig.startTime),
        endTime: this.normalizeWorkJourneyTemplateClock(fixedConfig.endTime),
        availableDays: activeDays.length > 0 ? activeDays : allowedDays,
        dsrPolicy: dsrPolicySnapshot
      });
      return mapped ?? undefined;
    }

    if (journeyType === "FLEXIBLE") {
      const flexibleConfig = this.isRecord(template.flexibleConfig)
        ? (template.flexibleConfig as Record<string, unknown>)
        : {};
      const mapped = this.parseJourney({
        shift: "FLEXIVEL",
        scale: "VARIAVEL",
        fixedSchedule: false,
        availabilityStartTime: this.normalizeWorkJourneyTemplateClock(flexibleConfig.entryWindowStart),
        availabilityEndTime: this.normalizeWorkJourneyTemplateClock(flexibleConfig.exitWindowEnd),
        availableDays: allowedDays,
        dsrPolicy: dsrPolicySnapshot
      });
      return mapped ?? undefined;
    }

    const intermittentConfig = this.isRecord(template.intermittentConfig)
      ? (template.intermittentConfig as Record<string, unknown>)
      : {};
    const callDays = this.normalizeWorkJourneyTemplateDays(
      intermittentConfig.callDays ?? template.allowedDays
    );
    const mapped = this.parseJourney({
      shift: "INTERMITENTE",
      scale: "CONVOCACAO",
      fixedSchedule: false,
      availabilityStartTime: this.normalizeWorkJourneyTemplateClock(intermittentConfig.allowedStartTime),
      availabilityEndTime: this.normalizeWorkJourneyTemplateClock(intermittentConfig.allowedEndTime),
      availableDays: callDays.length > 0 ? callDays : allowedDays,
      acceptsOutsideSchedule:
        intermittentConfig.allowMultipleCallsPerDay === undefined
          ? true
          : Boolean(intermittentConfig.allowMultipleCallsPerDay),
      dsrPolicy: dsrPolicySnapshot
    });
    return mapped ?? undefined;
  }

  private normalizeWorkJourneyTemplateType(value: unknown): "FIXED" | "FLEXIBLE" | "INTERMITTENT" | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if (normalized === "FIXED" || normalized === "FLEXIBLE" || normalized === "INTERMITTENT") {
      return normalized;
    }
    return undefined;
  }

  private normalizeWorkJourneyTemplateDays(value: unknown): JourneyWeekDay[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalizedDays = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toUpperCase())
      .filter(
        (item): item is JourneyWeekDay =>
          item === "MON" ||
          item === "TUE" ||
          item === "WED" ||
          item === "THU" ||
          item === "FRI" ||
          item === "SAT" ||
          item === "SUN"
      );

    return [...new Set(normalizedDays)];
  }

  private normalizeWorkJourneyTemplateClock(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim();
    return /^\d{2}:\d{2}$/.test(normalized) ? normalized : undefined;
  }

  private resolveJourneyScaleLabel(
    scaleType?: DriverJourney["scaleType"],
    activeDays?: JourneyWeekDay[]
  ): string | undefined {
    if (scaleType === "FIVE_TWO") {
      return "5x2";
    }
    if (scaleType === "SIX_ONE") {
      return "6x1";
    }
    if (scaleType === "TWELVE_THIRTY_SIX") {
      return "12x36";
    }
    if (scaleType === "CUSTOM" && Array.isArray(activeDays) && activeDays.length > 0) {
      return `${activeDays.length}x${Math.max(0, 7 - activeDays.length)}`;
    }
    return undefined;
  }

  private mergeJourneySettings(base?: DriverJourney, patch?: DriverJourney): DriverJourney | undefined {
    if (!base && !patch) {
      return undefined;
    }

    const next: DriverJourney = { ...(base ?? {}) };
    if (!patch) {
      return next;
    }

    for (const [key, value] of Object.entries(patch) as Array<[keyof DriverJourney, DriverJourney[keyof DriverJourney]]>) {
      if (value !== undefined) {
        (next as any)[key] = value;
      }
    }

    return next;
  }

  private parseEmploymentContractStatus(
    value: unknown,
    validTo?: string,
    terminatedAt?: string
  ): DriverEmploymentContractStatus {
    if (terminatedAt) {
      return "TERMINATED";
    }

    let base: DriverEmploymentContractStatus;
    if (
      value === "DRAFT" ||
      value === "PENDING_SIGNATURE" ||
      value === "ACTIVE" ||
      value === "EXPIRING_SOON" ||
      value === "EXPIRED" ||
      value === "TERMINATED"
    ) {
      base = value;
    } else if (value === "GENERATED" || value === "SENT") {
      base = "PENDING_SIGNATURE";
    } else if (value === "SIGNED") {
      base = "ACTIVE";
    } else if (value === "CANCELLED") {
      base = "TERMINATED";
    } else {
      base = "DRAFT";
    }

    if (base === "ACTIVE" || base === "EXPIRING_SOON") {
      return this.resolveActiveLifecycleStatus(validTo);
    }

    if (base !== "TERMINATED" && this.isDateExpired(validTo)) {
      return "EXPIRED";
    }

    return base;
  }

  private parseEmploymentContractEndorsementType(value: unknown): DriverEmploymentContractEndorsementType {
    return value === "SALARY_CHANGE" ||
      value === "SCHEDULE_CHANGE" ||
      value === "BENEFITS_CHANGE" ||
      value === "TERM_EXTENSION" ||
      value === "OTHER"
      ? value
      : "OTHER";
  }

  private normalizeEmploymentContracts(value: unknown): DriverEmploymentContract[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => {
        const profile =
          item.profile === "CLT" || item.profile === "INTERMITENTE" || item.profile === "MEI"
            ? item.profile
            : undefined;
        const templateKey =
          typeof item.templateKey === "string" && item.templateKey.trim().length > 0
            ? item.templateKey.trim()
            : profile === "INTERMITENTE"
              ? "INTERMITENTE_STANDARD"
              : profile === "MEI"
                ? "MEI_STANDARD"
                : "CLT_STANDARD";
        const templateName =
          typeof item.templateName === "string" && item.templateName.trim().length > 0
            ? item.templateName.trim()
            : profile === "INTERMITENTE"
              ? "Contrato Intermitente padrao"
              : profile === "MEI"
                ? "Contrato MEI de prestacao de servicos"
                : "Contrato CLT padrao";
        const generatedAt =
          typeof item.generatedAt === "string" && item.generatedAt.trim()
            ? item.generatedAt
            : new Date().toISOString();
        const content = typeof item.content === "string" ? item.content.trim() : "";
        const title =
          typeof item.title === "string" && item.title.trim()
            ? item.title.trim()
            : profile === "INTERMITENTE"
              ? "Contrato Intermitente"
              : profile === "MEI"
                ? "Contrato MEI"
                : "Contrato CLT";
        const kind =
          item.kind === "NEW" || item.kind === "RENEWAL"
            ? item.kind
            : typeof item.parentContractId === "string" && item.parentContractId.trim().length > 0
              ? "RENEWAL"
              : "NEW";
        const endorsements = Array.isArray(item.endorsements)
          ? item.endorsements
              .filter((entry): entry is Record<string, unknown> => this.isRecord(entry))
              .map((entry) => {
                const effectiveDate =
                  typeof entry.effectiveDate === "string" && entry.effectiveDate.trim()
                    ? entry.effectiveDate.trim()
                    : this.toDateOnly(new Date());
                const status =
                  entry.status === "DRAFT" ||
                  entry.status === "PENDING_SIGNATURE" ||
                  entry.status === "ACTIVE" ||
                  entry.status === "CANCELLED"
                    ? entry.status
                    : "ACTIVE";
                return {
                  id:
                    typeof entry.id === "string" && entry.id.trim()
                      ? entry.id.trim()
                      : `endorsement_${randomUUID()}`,
                  type: this.parseEmploymentContractEndorsementType(entry.type),
                  status,
                  effectiveDate,
                  notes:
                    typeof entry.notes === "string" && entry.notes.trim().length > 0
                      ? entry.notes.trim()
                      : undefined,
                  changes: this.isRecord(entry.changes) ? entry.changes : {},
                  createdAt:
                    typeof entry.createdAt === "string" && entry.createdAt.trim()
                      ? entry.createdAt.trim()
                      : new Date().toISOString(),
                  signedAt:
                    typeof entry.signedAt === "string" && entry.signedAt.trim()
                      ? entry.signedAt.trim()
                      : status === "ACTIVE"
                        ? new Date().toISOString()
                        : undefined
                } as DriverEmploymentContractEndorsement;
              })
              .slice(0, 25)
          : undefined;

        if (!profile || !content) {
          return undefined;
        }

        return {
          id:
            typeof item.id === "string" && item.id.trim()
              ? item.id.trim()
              : `contract_${randomUUID()}`,
          profile,
          kind,
          parentContractId:
            typeof item.parentContractId === "string" && item.parentContractId.trim().length > 0
              ? item.parentContractId.trim()
              : undefined,
          title,
          status: this.parseEmploymentContractStatus(
            item.status,
            typeof item.validTo === "string" ? item.validTo.trim() : undefined,
            typeof item.terminatedAt === "string" ? item.terminatedAt.trim() : undefined
          ),
          templateKey,
          templateName,
          templateVersion:
            typeof item.templateVersion === "string" && item.templateVersion.trim()
              ? item.templateVersion.trim()
              : "v1",
          generatedAt,
          generatedBy: "SYSTEM",
          validFrom:
            typeof item.validFrom === "string" && item.validFrom.trim()
              ? item.validFrom.trim()
              : undefined,
          validTo:
            typeof item.validTo === "string" && item.validTo.trim()
              ? item.validTo.trim()
              : undefined,
          signedAt:
            typeof item.signedAt === "string" && item.signedAt.trim()
              ? item.signedAt.trim()
              : undefined,
          terminatedAt:
            typeof item.terminatedAt === "string" && item.terminatedAt.trim()
              ? item.terminatedAt.trim()
              : undefined,
          content,
          snapshot: this.isRecord(item.snapshot) ? item.snapshot : {}
          ,
          endorsements
        } as DriverEmploymentContract;
      })
      .filter((item): item is DriverEmploymentContract => item !== undefined);
  }

  private parseContract(value: unknown): DriverContract | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const input = value as Record<string, unknown>;
    const salaryModel =
      input.salaryModel === "FIXED" || input.salaryModel === "FIXED_PLUS_COMMISSION" || input.salaryModel === "COMMISSION"
        ? input.salaryModel
        : undefined;
    const commissionType =
      input.commissionType === "PERCENT" || input.commissionType === "PER_RIDE" ? input.commissionType : undefined;
    const commissionApplyOn =
      input.commissionApplyOn === "RIDE" || input.commissionApplyOn === "RATING" ? input.commissionApplyOn : undefined;
    const intermittentStatus =
      input.intermittentStatus === "ATIVO" || input.intermittentStatus === "PAUSADO"
        ? input.intermittentStatus
        : undefined;
    const intermittentConvocationMode =
      input.intermittentConvocationMode === "ON_DEMAND" ||
      input.intermittentConvocationMode === "ADVANCE_NOTICE" ||
      input.intermittentConvocationMode === "FIXED_WINDOW"
        ? input.intermittentConvocationMode
        : undefined;
    const intermittentPaymentMode =
      input.intermittentPaymentMode === "DAILY" ||
      input.intermittentPaymentMode === "PER_RIDE" ||
      input.intermittentPaymentMode === "DAILY_PLUS_RIDE"
        ? input.intermittentPaymentMode
        : undefined;
    const intermittentRideCompensationType =
      input.intermittentRideCompensationType === "AMOUNT" || input.intermittentRideCompensationType === "PERCENT"
        ? input.intermittentRideCompensationType
        : undefined;
    const meiRemunerationModel =
      input.meiRemunerationModel === "COMMISSION_PERCENT" ||
      input.meiRemunerationModel === "PER_RIDE_FIXED" ||
      input.meiRemunerationModel === "RIDE_REVENUE_SHARE" ||
      input.meiRemunerationModel === "FIXED_PLUS_VARIABLE"
        ? input.meiRemunerationModel
        : undefined;
    const meiCommissionBase =
      input.meiCommissionBase === "RIDE" ||
      input.meiCommissionBase === "GROSS_REVENUE" ||
      input.meiCommissionBase === "RATING"
        ? input.meiCommissionBase
        : undefined;
    const meiRevenueShareBase =
      input.meiRevenueShareBase === "RIDE_GROSS" || input.meiRevenueShareBase === "RIDE_NET"
        ? input.meiRevenueShareBase
        : undefined;
    const meiVariableType =
      input.meiVariableType === "PERCENT" || input.meiVariableType === "AMOUNT"
        ? input.meiVariableType
        : undefined;
    const meiVariableBase =
      input.meiVariableBase === "RIDE" ||
      input.meiVariableBase === "GROSS_REVENUE" ||
      input.meiVariableBase === "RATING"
        ? input.meiVariableBase
        : undefined;
    const meiWorkMode =
      input.meiWorkMode === "ON_DEMAND" || input.meiWorkMode === "SCHEDULED" || input.meiWorkMode === "MIXED"
        ? input.meiWorkMode
        : undefined;
    const meiOperationVehicleMode =
      input.meiOperationVehicleMode === "OWN_VEHICLE" ||
      input.meiOperationVehicleMode === "COMPANY_VEHICLE" ||
      input.meiOperationVehicleMode === "BOTH"
        ? input.meiOperationVehicleMode
        : undefined;
    const meiFuelResponsibility =
      input.meiFuelResponsibility === "DRIVER" ||
      input.meiFuelResponsibility === "COMPANY" ||
      input.meiFuelResponsibility === "SHARED"
        ? input.meiFuelResponsibility
        : undefined;
    const meiMaintenanceResponsibility =
      input.meiMaintenanceResponsibility === "DRIVER" ||
      input.meiMaintenanceResponsibility === "COMPANY" ||
      input.meiMaintenanceResponsibility === "SHARED"
        ? input.meiMaintenanceResponsibility
        : undefined;
    const meiCnpj =
      typeof input.meiCnpj === "string" && input.meiCnpj.trim().length > 0
        ? input.meiCnpj.trim()
        : undefined;
    const meiLegalName =
      typeof input.meiLegalName === "string" && input.meiLegalName.trim().length > 0
        ? input.meiLegalName.trim()
        : undefined;
    const meiTradeName =
      typeof input.meiTradeName === "string" && input.meiTradeName.trim().length > 0
        ? input.meiTradeName.trim()
        : undefined;
    const meiMunicipalRegistration =
      typeof input.meiMunicipalRegistration === "string" && input.meiMunicipalRegistration.trim().length > 0
        ? input.meiMunicipalRegistration.trim()
        : undefined;
    const overtimePolicyMode =
      input.overtimePolicyMode === "PAID" || input.overtimePolicyMode === "BANK_HOURS"
        ? input.overtimePolicyMode
        : undefined;
    const workProfileTemplateId =
      typeof input.workProfileTemplateId === "string" && input.workProfileTemplateId.trim().length > 0
        ? input.workProfileTemplateId.trim()
        : undefined;
    const workProfileTemplateName =
      typeof input.workProfileTemplateName === "string" && input.workProfileTemplateName.trim().length > 0
        ? input.workProfileTemplateName.trim()
        : undefined;
    const workProfileSummary =
      typeof input.workProfileSummary === "string" && input.workProfileSummary.trim().length > 0
        ? input.workProfileSummary.trim()
        : undefined;
    const workProfileContractType =
      input.workProfileContractType === "CLT" ||
      input.workProfileContractType === "CLT_INTERMITENTE" ||
      input.workProfileContractType === "MEI" ||
      input.workProfileContractType === "PJ" ||
      input.workProfileContractType === "AUTONOMO"
        ? input.workProfileContractType
        : undefined;
    const employmentTemplateKey =
      typeof input.employmentTemplateKey === "string" && input.employmentTemplateKey.trim().length > 0
        ? input.employmentTemplateKey.trim()
        : undefined;
    const employmentTemplateName =
      typeof input.employmentTemplateName === "string" && input.employmentTemplateName.trim().length > 0
        ? input.employmentTemplateName.trim()
        : undefined;
    const employmentTemplateVersion =
      typeof input.employmentTemplateVersion === "string" && input.employmentTemplateVersion.trim().length > 0
        ? input.employmentTemplateVersion.trim()
        : undefined;
    const employmentContracts = this.normalizeEmploymentContracts(input.employmentContracts);
    const parsed: DriverContract = {
      hasFixedTermContract: input.hasFixedTermContract === undefined ? undefined : Boolean(input.hasFixedTermContract),
      notifyContractEnd: input.notifyContractEnd === undefined ? undefined : Boolean(input.notifyContractEnd),
      contractEndNotifyLeadDays: this.normalizeIntegerField(input.contractEndNotifyLeadDays, 0),
      experienceEnabled: input.experienceEnabled === undefined ? undefined : Boolean(input.experienceEnabled),
      experienceStartDate: typeof input.experienceStartDate === "string" ? input.experienceStartDate : undefined,
      experienceEndDate: typeof input.experienceEndDate === "string" ? input.experienceEndDate : undefined,
      autoRenewAfterExperience:
        input.autoRenewAfterExperience === undefined ? undefined : Boolean(input.autoRenewAfterExperience),
      notifyExperienceEnd: input.notifyExperienceEnd === undefined ? undefined : Boolean(input.notifyExperienceEnd),
      experienceNotifyLeadDays: this.normalizeIntegerField(input.experienceNotifyLeadDays, 0),
      experienceNotifyRepeatDays: this.normalizeIntegerField(input.experienceNotifyRepeatDays, 1),
      benefitsList: Array.isArray(input.benefitsList)
        ? input.benefitsList
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : undefined,
      otherBenefits: typeof input.otherBenefits === "string" ? input.otherBenefits : undefined,
      salaryModel,
      fixedSalary: this.normalizeDecimalField(input.fixedSalary),
      commissionType,
      commissionApplyOn,
      commissionPercent: this.normalizeDecimalField(input.commissionPercent),
      commissionPerRide: this.normalizeDecimalField(input.commissionPerRide),
      startDate: typeof input.startDate === "string" ? input.startDate : undefined,
      endDate: typeof input.endDate === "string" ? input.endDate : undefined,
      benefits: typeof input.benefits === "string" ? input.benefits : undefined,
      intermittentStatus,
      intermittentConvocationMode,
      intermittentNoticeHours: this.normalizeIntegerField(input.intermittentNoticeHours, 0),
      intermittentConvocationNotes:
        typeof input.intermittentConvocationNotes === "string" ? input.intermittentConvocationNotes : undefined,
      intermittentPaymentMode,
      intermittentDailyRate: this.normalizeDecimalField(input.intermittentDailyRate),
      intermittentRideCompensationType,
      intermittentRideAmount: this.normalizeDecimalField(input.intermittentRideAmount),
      intermittentRidePercent: this.normalizeDecimalField(input.intermittentRidePercent),
      intermittentPreferredWeekDays: Array.isArray(input.intermittentPreferredWeekDays)
        ? input.intermittentPreferredWeekDays
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().toUpperCase())
            .filter(
              (
                item
              ): item is "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" =>
                item === "MON" ||
                item === "TUE" ||
                item === "WED" ||
                item === "THU" ||
                item === "FRI" ||
                item === "SAT" ||
              item === "SUN"
            )
        : undefined,
      meiRemunerationModel,
      meiCommissionBase,
      meiCommissionPercent: this.normalizeDecimalField(input.meiCommissionPercent),
      meiPerRideAmount: this.normalizeDecimalField(input.meiPerRideAmount),
      meiRevenueSharePercent: this.normalizeDecimalField(input.meiRevenueSharePercent),
      meiRevenueShareBase,
      meiFixedBaseAmount: this.normalizeDecimalField(input.meiFixedBaseAmount),
      meiVariableType,
      meiVariablePercent: this.normalizeDecimalField(input.meiVariablePercent),
      meiVariableAmount: this.normalizeDecimalField(input.meiVariableAmount),
      meiVariableBase,
      meiWorkMode,
      meiOperationVehicleMode,
      meiFuelResponsibility,
      meiMaintenanceResponsibility,
      meiCnpj,
      meiLegalName,
      meiTradeName,
      meiMunicipalRegistration,
      meiPreferredWeekDays: Array.isArray(input.meiPreferredWeekDays)
        ? input.meiPreferredWeekDays
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().toUpperCase())
            .filter(
              (
                item
              ): item is "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" =>
                item === "MON" ||
                item === "TUE" ||
                item === "WED" ||
                item === "THU" ||
                item === "FRI" ||
                item === "SAT" ||
                item === "SUN"
            )
        : undefined,
      workedPeriods: typeof input.workedPeriods === "string" ? input.workedPeriods : undefined,
      intermittentPreferredDays: typeof input.intermittentPreferredDays === "string" ? input.intermittentPreferredDays : undefined,
      paymentMethod: typeof input.paymentMethod === "string" ? input.paymentMethod : undefined,
      paymentFrequency: typeof input.paymentFrequency === "string" ? input.paymentFrequency : undefined,
      fiscalNotes: typeof input.fiscalNotes === "string" ? input.fiscalNotes : undefined,
      notes: typeof input.notes === "string" ? input.notes : undefined,
      overtimeUseGlobalPolicy:
        input.overtimeUseGlobalPolicy === undefined ? undefined : Boolean(input.overtimeUseGlobalPolicy),
      overtimeEnabled: input.overtimeEnabled === undefined ? undefined : Boolean(input.overtimeEnabled),
      overtimePolicyMode,
      overtimeDailyLimitHours: this.normalizeDecimalField(input.overtimeDailyLimitHours),
      overtimeWeeklyLimitHours: this.normalizeDecimalField(input.overtimeWeeklyLimitHours),
      overtimeAfterDailyHours: this.normalizeDecimalField(input.overtimeAfterDailyHours),
      overtimeAfterWeeklyHours: this.normalizeDecimalField(input.overtimeAfterWeeklyHours),
      overtimeMultiplier50: this.normalizeDecimalField(input.overtimeMultiplier50),
      overtimeMultiplier100: this.normalizeDecimalField(input.overtimeMultiplier100),
      overtimeNightMultiplier: this.normalizeDecimalField(input.overtimeNightMultiplier),
      overtimeRoundingMinutes: this.normalizeIntegerField(input.overtimeRoundingMinutes, 0),
      workProfileTemplateId,
      workProfileTemplateName,
      workProfileSummary,
      workProfileContractType,
      employmentTemplateKey,
      employmentTemplateName,
      employmentTemplateVersion,
      employmentContracts: employmentContracts.length > 0 ? employmentContracts : undefined
    };

    if (
      parsed.hasFixedTermContract === undefined &&
      parsed.notifyContractEnd === undefined &&
      parsed.contractEndNotifyLeadDays === undefined &&
      parsed.experienceEnabled === undefined &&
      !parsed.experienceStartDate &&
      !parsed.experienceEndDate &&
      parsed.autoRenewAfterExperience === undefined &&
      parsed.notifyExperienceEnd === undefined &&
      parsed.experienceNotifyLeadDays === undefined &&
      parsed.experienceNotifyRepeatDays === undefined &&
      (!parsed.benefitsList || parsed.benefitsList.length === 0) &&
      !parsed.otherBenefits &&
      !parsed.salaryModel &&
      parsed.fixedSalary === undefined &&
      !parsed.commissionType &&
      !parsed.commissionApplyOn &&
      parsed.commissionPercent === undefined &&
      parsed.commissionPerRide === undefined &&
      !parsed.startDate &&
      !parsed.endDate &&
      !parsed.benefits &&
      !parsed.intermittentStatus &&
      !parsed.intermittentConvocationMode &&
      parsed.intermittentNoticeHours === undefined &&
      !parsed.intermittentConvocationNotes &&
      !parsed.intermittentPaymentMode &&
      parsed.intermittentDailyRate === undefined &&
      !parsed.intermittentRideCompensationType &&
      parsed.intermittentRideAmount === undefined &&
      parsed.intermittentRidePercent === undefined &&
      (!parsed.intermittentPreferredWeekDays || parsed.intermittentPreferredWeekDays.length === 0) &&
      !parsed.meiRemunerationModel &&
      !parsed.meiCommissionBase &&
      parsed.meiCommissionPercent === undefined &&
      parsed.meiPerRideAmount === undefined &&
      parsed.meiRevenueSharePercent === undefined &&
      !parsed.meiRevenueShareBase &&
      parsed.meiFixedBaseAmount === undefined &&
      !parsed.meiVariableType &&
      parsed.meiVariablePercent === undefined &&
      parsed.meiVariableAmount === undefined &&
      !parsed.meiVariableBase &&
      !parsed.meiWorkMode &&
      !parsed.meiOperationVehicleMode &&
      !parsed.meiFuelResponsibility &&
      !parsed.meiMaintenanceResponsibility &&
      !parsed.meiCnpj &&
      !parsed.meiLegalName &&
      !parsed.meiTradeName &&
      !parsed.meiMunicipalRegistration &&
      (!parsed.meiPreferredWeekDays || parsed.meiPreferredWeekDays.length === 0) &&
      !parsed.workedPeriods &&
      !parsed.intermittentPreferredDays &&
      !parsed.paymentMethod &&
      !parsed.paymentFrequency &&
      !parsed.fiscalNotes &&
      !parsed.notes &&
      parsed.overtimeUseGlobalPolicy === undefined &&
      parsed.overtimeEnabled === undefined &&
      !parsed.overtimePolicyMode &&
      parsed.overtimeDailyLimitHours === undefined &&
      parsed.overtimeWeeklyLimitHours === undefined &&
      parsed.overtimeAfterDailyHours === undefined &&
      parsed.overtimeAfterWeeklyHours === undefined &&
      parsed.overtimeMultiplier50 === undefined &&
      parsed.overtimeMultiplier100 === undefined &&
      parsed.overtimeNightMultiplier === undefined &&
      parsed.overtimeRoundingMinutes === undefined &&
      !parsed.workProfileTemplateId &&
      !parsed.workProfileTemplateName &&
      !parsed.workProfileSummary &&
      !parsed.workProfileContractType &&
      !parsed.employmentTemplateKey &&
      !parsed.employmentTemplateName &&
      !parsed.employmentTemplateVersion &&
      (!parsed.employmentContracts || parsed.employmentContracts.length === 0)
    ) {
      return undefined;
    }

    return parsed;
  }

  private normalizeDriverLeavePeriodInput(input: {
    type: "VACATION" | "LEAVE" | "SUSPENSION";
    startDate: string;
    endDate: string;
    reason?: string;
    notes?: string;
  }): {
    type: DriverLeavePeriodType;
    startDate: Date;
    endDate: Date;
    reason?: string;
    notes?: string;
  } {
    const type =
      input.type === "VACATION" || input.type === "LEAVE" || input.type === "SUSPENSION"
        ? input.type
        : undefined;
    if (!type) {
      throw new BadRequestException("Tipo de periodo invalido.");
    }

    const startDate = this.parseDateOnlyValue(input.startDate, "Data inicial do periodo invalida.");
    const endDate = this.parseDateOnlyValue(input.endDate, "Data final do periodo invalida.");
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException("Data final deve ser igual ou posterior a data inicial.");
    }

    const reason = this.normalizeOptional(input.reason ?? undefined) ?? undefined;
    const notes = this.normalizeOptional(input.notes ?? undefined) ?? undefined;

    return {
      type,
      startDate,
      endDate,
      reason,
      notes
    };
  }

  private parseDateOnlyValue(value: string, message: string): Date {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(message);
    }

    const parsed = new Date(`${normalized}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }

    return parsed;
  }

  private async ensureNoDriverLeavePeriodOverlap(
    driverId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<void> {
    const overlap = await this.prisma.driverLeavePeriod.findFirst({
      where: {
        driverId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startDate: {
          lte: endDate
        },
        endDate: {
          gte: startDate
        }
      },
      select: { id: true }
    });

    if (overlap) {
      throw new BadRequestException(
        "Ja existe um periodo de afastamento/ferias sobreposto para este motorista."
      );
    }
  }

  private toDriverLeavePeriod(period: {
    id: string;
    driverId: string;
    type: DriverLeavePeriodType;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): DriverLeavePeriod {
    return {
      id: period.id,
      driverId: period.driverId,
      type: period.type,
      startDate: this.toDateOnly(period.startDate),
      endDate: this.toDateOnly(period.endDate),
      reason: period.reason ?? undefined,
      notes: period.notes ?? undefined,
      createdAt: period.createdAt.toISOString(),
      updatedAt: period.updatedAt.toISOString()
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private resolveOvertimeTemplatePolicyCategory(value: unknown): "OVERTIME" | "NIGHT" {
    if (!this.isRecord(value)) {
      return "OVERTIME";
    }

    return value.policyCategory === "NIGHT" ? "NIGHT" : "OVERTIME";
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, "").trim();
  }

  private normalizeBirthDate(value: string): Date {
    const normalized = value.trim();
    const parsed = new Date(`${normalized}T12:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Data de nascimento invalida.");
    }

    return parsed;
  }

  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private normalizeOptional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeDecimalField(value: unknown): number | undefined {
    const raw =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim().length > 0
          ? Number(value.replace(",", "."))
          : undefined;

    if (raw === undefined || Number.isNaN(raw) || !Number.isFinite(raw)) {
      return undefined;
    }

    if (raw < 0) {
      return undefined;
    }

    return Number(raw.toFixed(2));
  }

  private normalizeIntegerField(value: unknown, minValue: number): number | undefined {
    const asNumber =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim().length > 0
          ? Number(value)
          : undefined;

    if (asNumber === undefined || Number.isNaN(asNumber) || !Number.isFinite(asNumber)) {
      return undefined;
    }

    const normalized = Math.trunc(asNumber);
    return normalized >= minValue ? normalized : undefined;
  }
}
