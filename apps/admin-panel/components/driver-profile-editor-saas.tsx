"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DriverContractSignatureRequestResult,
  DriverEmploymentContractEndorsementType,
  DriverComplianceHistoryItem,
  DriverCompensationSettings,
  DriverContract,
  DriverContractProfile,
  DriverAddress,
  DriverEmergencyContact,
  FleetAssignmentMode,
  FleetVehicle,
  DriverGender,
  DriverJourney,
  DriverLicense,
  DriverOperationalStatus,
  DriverPsychotechnical,
  DriverProfile,
  DriverToxicology,
  DriverType,
  DriverVehicle,
  formatCurrency,
  request
} from "../lib/api";
import {
  DriverEditorSection,
  DriverProfileEditorHero,
  DriverProfileEditorStepNav
} from "./driver-profile-editor-shell";
import { DriverProfileEditorContractsSection } from "./driver-profile-editor-contracts-section";
import { DriverProfileEditorComplianceSection } from "./driver-profile-editor-compliance-section";
import { DriverProfileEditorContactSection } from "./driver-profile-editor-contact-section";
import { DriverProfileEditorAccessibilitySection } from "./driver-profile-editor-accessibility-section";
import { DriverProfileEditorOperationSection } from "./driver-profile-editor-operation-section";
import { DriverProfileEditorPersonalSection } from "./driver-profile-editor-personal-section";

type DriverCompensationMode = NonNullable<DriverCompensationSettings["effectiveModel"]>;

type DriverFormState = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: DriverGender | "";
  bloodType: string;
  driverType: DriverType;
  fleetAssignmentMode: FleetAssignmentMode | "";
  defaultFleetVehicleId: string;
  operationalStatus: DriverOperationalStatus;
  operationalNotes: string;
};

type DriverCompensationFormState = {
  useGlobalConfig: boolean;
  customModel: DriverCompensationMode;
  customValue: string;
  customNotes: string;
};

type SubmitRequirementIssue = {
  section: DriverEditorSection;
  message: string;
};

type VehicleDraft = {
  id?: string;
  label: string;
  plate: string;
  color: string;
  year: string;
  isActive: boolean;
};

type DriverProfileEditorProps = {
  mode: "create" | "edit";
  initialDriver?: DriverProfile;
};

const emptyDriverLicense: DriverLicense = {
  number: "",
  category: "",
  expirationDate: "",
  firstLicenseDate: "",
  issuingState: "",
  documentPhotoUrl: "",
  expiryAlertLeadDays: 30,
  expiryAlertRepeatDays: 7
};

const emptyDriverToxicology: DriverToxicology = {
  required: true,
  examNumber: "",
  examDate: "",
  expirationDate: "",
  expiryAlertLeadDays: 30,
  expiryAlertRepeatDays: 7,
  clinicName: "",
  clinicCnpj: "",
  reportAttachmentName: "",
  reportAttachmentDataUrl: "",
  reportAttachmentMimeType: "",
  psychotechnical: {
    required: true,
    examNumber: "",
    examDate: "",
    expirationDate: "",
    situation: undefined,
    restrictionsDescription: "",
    examType: undefined,
    expiryAlertLeadDays: 30,
    expiryAlertRepeatDays: 7,
    clinicName: "",
    clinicCnpj: "",
    psychologistName: "",
    psychologistCrp: "",
    detailedResult: "",
    reportAttachmentName: "",
    reportAttachmentDataUrl: "",
    reportAttachmentMimeType: "",
    notes: ""
  },
  notes: ""
};

const emptyDriverJourney: DriverJourney = {
  fixedScheduleMode: "UNIFORM",
  shift: "",
  scale: "",
  scaleType: "SIX_ONE",
  customScaleWorkDays: undefined,
  customScaleOffDays: undefined,
  fixedSchedule: true,
  startTime: "",
  endTime: "",
  availabilityStartTime: "",
  availabilityEndTime: "",
  availableDays: ["MON", "TUE", "WED", "THU", "FRI"],
  acceptsOutsideSchedule: false,
  availabilityNotes: ""
};

const emptyDriverContract: DriverContract = {
  startDate: "",
  endDate: "",
  hasFixedTermContract: false,
  notifyContractEnd: true,
  contractEndNotifyLeadDays: 30,
  experienceEnabled: false,
  experienceStartDate: "",
  experienceEndDate: "",
  autoRenewAfterExperience: false,
  notifyExperienceEnd: true,
  experienceNotifyLeadDays: 15,
  experienceNotifyRepeatDays: 7,
  benefitsList: [],
  otherBenefits: "",
  salaryModel: "FIXED",
  fixedSalary: 0,
  commissionType: "PERCENT",
  commissionApplyOn: "RIDE",
  commissionPercent: 0,
  commissionPerRide: 0,
  benefits: "",
  intermittentStatus: "ATIVO",
  meiCnpj: "",
  meiLegalName: "",
  meiTradeName: "",
  meiMunicipalRegistration: "",
  workedPeriods: "",
  intermittentPreferredDays: "",
  paymentMethod: "",
  paymentFrequency: "",
  fiscalNotes: "",
  notes: ""
};

const emptyVehicleDraft: VehicleDraft = {
  label: "",
  plate: "",
  color: "",
  year: "",
  isActive: true
};
const minimumEmergencyContactsRequired = 2;

const monthOptions = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Marco" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" }
] as const;

const genderOptions: Array<{ value: DriverGender; label: string }> = [
  { value: "FEMALE", label: "Feminino" },
  { value: "MALE", label: "Masculino" },
  { value: "NON_BINARY", label: "Nao-binario" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefiro nao dizer" }
];

const driverEditorSections: DriverEditorSection[] = [
  "basic",
  "compliance",
  "contact",
  "accessibility",
  "contract",
  "contracts"
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCpfInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)].filter(Boolean);

  if (parts.length <= 1) {
    return digits;
  }

  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}`;
  }

  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
}

function formatPhoneInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatVehicleSummary(vehicle: VehicleDraft, fallbackLabel: string): string {
  const label = vehicle.label.trim() || fallbackLabel;
  const plate = vehicle.plate.trim() || "placa pendente";
  const status = vehicle.isActive ? "Ativo" : "Reserva";
  return `${label} - ${plate} - ${status}`;
}

function splitBirthDate(value?: string): { birthDay: string; birthMonth: string; birthYear: string } {
  if (!value) {
    return { birthDay: "", birthMonth: "", birthYear: "" };
  }

  const [birthYear = "", birthMonth = "", birthDay = ""] = value.split("-");
  return { birthDay, birthMonth, birthYear };
}

function buildBirthDateValue(birthDay: string, birthMonth: string, birthYear: string): string | null {
  if (birthDay.length !== 2 || birthMonth.length !== 2 || birthYear.length !== 4) {
    return null;
  }

  const candidate = `${birthYear}-${birthMonth}-${birthDay}`;
  const parsed = new Date(`${candidate}T12:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed.toISOString().slice(0, 10) !== candidate) {
    return null;
  }

  return candidate;
}

function parseIsoDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : `${value}T12:00:00.000Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getAgeFromBirthDate(value?: string): number | null {
  const birthDate = parseIsoDate(value);
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassedThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassedThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatShortDate(value?: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "Data pendente";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function formatEmploymentWindow(value?: string): { tenureLabel: string; sinceLabel: string } {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return {
      tenureLabel: "Aguardando cadastro",
      sinceLabel: "Sem data inicial"
    };
  }

  const today = new Date();
  const diffMs = today.getTime() - parsed.getTime();
  if (diffMs < 0) {
    return {
      tenureLabel: "Inicio programado",
      sinceLabel: `Desde ${formatShortDate(value)}`
    };
  }

  let totalMonths = (today.getFullYear() - parsed.getFullYear()) * 12 + (today.getMonth() - parsed.getMonth());
  if (today.getDate() < parsed.getDate()) {
    totalMonths -= 1;
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalMonths <= 0) {
    return {
      tenureLabel: totalDays <= 0 ? "Hoje" : `${totalDays} ${totalDays === 1 ? "dia" : "dias"}`,
      sinceLabel: `Desde ${formatShortDate(value)}`
    };
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "mes" : "meses"}`);
  }

  return {
    tenureLabel: parts.join(" e "),
    sinceLabel: `Desde ${formatShortDate(value)}`
  };
}

function sanitizeContractForSave(contract?: DriverContract): DriverContract | undefined {
  if (!contract) {
    return undefined;
  }

  const { employmentContracts, ...rest } = contract;
  return rest;
}

function hasConfiguredContract(contract?: DriverContract): boolean {
  if (!contract) return false;

  return Boolean(
    contract.startDate?.trim() ||
      contract.endDate?.trim() ||
      contract.hasFixedTermContract ||
      contract.experienceEnabled ||
      contract.experienceStartDate?.trim() ||
      contract.experienceEndDate?.trim() ||
      (contract.employmentContracts?.length ?? 0) > 0
  );
}

function resolveContractPhaseLabel(contract?: DriverContract): string {
  if (!hasConfiguredContract(contract)) {
    return "Contrato nao configurado";
  }

  if (contract?.experienceEnabled) {
    const start = parseIsoDate(contract.experienceStartDate);
    const end = parseIsoDate(contract.experienceEndDate);
    const today = new Date();
    if (start && end && today.getTime() >= start.getTime() && today.getTime() <= end.getTime()) {
      return "Periodo de experiencia";
    }
  }

  return "Contrato efetivado";
}

function toDriverFormState(driver?: DriverProfile): DriverFormState {
  const birthDateParts = splitBirthDate(driver?.birthDate);

  return {
    name: driver?.name ?? "",
    cpf: formatCpfInput(driver?.cpf ?? ""),
    phone: formatPhoneInput(driver?.phone ?? ""),
    email: driver?.email ?? "",
    isActive: driver?.isActive ?? true,
    password: "",
    confirmPassword: "",
    birthDay: birthDateParts.birthDay,
    birthMonth: birthDateParts.birthMonth,
    birthYear: birthDateParts.birthYear,
    gender: driver?.gender ?? "",
    bloodType: driver?.bloodType ?? "",
    driverType: driver?.driverType ?? "AGREGADO",
    fleetAssignmentMode: driver?.fleetAssignmentMode ?? (driver?.driverType === "FROTA" ? "FLEX" : ""),
    defaultFleetVehicleId: driver?.defaultFleetVehicle?.vehicleId ?? "",
    operationalStatus: driver?.operationalStatus ?? "ACTIVE",
    operationalNotes: driver?.operationalNotes ?? ""
  };
}

function deriveContractProfile(driver?: DriverProfile): DriverContractProfile {
  if (driver?.contractProfile) {
    return driver.contractProfile;
  }

  if (driver?.compensation.effectiveModel === "INTERMITTENT") {
    return "INTERMITENTE";
  }

  return driver?.driverType === "FROTA" ? "CLT" : "MEI";
}

function toVehicleDraft(vehicle: DriverVehicle): VehicleDraft {
  return {
    id: vehicle.id,
    label: vehicle.label,
    plate: vehicle.plate,
    color: vehicle.color ?? "",
    year: vehicle.year ? String(vehicle.year) : "",
    isActive: vehicle.isActive
  };
}

function toCompensationFormState(driver?: DriverProfile): DriverCompensationFormState {
  return {
    useGlobalConfig: false,
    customModel: driver?.compensation.customModel ?? "PERCENT",
    customValue: driver?.compensation.customValue !== undefined ? String(driver.compensation.customValue) : "0",
    customNotes: driver?.compensation.customNotes ?? ""
  };
}

function formatCompensationValue(model: DriverCompensationMode, value: number): string {
  switch (model) {
    case "PERCENT":
      return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% por corrida`;
    case "FLAT":
      return `${formatCurrency(value)} por corrida`;
    case "DAILY":
      return `${formatCurrency(value)} por diaria`;
    case "SHIFT":
      return `${formatCurrency(value)} por turno`;
    case "SALARY":
      return `${formatCurrency(value)} por mes`;
    case "INTERMITTENT":
      return value > 0 ? `${formatCurrency(value)} intermitente` : "Intermitente";
    default:
      return value > 0 ? `${formatCurrency(value)} personalizado` : "Personalizado";
  }
}

function getCompensationModeLabel(mode: DriverCompensationMode): string {
  switch (mode) {
    case "PERCENT":
      return "Comissao por corrida";
    case "FLAT":
      return "Valor fixo por corrida";
    case "DAILY":
      return "Diaria";
    case "SHIFT":
      return "Turno";
    case "SALARY":
      return "Salario";
    case "INTERMITTENT":
      return "Intermitente";
    default:
      return "Personalizado";
  }
}

function buildCompensationPreview(
  form: DriverCompensationFormState,
  baseSettings: DriverCompensationSettings | null
): DriverCompensationSettings | null {
  if (!baseSettings) {
    return null;
  }

  const customValue = Number(form.customValue || 0);
  const model = form.customModel;

  return {
    ...baseSettings,
    useGlobalConfig: false,
    customModel: model,
    customValue,
    customNotes: form.customNotes.trim() || undefined,
    globalModel: model,
    globalValue: customValue,
    globalIsActive: true,
    globalNotes: undefined,
    effectiveSource: "CUSTOM",
    effectiveModel: model,
    effectiveValue: customValue,
    effectiveIsActive: true
  };
}

function formatCurrentCompensationRule(settings: DriverCompensationSettings | null): string {
  if (!settings) {
    return "Regra atual indisponivel.";
  }

  const sourceLabel = "modelo do template";
  const value = settings.effectiveValue;

  switch (settings.effectiveModel) {
    case "PERCENT":
      return `Regra atual: Comissao de ${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% por corrida (${sourceLabel})`;
    case "FLAT":
      return `Regra atual: ${formatCurrency(value)} por corrida (${sourceLabel})`;
    case "DAILY":
      return `Regra atual: ${formatCurrency(value)} por diaria (${sourceLabel})`;
    case "SHIFT":
      return `Regra atual: ${formatCurrency(value)} por turno (${sourceLabel})`;
    case "SALARY":
      return `Regra atual: ${formatCurrency(value)} por mes (${sourceLabel})`;
    case "INTERMITTENT":
      return `Regra atual: Intermitente (${sourceLabel})`;
    default:
      return `Regra atual: Personalizada (${sourceLabel})`;
  }
}

function getDriverTypeLabel(type: DriverType): string {
  return type === "FROTA" ? "Motorista da frota" : "Agregado";
}

function getDriverTypeDescription(type: DriverType): string {
  return type === "FROTA"
    ? "Utiliza veiculo da empresa com operacao e alocacao controladas."
    : "Usa veiculo proprio e possui maior autonomia dentro das regras da plataforma.";
}

function getOperationalStatusLabel(status: DriverOperationalStatus): string {
  switch (status) {
    case "INACTIVE":
      return "Inativo";
    case "LEAVE":
      return "Em analise";
    case "SUSPENDED":
      return "Suspenso";
    default:
      return "Ativo";
  }
}

function getOperationalStatusDescription(status: DriverOperationalStatus): string {
  switch (status) {
    case "INACTIVE":
      return "Nao deve aparecer na operacao nem receber corridas.";
    case "LEAVE":
      return "Cadastro em avaliacao e temporariamente fora da operacao.";
    case "SUSPENDED":
      return "Fica bloqueado para operar ate nova liberacao.";
    default:
      return "Pode operar normalmente quando vinculo e veiculo estiverem regulares.";
  }
}

function getCompensationRule(model: DriverCompensationMode): {
  valueLabel?: string;
  valuePlaceholder?: string;
  notesLabel: string;
  notesPlaceholder: string;
  notesRequired: boolean;
  summary: string;
} {
  switch (model) {
    case "PERCENT":
      return {
        valueLabel: "Percentual (%)",
        valuePlaceholder: "Ex: 25",
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: false,
        summary: "Informe um percentual entre 0 e 100."
      };
    case "FLAT":
      return {
        valueLabel: "Valor por corrida",
        valuePlaceholder: "Ex: 45,00",
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: false,
        summary: "Informe o valor pago por corrida."
      };
    case "DAILY":
      return {
        valueLabel: "Valor da diaria",
        valuePlaceholder: "Ex: 180,00",
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: false,
        summary: "Informe o valor pago por dia."
      };
    case "SHIFT":
      return {
        valueLabel: "Valor por turno",
        valuePlaceholder: "Ex: 120,00",
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: false,
        summary: "Informe o valor pago por turno."
      };
    case "SALARY":
      return {
        valueLabel: "Valor mensal",
        valuePlaceholder: "Ex: 2500,00",
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: false,
        summary: "Informe o valor mensal."
      };
    case "INTERMITTENT":
      return {
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: true,
        summary: "Descreva como funciona a convocacao, escala e pagamento do intermitente."
      };
    default:
      return {
        notesLabel: "Detalhes da remuneracao",
        notesPlaceholder: "Ex: bonus por meta, acordo especifico, regras adicionais...",
        notesRequired: true,
        summary: "Descreva a regra combinada para este motorista."
      };
  }
}

function getPsychotechnicalSituationLabel(situation?: DriverPsychotechnical["situation"]): string | undefined {
  if (situation === "APTO") return "Apto";
  if (situation === "INAPTO") return "Inapto";
  if (situation === "APTO_COM_RESTRICOES") return "Apto com restricoes";
  return undefined;
}

function getPsychotechnicalExamTypeLabel(examType?: DriverPsychotechnical["examType"]): string | undefined {
  if (examType === "INICIAL") return "Inicial";
  if (examType === "RENOVACAO") return "Renovacao";
  return undefined;
}

function buildToxicologyHistorySummary(value?: DriverToxicology): string {
  if (!value?.required) {
    return "Toxicologico definido como nao obrigatorio.";
  }

  return `${
    value.examDate
      ? `Toxicologico ${value.examNumber ? `${value.examNumber} ` : ""}realizado em ${value.examDate}`
      : "Toxicologico marcado como pendente"
  }${
    value?.clinicName || value?.clinicCnpj
      ? `. Clinica ${value.clinicName?.trim() || "nao informada"}${value.clinicCnpj?.trim() ? ` | CNPJ ${value.clinicCnpj.trim()}` : ""}`
      : ""
  }${value.reportAttachmentName?.trim() ? `. Documento anexado (${value.reportAttachmentName.trim()})` : ""}.`;
}

function buildPsychotechnicalHistorySummary(value?: DriverToxicology): string {
  const psychotechnical = value?.psychotechnical;
  if (!psychotechnical?.required) {
    return "Psicotecnico definido como nao obrigatorio.";
  }

  const situationLabel = getPsychotechnicalSituationLabel(psychotechnical.situation);
  const examTypeLabel = getPsychotechnicalExamTypeLabel(psychotechnical.examType);
  const blocks = [
    psychotechnical.examDate
      ? `Psicotecnico realizado em ${psychotechnical.examDate}`
      : "Psicotecnico com data de realizacao pendente",
    situationLabel ? `Situacao ${situationLabel}` : "",
    examTypeLabel ? `Tipo ${examTypeLabel}` : ""
  ].filter((item) => item.length > 0);

  const clinicBlock =
    psychotechnical.clinicName || psychotechnical.clinicCnpj
      ? `Clinica ${psychotechnical.clinicName?.trim() || "nao informada"}${
          psychotechnical.clinicCnpj?.trim() ? ` | CNPJ ${psychotechnical.clinicCnpj.trim()}` : ""
        }`
      : "";
  const professionalBlock =
    psychotechnical.psychologistName || psychotechnical.psychologistCrp
      ? `Profissional ${psychotechnical.psychologistName?.trim() || "nao informado"}${
          psychotechnical.psychologistCrp?.trim() ? ` | CRP ${psychotechnical.psychologistCrp.trim()}` : ""
        }`
      : "";
  const attachmentBlock = psychotechnical.reportAttachmentName?.trim()
    ? `Laudo anexado (${psychotechnical.reportAttachmentName.trim()})`
    : "";

  return [...blocks, clinicBlock, professionalBlock, attachmentBlock].filter((item) => item.length > 0).join(". ") + ".";
}

export function DriverProfileEditorSaas({ mode, initialDriver }: DriverProfileEditorProps) {
  const router = useRouter();
  const [driverForm, setDriverForm] = useState<DriverFormState>(() => toDriverFormState(initialDriver));
  const [driverPhotoUrl, setDriverPhotoUrl] = useState(initialDriver?.photoUrl ?? "");
  const [driverHasPassword, setDriverHasPassword] = useState(initialDriver?.hasPassword ?? false);
  const [isResettingPassword, setIsResettingPassword] = useState(mode === "create" || !(initialDriver?.hasPassword ?? false));
  const [compensationForm, setCompensationForm] = useState<DriverCompensationFormState>(() =>
    toCompensationFormState(initialDriver)
  );
  const [compensationSettings, setCompensationSettings] = useState<DriverCompensationSettings | null>(
    initialDriver?.compensation ?? {
      useGlobalConfig: false,
      customModel: "PERCENT",
      customValue: 0,
      customNotes: undefined,
      globalModel: "PERCENT",
      globalValue: 0,
      globalIsActive: true,
      globalNotes: undefined,
      effectiveSource: "CUSTOM",
      effectiveModel: "PERCENT",
      effectiveValue: 0,
      effectiveIsActive: true
    }
  );
  const [emergencyContacts, setEmergencyContacts] = useState<DriverEmergencyContact[]>(
    initialDriver?.emergencyContacts ?? []
  );
  const [address, setAddress] = useState<DriverAddress | undefined>(initialDriver?.address);
  const [driverLicense, setDriverLicense] = useState<DriverLicense | undefined>(initialDriver?.driverLicense);
  const [toxicology, setToxicology] = useState<DriverToxicology | undefined>(initialDriver?.toxicology ?? emptyDriverToxicology);
  const [complianceHistory, setComplianceHistory] = useState<DriverComplianceHistoryItem[]>(
    initialDriver?.complianceHistory ?? []
  );
  const [contractProfile, setContractProfile] = useState<DriverContractProfile>(() => deriveContractProfile(initialDriver));
  const [journey, setJourney] = useState<DriverJourney | undefined>(initialDriver?.journey ?? emptyDriverJourney);
  const [contract, setContract] = useState<DriverContract | undefined>(initialDriver?.contract ?? emptyDriverContract);
  const [newVehicles, setNewVehicles] = useState<VehicleDraft[]>([]);
  const [existingVehicles, setExistingVehicles] = useState<VehicleDraft[]>(
    initialDriver?.vehicles.map((vehicle) => toVehicleDraft(vehicle)) ?? []
  );
  const [statusMessage, setStatusMessage] = useState(
    mode === "create"
      ? "Preencha os dados principais e revise a remuneracao do motorista."
      : "Atualize o cadastro e ajuste a remuneracao quando necessario."
  );
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState<string | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isRenewingContract, setIsRenewingContract] = useState(false);
  const [isActivatingContract, setIsActivatingContract] = useState(false);
  const [isRequestingSignature, setIsRequestingSignature] = useState(false);
  const [isTerminatingContract, setIsTerminatingContract] = useState(false);
  const [isCreatingEndorsement, setIsCreatingEndorsement] = useState(false);
  const [activeSection, setActiveSection] = useState<DriverEditorSection>("basic");
  const [expandedVehicleKey, setExpandedVehicleKey] = useState<string | null>(null);

  useEffect(() => {
    if (initialDriver?.compensation) {
      setCompensationSettings(initialDriver.compensation);
    }
  }, [initialDriver]);

  useEffect(() => {
    setDriverHasPassword(initialDriver?.hasPassword ?? false);
    setIsResettingPassword(mode === "create" || !(initialDriver?.hasPassword ?? false));
  }, [initialDriver, mode]);

  const hasExistingVehicles = existingVehicles.length > 0;
  const compensationPreview = useMemo(
    () => buildCompensationPreview(compensationForm, compensationSettings),
    [compensationForm, compensationSettings]
  );
  const effectiveCompensationLabel = compensationPreview
    ? formatCurrentCompensationRule(compensationPreview)
    : "Regra de remuneracao indisponivel";
  const customValueNumber = Number(compensationForm.customValue || 0);
  const effectiveCustomMode = compensationForm.customModel;
  const compensationRule = getCompensationRule(effectiveCustomMode);
  const customRuleRequiresValue = !!compensationRule.valueLabel;
  const trimmedCompensationNotes = compensationForm.customNotes.trim();
  const compensationNotesAreValid = !compensationRule.notesRequired || trimmedCompensationNotes.length > 0;
  const customValueIsValid =
    !customRuleRequiresValue ||
    (compensationForm.customValue.trim() !== "" &&
      customValueNumber >= 0 &&
      (compensationForm.customModel !== "PERCENT" || customValueNumber <= 100));
  const passwordValue = driverForm.password.trim();
  const confirmPasswordValue = driverForm.confirmPassword.trim();
  const isCreateMode = mode === "create";
  const shouldShowPasswordFields = isCreateMode || !driverHasPassword || isResettingPassword;
  const appAccessLabel = driverForm.isActive ? "Ativo" : "Inativo";
  const passwordFieldsTouched = passwordValue.length > 0 || confirmPasswordValue.length > 0;
  const passwordIsRequired = isCreateMode || !driverHasPassword || isResettingPassword;
  const passwordIsValid = passwordIsRequired
    ? passwordValue.length >= 6 && passwordValue === confirmPasswordValue
    : !passwordFieldsTouched || (passwordValue.length >= 6 && passwordValue === confirmPasswordValue);
  const birthDateValue = buildBirthDateValue(driverForm.birthDay, driverForm.birthMonth, driverForm.birthYear);
  const ageValue = getAgeFromBirthDate(birthDateValue ?? undefined);
  const ageLabel = ageValue === null ? "Idade pendente" : `${ageValue} ano${ageValue === 1 ? "" : "s"}`;
  const cnhCategory = driverLicense?.category?.trim().toUpperCase();
  const cnhCategoryLabel = cnhCategory ? `CNH categoria ${cnhCategory}` : "CNH pendente";
  const requiredCoreFieldsReady =
    driverForm.name.trim().length > 0 &&
    digitsOnly(driverForm.cpf).length === 11 &&
    digitsOnly(driverForm.phone).length >= 10 &&
    driverForm.email.trim().length > 0 &&
    birthDateValue !== null &&
    driverForm.gender !== "";
  const readyVehicles = useMemo(
    () => [...existingVehicles, ...newVehicles].filter((vehicle) => vehicle.label.trim() && vehicle.plate.trim()),
    [existingVehicles, newVehicles]
  );
  const emergencyContactsAreValid = emergencyContacts.length >= minimumEmergencyContactsRequired;
  const submitRequirementIssues = useMemo<SubmitRequirementIssue[]>(() => {
    const issues: SubmitRequirementIssue[] = [];

    if (driverForm.name.trim().length === 0) {
      issues.push({ section: "basic", message: "Dados basicos: informe o nome do motorista." });
    }
    if (digitsOnly(driverForm.cpf).length !== 11) {
      issues.push({ section: "basic", message: "Dados basicos: CPF deve ter 11 digitos." });
    }
    if (digitsOnly(driverForm.phone).length < 10) {
      issues.push({ section: "contact", message: "Contato e emergencia: telefone principal invalido." });
    }
    if (driverForm.email.trim().length === 0) {
      issues.push({ section: "contact", message: "Contato e emergencia: informe o e-mail." });
    }
    if (birthDateValue === null) {
      issues.push({ section: "basic", message: "Dados basicos: preencha a data de nascimento completa." });
    }
    if (driverForm.gender === "") {
      issues.push({ section: "basic", message: "Dados basicos: selecione o genero." });
    }
    if (!emergencyContactsAreValid) {
      issues.push({
        section: "contact",
        message: `Contato e emergencia: cadastre pelo menos ${minimumEmergencyContactsRequired} contatos.`
      });
    }
    if (!customValueIsValid) {
      issues.push({
        section: "contract",
        message: "Operacao e remuneracao: informe um valor de remuneracao valido."
      });
    }
    if (!compensationNotesAreValid) {
      issues.push({
        section: "contract",
        message: "Operacao e remuneracao: detalhe obrigatorio da remuneracao pendente."
      });
    }
    if (!passwordIsValid) {
      issues.push({
        section: "basic",
        message: passwordIsRequired
          ? "Dados basicos: senha minima de 6 caracteres e confirmacao obrigatoria."
          : "Dados basicos: senha e confirmacao precisam coincidir."
      });
    }

    return issues;
  }, [
    birthDateValue,
    compensationNotesAreValid,
    customValueIsValid,
    driverForm.cpf,
    driverForm.email,
    driverForm.gender,
    driverForm.name,
    driverForm.phone,
    emergencyContactsAreValid,
    minimumEmergencyContactsRequired,
    passwordIsRequired,
    passwordIsValid
  ]);
  const canSubmit = !isSavingDriver && submitRequirementIssues.length === 0;
  const activeVehicle = useMemo(
    () => [...existingVehicles, ...newVehicles].find((vehicle) => vehicle.isActive),
    [existingVehicles, newVehicles]
  );
  const activeReadyVehicle = useMemo(
    () => readyVehicles.find((vehicle) => vehicle.isActive),
    [readyVehicles]
  );
  const operationalStatusLabel = getOperationalStatusLabel(driverForm.operationalStatus);
  const operationalStatusDescription = getOperationalStatusDescription(driverForm.operationalStatus);
  const operationBlockingIssues = useMemo(() => {
    const issues: string[] = [];

    if (driverForm.operationalStatus === "INACTIVE") {
      issues.push("Motorista marcado como inativo.");
    } else if (driverForm.operationalStatus === "LEAVE") {
      issues.push("Motorista em afastamento.");
    } else if (driverForm.operationalStatus === "SUSPENDED") {
      issues.push("Motorista suspenso para operacao.");
    }

    return issues;
  }, [driverForm.operationalStatus]);
  const operationEligible = operationBlockingIssues.length === 0;
  const sidebarStatusChecks = [
    { label: "Cadastro completo", complete: requiredCoreFieldsReady },
    {
      label: `Contatos de emergencia (${minimumEmergencyContactsRequired}+)`,
      complete: emergencyContactsAreValid
    },
    { label: "Remuneracao definida", complete: !!compensationPreview && customValueIsValid && compensationNotesAreValid },
    { label: "Pronto para operar", complete: operationEligible }
  ];
  const activeVehicleSummary = useMemo(() => {
    if (!activeVehicle) {
      return "Nenhum veiculo ativo";
    }

    if (activeVehicle.label && activeVehicle.plate) {
      return `${activeVehicle.label} • ${activeVehicle.plate}`;
    }

    return activeVehicle.label || activeVehicle.plate || "Veiculo ativo sem resumo";
  }, [activeVehicle]);
  const driverTypeLabel = getDriverTypeLabel(driverForm.driverType);
  const contractPhaseLabel = resolveContractPhaseLabel(contract);
  const employmentWindow = useMemo(() => formatEmploymentWindow(initialDriver?.createdAt), [initialDriver?.createdAt]);
  const sidebarCompensationModeLabel = getCompensationModeLabel(
    compensationPreview?.effectiveModel ?? compensationSettings?.effectiveModel ?? "PERCENT"
  );
  const activeSectionIndex = Math.max(driverEditorSections.findIndex((section) => section === activeSection), 0);
  const isFirstSection = activeSectionIndex === 0;
  const isLastSection = activeSectionIndex === driverEditorSections.length - 1;

  function updateDriverField<Key extends keyof DriverFormState>(field: Key, value: DriverFormState[Key]) {
    setDriverForm((current) => ({ ...current, [field]: value }));
  }

  function goToPreviousSection() {
    if (isFirstSection) {
      return;
    }

    setActiveSection(driverEditorSections[activeSectionIndex - 1]);
  }

  function goToNextSection() {
    if (isLastSection) {
      return;
    }

    setActiveSection(driverEditorSections[activeSectionIndex + 1]);
  }

  function getExistingVehicleKey(vehicleId: string): string {
    return `existing-${vehicleId}`;
  }

  function getNewVehicleKey(index: number): string {
    return `new-${index}`;
  }

  function openVehicleEditor(key: string) {
    setExpandedVehicleKey(key);
  }

  function handleCpfChange(value: string) {
    updateDriverField("cpf", formatCpfInput(value));
  }

  function handlePhoneChange(value: string) {
    updateDriverField("phone", formatPhoneInput(value));
  }

  function handleBirthPartChange(part: "birthDay" | "birthMonth" | "birthYear", value: string) {
    const sanitized =
      part === "birthYear" ? digitsOnly(value).slice(0, 4) : part === "birthMonth" ? digitsOnly(value).slice(0, 2) : digitsOnly(value).slice(0, 2);
    updateDriverField(part, sanitized);
  }

  function updateCompensationField<Key extends keyof DriverCompensationFormState>(
    field: Key,
    value: DriverCompensationFormState[Key]
  ) {
    setCompensationForm((current) => ({ ...current, [field]: value }));
  }

  function updateDraftVehicle(
    collection: "new" | "existing",
    index: number,
    field: keyof VehicleDraft,
    value: string | boolean
  ) {
    const setter = collection === "new" ? setNewVehicles : setExistingVehicles;
    setter((current) => {
      const next = current.map((vehicle, vehicleIndex) => {
        if (vehicleIndex !== index) {
          return field === "isActive" && value === true ? { ...vehicle, isActive: false } : vehicle;
        }
        return { ...vehicle, [field]: value };
      });

      if (field === "isActive" && value === true) {
        if (collection === "new") {
          setExistingVehicles((items) => items.map((vehicle) => ({ ...vehicle, isActive: false })));
        } else {
          setNewVehicles((items) => items.map((vehicle) => ({ ...vehicle, isActive: false })));
        }
      }

      return next;
    });
  }

  function addVehicleDraft() {
    setActiveSection("contract");
    setNewVehicles((current) => {
      const nextIndex = current.length;
      const nextVehicles = [
        ...current,
        {
          ...emptyVehicleDraft,
          isActive: current.length === 0 && existingVehicles.every((vehicle) => !vehicle.isActive)
        }
      ];

      setExpandedVehicleKey(getNewVehicleKey(nextIndex));

      return nextVehicles;
    });
  }

  function removeNewVehicle(index: number) {
    const removedKey = getNewVehicleKey(index);

    setNewVehicles((current) => {
      const nextVehicles = current.filter((_, vehicleIndex) => vehicleIndex !== index);

      setExpandedVehicleKey((currentExpanded) => {
        if (currentExpanded !== removedKey) {
          return currentExpanded;
        }

        return null;
      });

      return nextVehicles;
    });
  }

  function buildDriverRequestBody() {
    const contractPayload = sanitizeContractForSave(contract);

    return {
      name: driverForm.name,
      cpf: driverForm.cpf,
      phone: driverForm.phone,
      email: driverForm.email,
      isActive: driverForm.isActive,
      password: passwordValue || undefined,
      photoUrl: driverPhotoUrl.trim() || undefined,
      birthDate: birthDateValue ?? undefined,
      gender: driverForm.gender || undefined,
      bloodType: driverForm.bloodType || undefined,
      driverType: driverForm.driverType,
      fleetAssignmentMode: driverForm.fleetAssignmentMode || undefined,
      defaultFleetVehicleId: driverForm.defaultFleetVehicleId || undefined,
      operationalStatus: driverForm.operationalStatus,
      operationalNotes: driverForm.operationalNotes,
      emergencyContacts,
      address,
      driverLicense,
      toxicology,
      complianceHistory,
      contractProfile,
      journey,
      contract: contractPayload,
      compensationModel: compensationForm.customModel,
      compensationValue: Number(compensationForm.customValue || 0),
      compensationNotes: compensationForm.customNotes
    };
  }

  async function handleCreateDriver(options?: { redirect?: boolean }) {
    const redirect = options?.redirect ?? true;
    const createdDriver = await request<DriverProfile>("/admin/drivers", {
      method: "POST",
      body: JSON.stringify(buildDriverRequestBody())
    });

    if (redirect) {
      router.push(`/drivers/${createdDriver.id}`);
      router.refresh();
    }

    return createdDriver;
  }

  async function handleUpdateDriver(options?: { showSuccessMessage?: boolean }) {
    const showSuccessMessage = options?.showSuccessMessage ?? true;
    if (!initialDriver) {
      return null;
    }

    const updatedDriver = await request<DriverProfile>(`/admin/drivers/${initialDriver.id}`, {
      method: "PATCH",
      body: JSON.stringify(buildDriverRequestBody())
    });

    setDriverForm(toDriverFormState(updatedDriver));
    setDriverPhotoUrl(updatedDriver.photoUrl ?? "");
    setDriverHasPassword(updatedDriver.hasPassword);
    setIsResettingPassword(false);
    setCompensationForm(toCompensationFormState(updatedDriver));
    setCompensationSettings(updatedDriver.compensation);
    setEmergencyContacts(updatedDriver.emergencyContacts ?? []);
    setAddress(updatedDriver.address);
    setDriverLicense(updatedDriver.driverLicense);
    setToxicology(updatedDriver.toxicology ?? emptyDriverToxicology);
    setComplianceHistory(updatedDriver.complianceHistory ?? []);
    setContractProfile(deriveContractProfile(updatedDriver));
    setJourney(updatedDriver.journey ?? emptyDriverJourney);
    setContract(updatedDriver.contract ?? emptyDriverContract);
    if (showSuccessMessage) {
      setStatusMessage(`Cadastro de ${updatedDriver.name} atualizado.`);
    }
    router.refresh();
    return updatedDriver;
  }

  async function persistDriverBeforeGenerateContract(): Promise<DriverProfile | null> {
    if (submitRequirementIssues.length > 0) {
      const firstIssue = submitRequirementIssues[0];
      setActiveSection(firstIssue.section);
      setStatusMessage(`Faltam campos obrigatorios para salvar. ${firstIssue.message}`);
      return null;
    }

    setIsSavingDriver(true);
    try {
      if (mode === "create") {
        return await handleCreateDriver({ redirect: false });
      }
      return await handleUpdateDriver({ showSuccessMessage: false });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar o cadastro.");
      return null;
    } finally {
      setIsSavingDriver(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitRequirementIssues.length > 0) {
      const firstIssue = submitRequirementIssues[0];
      setActiveSection(firstIssue.section);
      setStatusMessage(`Faltam campos obrigatorios para salvar. ${firstIssue.message}`);
      return;
    }

    setIsSavingDriver(true);

    try {
      if (mode === "create") {
        await handleCreateDriver({ redirect: true });
      } else {
        await handleUpdateDriver({ showSuccessMessage: true });
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar o cadastro.");
    } finally {
      setIsSavingDriver(false);
    }
  }

  async function handleCreateVehicle(driverId: string, draft: VehicleDraft, index: number) {
    setIsSavingVehicle(`new-${index}`);
    try {
      const updatedDriver = await request<DriverProfile>(`/admin/drivers/${driverId}/vehicles`, {
        method: "POST",
        body: JSON.stringify({
          label: draft.label,
          plate: draft.plate,
          color: draft.color || undefined,
          year: draft.year ? Number(draft.year) : undefined,
          isActive: draft.isActive
        })
      });

      setExistingVehicles(updatedDriver.vehicles.map((vehicle) => toVehicleDraft(vehicle)));
      setCompensationSettings(updatedDriver.compensation);
      setNewVehicles((current) => current.filter((_, currentIndex) => currentIndex !== index));
      setExpandedVehicleKey(null);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao adicionar veiculo.");
    } finally {
      setIsSavingVehicle(null);
    }
  }

  async function handleUpdateVehicle(driverId: string, vehicle: VehicleDraft, index: number) {
    if (!vehicle.id) {
      return;
    }

    const vehicleId = vehicle.id;

    setIsSavingVehicle(vehicleId);
    try {
      const updatedDriver = await request<DriverProfile>(`/admin/drivers/${driverId}/vehicles/${vehicleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: vehicle.label,
          plate: vehicle.plate,
          color: vehicle.color || undefined,
          year: vehicle.year ? Number(vehicle.year) : undefined,
          isActive: vehicle.isActive
        })
      });

      setExistingVehicles(updatedDriver.vehicles.map((item) => toVehicleDraft(item)));
      setCompensationSettings(updatedDriver.compensation);
      setExpandedVehicleKey(null);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar veiculo.");
      setExistingVehicles((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item } : item)));
    } finally {
      setIsSavingVehicle(null);
    }
  }

  async function handleGenerateEmploymentContract(payload?: {
    templateKey?: string;
    templateName?: string;
    templateVersion?: string;
    templateContent?: string;
  }) {
    setIsGeneratingContract(true);
    try {
      const persistedDriver = await persistDriverBeforeGenerateContract();
      if (!persistedDriver?.id) {
        return;
      }

      const selectedTemplatePayload =
        payload?.templateKey && payload.templateKey.trim().length > 0
          ? {
              templateKey: payload.templateKey.trim(),
              templateName: payload.templateName?.trim() || undefined,
              templateVersion: payload.templateVersion?.trim() || undefined,
              templateContent: payload.templateContent || undefined
            }
          : contract?.employmentTemplateKey && contract.employmentTemplateKey.trim().length > 0
          ? {
              templateKey: contract.employmentTemplateKey.trim(),
              templateName: contract.employmentTemplateName?.trim() || undefined,
              templateVersion: contract.employmentTemplateVersion?.trim() || undefined
            }
          : undefined;
      const updatedDriver = await request<DriverProfile>(
        `/admin/drivers/${persistedDriver.id}/contracts/generate`,
        {
          method: "POST",
          body: JSON.stringify(selectedTemplatePayload ?? {})
        }
      );
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);
      setStatusMessage(
        `Contrato gerado para ${updatedDriver.name}${selectedTemplatePayload?.templateKey ? ` com modelo ${selectedTemplatePayload.templateName || selectedTemplatePayload.templateKey}.` : "."}`
      );
      if (mode === "create") {
        router.push(`/drivers/${persistedDriver.id}/cadastro`);
      }
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao gerar contrato.");
    } finally {
      setIsGeneratingContract(false);
    }
  }

  async function handleRenewEmploymentContract(
    contractId: string,
    payload?: {
      templateKey?: string;
      templateName?: string;
      templateVersion?: string;
      templateContent?: string;
      contract?: Partial<DriverContract>;
      journey?: Partial<DriverJourney>;
    }
  ) {
    if (!initialDriver?.id) {
      setStatusMessage("Salve o cadastro do motorista antes de renovar contrato.");
      return;
    }

    setIsRenewingContract(true);
    try {
      const updatedDriver = await request<DriverProfile>(
        `/admin/drivers/${initialDriver.id}/contracts/${contractId}/renew`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(payload ?? {}),
            templateContent: payload?.templateContent || undefined
          })
        }
      );
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);
      setStatusMessage(`Renovacao gerada para ${updatedDriver.name}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao gerar renovacao.");
    } finally {
      setIsRenewingContract(false);
    }
  }

  async function handleActivateEmploymentContract(contractId: string) {
    if (!initialDriver?.id) {
      setStatusMessage("Salve o cadastro do motorista antes de ativar contrato.");
      return;
    }

    setIsActivatingContract(true);
    try {
      const updatedDriver = await request<DriverProfile>(
        `/admin/drivers/${initialDriver.id}/contracts/${contractId}/activate`,
        { method: "POST" }
      );
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);
      setStatusMessage(`Contrato ativado para ${updatedDriver.name}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao ativar contrato.");
    } finally {
      setIsActivatingContract(false);
    }
  }

  async function handleRequestEmploymentContractSignature(contractId: string) {
    if (!initialDriver?.id) {
      setStatusMessage("Salve o cadastro do motorista antes de solicitar assinatura.");
      return;
    }

    setIsRequestingSignature(true);
    try {
      const response = await request<DriverContractSignatureRequestResult>(
        `/admin/drivers/${initialDriver.id}/contracts/${contractId}/request-signature`,
        {
          method: "POST",
          body: JSON.stringify({
            signerEmail: driverForm.email.trim() || undefined
          })
        }
      );
      const updatedDriver = response.driver;
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);

      let copied = false;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(response.signatureUrl);
          copied = true;
        } catch {
          copied = false;
        }
      }

      setStatusMessage(
        `Solicitacao de assinatura enviada para ${response.signerEmail}. Expira em ${new Date(response.expiresAt).toLocaleString("pt-BR")}.${copied ? " Link copiado." : ` Link: ${response.signatureUrl}`}${response.emailDeliveryStatus === "SENT" ? " E-mail enviado automaticamente." : response.emailDeliveryStatus === "SKIPPED" ? ` E-mail nao enviado automaticamente: ${response.emailDeliveryMessage ?? "SMTP nao configurado."}` : ` Falha no envio automatico de e-mail: ${response.emailDeliveryMessage ?? "erro desconhecido."}`}`
      );
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao solicitar assinatura.");
    } finally {
      setIsRequestingSignature(false);
    }
  }

  async function handleTerminateEmploymentContract(
    contractId: string,
    payload: {
      mode: "CANCEL" | "FINALIZE";
      reason?: string;
    }
  ) {
    if (!initialDriver?.id) {
      setStatusMessage("Salve o cadastro do motorista antes de encerrar/cancelar contrato.");
      return;
    }

    setIsTerminatingContract(true);
    try {
      const updatedDriver = await request<DriverProfile>(
        `/admin/drivers/${initialDriver.id}/contracts/${contractId}/terminate`,
        {
          method: "POST",
          body: JSON.stringify({
            mode: payload.mode,
            reason: payload.reason
          })
        }
      );
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);
      setStatusMessage(
        payload.mode === "CANCEL"
          ? `Contrato cancelado para ${updatedDriver.name}.`
          : `Contrato encerrado para ${updatedDriver.name}.`
      );
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao encerrar/cancelar contrato.");
    } finally {
      setIsTerminatingContract(false);
    }
  }

  async function handleCreateContractEndorsement(
    contractId: string,
    payload: {
      type: DriverEmploymentContractEndorsementType;
      effectiveDate: string;
      notes?: string;
      applySettings?: boolean;
      contract?: Partial<DriverContract>;
      journey?: Partial<DriverJourney>;
    }
  ) {
    if (!initialDriver?.id) {
      setStatusMessage("Salve o cadastro do motorista antes de criar endosso.");
      return;
    }

    setIsCreatingEndorsement(true);
    try {
      const updatedDriver = await request<DriverProfile>(
        `/admin/drivers/${initialDriver.id}/contracts/${contractId}/endorse`,
        {
          method: "POST",
          body: JSON.stringify({
            type: payload.type,
            effectiveDate: payload.effectiveDate,
            notes: payload.notes,
            applySettings: payload.applySettings,
            contract: payload.contract,
            journey: payload.journey,
            changes: {
              source: "DRIVER_PROFILE_EDITOR",
              endorsementType: payload.type
            }
          })
        }
      );
      setContractProfile(deriveContractProfile(updatedDriver));
      setContract(updatedDriver.contract ?? emptyDriverContract);
      setJourney(updatedDriver.journey ?? emptyDriverJourney);
      setStatusMessage(`Endosso criado para ${updatedDriver.name}.`);
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao criar endosso.");
    } finally {
      setIsCreatingEndorsement(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide driver-editor-page-shell">
      <section className="overtime-editor-page-header driver-editor-page-header">
        <h1>{mode === "create" ? "Cadastrar motorista" : "Editar motorista"}</h1>
        <p>
          {mode === "create"
            ? "Preencha os dados do motorista e avance pelas etapas do cadastro."
            : "Atualize os dados do motorista e mantenha o cadastro padronizado."}
        </p>
      </section>
      <section className={`driver-editor-shell ${mode === "create" ? "is-create" : "is-edit"}`}>
        <div className="driver-editor-main">
          {mode === "edit" ? (
            <section className="driver-editor-hero">
              <DriverProfileEditorHero
                mode={mode}
                initialDriverName={initialDriver?.name}
                photoUrl={driverPhotoUrl}
                cnhCategoryLabel={cnhCategoryLabel}
                ageLabel={ageLabel}
                contractPhaseLabel={contractPhaseLabel}
                employmentTenureLabel={employmentWindow.tenureLabel}
                employmentSinceLabel={employmentWindow.sinceLabel}
              />
            </section>
          ) : null}

          <div className="driver-editor-workspace">
            <DriverProfileEditorStepNav activeSection={activeSection} onSectionChange={setActiveSection} />

            <form className="driver-editor-form" onSubmit={handleSubmit}>
              {statusMessage ? (
                <p className="driver-editor-status-message" role="status" aria-live="polite">
                  {statusMessage}
                </p>
              ) : null}
              <div className="driver-editor-content">
                <div className="driver-editor-sections">
                  <DriverProfileEditorPersonalSection
                  activeSection={activeSection}
                  mode={mode}
                  name={driverForm.name}
                  cpf={driverForm.cpf}
                  birthDay={driverForm.birthDay}
                  birthMonth={driverForm.birthMonth}
                  birthYear={driverForm.birthYear}
                  gender={driverForm.gender}
                  bloodType={driverForm.bloodType}
                  isActive={driverForm.isActive}
                  operationalStatus={driverForm.operationalStatus}
                  appAccessLabel={appAccessLabel}
                  photoUrl={driverPhotoUrl}
                  address={address}
                  driverHasPassword={driverHasPassword}
                  isCreateMode={isCreateMode}
                  isResettingPassword={isResettingPassword}
                  shouldShowPasswordFields={shouldShowPasswordFields}
                  password={driverForm.password}
                  confirmPassword={driverForm.confirmPassword}
                  passwordIsValid={passwordIsValid}
                  passwordFieldsTouched={passwordFieldsTouched}
                  monthOptions={monthOptions}
                  genderOptions={genderOptions}
                  onNameChange={(value) => updateDriverField("name", value)}
                  onCpfChange={handleCpfChange}
                  onBirthPartChange={handleBirthPartChange}
                  onBirthMonthChange={(value) => updateDriverField("birthMonth", value)}
                  onGenderChange={(value) => updateDriverField("gender", value as DriverFormState["gender"])}
                  onBloodTypeChange={(value) => updateDriverField("bloodType", value)}
                  onActiveChange={(value) => updateDriverField("isActive", value)}
                  onPhotoUrlChange={setDriverPhotoUrl}
                  onAddressChange={setAddress}
                  onOperationalStatusChange={(value) => updateDriverField("operationalStatus", value)}
                  onResetPasswordStart={() => setIsResettingPassword(true)}
                  onPasswordChange={(value) => updateDriverField("password", value)}
                  onConfirmPasswordChange={(value) => updateDriverField("confirmPassword", value)}
                />

                  <DriverProfileEditorContactSection
                    activeSection={activeSection}
                    phone={driverForm.phone}
                    email={driverForm.email}
                    emergencyContacts={emergencyContacts}
                    minimumEmergencyContacts={minimumEmergencyContactsRequired}
                    onPhoneChange={handlePhoneChange}
                    onEmailChange={(value) => updateDriverField("email", value)}
                    onEmergencyContactsChange={setEmergencyContacts}
                  />

                  <DriverProfileEditorComplianceSection
                    activeSection={activeSection}
                    driverLicense={driverLicense}
                    toxicology={toxicology}
                    complianceHistory={complianceHistory}
                    onDriverLicenseChange={(value) => {
                      setDriverLicense(value);
                      setComplianceHistory((current) => [
                        {
                          id: `cnh-${Date.now()}`,
                          title: value ? "CNH atualizada" : "CNH removida",
                          meta: "Cadastro atualizado",
                          detail: value
                            ? `CNH ${value.number || "sem numero"} salva no cadastro do motorista.`
                            : "Dados de CNH removidos do cadastro.",
                          createdAt: new Date().toISOString()
                        },
                        ...current
                      ]);
                    }}
                    onToxicologyChange={(value) => {
                      setToxicology(value);
                      setComplianceHistory((current) => [
                        {
                          id: `tox-${Date.now()}`,
                          title: "Conformidade atualizada",
                          meta: "Cadastro atualizado",
                          detail: `${buildToxicologyHistorySummary(value)} ${buildPsychotechnicalHistorySummary(value)}`,
                          createdAt: new Date().toISOString()
                        },
                        ...current
                      ]);
                    }}
                  />

                  <DriverProfileEditorAccessibilitySection
                    activeSection={activeSection}
                    accessibility={journey?.accessibility}
                    onAccessibilityChange={(value) =>
                      setJourney((current) => ({
                        ...(current ?? emptyDriverJourney),
                        accessibility: value
                      }))
                    }
                  />

                  <DriverProfileEditorOperationSection
                  activeSection={activeSection}
                  driverType={driverForm.driverType}
                  contractProfile={contractProfile}
                  journey={journey}
                  contract={contract}
                  onOpenContractsSection={() => setActiveSection("contracts")}
                  isGeneratingContract={isGeneratingContract}
                  isRequestingSignature={isRequestingSignature}
                  isActivatingContract={isActivatingContract}
                  isTerminatingContract={isTerminatingContract}
                  onGenerateContract={(payload) => handleGenerateEmploymentContract(payload)}
                  onRequestSignature={(contractId) => handleRequestEmploymentContractSignature(contractId)}
                  onActivateContract={(contractId) => handleActivateEmploymentContract(contractId)}
                  onCancelContract={(contractId, mode) =>
                    handleTerminateEmploymentContract(contractId, { mode })
                  }
                  onContractProfileChange={setContractProfile}
                  onJourneyChange={setJourney}
                  onContractChange={setContract}
                  effectiveCompensationLabel={effectiveCompensationLabel}
                  customModel={compensationForm.customModel}
                  customValue={compensationForm.customValue}
                  customNotes={compensationForm.customNotes}
                  onCustomModelChange={(value) => updateCompensationField("customModel", value)}
                  onCustomValueChange={(value) => updateCompensationField("customValue", value)}
                  onCustomNotesChange={(value) => updateCompensationField("customNotes", value)}
                />

                  <DriverProfileEditorContractsSection
                    activeSection={activeSection}
                    mode={mode}
                    driverId={initialDriver?.id}
                    driverName={driverForm.name}
                    driverEmail={driverForm.email}
                    address={address}
                    contractProfile={contractProfile}
                    contract={contract}
                    journey={journey}
                    onContractChange={setContract}
                    isGeneratingContract={isGeneratingContract}
                    isRenewingContract={isRenewingContract}
                    isActivatingContract={isActivatingContract}
                    isRequestingSignature={isRequestingSignature}
                    isTerminatingContract={isTerminatingContract}
                    isCreatingEndorsement={isCreatingEndorsement}
                    onGenerateContract={handleGenerateEmploymentContract}
                    onRenewContract={handleRenewEmploymentContract}
                    onActivateContract={handleActivateEmploymentContract}
                    onRequestSignature={handleRequestEmploymentContractSignature}
                    onTerminateContract={handleTerminateEmploymentContract}
                    onCreateEndorsement={handleCreateContractEndorsement}
                  />
                </div>
                <div className="driver-editor-form-footer">
                  {!isSavingDriver && submitRequirementIssues.length > 0 ? (
                    <div className="driver-editor-submit-pending">
                      <strong>Falta preencher para salvar:</strong>
                      <ul>
                        {submitRequirementIssues.map((issue) => (
                          <li key={`${issue.section}-${issue.message}`}>{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="driver-editor-form-actions">
                    <div className="driver-editor-form-nav-actions">
                      <button
                        type="button"
                        className="secondary driver-editor-nav-button"
                        onClick={goToPreviousSection}
                        disabled={isFirstSection}
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="secondary driver-editor-nav-button"
                        onClick={goToNextSection}
                        disabled={isLastSection}
                      >
                        Proximo
                      </button>
                    </div>

                    <button type="submit" className="driver-editor-submit-button" disabled={!canSubmit}>
                      {isSavingDriver ? "Salvando..." : mode === "create" ? "Salvar motorista" : "Salvar alteracoes"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
