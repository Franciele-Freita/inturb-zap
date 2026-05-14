import { CompanyEmploymentLinkage, CompanyProfileConfig, WorkProfile } from "./api";

export const DEFAULT_EMPLOYMENT_LINKAGES: CompanyEmploymentLinkage[] = [
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

export type EmploymentLinkageCapabilities = {
  isLaborRegime: boolean;
  requiresJourneyTemplate: boolean;
  allowsOvertimePolicy: boolean;
  usesIntermittentRemunerationFlow: boolean;
};

export type EmploymentLinkageOption = {
  value: CompanyEmploymentLinkage["key"];
  label: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPLOYMENT_LINKAGE_CAPABILITIES: Record<
  CompanyEmploymentLinkage["key"],
  EmploymentLinkageCapabilities
> = {
  CLT: {
    isLaborRegime: true,
    requiresJourneyTemplate: true,
    allowsOvertimePolicy: true,
    usesIntermittentRemunerationFlow: false
  },
  CLT_INTERMITENTE: {
    isLaborRegime: true,
    requiresJourneyTemplate: true,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: true
  },
  MEI: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  },
  PJ: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  },
  AUTONOMO: {
    isLaborRegime: false,
    requiresJourneyTemplate: false,
    allowsOvertimePolicy: false,
    usesIntermittentRemunerationFlow: false
  }
};

export function normalizeEmploymentLinkages(
  value: CompanyProfileConfig["employmentLinkages"]
): CompanyEmploymentLinkage[] {
  const defaultMap = new Map(DEFAULT_EMPLOYMENT_LINKAGES.map((item) => [item.key, item]));
  const merged = new Map(DEFAULT_EMPLOYMENT_LINKAGES.map((item) => [item.key, { ...item }]));

  (value ?? []).forEach((item) => {
    const fallback = defaultMap.get(item.key);
    if (!fallback) return;
    merged.set(item.key, {
      key: item.key,
      label: item.label?.trim() || fallback.label,
      description: item.description?.trim() || fallback.description,
      isActive: item.isActive ?? fallback.isActive,
      sortOrder:
        typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
          ? Math.min(Math.max(Math.trunc(item.sortOrder), 1), 99)
          : fallback.sortOrder
    });
  });

  return [...merged.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function resolveEmploymentLinkageTitle(value: CompanyEmploymentLinkage["key"]): string {
  if (value === "CLT_INTERMITENTE") return "CLT Intermitente";
  if (value === "MEI") return "MEI";
  if (value === "PJ") return "Pessoa Juridica (PJ)";
  if (value === "AUTONOMO") return "Autonomo";
  return "CLT";
}

export function buildEmploymentLinkageOptions(
  value: CompanyProfileConfig["employmentLinkages"]
): EmploymentLinkageOption[] {
  return normalizeEmploymentLinkages(value).map((item) => ({
    value: item.key,
    label: item.label?.trim() || resolveEmploymentLinkageTitle(item.key),
    isActive: item.isActive,
    sortOrder: item.sortOrder
  }));
}

export function getEmploymentLinkageCapabilities(
  value: CompanyEmploymentLinkage["key"]
): EmploymentLinkageCapabilities {
  return EMPLOYMENT_LINKAGE_CAPABILITIES[value];
}

export function clampSortOrder(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.trunc(parsed), 1), 99);
}

export function buildUsageByLinkageKey(profiles: WorkProfile[]): Record<CompanyEmploymentLinkage["key"], number> {
  const totals: Record<CompanyEmploymentLinkage["key"], number> = {
    CLT: 0,
    CLT_INTERMITENTE: 0,
    MEI: 0,
    PJ: 0,
    AUTONOMO: 0
  };

  profiles.forEach((profile) => {
    totals[profile.contractType] += 1;
  });

  return totals;
}
