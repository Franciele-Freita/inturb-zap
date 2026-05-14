export type CargoCatalogItem = {
  id: string;
  name: string;
  description?: string;
  department: string;
  level: string;
  levels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_CARGO_LEVEL = "OPERACIONAL";
const DEFAULT_CARGO_SENIORITY_LEVELS = ["Junior", "Pleno", "Senior"] as const;
const CARGO_LEADERSHIP_LEVELS = ["LIDERANCA", "GESTAO", "ESTRATEGICO"] as const;
const CARGO_PRIMARY_LEVELS = [
  "OPERACIONAL",
  "TECNICO",
  "ADMINISTRATIVO",
  ...CARGO_LEADERSHIP_LEVELS
] as const;

const CARGO_DEPARTMENT_FALLBACK_OPTIONS = [
  "Administrativo",
  "Comercial",
  "Financeiro",
  "RH",
  "Operacoes"
];

export function sortCargoCatalogByName<T extends Pick<CargoCatalogItem, "name">>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function listCargoDepartmentOptions(): string[] {
  return CARGO_DEPARTMENT_FALLBACK_OPTIONS;
}

export function normalizeCargoLevel(level: string): string {
  const normalized = level.trim().toUpperCase();
  if (CARGO_PRIMARY_LEVELS.includes(normalized as (typeof CARGO_PRIMARY_LEVELS)[number])) {
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
  return DEFAULT_CARGO_LEVEL;
}

export function resolveCargoLevelLabel(level: string): string {
  const normalized = normalizeCargoLevel(level);
  if (normalized === "TECNICO") {
    return "Tecnico";
  }
  if (normalized === "ADMINISTRATIVO") {
    return "Administrativo";
  }
  if (normalized === "LIDERANCA") {
    return "Lideranca";
  }
  if (normalized === "GESTAO") {
    return "Gestao";
  }
  if (normalized === "ESTRATEGICO") {
    return "Estrategico";
  }
  return "Operacional";
}

export function normalizeCargoSeniorityLevels(
  levels: unknown,
  fallbackLegacyLevel?: string
): string[] {
  const base = Array.isArray(levels) ? levels : [];
  const normalized = base
    .filter((item) => typeof item === "string")
    .map((item) => normalizeCargoSeniorityLevel(item))
    .filter((item) => item.length > 0);

  const deduped: string[] = [];
  for (const level of normalized) {
    const exists = deduped.some((item) => item.toLowerCase() === level.toLowerCase());
    if (!exists) {
      deduped.push(level);
    }
  }

  if (deduped.length > 0) {
    return deduped.slice(0, 10);
  }

  const legacyLevel = normalizeCargoLevel(fallbackLegacyLevel ?? "");
  if (CARGO_LEADERSHIP_LEVELS.includes(legacyLevel as (typeof CARGO_LEADERSHIP_LEVELS)[number])) {
    return ["Senior"];
  }

  return [...DEFAULT_CARGO_SENIORITY_LEVELS];
}

function normalizeCargoSeniorityLevel(level: string): string {
  const trimmed = level.trim();
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

  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ");
}

export function normalizeCargoDepartment(department: string): string {
  const normalized = department.trim().toUpperCase();
  if (normalized === "ADMINISTRATIVO") {
    return "Administrativo";
  }
  if (normalized === "COMERCIAL") {
    return "Comercial";
  }
  if (normalized === "FINANCEIRO") {
    return "Financeiro";
  }
  if (
    normalized === "RH" ||
    normalized === "RECURSOS HUMANOS" ||
    normalized === "RECURSOS HUMANOS."
  ) {
    return "RH";
  }
  if (
    normalized === "OPERACOES" ||
    normalized === "OPERACAO" ||
    normalized === "OPERACIONAL" ||
    normalized === "CENTRAL OPERACIONAL"
  ) {
    return "Operacoes";
  }
  return department.trim();
}
