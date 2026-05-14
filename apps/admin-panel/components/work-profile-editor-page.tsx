"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Benefit,
  CargoOption,
  CompanyProfileConfig,
  HolidayScopeType,
  WorkProfileBaseRemunerationType,
  BenefitDiscountBase,
  BenefitDiscountMode,
  OvertimeTemplate,
  WorkProfile,
  WorkProfileCommissionType,
  WorkProfileContractType,
  WorkProfileRemunerationModel,
  formatCurrency,
  request
} from "../lib/api";
import { loadDocumentTemplates } from "../lib/document-templates";
import {
  WorkJourneyTemplate,
  DAY_OPTIONS,
  DayOfWeek,
  formatDayList,
  resolveScaleTypeLabel,
  summarizeWorkJourney
} from "../lib/work-journeys";
import {
  buildEmploymentLinkageOptions,
  DEFAULT_EMPLOYMENT_LINKAGES,
  EmploymentLinkageOption,
  getEmploymentLinkageCapabilities,
  resolveEmploymentLinkageTitle
} from "../lib/employment-linkages";
import { DriverProfileEditorModal } from "./driver-profile-editor-modal";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  profileId?: string;
};

type ProfileWizardStep =
  | "STRUCTURE"
  | "REMUNERATION"
  | "POLICIES"
  | "BENEFITS"
  | "CONTRACT_RULES"
  | "REVIEW";

type EngagementType = "ON_DEMAND" | "BY_SCALE" | "FREE";
type LinkedBenefitPayer = "COMPANY" | "EMPLOYEE" | "SHARED";

type ProfileWizardStepDefinition = {
  key: ProfileWizardStep;
  index: string;
  title: string;
  description: string;
};

type ContractTemplateOption = {
  key: string;
  name: string;
  version: string;
  content: string;
};

type FormState = {
  description: string;
  isActive: boolean;
  cargoId: string;
  cargoName: string;
  cargoLevel: string;
  contractType: WorkProfileContractType;
  engagementType: EngagementType;
  availabilityDays: DayOfWeek[];
  availabilityStartTime: string;
  availabilityEndTime: string;
  journeyTemplateId: string;
  remunerationModel: WorkProfileRemunerationModel;
  baseRemunerationType: WorkProfileBaseRemunerationType;
  hasVariableCompensation: boolean;
  fixedSalary: string;
  commissionType: WorkProfileCommissionType;
  commissionValue: string;
  commissionRule: string;
  contractTemplateKey: string;
  contractTemplateName: string;
  contractTemplateVersion: string;
  usesOvertime: boolean;
  overtimeTemplateId: string;
  usesNightPolicy: boolean;
  nightTemplateId: string;
  holidayScopeType: "" | HolidayScopeType;
  holidayStateCode: string;
  holidayCityCode: string;
  linkedBenefits: LinkedBenefitConfig[];
  allowContractEditing: boolean;
  allowJourneyCustomization: boolean;
  allowBenefitsCustomization: boolean;
};

type LinkedBenefitConfig = {
  benefitId: string;
  benefitName: string;
  payer: LinkedBenefitPayer;
  deductFromSalary: boolean;
  integratePayroll: boolean;
  referenceValue: string;
  percentageValue: string;
  discountMode: BenefitDiscountMode;
  discountValue: string;
  discountBase: BenefitDiscountBase;
  discountLimit: string;
  notes: string;
  mandatoryInContract: boolean;
  editableInContract: boolean;
  originalSummary: string;
};

type ResolvedLinkedBenefit = {
  config: LinkedBenefitConfig;
  benefit?: Benefit;
};

type FormField =
  | "cargoName"
  | "cargoLevel"
  | "contractType"
  | "engagementType"
  | "availabilityWindow"
  | "journeyTemplateId"
  | "remunerationModel"
  | "baseRemunerationType"
  | "hasVariableCompensation"
  | "fixedSalary"
  | "commissionValue"
  | "commissionRule"
  | "contractTemplateKey"
  | "overtimeTemplateId"
  | "nightTemplateId"
  | "holidayScopeType"
  | "holidayStateCode"
  | "holidayCityCode"
  | "linkedBenefits";

type FormFieldErrors = Partial<Record<FormField, string>>;

const defaultForm: FormState = {
  description: "",
  isActive: true,
  cargoId: "",
  cargoName: "",
  cargoLevel: "",
  contractType: "CLT",
  engagementType: "ON_DEMAND",
  availabilityDays: [],
  availabilityStartTime: "",
  availabilityEndTime: "",
  journeyTemplateId: "",
  remunerationModel: "FIXED",
  baseRemunerationType: "HOUR",
  hasVariableCompensation: false,
  fixedSalary: "",
  commissionType: "PERCENT",
  commissionValue: "",
  commissionRule: "",
  contractTemplateKey: "",
  contractTemplateName: "",
  contractTemplateVersion: "",
  usesOvertime: true,
  overtimeTemplateId: "",
  usesNightPolicy: false,
  nightTemplateId: "",
  holidayScopeType: "",
  holidayStateCode: "",
  holidayCityCode: "",
  linkedBenefits: [],
  allowContractEditing: true,
  allowJourneyCustomization: true,
  allowBenefitsCustomization: true
};

const defaultContractTypeOptions: EmploymentLinkageOption[] =
  buildEmploymentLinkageOptions(DEFAULT_EMPLOYMENT_LINKAGES);
const validContractTypes = new Set<WorkProfileContractType>(
  defaultContractTypeOptions.map((item) => item.value)
);

const initialTouchedFields: Record<FormField, boolean> = {
  cargoName: false,
  cargoLevel: false,
  contractType: false,
  engagementType: false,
  availabilityWindow: false,
  journeyTemplateId: false,
  remunerationModel: false,
  baseRemunerationType: false,
  hasVariableCompensation: false,
  fixedSalary: false,
  commissionValue: false,
  commissionRule: false,
  contractTemplateKey: false,
  overtimeTemplateId: false,
  nightTemplateId: false,
  holidayScopeType: false,
  holidayStateCode: false,
  holidayCityCode: false,
  linkedBenefits: false
};

const profileWizardSteps: ProfileWizardStepDefinition[] = [
  {
    key: "STRUCTURE",
    index: "01",
    title: "Cargo e Vínculo",
    description: "Defina a funcao e o tipo de contratacao"
  },
  {
    key: "REMUNERATION",
    index: "02",
    title: "Salário e Pagamento",
    description: "Configure o ganho fixo e comissoes"
  },
  {
    key: "POLICIES",
    index: "03",
    title: "Politicas",
    description: "Hora extra e adicionais por regime"
  },
  {
    key: "BENEFITS",
    index: "04",
    title: "Beneficios",
    description: "Selecione e configure beneficios por vinculo"
  },
  {
    key: "CONTRACT_RULES",
    index: "05",
    title: "Regras contratuais",
    description: "Permissoes de customizacao no contrato"
  },
  {
    key: "REVIEW",
    index: "06",
    title: "Modelo de contrato",
    description: "Selecione o modelo para geracao de contratos"
  }
];

export function WorkProfileEditorPage({ mode, profileId }: Props) {
  const router = useRouter();
  const isReadOnly = mode === "view";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [cargoItems, setCargoItems] = useState<CargoOption[]>([]);
  const [journeys, setJourneys] = useState<WorkJourneyTemplate[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [overtimeTemplates, setOvertimeTemplates] = useState<OvertimeTemplate[]>([]);
  const [nightTemplates, setNightTemplates] = useState<OvertimeTemplate[]>([]);
  const [contractTypeOptions, setContractTypeOptions] = useState<EmploymentLinkageOption[]>(
    defaultContractTypeOptions
  );
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    mode === "create" ? null : "Carregando perfil."
  );
  const [dependenciesErrorMessage, setDependenciesErrorMessage] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touchedFields, setTouchedFields] =
    useState<Record<FormField, boolean>>(initialTouchedFields);
  const [isBenefitsPickerOpen, setIsBenefitsPickerOpen] = useState(false);
  const [benefitSearch, setBenefitSearch] = useState("");
  const [pendingBenefitIds, setPendingBenefitIds] = useState<string[]>([]);
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ProfileWizardStep>("STRUCTURE");
  const [laborJourneyQuery, setLaborJourneyQuery] = useState("");
  const [optionalJourneyQuery, setOptionalJourneyQuery] = useState("");
  const [showLaborJourneyResults, setShowLaborJourneyResults] = useState(false);
  const [showOptionalJourneyResults, setShowOptionalJourneyResults] = useState(false);
  const activeContractTypeOptions = useMemo(
    () => contractTypeOptions.filter((item) => item.isActive),
    [contractTypeOptions]
  );

  useEffect(() => {
    void Promise.all([
      request<WorkJourneyTemplate[]>("/admin/work-journeys?onlyActive=true"),
      request<CargoOption[]>("/admin/cargos/options?limit=2000"),
      request<Benefit[]>("/admin/benefits"),
      request<OvertimeTemplate[]>("/admin/overtime-templates?category=OVERTIME"),
      request<OvertimeTemplate[]>("/admin/overtime-templates?category=NIGHT"),
      request<CompanyProfileConfig>("/admin/company-profile")
    ])
      .then(([journeyData, cargoData, benefitData, overtimeData, nightData, companyProfile]) => {
        setJourneys(journeyData);
        setCargoItems(cargoData);
        setBenefits(benefitData.filter((item) => item.isActive));
        setOvertimeTemplates(overtimeData.filter((item) => item.isActive));
        setNightTemplates(nightData.filter((item) => item.isActive));
        setContractTypeOptions(buildEmploymentLinkageOptions(companyProfile.employmentLinkages));
        setDependenciesErrorMessage(null);
      })
      .catch((error) => {
        setJourneys([]);
        setCargoItems([]);
        setBenefits([]);
        setOvertimeTemplates([]);
        setNightTemplates([]);
        setContractTypeOptions(defaultContractTypeOptions);
        setDependenciesErrorMessage(
          error instanceof Error
            ? `Falha ao carregar dados auxiliares do perfil: ${error.message}`
            : "Falha ao carregar dados auxiliares do perfil."
        );
      });
  }, []);

  useEffect(() => {
    if (mode === "create" || !profileId) {
      setLaborJourneyQuery("");
      setOptionalJourneyQuery("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void request<WorkProfile>(`/admin/work-profiles/${profileId}`)
      .then((profile) => {
        setForm(mapProfileToForm(profile));
        const selectedJourneyName = profile.journeyTemplateName?.trim() ?? "";
        setLaborJourneyQuery(selectedJourneyName);
        setOptionalJourneyQuery(selectedJourneyName);
        setStatusMessage(null);
      })
      .catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar perfil.");
      })
      .finally(() => setIsLoading(false));
  }, [mode, profileId]);

  useEffect(() => {
    const capabilities = getEmploymentLinkageCapabilities(form.contractType);
    if (capabilities.allowsOvertimePolicy || !form.usesOvertime) {
      return;
    }
    setForm((current) => ({
      ...current,
      usesOvertime: false,
      overtimeTemplateId: ""
    }));
  }, [form.contractType, form.usesOvertime]);

  useEffect(() => {
    const capabilities = getEmploymentLinkageCapabilities(form.contractType);
    if (capabilities.isLaborRegime || !form.usesNightPolicy) {
      return;
    }
    setForm((current) => ({
      ...current,
      usesNightPolicy: false,
      nightTemplateId: ""
    }));
  }, [form.contractType, form.usesNightPolicy]);

  useEffect(() => {
    const capabilities = getEmploymentLinkageCapabilities(form.contractType);
    if (capabilities.isLaborRegime) {
      return;
    }
    if (
      !form.holidayScopeType &&
      !form.holidayStateCode.trim() &&
      !form.holidayCityCode.trim()
    ) {
      return;
    }
    setForm((current) => ({
      ...current,
      holidayScopeType: "",
      holidayStateCode: "",
      holidayCityCode: ""
    }));
  }, [
    form.contractType,
    form.holidayScopeType,
    form.holidayStateCode,
    form.holidayCityCode
  ]);

  useEffect(() => {
    const capabilities = getEmploymentLinkageCapabilities(form.contractType);
    if (!capabilities.usesIntermittentRemunerationFlow) {
      return;
    }
    const nextModel: WorkProfileRemunerationModel = form.hasVariableCompensation
      ? "FIXED_PLUS_COMMISSION"
      : "FIXED";
    if (form.remunerationModel === nextModel) {
      return;
    }
    setForm((current) => ({
      ...current,
      remunerationModel: nextModel
    }));
  }, [form.contractType, form.hasVariableCompensation, form.remunerationModel]);

  useEffect(() => {
    const selected = contractTypeOptions.find((item) => item.value === form.contractType);
    if (selected?.isActive) {
      return;
    }
    const fallback = activeContractTypeOptions[0];
    if (!fallback || fallback.value === form.contractType) {
      return;
    }
    setForm((current) => ({
      ...current,
      contractType: fallback.value
    }));
  }, [contractTypeOptions, activeContractTypeOptions, form.contractType]);

  const journeyOptions = useMemo(() => {
    const selectedJourney = journeys.find((item) => item.id === form.journeyTemplateId);
    if (selectedJourney || form.journeyTemplateId.length === 0) {
      return journeys;
    }
    return [
      ...journeys,
      {
        id: form.journeyTemplateId,
        name: "Jornada selecionada",
        isActive: true,
        type: "FIXED",
        allowedDays: [],
        breakType: "NONE",
        maxHoursPerDay: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as WorkJourneyTemplate
    ];
  }, [journeys, form.journeyTemplateId]);
  const cargoOptions = useMemo(() => {
    const options = cargoItems.map((item) => ({
      id: item.id,
      name: item.name
    }));
    if (
      form.cargoId.trim().length > 0 &&
      form.cargoName.trim().length > 0 &&
      !options.some((item) => item.id === form.cargoId)
    ) {
      options.push({
        id: form.cargoId,
        name: form.cargoName.trim()
      });
    }
    return options.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [cargoItems, form.cargoId, form.cargoName]);
  const selectedCargo = useMemo(
    () => cargoItems.find((item) => item.id === form.cargoId),
    [cargoItems, form.cargoId]
  );
  const cargoLevelOptions = useMemo(() => {
    if (selectedCargo) {
      return selectedCargo.levels;
    }
    if (!form.cargoName.trim()) {
      return [];
    }
    const normalizedName = form.cargoName.trim().toLowerCase();
    const fallbackCargo = cargoItems.find(
      (item) => item.name.trim().toLowerCase() === normalizedName
    );
    return fallbackCargo?.levels ?? [];
  }, [cargoItems, form.cargoName, selectedCargo]);

  const selectedJourney = useMemo(
    () => journeyOptions.find((item) => item.id === form.journeyTemplateId),
    [journeyOptions, form.journeyTemplateId]
  );
  const selectedJourneySummary = useMemo(() => {
    if (!selectedJourney) return "";
    return summarizeWorkJourney(selectedJourney).slice(0, 3).join(" | ");
  }, [selectedJourney]);
  const selectedJourneyPreview = useMemo(
    () => buildJourneyPreview(selectedJourney),
    [selectedJourney]
  );
  const contractCapabilities = useMemo(
    () => getEmploymentLinkageCapabilities(form.contractType),
    [form.contractType]
  );
  const isLaborContract = useMemo(
    () => contractCapabilities.isLaborRegime,
    [contractCapabilities]
  );
  const allowsOvertimePolicy = useMemo(
    () => contractCapabilities.allowsOvertimePolicy,
    [contractCapabilities]
  );
  const usesIntermittentRemunerationFlow = useMemo(
    () => contractCapabilities.usesIntermittentRemunerationFlow,
    [contractCapabilities]
  );

  const selectedOvertime = useMemo(
    () => overtimeTemplates.find((item) => item.id === form.overtimeTemplateId),
    [overtimeTemplates, form.overtimeTemplateId]
  );
  const selectedNight = useMemo(
    () => nightTemplates.find((item) => item.id === form.nightTemplateId),
    [nightTemplates, form.nightTemplateId]
  );
  const contractTemplateOptions = useMemo<ContractTemplateOption[]>(() => {
    return loadDocumentTemplates()
      .filter((item) => item.scope === "DRIVER_EMPLOYMENT" && item.status === "PUBLISHED")
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
      .map((item) => ({
        key: item.key,
        name: item.name,
        version: item.version,
        content: item.content
      }));
  }, []);
  const selectedContractTemplate = useMemo(
    () => contractTemplateOptions.find((item) => item.key === form.contractTemplateKey),
    [contractTemplateOptions, form.contractTemplateKey]
  );
  const benefitsById = useMemo(
    () => new Map(benefits.map((item) => [item.id, item])),
    [benefits]
  );
  const linkedBenefits = useMemo<ResolvedLinkedBenefit[]>(
    () =>
      form.linkedBenefits.map((config) => ({
        config,
        benefit: benefitsById.get(config.benefitId)
      })),
    [form.linkedBenefits, benefitsById]
  );
  const selectedBenefitsPreview = useMemo(
    () => buildBenefitsPreview(form.linkedBenefits),
    [form.linkedBenefits]
  );
  const selectedOvertimePreview = useMemo(
    () => buildOvertimePreview(selectedOvertime),
    [selectedOvertime]
  );
  const selectedNightPreview = useMemo(
    () => buildOvertimePreview(selectedNight),
    [selectedNight]
  );
  const filteredBenefits = useMemo(() => {
    const query = benefitSearch.trim().toLowerCase();
    if (!query) {
      return benefits;
    }
    return benefits.filter((item) => {
      const summary = item.summary?.toLowerCase() ?? "";
      const description = item.description?.toLowerCase() ?? "";
      return (
        item.name.toLowerCase().includes(query) ||
        summary.includes(query) ||
        description.includes(query)
      );
    });
  }, [benefits, benefitSearch]);
  const editingBenefit = useMemo(
    () => linkedBenefits.find((item) => item.config.benefitId === editingBenefitId),
    [linkedBenefits, editingBenefitId]
  );
  const laborJourneyResults = useMemo(() => {
    const query = laborJourneyQuery.trim().toLowerCase();
    return journeyOptions
      .filter((journey) => {
        if (!query) return true;
        const details = buildJourneyOptionDetails(journey).toLowerCase();
        return journey.name.toLowerCase().includes(query) || details.includes(query);
      })
      .slice(0, 20);
  }, [journeyOptions, laborJourneyQuery]);
  const optionalJourneyResults = useMemo(() => {
    const query = optionalJourneyQuery.trim().toLowerCase();
    return journeyOptions
      .filter((journey) => {
        if (!query) return true;
        const details = buildJourneyOptionDetails(journey).toLowerCase();
        return journey.name.toLowerCase().includes(query) || details.includes(query);
      })
      .slice(0, 20);
  }, [journeyOptions, optionalJourneyQuery]);

  useEffect(() => {
    if (!form.cargoId.trim()) {
      if (form.cargoLevel.trim().length > 0) {
        setForm((current) => ({ ...current, cargoLevel: "" }));
      }
      return;
    }

    if (cargoLevelOptions.length === 0) {
      return;
    }

    const hasSelectedLevel = cargoLevelOptions.some(
      (item) => item.toLowerCase() === form.cargoLevel.trim().toLowerCase()
    );
    if (!hasSelectedLevel) {
      setForm((current) => ({ ...current, cargoLevel: cargoLevelOptions[0] }));
    }
  }, [form.cargoId, form.cargoLevel, cargoLevelOptions]);

  useEffect(() => {
    if (form.cargoId.trim()) {
      const cargo = cargoItems.find((item) => item.id === form.cargoId);
      if (cargo && cargo.name !== form.cargoName) {
        setForm((current) => ({ ...current, cargoName: cargo.name }));
      }
      return;
    }

    if (!form.cargoName.trim() || cargoItems.length === 0) {
      return;
    }
    const normalizedName = form.cargoName.trim().toLowerCase();
    const matched = cargoItems.find((item) => item.name.trim().toLowerCase() === normalizedName);
    if (matched) {
      setForm((current) => ({
        ...current,
        cargoId: matched.id,
        cargoName: matched.name
      }));
    }
  }, [cargoItems, form.cargoId, form.cargoName]);

  const fieldErrors = useMemo(
    () =>
      validateFieldErrors(form, {
        cargos: cargoItems,
        cargoLevelOptions,
        journeyOptions,
        overtimeTemplates,
        nightTemplates,
        contractTemplateOptions,
        contractTypeOptions: activeContractTypeOptions,
        isLaborContract,
        allowsOvertimePolicy
      }),
    [
      form,
      cargoItems,
      cargoLevelOptions,
      journeyOptions,
      overtimeTemplates,
      nightTemplates,
      contractTemplateOptions,
      activeContractTypeOptions,
      isLaborContract,
      allowsOvertimePolicy
    ]
  );
  const validationErrors = useMemo(() => {
    return (Object.values(fieldErrors).filter(Boolean) as string[]) ?? [];
  }, [fieldErrors]);
  const canSave = useMemo(
    () => !isReadOnly && !isLoading && !isSaving && validationErrors.length === 0,
    [isReadOnly, isLoading, isSaving, validationErrors.length]
  );
  const summary = useMemo(
    () =>
      buildSummary({
        form,
        isLaborContract,
        allowsOvertimePolicy,
        selectedJourney,
        selectedOvertime,
        selectedNight,
        selectedContractTemplate
      }),
    [
      form,
      isLaborContract,
      allowsOvertimePolicy,
      selectedJourney,
      selectedOvertime,
      selectedNight,
      selectedContractTemplate
    ]
  );
  const activeStepIndex = useMemo(
    () => Math.max(profileWizardSteps.findIndex((step) => step.key === activeStep), 0),
    [activeStep]
  );
  const progress = Math.round(((activeStepIndex + 1) / profileWizardSteps.length) * 100);
  const stepErrors = useMemo<Record<ProfileWizardStep, string[]>>(() => {
    function unique(messages: Array<string | undefined>): string[] {
      return [...new Set(messages.filter((message): message is string => Boolean(message?.trim().length)))];
    }

    return {
      STRUCTURE: unique([
        fieldErrors.cargoName,
        fieldErrors.cargoLevel,
        fieldErrors.contractType,
        fieldErrors.engagementType,
        fieldErrors.availabilityWindow,
        fieldErrors.journeyTemplateId
      ]),
      REMUNERATION: unique([
        fieldErrors.remunerationModel,
        fieldErrors.baseRemunerationType,
        fieldErrors.hasVariableCompensation,
        fieldErrors.fixedSalary,
        fieldErrors.commissionValue,
        fieldErrors.commissionRule
      ]),
      POLICIES: unique([
        fieldErrors.overtimeTemplateId,
        fieldErrors.nightTemplateId,
        fieldErrors.holidayScopeType,
        fieldErrors.holidayStateCode,
        fieldErrors.holidayCityCode
      ]),
      BENEFITS: unique([fieldErrors.linkedBenefits]),
      CONTRACT_RULES: [],
      REVIEW: unique([fieldErrors.contractTemplateKey])
    };
  }, [fieldErrors]);
  const currentStepErrors = stepErrors[activeStep] ?? [];

  function update<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAvailabilityDay(day: DayOfWeek) {
    setForm((current) => {
      const nextDays = current.availabilityDays.includes(day)
        ? current.availabilityDays.filter((item) => item !== day)
        : [...current.availabilityDays, day];
      return { ...current, availabilityDays: nextDays };
    });
  }

  function markFieldAsTouched(field: FormField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function shouldShowFieldError(field: FormField): boolean {
    return Boolean(fieldErrors[field]) && (submitAttempted || touchedFields[field]);
  }

  function canNavigateToStep(targetStep: ProfileWizardStep): boolean {
    if (isReadOnly) return true;
    const targetIndex = profileWizardSteps.findIndex((step) => step.key === targetStep);
    if (targetIndex <= 0) return true;
    for (let index = 0; index < targetIndex; index += 1) {
      const stepKey = profileWizardSteps[index].key;
      if ((stepErrors[stepKey] ?? []).length > 0) {
        return false;
      }
    }
    return true;
  }

  function goToStep(nextStep: ProfileWizardStep) {
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
    setActiveStep(profileWizardSteps[previousIndex].key);
  }

  function goToNextStep() {
    const nextIndex = activeStepIndex + 1;
    if (nextIndex >= profileWizardSteps.length) return;

    setSubmitAttempted(true);
    if (!isReadOnly && currentStepErrors.length > 0) {
      setStatusMessage(currentStepErrors[0]);
      return;
    }
    setStatusMessage(null);
    setActiveStep(profileWizardSteps[nextIndex].key);
  }

  function openBenefitsPicker() {
    setPendingBenefitIds(form.linkedBenefits.map((item) => item.benefitId));
    setBenefitSearch("");
    setIsBenefitsPickerOpen(true);
  }

  function closeBenefitsPicker() {
    setIsBenefitsPickerOpen(false);
    setBenefitSearch("");
    setPendingBenefitIds([]);
  }

  function togglePendingBenefit(benefitId: string) {
    setPendingBenefitIds((current) =>
      current.includes(benefitId)
        ? current.filter((item) => item !== benefitId)
        : [...current, benefitId]
    );
  }

  function applySelectedBenefits() {
    setForm((current) => {
      const existingMap = new Map(current.linkedBenefits.map((item) => [item.benefitId, item]));
      const nextLinkedBenefits = pendingBenefitIds.map((benefitId) => {
        const existing = existingMap.get(benefitId);
        if (existing) {
          return existing;
        }
        const benefit = benefitsById.get(benefitId);
        return createLinkedBenefitConfig(benefit);
      });
      return {
        ...current,
        linkedBenefits: nextLinkedBenefits
      };
    });
    closeBenefitsPicker();
  }

  function removeLinkedBenefit(benefitId: string) {
    setForm((current) => ({
      ...current,
      linkedBenefits: current.linkedBenefits.filter((item) => item.benefitId !== benefitId)
    }));
    if (editingBenefitId === benefitId) {
      setEditingBenefitId(null);
    }
  }

  function updateLinkedBenefit(
    benefitId: string,
    patch: Partial<Omit<LinkedBenefitConfig, "benefitId" | "benefitName">>
  ) {
    setForm((current) => ({
      ...current,
      linkedBenefits: current.linkedBenefits.map((item) =>
        item.benefitId === benefitId ? { ...item, ...patch } : item
      )
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setTouchedFields({
      cargoName: true,
      cargoLevel: true,
      contractType: true,
      engagementType: true,
      availabilityWindow: true,
      journeyTemplateId: true,
      remunerationModel: true,
      baseRemunerationType: true,
      hasVariableCompensation: true,
      fixedSalary: true,
      commissionValue: true,
      commissionRule: true,
      contractTemplateKey: true,
      overtimeTemplateId: true,
      nightTemplateId: true,
      holidayScopeType: true,
      holidayStateCode: true,
      holidayCityCode: true,
      linkedBenefits: true
    });

    if (!canSave || isReadOnly) {
      if (validationErrors.length > 0) {
        setStatusMessage(validationErrors[0]);
      }
      return;
    }

    setIsSaving(true);
    setStatusMessage("Salvando perfil de trabalho...");

    try {
      const payload = buildPayload({
        form,
        isLaborContract,
        allowsOvertimePolicy,
        usesIntermittentRemunerationFlow,
        selectedJourney,
        selectedJourneySummary,
        selectedOvertime,
        selectedNight,
        selectedContractTemplate
      });

      if (mode === "edit" && profileId) {
        await request(`/admin/work-profiles/${profileId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await request("/admin/work-profiles", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      router.push("/administrative/work-profiles");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao salvar perfil.");
      setIsSaving(false);
    }
  }

  const disabled = isReadOnly || isLoading || isSaving;
  const navigationDisabled = isLoading || isSaving;
  const showErrors = submitAttempted && validationErrors.length > 0;
  const pageTitle =
    mode === "create"
      ? "Cadastrar perfil de trabalho"
      : mode === "edit"
        ? "Editar perfil de trabalho"
        : "Visualizar perfil de trabalho";
  const pageSubtitle =
    "Configure um template inteligente de perfil para contrato, ponto e financeiro.";
  const primaryActionLabel =
    isSaving ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Salvar perfil";

  return (
    <main className="page-shell page-shell-wide overtime-editor-page-shell work-profile-editor-page-shell">
      <header className="overtime-editor-page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </header>

      {statusMessage ? <p className="overtime-editor-status-message">{statusMessage}</p> : null}
      {dependenciesErrorMessage ? (
        <p
          className="overtime-editor-status-message"
          role="alert"
          style={{
            border: "1px solid rgba(219, 67, 103, 0.28)",
            background: "rgba(255, 246, 249, 0.88)",
            color: "#a13a49"
          }}
        >
          {dependenciesErrorMessage}
        </p>
      ) : null}

      <div className="driver-editor-workspace">
        <aside className="driver-editor-stepbar" aria-label="Etapas do cadastro do perfil de trabalho">
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
            {profileWizardSteps.map((step, index) => {
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
          <article className="panel panel-wide overtime-editor-card">
            <form className="stack overtime-editor-form" onSubmit={(event) => void onSubmit(event)}>
              {/* <div className="driver-editor-form-step-meta">
                <span className="driver-editor-form-step-badge">
                  {profileWizardSteps[activeStepIndex]?.index ?? "01"}
                </span>
                <strong>{profileWizardSteps[activeStepIndex]?.title ?? "Etapa"}</strong>
                <small>{profileWizardSteps[activeStepIndex]?.description ?? ""}</small>
              </div> */}

              {currentStepErrors.length > 0 && submitAttempted ? (
                <div className="driver-editor-contract-inline-note">
                  <strong>Existem campos pendentes nesta etapa</strong>
                  <span>{currentStepErrors.join(" | ")}</span>
                </div>
              ) : null}

              {activeStep === "STRUCTURE" ? (
                <>
                  <div className="panel-head">
                    <h2>Cargo e Tipo de Contrato</h2>
                    <span>
                      Defina cargo, nivel e vinculo. O nome do perfil sera gerado automaticamente.
                    </span>
                  </div>

                  <div className="form-grid">
                    <label className={shouldShowFieldError("cargoName") ? "driver-editor-field-invalid" : undefined}>
                      Cargo
                      <select
                        className="select"
                        value={form.cargoId}
                        onChange={(event) => {
                          const nextCargoId = event.target.value;
                          const selected = cargoItems.find((item) => item.id === nextCargoId);
                          setForm((current) => ({
                            ...current,
                            cargoId: nextCargoId,
                            cargoName: selected?.name ?? "",
                            cargoLevel: selected ? current.cargoLevel : ""
                          }));
                        }}
                        onBlur={() => markFieldAsTouched("cargoName")}
                        disabled={disabled}
                      >
                        <option value="">Selecione um cargo</option>
                        {cargoOptions.map((cargo) => (
                          <option key={cargo.id} value={cargo.id}>
                            {cargo.name}
                          </option>
                        ))}
                      </select>
                      {shouldShowFieldError("cargoName") ? <small>{fieldErrors.cargoName}</small> : null}
                    </label>
                    <label className={shouldShowFieldError("cargoLevel") ? "driver-editor-field-invalid" : undefined}>
                      Nivel
                      <select
                        className="select"
                        value={form.cargoLevel}
                        onChange={(event) => update("cargoLevel", event.target.value)}
                        onBlur={() => markFieldAsTouched("cargoLevel")}
                        disabled={disabled || !form.cargoId.trim()}
                      >
                        <option value="">Selecione um nivel</option>
                        {cargoLevelOptions.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                      {shouldShowFieldError("cargoLevel") ? <small>{fieldErrors.cargoLevel}</small> : null}
                    </label>

                    <label className={shouldShowFieldError("contractType") ? "driver-editor-field-invalid" : undefined}>
                      Vinculo
                      <select
                        className="select"
                        value={form.contractType}
                        onChange={(event) => update("contractType", event.target.value as WorkProfileContractType)}
                        onBlur={() => markFieldAsTouched("contractType")}
                        disabled={disabled || activeContractTypeOptions.length === 0}
                      >
                        {activeContractTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {shouldShowFieldError("contractType") ? <small>{fieldErrors.contractType}</small> : null}
                      {activeContractTypeOptions.length === 0 ? (
                        <small>Nenhum vinculo ativo configurado na empresa.</small>
                      ) : null}
                    </label>

                    <label className="toggle-field">
                      <span>Perfil ativo</span>
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) => update("isActive", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                  </div>

                  <label>
                    Descricao
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => update("description", event.target.value)}
                      placeholder="Ex.: Perfil padrao para operacao urbana CLT."
                      disabled={disabled}
                    />
                  </label>

                  {isLaborContract ? (
                    <>
                      <div className="form-grid">
                        <div
                          className={
                            shouldShowFieldError("journeyTemplateId") ? "driver-editor-field-invalid" : undefined
                          }
                          style={{ position: "relative" }}
                        >
                          <span>Jornada</span>
                          <input
                            value={laborJourneyQuery}
                            onChange={(event) => {
                              const nextQuery = event.target.value;
                              setLaborJourneyQuery(nextQuery);
                              if (
                                form.journeyTemplateId &&
                                nextQuery.trim() !== (selectedJourney?.name ?? "")
                              ) {
                                update("journeyTemplateId", "");
                              }
                              setShowLaborJourneyResults(true);
                            }}
                            onFocus={() => setShowLaborJourneyResults(true)}
                            onBlur={() => {
                              markFieldAsTouched("journeyTemplateId");
                              setTimeout(() => setShowLaborJourneyResults(false), 120);
                            }}
                            placeholder="Buscar jornada por nome ou detalhes..."
                            disabled={disabled}
                          />
                          {showLaborJourneyResults && laborJourneyResults.length > 0 ? (
                            <ul className="cbo-autocomplete-list">
                              {laborJourneyResults.map((journey) => (
                                <li
                                  key={journey.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    update("journeyTemplateId", journey.id);
                                    setLaborJourneyQuery(journey.name);
                                    setOptionalJourneyQuery(journey.name);
                                    setShowLaborJourneyResults(false);
                                    markFieldAsTouched("journeyTemplateId");
                                  }}
                                >
                                  <strong>{journey.name}</strong>
                                  <small>{buildJourneyOptionDetails(journey)}</small>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {shouldShowFieldError("journeyTemplateId") ? (
                            <small>{fieldErrors.journeyTemplateId}</small>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-grid">
                        <label
                          className={shouldShowFieldError("engagementType") ? "driver-editor-field-invalid" : undefined}
                        >
                          Como ele sera acionado? (Atuacao)
                          <select
                            className="select"
                            value={form.engagementType}
                            onChange={(event) => update("engagementType", event.target.value as EngagementType)}
                            onBlur={() => markFieldAsTouched("engagementType")}
                            disabled={disabled}
                          >
                            <option value="ON_DEMAND">Por demanda</option>
                            <option value="BY_SCALE">Por escala</option>
                            <option value="FREE">Livre</option>
                          </select>
                          {shouldShowFieldError("engagementType") ? <small>{fieldErrors.engagementType}</small> : null}
                        </label>
                        <div style={{ position: "relative" }}>
                          <span>Jornada de referencia operacional (opcional)</span>
                          <input
                            value={optionalJourneyQuery}
                            onChange={(event) => {
                              const nextQuery = event.target.value;
                              setOptionalJourneyQuery(nextQuery);
                              if (
                                form.journeyTemplateId &&
                                nextQuery.trim() !== (selectedJourney?.name ?? "")
                              ) {
                                update("journeyTemplateId", "");
                              }
                              setShowOptionalJourneyResults(true);
                            }}
                            onFocus={() => setShowOptionalJourneyResults(true)}
                            onBlur={() => {
                              markFieldAsTouched("journeyTemplateId");
                              setTimeout(() => setShowOptionalJourneyResults(false), 120);
                            }}
                            placeholder="Buscar jornada por nome ou detalhes..."
                            disabled={disabled}
                          />
                          {showOptionalJourneyResults ? (
                            <ul className="cbo-autocomplete-list">
                              <li
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  update("journeyTemplateId", "");
                                  setOptionalJourneyQuery("");
                                  setLaborJourneyQuery("");
                                  setShowOptionalJourneyResults(false);
                                  markFieldAsTouched("journeyTemplateId");
                                }}
                              >
                                <strong>Nao usar jornada de referencia</strong>
                                <small>Perfil sem jornada pre-definida.</small>
                              </li>
                              {optionalJourneyResults.map((journey) => (
                                <li
                                  key={journey.id}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    update("journeyTemplateId", journey.id);
                                    setOptionalJourneyQuery(journey.name);
                                    setLaborJourneyQuery(journey.name);
                                    setShowOptionalJourneyResults(false);
                                    markFieldAsTouched("journeyTemplateId");
                                  }}
                                >
                                  <strong>{journey.name}</strong>
                                  <small>{buildJourneyOptionDetails(journey)}</small>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {shouldShowFieldError("journeyTemplateId") ? (
                            <small>{fieldErrors.journeyTemplateId}</small>
                          ) : null}
                        </div>
                      </div>

                      <div className="stack">
                        <strong>Disponibilidade (opcional)</strong>
                        <div className="benefit-contract-chips">
                          {DAY_OPTIONS.map((day) => {
                            const selected = form.availabilityDays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                className={selected ? "pricing-rule-day is-selected" : "pricing-rule-day"}
                                onClick={() => toggleAvailabilityDay(day.value)}
                                disabled={disabled}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="form-grid">
                          <label
                            className={
                              shouldShowFieldError("availabilityWindow") ? "driver-editor-field-invalid" : undefined
                            }
                          >
                            Faixa de horario - inicio
                            <input
                              type="time"
                              value={form.availabilityStartTime}
                              onChange={(event) => update("availabilityStartTime", event.target.value)}
                              onBlur={() => markFieldAsTouched("availabilityWindow")}
                              disabled={disabled}
                            />
                          </label>
                          <label
                            className={
                              shouldShowFieldError("availabilityWindow") ? "driver-editor-field-invalid" : undefined
                            }
                          >
                            Faixa de horario - fim
                            <input
                              type="time"
                              value={form.availabilityEndTime}
                              onChange={(event) => update("availabilityEndTime", event.target.value)}
                              onBlur={() => markFieldAsTouched("availabilityWindow")}
                              disabled={disabled}
                            />
                            {shouldShowFieldError("availabilityWindow") ? (
                              <small>{fieldErrors.availabilityWindow}</small>
                            ) : null}
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="driver-editor-contract-inline-note">
                    <strong>Resumo da configuracao estrutural</strong>
                    <span>
                      {selectedJourneyPreview ??
                        (isLaborContract
                          ? "Selecione uma jornada para visualizar um resumo claro da configuracao."
                          : "Sem jornada de referencia selecionada.")}
                    </span>
                  </div>
                </>
              ) : null}

              {activeStep === "REMUNERATION" ? (
                <>
                  <div className="panel-head">
                    <h2>Remuneracao</h2>
                    <span>
                      {usesIntermittentRemunerationFlow
                        ? "Defina base de pagamento do intermitente e variavel adicional opcional."
                        : "Configure o modelo de pagamento do perfil."}
                    </span>
                  </div>

                  {usesIntermittentRemunerationFlow ? (
                    <>
                      <div className="form-grid">
                        <label
                          className={
                            shouldShowFieldError("baseRemunerationType") ? "driver-editor-field-invalid" : undefined
                          }
                        >
                          Remuneracao base
                          <select
                            className="select"
                            value={form.baseRemunerationType}
                            onChange={(event) =>
                              update("baseRemunerationType", event.target.value as WorkProfileBaseRemunerationType)
                            }
                            onBlur={() => markFieldAsTouched("baseRemunerationType")}
                            disabled={disabled}
                          >
                            <option value="HOUR">Por hora</option>
                            <option value="DAILY">Por diaria</option>
                            <option value="EVENT">Por evento/servico</option>
                          </select>
                          {shouldShowFieldError("baseRemunerationType") ? (
                            <small>{fieldErrors.baseRemunerationType}</small>
                          ) : null}
                        </label>
                      </div>

                      <div className="form-grid">
                        <label className={shouldShowFieldError("fixedSalary") ? "driver-editor-field-invalid" : undefined}>
                          {form.baseRemunerationType === "HOUR"
                            ? "Valor por hora"
                            : form.baseRemunerationType === "DAILY"
                              ? "Valor por diaria"
                              : "Valor por evento/servico"}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.fixedSalary}
                            onChange={(event) => update("fixedSalary", event.target.value)}
                            onBlur={() => markFieldAsTouched("fixedSalary")}
                            disabled={disabled}
                          />
                          {shouldShowFieldError("fixedSalary") ? <small>{fieldErrors.fixedSalary}</small> : null}
                        </label>
                      </div>

                      <div className="form-grid">
                        <label
                          className={
                            shouldShowFieldError("hasVariableCompensation") ? "driver-editor-field-invalid" : undefined
                          }
                        >
                          Possui comissao ou variavel adicional?
                          <select
                            className="select"
                            value={form.hasVariableCompensation ? "YES" : "NO"}
                            onChange={(event) =>
                              update("hasVariableCompensation", event.target.value === "YES")
                            }
                            onBlur={() => markFieldAsTouched("hasVariableCompensation")}
                            disabled={disabled}
                          >
                            <option value="NO">Nao</option>
                            <option value="YES">Sim</option>
                          </select>
                          {shouldShowFieldError("hasVariableCompensation") ? (
                            <small>{fieldErrors.hasVariableCompensation}</small>
                          ) : null}
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="form-grid">
                      <label
                        className={shouldShowFieldError("remunerationModel") ? "driver-editor-field-invalid" : undefined}
                      >
                        Modelo de remuneracao
                        <select
                          className="select"
                          value={form.remunerationModel}
                          onChange={(event) =>
                            update("remunerationModel", event.target.value as WorkProfileRemunerationModel)
                          }
                          onBlur={() => markFieldAsTouched("remunerationModel")}
                          disabled={disabled}
                        >
                          <option value="FIXED">Salario fixo</option>
                          <option value="FIXED_PLUS_COMMISSION">Fixo + comissao</option>
                          <option value="COMMISSION_ONLY">Comissao</option>
                        </select>
                        {shouldShowFieldError("remunerationModel") ? (
                          <small>{fieldErrors.remunerationModel}</small>
                        ) : null}
                      </label>
                    </div>
                  )}

                  {!usesIntermittentRemunerationFlow && form.remunerationModel !== "COMMISSION_ONLY" ? (
                    <div className="form-grid">
                      <label className={shouldShowFieldError("fixedSalary") ? "driver-editor-field-invalid" : undefined}>
                        Valor do salario
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.fixedSalary}
                          onChange={(event) => update("fixedSalary", event.target.value)}
                          onBlur={() => markFieldAsTouched("fixedSalary")}
                          disabled={disabled}
                        />
                        {shouldShowFieldError("fixedSalary") ? <small>{fieldErrors.fixedSalary}</small> : null}
                      </label>
                    </div>
                  ) : null}

                  {(usesIntermittentRemunerationFlow ? form.hasVariableCompensation : form.remunerationModel !== "FIXED") ? (
                    <>
                      <div className="panel-head">
                        <h2>Variavel adicional</h2>
                        <span>Configure comissao ou valor variavel adicional.</span>
                      </div>

                      <div className="form-grid">
                        <label>
                          Tipo da variavel
                          <select
                            className="select"
                            value={form.commissionType}
                            onChange={(event) =>
                              update("commissionType", event.target.value as WorkProfileCommissionType)
                            }
                            disabled={disabled}
                          >
                            <option value="PERCENT">Percentual</option>
                            <option value="PER_RIDE">
                              {usesIntermittentRemunerationFlow ? "Valor por evento/servico" : "Valor por corrida"}
                            </option>
                          </select>
                        </label>
                        <label
                          className={
                            shouldShowFieldError("commissionValue") ? "driver-editor-field-invalid" : undefined
                          }
                        >
                          Valor da comissao
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.commissionValue}
                            onChange={(event) => update("commissionValue", event.target.value)}
                            onBlur={() => markFieldAsTouched("commissionValue")}
                            disabled={disabled}
                          />
                          {shouldShowFieldError("commissionValue") ? (
                            <small>{fieldErrors.commissionValue}</small>
                          ) : null}
                        </label>
                      </div>

                      <label className={shouldShowFieldError("commissionRule") ? "driver-editor-field-invalid" : undefined}>
                        Regra da variavel adicional
                        <textarea
                          rows={3}
                          value={form.commissionRule}
                          onChange={(event) => update("commissionRule", event.target.value)}
                          onBlur={() => markFieldAsTouched("commissionRule")}
                          placeholder="Ex.: Percentual aplicado sobre faturamento liquido de cada servico."
                          disabled={disabled}
                        />
                        {shouldShowFieldError("commissionRule") ? <small>{fieldErrors.commissionRule}</small> : null}
                      </label>
                      <small>
                        Essa regra sera usada na geracao do contrato para definir base de calculo e gatilhos
                        de pagamento.
                      </small>
                    </>
                  ) : null}
                </>
              ) : null}

              {activeStep === "POLICIES" ? (
                <>
                  <div className="panel-head">
                    <h2>Politicas</h2>
                    <span>Hora extra e adicionais conforme regime do vinculo.</span>
                  </div>

                  {isLaborContract ? (
                    <>
                      {allowsOvertimePolicy ? (
                        <>
                          <div className="form-grid">
                            <label className="toggle-field">
                              <span>Perfil utiliza hora extra</span>
                              <input
                                type="checkbox"
                                checked={form.usesOvertime}
                                onChange={(event) =>
                                  setForm((current) => ({
                                    ...current,
                                    usesOvertime: event.target.checked,
                                    overtimeTemplateId: event.target.checked ? current.overtimeTemplateId : ""
                                  }))
                                }
                                disabled={disabled}
                              />
                            </label>
                          </div>

                          {form.usesOvertime ? (
                            <>
                              <div className="form-grid">
                                <label
                                  className={
                                    shouldShowFieldError("overtimeTemplateId")
                                      ? "driver-editor-field-invalid"
                                      : undefined
                                  }
                                >
                                  Politica de hora extra
                                  <select
                                    className="select"
                                    value={form.overtimeTemplateId}
                                    onChange={(event) => update("overtimeTemplateId", event.target.value)}
                                    onBlur={() => markFieldAsTouched("overtimeTemplateId")}
                                    disabled={disabled}
                                  >
                                    <option value="">Selecione uma politica</option>
                                    {overtimeTemplates.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ))}
                                  </select>
                                  {shouldShowFieldError("overtimeTemplateId") ? (
                                    <small>{fieldErrors.overtimeTemplateId}</small>
                                  ) : null}
                                </label>
                              </div>

                              <div className="driver-editor-contract-inline-note">
                                <strong>Resumo da politica</strong>
                                <span>
                                  {selectedOvertimePreview ??
                                    "Selecione uma politica de hora extra para visualizar o resumo."}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="driver-editor-contract-inline-note">
                              <strong>Hora extra desativada</strong>
                              <span>Este perfil sera salvo sem politica de hora extra.</span>
                            </div>
                          )}
                        </>
                      ) : null}

                      <div className="form-grid">
                        <label className="toggle-field">
                          <span>Perfil utiliza adicional noturno</span>
                          <input
                            type="checkbox"
                            checked={form.usesNightPolicy}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                usesNightPolicy: event.target.checked,
                                nightTemplateId: event.target.checked ? current.nightTemplateId : ""
                              }))
                            }
                            disabled={disabled}
                          />
                        </label>
                      </div>

                      {form.usesNightPolicy ? (
                        <>
                          <div className="form-grid">
                            <label
                              className={
                                shouldShowFieldError("nightTemplateId")
                                  ? "driver-editor-field-invalid"
                                  : undefined
                              }
                            >
                              Politica de adicional noturno
                              <select
                                className="select"
                                value={form.nightTemplateId}
                                onChange={(event) => update("nightTemplateId", event.target.value)}
                                onBlur={() => markFieldAsTouched("nightTemplateId")}
                                disabled={disabled}
                              >
                                <option value="">Selecione uma politica</option>
                                {nightTemplates.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                              {shouldShowFieldError("nightTemplateId") ? (
                                <small>{fieldErrors.nightTemplateId}</small>
                              ) : null}
                            </label>
                          </div>

                          <div className="driver-editor-contract-inline-note">
                            <strong>Resumo da politica noturna</strong>
                            <span>
                              {selectedNightPreview ??
                                "Selecione uma politica de adicional noturno para visualizar o resumo."}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="driver-editor-contract-inline-note">
                          <strong>Adicional noturno desativado</strong>
                          <span>Este perfil sera salvo sem politica de adicional noturno.</span>
                        </div>
                      )}

                      <div className="driver-editor-contract-inline-note">
                        <strong>Politica de DSR herdada da jornada</strong>
                        <span>
                          {selectedJourney?.dsrPolicy?.summary ??
                            "Configure uma politica de DSR na jornada para concluir este perfil."}
                        </span>
                      </div>

                      <div className="form-grid">
                        <label className={shouldShowFieldError("holidayScopeType") ? "driver-editor-field-invalid" : undefined}>
                          Escopo de feriados para este perfil
                          <select
                            className="select"
                            value={form.holidayScopeType}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                holidayScopeType: event.target.value as FormState["holidayScopeType"],
                                holidayStateCode:
                                  event.target.value === "STATE" || event.target.value === "CITY"
                                    ? current.holidayStateCode
                                    : "",
                                holidayCityCode: event.target.value === "CITY" ? current.holidayCityCode : ""
                              }))
                            }
                            onBlur={() => markFieldAsTouched("holidayScopeType")}
                            disabled={disabled}
                          >
                            <option value="">Sem escopo dedicado</option>
                            <option value="NATIONAL">Nacional</option>
                            <option value="STATE">Estadual (UF)</option>
                            <option value="CITY">Municipal (UF + cidade)</option>
                          </select>
                          {shouldShowFieldError("holidayScopeType") ? <small>{fieldErrors.holidayScopeType}</small> : null}
                        </label>
                      </div>

                      {form.holidayScopeType === "STATE" || form.holidayScopeType === "CITY" ? (
                        <div className="form-grid">
                          <label
                            className={
                              shouldShowFieldError("holidayStateCode") ? "driver-editor-field-invalid" : undefined
                            }
                          >
                            UF
                            <input
                              type="text"
                              maxLength={2}
                              value={form.holidayStateCode}
                              onChange={(event) =>
                                update("holidayStateCode", event.target.value.toUpperCase())
                              }
                              onBlur={() => markFieldAsTouched("holidayStateCode")}
                              placeholder="SP"
                              disabled={disabled}
                            />
                            {shouldShowFieldError("holidayStateCode") ? (
                              <small>{fieldErrors.holidayStateCode}</small>
                            ) : null}
                          </label>

                          {form.holidayScopeType === "CITY" ? (
                            <label
                              className={
                                shouldShowFieldError("holidayCityCode") ? "driver-editor-field-invalid" : undefined
                              }
                            >
                              Cidade
                              <input
                                type="text"
                                value={form.holidayCityCode}
                                onChange={(event) => update("holidayCityCode", event.target.value)}
                                onBlur={() => markFieldAsTouched("holidayCityCode")}
                                placeholder="Sao Paulo"
                                disabled={disabled}
                              />
                              {shouldShowFieldError("holidayCityCode") ? (
                                <small>{fieldErrors.holidayCityCode}</small>
                              ) : null}
                            </label>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="driver-editor-contract-inline-note">
                        <strong>Resumo de feriados</strong>
                        <span>
                          {form.holidayScopeType
                            ? buildHolidayScopePreview(
                                form.holidayScopeType,
                                form.holidayStateCode.trim().toUpperCase() || undefined,
                                form.holidayCityCode.trim() || undefined
                              )
                            : "Sem escopo dedicado (usa regra padrao da empresa/apuracao)."}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="driver-editor-contract-inline-note">
                      <strong>Politica trabalhista desabilitada para este vinculo</strong>
                      <span>
                        Para MEI, PJ e Autonomo, hora extra, adicional noturno e feriados ficam ocultos.
                      </span>
                    </div>
                  )}
                </>
              ) : null}

              {activeStep === "BENEFITS" ? (
                <>
                  <div className="panel-head">
                    <h2>Beneficios</h2>
                    <span>Selecione no modal e ajuste a configuracao por vinculo.</span>
                  </div>

                  <div className="overtime-editor-footer">
                    <button type="button" onClick={openBenefitsPicker} disabled={disabled || benefits.length === 0}>
                      Adicionar beneficios
                    </button>
                  </div>

                  {benefits.length === 0 ? (
                    <div className="driver-editor-contract-inline-note">
                      <strong>Nenhum beneficio ativo encontrado</strong>
                      <span>Cadastre beneficios para vincular neste perfil de trabalho.</span>
                    </div>
                  ) : null}

                  {linkedBenefits.length > 0 ? (
                    <div className="stack">
                      {linkedBenefits.map((item) => (
                        <div key={item.config.benefitId} className="driver-editor-contract-inline-note">
                          <strong>
                            {item.config.benefitName} - {resolveBenefitTypeLabel(item.benefit?.type)}
                          </strong>
                          <span>
                            {resolveBenefitFrequencyLabel(item.benefit?.frequency)} |{" "}
                            {buildLinkedBenefitSummary(item.config, item.benefit)}
                          </span>
                          {!isReadOnly ? (
                            <div className="overtime-editor-footer">
                              <button
                                type="button"
                                onClick={() => setEditingBenefitId(item.config.benefitId)}
                                disabled={disabled}
                              >
                                Editar configuracao
                              </button>
                              <button
                                type="button"
                                className="secondary-link"
                                onClick={() => removeLinkedBenefit(item.config.benefitId)}
                                disabled={disabled}
                              >
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="driver-editor-contract-inline-note">
                      <strong>Nenhum beneficio vinculado</strong>
                      <span>Use "Adicionar beneficios" para montar os beneficios deste perfil.</span>
                    </div>
                  )}

                  <div className="driver-editor-contract-inline-note">
                    <strong>Resumo dos beneficios</strong>
                    <span>{selectedBenefitsPreview}</span>
                  </div>
                </>
              ) : null}

              {activeStep === "CONTRACT_RULES" ? (
                <>
                  <div className="panel-head">
                    <h2>Regras contratuais</h2>
                    <span>Defina o que pode ser customizado ao gerar o contrato.</span>
                  </div>

                  <div className="form-grid">
                    <label className="toggle-field">
                      <span>Permitir edicao do perfil no contrato</span>
                      <input
                        type="checkbox"
                        checked={form.allowContractEditing}
                        onChange={(event) => update("allowContractEditing", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                    <label className="toggle-field">
                      <span>Permitir customizar jornada</span>
                      <input
                        type="checkbox"
                        checked={form.allowJourneyCustomization}
                        onChange={(event) => update("allowJourneyCustomization", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                    <label className="toggle-field">
                      <span>Permitir customizar beneficios</span>
                      <input
                        type="checkbox"
                        checked={form.allowBenefitsCustomization}
                        onChange={(event) => update("allowBenefitsCustomization", event.target.checked)}
                        disabled={disabled}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {activeStep === "REVIEW" ? (
                <>
                  <div className="panel-head">
                    <h2>Conferência Final e Contrato</h2>
                    <span>Revise os dados e escolha o modelo de documento para impressao.</span>
                  </div>

                  <div className="journey-review-container">
                    <div className="journey-review-main-card">
                      <strong>Resumo do Perfil</strong>
                      <p className="journey-review-sentence">{summary}</p>
                    </div>
                    
                    <div className="journey-review-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                      <div className="review-item">
                        <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.7 }}>Remuneração</label>
                        <strong>{form.fixedSalary ? `R$ ${form.fixedSalary}` : "A definir"}</strong>
                      </div>
                      <div className="review-item">
                        <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.7 }}>Jornada</label>
                        <strong>{selectedJourney?.name || "Nao selecionada"}</strong>
                      </div>
                      <div className="review-item">
                        <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.7 }}>Benefícios</label>
                        <strong>{form.linkedBenefits.length} vinculados</strong>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label
                      className={
                        shouldShowFieldError("contractTemplateKey")
                          ? "driver-editor-field-invalid"
                          : undefined
                      }
                    >
                      Modelo de Documento (Contrato)
                      <select
                        className="select"
                        value={form.contractTemplateKey}
                        onChange={(event) => {
                          const selected = contractTemplateOptions.find(
                            (item) => item.key === event.target.value
                          );
                          setForm((current) => ({
                            ...current,
                            contractTemplateKey: event.target.value,
                            contractTemplateName: selected?.name ?? "",
                            contractTemplateVersion: selected?.version ?? ""
                          }));
                        }}
                        onBlur={() => markFieldAsTouched("contractTemplateKey")}
                        disabled={disabled || contractTemplateOptions.length === 0}
                      >
                        <option value="">
                          {contractTemplateOptions.length === 0
                            ? "Nenhum modelo publicado encontrado"
                            : "Selecione um modelo"}
                        </option>
                        {contractTemplateOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.name} ({option.version})
                          </option>
                        ))}
                      </select>
                      {shouldShowFieldError("contractTemplateKey") ? (
                        <small>{fieldErrors.contractTemplateKey}</small>
                      ) : null}
                    </label>
                  </div>

                  {selectedContractTemplate ? (
                    <div className="driver-editor-contract-inline-note">
                      <strong>Modelo selecionado</strong>
                      <span>
                        {selectedContractTemplate.name} ({selectedContractTemplate.version}) -{" "}
                        {selectedContractTemplate.key}
                      </span>
                    </div>
                  ) : null}

                 {/*  <div className="driver-editor-contract-inline-note">
                    <strong>Resumo do perfil</strong>
                    <span>{summary}</span>
                  </div> */}

                  {showErrors ? (
                    <div className="driver-editor-contract-validation-alert" role="alert">
                      <strong>Corrija os campos abaixo antes de salvar:</strong>
                      <ul>
                        {validationErrors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="driver-editor-form-footer">
                <div className="driver-editor-form-actions">
                  <Link href="/administrative/work-profiles" className="button-link secondary-link">
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
                        {primaryActionLabel}
                      </button>
                    ) : null}

                    {isReadOnly && profileId ? (
                      <Link href={`/administrative/work-profiles/${profileId}/edit`} className="button-link">
                        Editar perfil
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </form>
          </article>
        </section>
      </div>

      <DriverProfileEditorModal
        open={isBenefitsPickerOpen}
        title="Selecionar beneficios"
        description="Selecione os beneficios que este perfil podera utilizar."
        onClose={closeBenefitsPicker}
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={closeBenefitsPicker}>
              Cancelar
            </button>
            <button type="button" onClick={applySelectedBenefits}>
              Vincular {pendingBenefitIds.length > 0 ? `(${pendingBenefitIds.length})` : ""}
            </button>
          </>
        }
      >
        <label className="driver-editor-modal-field-full">
          Buscar beneficio
          <input
            value={benefitSearch}
            onChange={(event) => setBenefitSearch(event.target.value)}
            placeholder="Digite nome, tipo ou resumo"
            autoFocus
          />
        </label>

        {filteredBenefits.length > 0 ? (
          <div className="stack">
            {filteredBenefits.map((benefit) => {
              const selected = pendingBenefitIds.includes(benefit.id);
              return (
                <label key={benefit.id} className="toggle-field">
                  <span>
                    <strong>{benefit.name}</strong>
                    <small>
                      {resolveBenefitTypeLabel(benefit.type)} |{" "}
                      {resolveBenefitFrequencyLabel(benefit.frequency)}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePendingBenefit(benefit.id)}
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="driver-editor-contract-inline-note">
            <strong>Nenhum beneficio encontrado</strong>
            <span>Ajuste o termo de busca para localizar beneficios ativos.</span>
          </div>
        )}
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={Boolean(editingBenefit)}
        title={`Configurar beneficio${editingBenefit ? ` - ${editingBenefit.config.benefitName}` : ""}`}
        description="Essas alteracoes valem apenas para este perfil de trabalho."
        onClose={() => setEditingBenefitId(null)}
      >
        {editingBenefit ? (
          <>
            <div className="driver-editor-contract-inline-note">
              <strong>Cadastro mestre preservado</strong>
              <span>Os ajustes abaixo nao alteram o beneficio global.</span>
            </div>

            {editingBenefit.benefit?.type === "INFORMATIVE" ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Beneficio informativo</strong>
                <span>Este tipo nao possui campos financeiros obrigatorios.</span>
              </div>
            ) : null}

            {editingBenefit.benefit?.type === "PERCENTAGE" ? (
              <div className="form-grid">
                <label>
                  Percentual (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingBenefit.config.percentageValue}
                    onChange={(event) =>
                      updateLinkedBenefit(editingBenefit.config.benefitId, {
                        percentageValue: event.target.value
                      })
                    }
                  />
                </label>
              </div>
            ) : editingBenefit.benefit?.type !== "INFORMATIVE" ? (
              <div className="form-grid">
                <label>
                  Valor base de referencia (opcional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingBenefit.config.referenceValue}
                    onChange={(event) =>
                      updateLinkedBenefit(editingBenefit.config.benefitId, {
                        referenceValue: event.target.value
                      })
                    }
                  />
                  <small>Usado como base para contratos ou estimativas. O valor real pode variar.</small>
                </label>
              </div>
            ) : null}

            <div className="panel-head">
              <h2>Custeio e folha</h2>
              <span>Uma unica fonte de verdade para desconto e pagamento.</span>
            </div>
            <div className="form-grid">
              <label>
                Quem paga
                <select
                  className="select"
                  value={editingBenefit.config.payer}
                  onChange={(event) =>
                    applyLinkedBenefitPayer(
                      editingBenefit.config.benefitId,
                      event.target.value as LinkedBenefitPayer,
                      updateLinkedBenefit
                    )
                  }
                  disabled={editingBenefit.benefit?.type === "INFORMATIVE"}
                >
                  <option value="COMPANY">Empresa</option>
                  <option value="EMPLOYEE">Colaborador</option>
                  <option value="SHARED">Dividido</option>
                </select>
              </label>
              <label className="toggle-field">
                <span>Integrar na folha de pagamento</span>
                <input
                  type="checkbox"
                  checked={editingBenefit.config.integratePayroll}
                  onChange={(event) =>
                    updateLinkedBenefit(editingBenefit.config.benefitId, {
                      integratePayroll: event.target.checked
                    })
                  }
                  disabled={editingBenefit.benefit?.type === "INFORMATIVE"}
                />
              </label>
              <label className="toggle-field">
                <span>Desconta do salario</span>
                <input
                  type="checkbox"
                  checked={resolveLinkedBenefitDeductFromSalary(editingBenefit.config)}
                  onChange={(event) =>
                    updateLinkedBenefit(editingBenefit.config.benefitId, {
                      deductFromSalary: event.target.checked
                    })
                  }
                  disabled={editingBenefit.config.payer !== "SHARED" || editingBenefit.benefit?.type === "INFORMATIVE"}
                />
              </label>
            </div>

            {editingBenefit.config.payer === "COMPANY" ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Regra automatica aplicada</strong>
                <span>Custeio da empresa nao gera desconto em salario.</span>
              </div>
            ) : null}
            {editingBenefit.config.payer === "EMPLOYEE" ? (
              <div className="driver-editor-contract-inline-note">
                <strong>Regra automatica aplicada</strong>
                <span>Custeio do colaborador exige desconto em salario.</span>
              </div>
            ) : null}

            {shouldShowLinkedBenefitDiscountBlock(editingBenefit.config, editingBenefit.benefit) ? (
              <>
                <div className="panel-head">
                  <h2>Desconto do colaborador</h2>
                  <span>Configuracao aplicada somente neste perfil.</span>
                </div>

                <div className="form-grid">
                  <label>
                    Tipo de desconto
                    <select
                      className="select"
                      value={editingBenefit.config.discountMode}
                      onChange={(event) =>
                        updateLinkedBenefit(editingBenefit.config.benefitId, {
                          discountMode: event.target.value as BenefitDiscountMode
                        })
                      }
                    >
                      <option value="AMOUNT">Valor fixo</option>
                      <option value="PERCENT">Percentual</option>
                    </select>
                  </label>
                  <label>
                    Valor do desconto
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingBenefit.config.discountValue}
                      onChange={(event) =>
                        updateLinkedBenefit(editingBenefit.config.benefitId, {
                          discountValue: event.target.value
                        })
                      }
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Base do desconto
                    <select
                      className="select"
                      value={editingBenefit.config.discountBase}
                      onChange={(event) =>
                        updateLinkedBenefit(editingBenefit.config.benefitId, {
                          discountBase: event.target.value as BenefitDiscountBase
                        })
                      }
                    >
                      <option value="SALARY">Sobre salario</option>
                      <option value="BENEFIT">Sobre beneficio</option>
                    </select>
                  </label>
                  <label>
                    Limite opcional
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingBenefit.config.discountLimit}
                      onChange={(event) =>
                        updateLinkedBenefit(editingBenefit.config.benefitId, {
                          discountLimit: event.target.value
                        })
                      }
                    />
                  </label>
                </div>
              </>
            ) : null}

            <label>
              Observacoes
              <textarea
                rows={3}
                value={editingBenefit.config.notes}
                onChange={(event) =>
                  updateLinkedBenefit(editingBenefit.config.benefitId, {
                    notes: event.target.value
                  })
                }
                placeholder="Observacoes operacionais deste beneficio para o perfil."
              />
            </label>

            <div className="panel-head">
              <h2>Contrato</h2>
              <span>Defina como este beneficio aparece no contrato do perfil.</span>
            </div>
            <div className="form-grid">
              <label className="toggle-field">
                <span>Obrigatorio no contrato</span>
                <input
                  type="checkbox"
                  checked={editingBenefit.config.mandatoryInContract}
                  onChange={(event) =>
                    updateLinkedBenefit(editingBenefit.config.benefitId, {
                      mandatoryInContract: event.target.checked
                    })
                  }
                />
              </label>
              <label className="toggle-field">
                <span>Pode ser editado no contrato</span>
                <input
                  type="checkbox"
                  checked={editingBenefit.config.editableInContract}
                  onChange={(event) =>
                    updateLinkedBenefit(editingBenefit.config.benefitId, {
                      editableInContract: event.target.checked
                    })
                  }
                />
              </label>
            </div>
          </>
        ) : null}
      </DriverProfileEditorModal>
    </main>
  );
}

function mapProfileToForm(profile: WorkProfile): FormState {
  const profileExtra = profile as WorkProfile & {
    cargoLevel?: string;
    engagementType?: EngagementType;
    availabilityDays?: DayOfWeek[];
    availabilityStartTime?: string;
    availabilityEndTime?: string;
  };
  return {
    ...defaultForm,
    description: profile.description ?? "",
    isActive: profile.isActive,
    cargoId: profile.cargoId ?? "",
    cargoName: profile.cargoName,
    cargoLevel: profileExtra.cargoLevel ?? "",
    contractType: profile.contractType,
    engagementType: profileExtra.engagementType ?? "ON_DEMAND",
    availabilityDays: Array.isArray(profileExtra.availabilityDays) ? profileExtra.availabilityDays : [],
    availabilityStartTime: profileExtra.availabilityStartTime ?? "",
    availabilityEndTime: profileExtra.availabilityEndTime ?? "",
    journeyTemplateId: profile.journeyTemplateId ?? "",
    remunerationModel: profile.remuneration.model === "COMMISSION_ONLY" ? "FIXED_PLUS_COMMISSION" : profile.remuneration.model,
    baseRemunerationType: profile.remuneration.baseType ?? "HOUR",
    hasVariableCompensation:
      profile.remuneration.hasVariableCompensation ?? profile.remuneration.model !== "FIXED",
    fixedSalary:
      profile.remuneration.fixedSalary === undefined ? "" : String(profile.remuneration.fixedSalary),
    commissionType: profile.remuneration.commissionType ?? "PERCENT",
    commissionValue:
      profile.remuneration.commissionValue === undefined ? "" : String(profile.remuneration.commissionValue),
    commissionRule: profile.remuneration.commissionRule ?? "",
    contractTemplateKey: profile.remuneration.contractTemplateKey ?? "",
    contractTemplateName: profile.remuneration.contractTemplateName ?? "",
    contractTemplateVersion: profile.remuneration.contractTemplateVersion ?? "",
    usesOvertime: profile.usesOvertime,
    overtimeTemplateId: profile.overtimeTemplateId ?? "",
    usesNightPolicy: profile.usesNightPolicy,
    nightTemplateId: profile.nightTemplateId ?? "",
    holidayScopeType: profile.holidayScopeType ?? "",
    holidayStateCode: profile.holidayStateCode ?? "",
    holidayCityCode: profile.holidayCityCode ?? "",
    linkedBenefits: profile.benefits.map((item) =>
      createLinkedBenefitConfig(undefined, {
        benefitId: item.id,
        benefitName: item.name,
        originalSummary: item.summary ?? ""
      })
    ),
    allowContractEditing: profile.allowContractEditing,
    allowJourneyCustomization: profile.allowJourneyCustomization,
    allowBenefitsCustomization: profile.allowBenefitsCustomization
  };
}

function resolveCargoById(cargos: CargoOption[], cargoId: string): CargoOption | undefined {
  const normalizedId = cargoId.trim();
  if (!normalizedId) {
    return undefined;
  }

  return cargos.find((item) => item.id === normalizedId);
}

function buildJourneyOptionDetails(journey: WorkJourneyTemplate): string {
  const summary = summarizeWorkJourney(journey).slice(0, 2).join(" | ");
  if (journey.description && journey.description.trim().length > 0) {
    return `${journey.description.trim()} | ${summary}`;
  }
  return summary;
}

function validateFieldErrors(
  form: FormState,
  options: {
    cargos: CargoOption[];
    cargoLevelOptions: string[];
    journeyOptions: WorkJourneyTemplate[];
    overtimeTemplates: OvertimeTemplate[];
    nightTemplates: OvertimeTemplate[];
    contractTemplateOptions: ContractTemplateOption[];
    contractTypeOptions: EmploymentLinkageOption[];
    isLaborContract: boolean;
    allowsOvertimePolicy: boolean;
  }
): FormFieldErrors {
  const errors: FormFieldErrors = {};

  const selectedCargo = resolveCargoById(options.cargos, form.cargoId);
  if (!form.cargoId.trim()) {
    errors.cargoName = "Selecione um cargo.";
  } else if (!selectedCargo) {
    errors.cargoName = "Cargo selecionado nao existe entre os cargos ativos.";
  }

  const levelOptions =
    options.cargoLevelOptions.length > 0
      ? options.cargoLevelOptions
      : selectedCargo?.levels ?? [];
  if (form.cargoId.trim()) {
    if (!form.cargoLevel.trim()) {
      errors.cargoLevel = "Selecione um nivel.";
    } else if (
      levelOptions.length > 0 &&
      !levelOptions.some((item) => item.toLowerCase() === form.cargoLevel.trim().toLowerCase())
    ) {
      errors.cargoLevel = "Nivel selecionado nao pertence ao cargo escolhido.";
    }
  }

  if (!isValidContractType(form.contractType)) {
    errors.contractType = "Selecione um vinculo valido.";
  } else {
    const selectedContractType = options.contractTypeOptions.find(
      (item) => item.value === form.contractType
    );
    if (!selectedContractType) {
      errors.contractType = "Selecione um vinculo ativo configurado na empresa.";
    }
  }

  if (options.isLaborContract) {
    if (!form.journeyTemplateId) {
      errors.journeyTemplateId = "Selecione uma jornada de trabalho.";
    } else if (!options.journeyOptions.some((item) => item.id === form.journeyTemplateId)) {
      errors.journeyTemplateId = "Jornada selecionada nao existe.";
    } else {
      const selectedJourney = options.journeyOptions.find((item) => item.id === form.journeyTemplateId);
      if (!selectedJourney?.dsrPolicy?.enabled) {
        errors.journeyTemplateId = "A jornada selecionada precisa ter politica de DSR configurada.";
      }
    }
  } else {
    if (!isValidEngagementType(form.engagementType)) {
      errors.engagementType = "Selecione um tipo de atuacao valido.";
    }

    if (form.journeyTemplateId && !options.journeyOptions.some((item) => item.id === form.journeyTemplateId)) {
      errors.journeyTemplateId = "Jornada de referencia selecionada nao existe.";
    }

    const start = form.availabilityStartTime.trim();
    const end = form.availabilityEndTime.trim();
    if ((start.length > 0 || end.length > 0) && (!isClock(start) || !isClock(end))) {
      errors.availabilityWindow = "Informe inicio e fim da disponibilidade em formato HH:mm.";
    } else if (isClock(start) && isClock(end) && toMinutes(end) <= toMinutes(start)) {
      errors.availabilityWindow = "Fim da disponibilidade deve ser maior que o inicio.";
    }
  }

  const capabilities = getEmploymentLinkageCapabilities(form.contractType);
  if (capabilities.usesIntermittentRemunerationFlow) {
    if (!isValidBaseRemunerationType(form.baseRemunerationType)) {
      errors.baseRemunerationType = "Selecione uma remuneracao base valida.";
    }

    if ((toNumber(form.fixedSalary) ?? 0) <= 0) {
      if (form.baseRemunerationType === "HOUR") {
        errors.fixedSalary = "Informe valor por hora maior que zero.";
      } else if (form.baseRemunerationType === "DAILY") {
        errors.fixedSalary = "Informe valor por diaria maior que zero.";
      } else {
        errors.fixedSalary = "Informe valor por evento/servico maior que zero.";
      }
    }

    if (typeof form.hasVariableCompensation !== "boolean") {
      errors.hasVariableCompensation = "Informe se existe variavel adicional.";
    }

    if (form.hasVariableCompensation) {
      if ((toNumber(form.commissionValue) ?? 0) <= 0) {
        errors.commissionValue = "Informe valor de comissao maior que zero.";
      }
      if (form.commissionRule.trim().length < 3) {
        errors.commissionRule = "Informe a regra da comissao com ao menos 3 caracteres.";
      }
    }
  } else {
    if (!isValidRemunerationModel(form.remunerationModel)) {
      errors.remunerationModel = "Selecione um modelo de remuneracao valido.";
    }

    if (form.remunerationModel !== "COMMISSION_ONLY" && (toNumber(form.fixedSalary) ?? 0) <= 0) {
      errors.fixedSalary = "Informe valor de salario fixo maior que zero.";
    }

    if (form.remunerationModel !== "FIXED") {
      if ((toNumber(form.commissionValue) ?? 0) <= 0) {
        errors.commissionValue = "Informe valor de comissao maior que zero.";
      }
      if (form.commissionRule.trim().length < 3) {
        errors.commissionRule = "Informe a regra da comissao com ao menos 3 caracteres.";
      }
    }
  }

  if (options.allowsOvertimePolicy && form.usesOvertime) {
    if (!form.overtimeTemplateId) {
      errors.overtimeTemplateId = "Selecione uma politica de hora extra.";
    } else if (!options.overtimeTemplates.some((item) => item.id === form.overtimeTemplateId)) {
      errors.overtimeTemplateId = "Politica de hora extra selecionada nao existe.";
    }
  }

  if (options.isLaborContract && form.usesNightPolicy) {
    if (!form.nightTemplateId) {
      errors.nightTemplateId = "Selecione uma politica de adicional noturno.";
    } else if (!options.nightTemplates.some((item) => item.id === form.nightTemplateId)) {
      errors.nightTemplateId = "Politica de adicional noturno selecionada nao existe.";
    }
  }

  if (options.isLaborContract && form.holidayScopeType === "STATE") {
    if (form.holidayStateCode.trim().length !== 2) {
      errors.holidayStateCode = "Informe a UF com 2 letras para feriado estadual.";
    }
  }

  if (options.isLaborContract && form.holidayScopeType === "CITY") {
    if (form.holidayStateCode.trim().length !== 2) {
      errors.holidayStateCode = "Informe a UF com 2 letras para feriado municipal.";
    }
    if (form.holidayCityCode.trim().length < 2) {
      errors.holidayCityCode = "Informe a cidade para feriado municipal.";
    }
  }

  const benefitIds = form.linkedBenefits.map((item) => item.benefitId).filter(Boolean);
  if (new Set(benefitIds).size !== benefitIds.length) {
    errors.linkedBenefits = "Existem beneficios duplicados. Revise os vinculados.";
  }

  if (options.contractTemplateOptions.length > 0) {
    if (!form.contractTemplateKey.trim()) {
      errors.contractTemplateKey = "Selecione um modelo de contrato.";
    } else if (
      !options.contractTemplateOptions.some((item) => item.key === form.contractTemplateKey)
    ) {
      errors.contractTemplateKey = "Modelo de contrato selecionado nao existe.";
    }
  }

  return errors;
}

function buildAutomaticProfileName(form: Pick<FormState, "cargoName" | "cargoLevel" | "contractType">): string {
  const cargoName = form.cargoName.trim();
  const cargoLevel = form.cargoLevel.trim();
  const contractLabel = resolveContractLabel(form.contractType);
  const cargoWithLevel = [cargoName, cargoLevel].filter((item) => item.length > 0).join(" ");

  if (cargoWithLevel.length > 0) {
    return `${cargoWithLevel} - ${contractLabel}`;
  }

  return `Perfil - ${contractLabel}`;
}

function buildPayload(params: {
  form: FormState;
  isLaborContract: boolean;
  allowsOvertimePolicy: boolean;
  usesIntermittentRemunerationFlow: boolean;
  selectedJourney?: WorkJourneyTemplate;
  selectedJourneySummary: string;
  selectedOvertime?: OvertimeTemplate;
  selectedNight?: OvertimeTemplate;
  selectedContractTemplate?: ContractTemplateOption;
}) {
  const {
    form,
    isLaborContract,
    allowsOvertimePolicy,
    usesIntermittentRemunerationFlow,
    selectedJourney,
    selectedJourneySummary,
    selectedOvertime,
    selectedNight,
    selectedContractTemplate
  } = params;
  const journeyReferenceId = form.journeyTemplateId ? selectedJourney?.id : undefined;
  const usesOvertime = allowsOvertimePolicy ? form.usesOvertime : false;
  const usesNightPolicy = isLaborContract ? form.usesNightPolicy : false;
  const holidayScopeType = isLaborContract ? form.holidayScopeType || undefined : undefined;
  const holidayStateCode =
    holidayScopeType === "STATE" || holidayScopeType === "CITY"
      ? form.holidayStateCode.trim().toUpperCase() || undefined
      : undefined;
  const holidayCityCode =
    holidayScopeType === "CITY" ? form.holidayCityCode.trim() || undefined : undefined;

  return {
    name: buildAutomaticProfileName(form),
    description: form.description.trim() || undefined,
    isActive: form.isActive,
    cargoId: form.cargoId.trim(),
    cargoLevel: form.cargoLevel.trim() || undefined,
    contractType: form.contractType,
    engagementType: isLaborContract ? undefined : form.engagementType,
    availabilityDays:
      !isLaborContract && form.availabilityDays.length > 0 ? form.availabilityDays : undefined,
    availabilityStartTime:
      !isLaborContract && form.availabilityStartTime.trim().length > 0
        ? form.availabilityStartTime
        : undefined,
    availabilityEndTime:
      !isLaborContract && form.availabilityEndTime.trim().length > 0 ? form.availabilityEndTime : undefined,
    journeyTemplateId: journeyReferenceId,
    journeyTemplateName: selectedJourney?.name,
    journeySummary: selectedJourneySummary || undefined,
    remuneration: {
      model:
        usesIntermittentRemunerationFlow
          ? form.hasVariableCompensation
            ? "FIXED_PLUS_COMMISSION"
            : "FIXED"
          : form.remunerationModel,
      baseType: usesIntermittentRemunerationFlow ? form.baseRemunerationType : undefined,
      hasVariableCompensation:
        usesIntermittentRemunerationFlow ? form.hasVariableCompensation : undefined,
      fixedSalary:
        usesIntermittentRemunerationFlow
          ? toNumber(form.fixedSalary)
          : form.remunerationModel === "COMMISSION_ONLY"
            ? undefined
            : toNumber(form.fixedSalary),
      commissionType:
        usesIntermittentRemunerationFlow
          ? form.hasVariableCompensation
            ? form.commissionType
            : undefined
          : form.remunerationModel === "FIXED"
            ? undefined
            : form.commissionType,
      commissionValue:
        usesIntermittentRemunerationFlow
          ? form.hasVariableCompensation
            ? toNumber(form.commissionValue)
            : undefined
          : form.remunerationModel === "FIXED"
            ? undefined
            : toNumber(form.commissionValue),
      commissionRule:
        usesIntermittentRemunerationFlow
          ? form.hasVariableCompensation
            ? form.commissionRule.trim() || undefined
            : undefined
          : form.remunerationModel === "FIXED"
            ? undefined
            : form.commissionRule.trim() || undefined,
      contractTemplateKey: form.contractTemplateKey.trim() || undefined,
      contractTemplateName: form.contractTemplateName.trim() || undefined,
      contractTemplateVersion: form.contractTemplateVersion.trim() || undefined,
      contractTemplateContent: selectedContractTemplate?.content || undefined
    },
    usesOvertime,
    overtimeTemplateId: usesOvertime ? selectedOvertime?.id : undefined,
    overtimeTemplateName: usesOvertime ? selectedOvertime?.name : undefined,
    overtimeSummary:
      usesOvertime && selectedOvertime
        ? [selectedOvertime.name, selectedOvertime.description].filter(Boolean).join(" | ")
        : undefined,
    usesNightPolicy,
    nightTemplateId: usesNightPolicy ? selectedNight?.id : undefined,
    nightTemplateName: usesNightPolicy ? selectedNight?.name : undefined,
    nightSummary:
      usesNightPolicy && selectedNight
        ? [selectedNight.name, selectedNight.description].filter(Boolean).join(" | ")
        : undefined,
    holidayScopeType,
    holidayStateCode,
    holidayCityCode,
    holidaySummary:
      isLaborContract && holidayScopeType
        ? buildHolidayScopePreview(holidayScopeType, holidayStateCode, holidayCityCode)
        : undefined,
    benefits: form.linkedBenefits.map((item) => ({
      id: item.benefitId,
      name: item.benefitName,
      summary: buildLinkedBenefitSummary(item)
    })),
    allowContractEditing: form.allowContractEditing,
    allowJourneyCustomization: form.allowJourneyCustomization,
    allowBenefitsCustomization: form.allowBenefitsCustomization
  };
}

function buildSummary(params: {
  form: FormState;
  isLaborContract: boolean;
  allowsOvertimePolicy: boolean;
  selectedJourney?: WorkJourneyTemplate;
  selectedOvertime?: OvertimeTemplate;
  selectedNight?: OvertimeTemplate;
  selectedContractTemplate?: ContractTemplateOption;
}): string {
  const {
    form,
    isLaborContract,
    allowsOvertimePolicy,
    selectedJourney,
    selectedOvertime,
    selectedNight,
    selectedContractTemplate
  } = params;
  const intro = `Perfil ${resolveContractLabel(form.contractType)}${
    form.cargoName.trim() ? ` para o cargo ${form.cargoName.trim()}` : ""
  }${form.cargoLevel.trim() ? ` no nivel ${form.cargoLevel.trim()}` : ""}`;

  const details: string[] = [];
  const remunerationSummary = buildRemunerationSummary(form, form.contractType);
  if (remunerationSummary) {
    details.push(remunerationSummary);
  }
  if (isLaborContract) {
    if (selectedJourney?.name) {
      details.push(`com jornada ${selectedJourney.name}`);
    } else {
      details.push("com jornada pendente");
    }
  } else {
    details.push(`atuacao ${resolveEngagementLabel(form.engagementType).toLowerCase()}`);
    if (form.availabilityDays.length > 0) {
      details.push(`disponibilidade em ${formatDayList(form.availabilityDays).toLowerCase()}`);
    }
    if (form.availabilityStartTime && form.availabilityEndTime) {
      details.push(`faixa ${form.availabilityStartTime} as ${form.availabilityEndTime}`);
    }
    if (selectedJourney?.name) {
      details.push(`jornada de referencia ${selectedJourney.name}`);
    }
  }

  if (allowsOvertimePolicy && form.usesOvertime) {
    details.push(
      selectedOvertime
        ? `com politica de hora extra "${selectedOvertime.name}"`
        : "com hora extra ativada e politica pendente"
    );
  } else if (isLaborContract) {
    details.push("sem politica de hora extra");
  }

  if (isLaborContract && form.usesNightPolicy) {
    details.push(
      selectedNight
        ? `com adicional noturno "${selectedNight.name}"`
        : "com adicional noturno ativado e politica pendente"
    );
  } else if (isLaborContract) {
    details.push("sem adicional noturno");
  }

  if (isLaborContract && selectedJourney?.dsrPolicy?.enabled) {
    details.push("DSR definido na jornada");
  } else if (isLaborContract) {
    details.push("DSR sem politica dedicada");
  }

  if (isLaborContract && form.holidayScopeType) {
    details.push(
      buildHolidayScopePreview(
        form.holidayScopeType,
        form.holidayStateCode.trim().toUpperCase() || undefined,
        form.holidayCityCode.trim() || undefined
      )
    );
  } else if (isLaborContract) {
    details.push("feriados sem escopo configurado");
  }

  if (form.linkedBenefits.length > 0) {
    details.push(`beneficios vinculados: ${buildBenefitsPreview(form.linkedBenefits)}`);
  } else {
    details.push("sem beneficios vinculados");
  }

  if (selectedContractTemplate) {
    details.push(
      `modelo de contrato ${selectedContractTemplate.name} (${selectedContractTemplate.version})`
    );
  } else if (form.contractTemplateKey.trim()) {
    details.push(`modelo de contrato ${form.contractTemplateKey.trim()}`);
  }

  return [intro, ...details].join(", ") + ".";
}

function buildJourneyPreview(journey?: WorkJourneyTemplate): string | null {
  if (!journey) return null;

  const breakSummary =
    journey.breakType === "NONE"
      ? "sem intervalo"
      : `com intervalo de ${journey.breakDurationMinutes ?? 0} min`;

  if (journey.type === "FIXED" && journey.fixedConfig) {
    return `Jornada ${resolveScaleTypeLabel(journey.fixedConfig.scaleType)}, dias ${formatDayList(
      journey.fixedConfig.activeDays
    ).toLowerCase()}, das ${journey.fixedConfig.startTime} as ${journey.fixedConfig.endTime}, ${breakSummary}.`;
  }

  if (journey.type === "FLEXIBLE" && journey.flexibleConfig) {
    return `Jornada flexivel com entrada entre ${journey.flexibleConfig.entryWindowStart} e ${journey.flexibleConfig.entryWindowEnd}, saida entre ${journey.flexibleConfig.exitWindowStart} e ${journey.flexibleConfig.exitWindowEnd}, carga esperada de ${journey.flexibleConfig.expectedDailyHours}h/dia, ${breakSummary}.`;
  }

  if (journey.type === "INTERMITTENT" && journey.intermittentConfig) {
    return `Jornada intermitente com convocacoes de ${journey.intermittentConfig.minHoursPerCall}h a ${journey.intermittentConfig.maxHoursPerCall}h, em ${formatDayList(
      journey.intermittentConfig.callDays
    ).toLowerCase()}, faixa ${journey.intermittentConfig.allowedStartTime} as ${journey.intermittentConfig.allowedEndTime}.`;
  }

  return summarizeWorkJourney(journey).slice(0, 2).join(" | ");
}

function buildOvertimePreview(template?: OvertimeTemplate): string | null {
  if (!template) return null;
  if (template.description?.trim()) {
    return `${template.name} - ${template.description.trim()}`;
  }
  return template.name;
}

function buildHolidayScopePreview(
  scopeType: HolidayScopeType,
  stateCode?: string,
  cityCode?: string
): string {
  if (scopeType === "CITY") {
    return `Feriados municipais (${cityCode ?? "cidade"} - ${stateCode ?? "UF"})`;
  }
  if (scopeType === "STATE") {
    return `Feriados estaduais (${stateCode ?? "UF"})`;
  }
  return "Feriados nacionais";
}

function buildBenefitsPreview(linkedBenefits: LinkedBenefitConfig[]): string {
  if (linkedBenefits.length === 0) {
    return "Nenhum beneficio vinculado.";
  }

  const names = linkedBenefits
    .map((item) => item.benefitName.trim())
    .filter((name) => name.length > 0);
  if (names.length === 0) {
    return "Nenhum beneficio vinculado.";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} + ${names[1]}`;
  }
  return `${names[0]} + ${names[1]} + mais ${names.length - 2}`;
}

function buildLinkedBenefitSummary(config: LinkedBenefitConfig, benefit?: Benefit): string {
  const parts: string[] = [];
  const deductFromSalary = resolveLinkedBenefitDeductFromSalary(config);
  parts.push(`custeio ${resolveLinkedBenefitPayerLabel(config.payer).toLowerCase()}`);

  if (benefit?.type === "PERCENTAGE") {
    if (config.percentageValue.trim().length > 0) {
      parts.push(`percentual ${config.percentageValue}%`);
    }
  } else if (benefit?.type !== "INFORMATIVE") {
    if (config.referenceValue.trim().length > 0) {
      parts.push(`referencia R$ ${config.referenceValue}`);
    }
  }

  if (deductFromSalary && config.discountValue.trim().length > 0) {
    const discountLabel =
      config.discountMode === "PERCENT"
        ? `${config.discountValue}%`
        : `R$ ${config.discountValue}`;
    const baseLabel = config.discountBase === "SALARY" ? "sobre salario" : "sobre beneficio";
    parts.push(`desconto ${discountLabel} ${baseLabel}`);
  } else if (deductFromSalary && benefit?.type !== "INFORMATIVE") {
    parts.push("desconto em folha habilitado");
  } else if (!deductFromSalary) {
    parts.push("sem desconto em salario");
  }

  if (config.integratePayroll) {
    parts.push("integrado na folha");
  }

  if (config.mandatoryInContract) {
    parts.push("obrigatorio no contrato");
  }
  if (config.editableInContract) {
    parts.push("editavel no contrato");
  }
  if (config.notes.trim().length > 0) {
    parts.push(`obs: ${config.notes.trim()}`);
  }

  if (parts.length === 0) {
    return config.originalSummary.trim() || "sem configuracao adicional.";
  }

  return parts.join(", ");
}

function createLinkedBenefitConfig(
  benefit?: Benefit,
  seed?: Partial<Pick<LinkedBenefitConfig, "benefitId" | "benefitName" | "originalSummary">>
): LinkedBenefitConfig {
  const valueConfig = benefit?.valueConfig;
  const payer = resolveLinkedBenefitPayerFromBenefit(benefit);
  const deductFromSalary =
    payer === "COMPANY" ? false : payer === "EMPLOYEE" ? true : benefit?.deductFromSalary ?? true;

  return {
    benefitId: seed?.benefitId ?? benefit?.id ?? "",
    benefitName: seed?.benefitName ?? benefit?.name ?? "Beneficio",
    payer,
    deductFromSalary,
    integratePayroll: benefit?.incursCharges ?? false,
    referenceValue:
      valueConfig?.fixedAmount === undefined || valueConfig.fixedAmount === null
        ? ""
        : String(valueConfig.fixedAmount),
    percentageValue:
      valueConfig?.percentageValue === undefined || valueConfig.percentageValue === null
        ? ""
        : String(valueConfig.percentageValue),
    discountMode: valueConfig?.discountMode ?? "AMOUNT",
    discountValue:
      valueConfig?.discountValue === undefined || valueConfig.discountValue === null
        ? ""
        : String(valueConfig.discountValue),
    discountBase: valueConfig?.discountBase ?? "SALARY",
    discountLimit:
      valueConfig?.discountLimit === undefined || valueConfig.discountLimit === null
        ? ""
        : String(valueConfig.discountLimit),
    notes: "",
    mandatoryInContract: benefit?.isMandatory ?? false,
    editableInContract: benefit?.editableInContract ?? true,
    originalSummary: seed?.originalSummary ?? benefit?.summary ?? ""
  };
}

function resolveBenefitTypeLabel(type?: Benefit["type"]): string {
  if (type === "FIXED") return "Valor fixo";
  if (type === "PERCENTAGE") return "Percentual";
  if (type === "VARIABLE") return "Valor variavel";
  if (type === "INFORMATIVE") return "Informativo";
  return "Nao informado";
}

function resolveBenefitFrequencyLabel(frequency?: Benefit["frequency"]): string {
  if (frequency === "DAILY") return "Frequencia diaria";
  if (frequency === "MONTHLY") return "Frequencia mensal";
  if (frequency === "PER_USE") return "Por uso";
  if (frequency === "PER_TRIP") return "Por viagem";
  if (frequency === "ONE_TIME") return "Evento unico";
  return "Frequencia nao definida";
}

function resolveLinkedBenefitPayerFromBenefit(benefit?: Benefit): LinkedBenefitPayer {
  if (!benefit) return "SHARED";
  if (!benefit.deductFromSalary) return "COMPANY";
  return benefit.incursCharges ? "SHARED" : "EMPLOYEE";
}

function resolveLinkedBenefitPayerLabel(value: LinkedBenefitPayer): string {
  if (value === "EMPLOYEE") return "Colaborador";
  if (value === "SHARED") return "Dividido";
  return "Empresa";
}

function resolveLinkedBenefitDeductFromSalary(config: LinkedBenefitConfig): boolean {
  if (config.payer === "COMPANY") return false;
  if (config.payer === "EMPLOYEE") return true;
  return config.deductFromSalary;
}

function shouldShowLinkedBenefitDiscountBlock(config: LinkedBenefitConfig, benefit?: Benefit): boolean {
  if (benefit?.type === "INFORMATIVE") return false;
  return resolveLinkedBenefitDeductFromSalary(config);
}

function applyLinkedBenefitPayer(
  benefitId: string,
  payer: LinkedBenefitPayer,
  update: (
    benefitId: string,
    patch: Partial<Omit<LinkedBenefitConfig, "benefitId" | "benefitName">>
  ) => void
) {
  if (payer === "COMPANY") {
    update(benefitId, {
      payer,
      deductFromSalary: false
    });
    return;
  }
  if (payer === "EMPLOYEE") {
    update(benefitId, {
      payer,
      deductFromSalary: true
    });
    return;
  }
  update(benefitId, { payer });
}

function resolveEngagementLabel(value: EngagementType): string {
  if (value === "BY_SCALE") return "Por escala";
  if (value === "FREE") return "Livre";
  return "Por demanda";
}

function buildRemunerationSummary(
  form: FormState,
  contractType: WorkProfileContractType
): string | null {
  const capabilities = getEmploymentLinkageCapabilities(contractType);
  if (!capabilities.usesIntermittentRemunerationFlow) {
    if (form.remunerationModel === "FIXED") {
      const fixedSalary = toNumber(form.fixedSalary);
      if (fixedSalary !== undefined && fixedSalary > 0) {
        return `com salario fixo de ${formatCurrency(fixedSalary)}`;
      }
      return null;
    }

    if (form.remunerationModel === "FIXED_PLUS_COMMISSION") {
      const fixedSalary = toNumber(form.fixedSalary);
      const commissionValue = toNumber(form.commissionValue);
      const parts: string[] = [];
      if (fixedSalary !== undefined && fixedSalary > 0) {
        parts.push(`salario de ${formatCurrency(fixedSalary)}`);
      }
      if (commissionValue !== undefined && commissionValue > 0) {
        parts.push(`comissao ${resolveCommissionLabel(form.commissionType)} de ${commissionValue}`);
      }
      if (parts.length === 0) {
        return null;
      }
      return `com ${parts.join(" e ")}`;
    }

    if (form.remunerationModel === "COMMISSION_ONLY") {
      const commissionValue = toNumber(form.commissionValue);
      if (commissionValue !== undefined && commissionValue > 0) {
        return `com remuneracao por comissao ${resolveCommissionLabel(form.commissionType)} de ${commissionValue}`;
      }
      return null;
    }

    return null;
  }

  const baseValue = toNumber(form.fixedSalary);
  if (baseValue === undefined || baseValue <= 0) {
    return null;
  }
  const baseLabel =
    form.baseRemunerationType === "HOUR"
      ? `valor por hora de ${formatCurrency(baseValue)}`
      : form.baseRemunerationType === "DAILY"
        ? `valor por diaria de ${formatCurrency(baseValue)}`
        : `valor por evento/servico de ${formatCurrency(baseValue)}`;

  if (form.hasVariableCompensation) {
    const commissionValue = toNumber(form.commissionValue);
    const parts: string[] = [baseLabel];
    if (commissionValue !== undefined && commissionValue > 0) {
      const variableLabel = form.commissionType === "PER_RIDE" ? "por evento/servico" : "percentual";
      parts.push(`variavel ${variableLabel} de ${commissionValue}`);
    }
    return `com ${parts.join(" e ")}`;
  }
  return `com ${baseLabel}`;
}

function resolveContractLabel(value: WorkProfileContractType): string {
  return resolveEmploymentLinkageTitle(value);
}

function isValidContractType(value: string): value is WorkProfileContractType {
  return validContractTypes.has(value as WorkProfileContractType);
}

function isValidEngagementType(value: string): value is EngagementType {
  return value === "ON_DEMAND" || value === "BY_SCALE" || value === "FREE";
}

function isValidBaseRemunerationType(value: string): value is WorkProfileBaseRemunerationType {
  return value === "HOUR" || value === "DAILY" || value === "EVENT";
}

function isValidRemunerationModel(value: string): value is WorkProfileRemunerationModel {
  return value === "FIXED" || value === "FIXED_PLUS_COMMISSION" || value === "COMMISSION_ONLY";
}

function resolveCommissionLabel(value: WorkProfileCommissionType): string {
  if (value === "PER_RIDE") return "por corrida";
  return "percentual";
}

function toNumber(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isClock(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

function toMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(":");
  return Number(hourRaw) * 60 + Number(minuteRaw);
}
