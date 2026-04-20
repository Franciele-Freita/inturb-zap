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

const STORAGE_KEY = "admin_panel_administrative_cargo_v1";
const DEFAULT_CARGO_LEVEL = "OPERACIONAL";
const DEFAULT_CARGO_DEPARTMENT = "Opera\u00e7\u00f5es";
const DEFAULT_CARGO_SENIORITY_LEVELS = ["Junior", "Pleno", "Senior"] as const;

const CARGO_DEPARTMENT_FALLBACK_OPTIONS = [
  "Administrativo",
  "Comercial",
  "Financeiro",
  "RH",
  "Opera\u00e7\u00f5es"
];

const defaultCargoItems: CargoCatalogItem[] = [
  {
    id: "cargo_motorista_frota",
    name: "Motorista de frota",
    description: "Conducao operacional de veiculos da frota em rotas programadas.",
    department: "Opera\u00e7\u00f5es",
    level: "OPERACIONAL",
    levels: [...DEFAULT_CARGO_SENIORITY_LEVELS],
    isActive: true,
    createdAt: "2026-04-10T13:00:00.000Z",
    updatedAt: "2026-04-12T10:30:00.000Z"
  },
  {
    id: "cargo_motorista_agregado",
    name: "Motorista agregado",
    description: "Operacao com veiculo agregado seguindo padroes e janelas definidas.",
    department: "Opera\u00e7\u00f5es",
    level: "OPERACIONAL",
    levels: [...DEFAULT_CARGO_SENIORITY_LEVELS],
    isActive: true,
    createdAt: "2026-04-10T13:10:00.000Z",
    updatedAt: "2026-04-11T17:45:00.000Z"
  },
  {
    id: "cargo_monitor_operacional",
    name: "Monitor operacional",
    description: "Acompanha desempenho da operacao e direciona ajustes taticos.",
    department: "Opera\u00e7\u00f5es",
    level: "LIDERANCA",
    levels: ["Pleno", "Senior"],
    isActive: false,
    createdAt: "2026-04-10T13:20:00.000Z",
    updatedAt: "2026-04-10T13:20:00.000Z"
  }
];

export function sortCargoCatalogByName(items: CargoCatalogItem[]): CargoCatalogItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function loadCargoCatalogItems(): CargoCatalogItem[] {
  if (typeof window === "undefined") {
    return sortCargoCatalogByName(defaultCargoItems);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return sortCargoCatalogByName(defaultCargoItems);
  }

  try {
    const parsed = JSON.parse(raw) as CargoCatalogItem[];
    if (!Array.isArray(parsed)) {
      return sortCargoCatalogByName(defaultCargoItems);
    }

    return sortCargoCatalogByName(
      parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: typeof item.id === "string" && item.id.trim() ? item.id : `cargo_${Date.now()}`,
          name: typeof item.name === "string" && item.name.trim() ? item.name : "Cargo sem nome",
          description:
            typeof item.description === "string" && item.description.trim().length > 0
              ? item.description.trim()
              : undefined,
          department:
            typeof item.department === "string" && item.department.trim()
              ? normalizeCargoDepartment(item.department)
              : DEFAULT_CARGO_DEPARTMENT,
          level:
            typeof item.level === "string" && item.level.trim()
              ? normalizeCargoLevel(item.level)
              : DEFAULT_CARGO_LEVEL,
          levels: normalizeCargoSeniorityLevels(item.levels, item.level),
          isActive: Boolean(item.isActive),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString()
        }))
    );
  } catch {
    return sortCargoCatalogByName(defaultCargoItems);
  }
}

export function saveCargoCatalogItems(items: CargoCatalogItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sortCargoCatalogByName(items))
  );
}

export function getCargoCatalogItemById(id: string): CargoCatalogItem | undefined {
  return loadCargoCatalogItems().find((item) => item.id === id);
}

export function listActiveCargoNames(): string[] {
  return listActiveCargoItems().map((item) => item.name);
}

export function listActiveCargoItems(): CargoCatalogItem[] {
  return loadCargoCatalogItems().filter((item) => item.isActive);
}

export function listCargoLevelsByName(cargoName: string): string[] {
  const normalizedName = cargoName.trim().toLowerCase();
  if (!normalizedName) {
    return [...DEFAULT_CARGO_SENIORITY_LEVELS];
  }

  const item = loadCargoCatalogItems().find(
    (cargo) => cargo.name.trim().toLowerCase() === normalizedName
  );

  if (!item || !item.isActive) {
    return [...DEFAULT_CARGO_SENIORITY_LEVELS];
  }

  return normalizeCargoSeniorityLevels(item.levels, item.level);
}

export function listCargoDepartmentOptions(): string[] {
  return CARGO_DEPARTMENT_FALLBACK_OPTIONS;
}

export function normalizeCargoLevel(level: string): string {
  const normalized = level.trim().toUpperCase();
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
  if (normalized === "ANALISTA" || normalized === "TECNICA" || normalized === "TECNICO") {
    return "TECNICO";
  }
  if (normalized === "SUPERVISOR" || normalized === "COORDENADOR") {
    return "LIDERANCA";
  }
  if (normalized === "SUPERVISAO" || normalized === "COORDENACAO" || normalized === "TATICO") {
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
    return "T\u00e9cnico";
  }
  if (normalized === "ADMINISTRATIVO") {
    return "Administrativo";
  }
  if (normalized === "LIDERANCA") {
    return "Lideran\u00e7a";
  }
  if (normalized === "GESTAO") {
    return "Gest\u00e3o";
  }
  if (normalized === "ESTRATEGICO") {
    return "Estrat\u00e9gico";
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

  const legacy = normalizeCargoLevel(fallbackLegacyLevel ?? "");
  if (legacy === "LIDERANCA" || legacy === "GESTAO" || legacy === "ESTRATEGICO") {
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

function normalizeCargoDepartment(department: string): string {
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
    normalized === "OPERA\u00c7\u00d5ES" ||
    normalized === "OPERACAO" ||
    normalized === "OPERACIONAL" ||
    normalized === "CENTRAL OPERACIONAL"
  ) {
    return "Opera\u00e7\u00f5es";
  }
  return DEFAULT_CARGO_DEPARTMENT;
}
