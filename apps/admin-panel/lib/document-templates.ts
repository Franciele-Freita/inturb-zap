"use client";

export type TemplateScope = "DRIVER_EMPLOYMENT" | "VEHICLE" | "STAFF";
export type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type DocumentTemplate = {
  id: string;
  key: string;
  name: string;
  scope: TemplateScope;
  version: string;
  status: TemplateStatus;
  updatedAt: string;
  content: string;
};

export type TemplateVariable = {
  token: string;
  label: string;
  description: string;
};

export type TemplateVariableEntry = TemplateVariable & {
  scope: TemplateScope;
};

export type TemplateVariableGroup =
  | "DRIVER"
  | "CONTRACT"
  | "JOURNEY"
  | "VEHICLE"
  | "STAFF"
  | "COMPANY"
  | "GENERATED"
  | "OTHER";

export type InlineTemplateCommand = {
  start: number;
  end: number;
  query: string;
};

const STORAGE_KEY = "admin_panel_document_templates_v1";

const defaultTemplates: DocumentTemplate[] = [
  {
    id: "tpl_driver_clt_v1",
    key: "DRIVER_CLT_STANDARD",
    name: "Contrato CLT padrao",
    scope: "DRIVER_EMPLOYMENT",
    version: "v1",
    status: "PUBLISHED",
    updatedAt: "2026-03-31T10:00:00.000Z",
    content: "CONTRATO CLT\nColaborador: {{driver.name}}\nCPF: {{driver.cpf}}\nInicio: {{contract.startDate}}"
  },
  {
    id: "tpl_driver_inter_v1",
    key: "DRIVER_INTERMITENTE_STANDARD",
    name: "Contrato Intermitente padrao",
    scope: "DRIVER_EMPLOYMENT",
    version: "v1",
    status: "PUBLISHED",
    updatedAt: "2026-03-31T10:10:00.000Z",
    content:
      "CONTRATO INTERMITENTE\nColaborador: {{driver.name}}\nModelo: {{contract.intermittentPaymentMode}}"
  },
  {
    id: "tpl_vehicle_term_v1",
    key: "VEHICLE_OPERATION_TERM",
    name: "Termo de veiculo da frota",
    scope: "VEHICLE",
    version: "v1",
    status: "DRAFT",
    updatedAt: "2026-03-31T10:20:00.000Z",
    content: "TERMO DE VEICULO\nMotorista: {{driver.name}}\nPlaca: {{vehicle.plate}}"
  }
];

const companyTemplateVariables: TemplateVariable[] = [
  { token: "{{company.legalName}}", label: "Razao social", description: "Razao social da empresa contratante." },
  { token: "{{company.tradeName}}", label: "Nome fantasia", description: "Nome fantasia da empresa." },
  { token: "{{company.cnpj}}", label: "CNPJ da empresa", description: "CNPJ institucional cadastrado." },
  { token: "{{company.phone}}", label: "Telefone da empresa", description: "Telefone institucional da empresa." },
  { token: "{{company.email}}", label: "E-mail da empresa", description: "E-mail institucional da empresa." },
  { token: "{{company.website}}", label: "Site da empresa", description: "Site institucional (quando houver)." },
  { token: "{{company.address.zipCode}}", label: "CEP da empresa", description: "CEP do endereco da empresa." },
  { token: "{{company.address.street}}", label: "Rua da empresa", description: "Logradouro do endereco da empresa." },
  { token: "{{company.address.number}}", label: "Numero da empresa", description: "Numero do endereco da empresa." },
  { token: "{{company.address.neighborhood}}", label: "Bairro da empresa", description: "Bairro do endereco da empresa." },
  { token: "{{company.address.city}}", label: "Cidade da empresa", description: "Cidade da empresa." },
  { token: "{{company.address.state}}", label: "UF da empresa", description: "UF da empresa." },
  {
    token: "{{company.address.full}}",
    label: "Endereco completo da empresa",
    description: "Endereco completo da empresa em uma linha."
  },
  {
    token: "{{company.representative.name}}",
    label: "Representante legal",
    description: "Nome do representante legal da contratante."
  },
  {
    token: "{{company.representative.cpf}}",
    label: "CPF do representante",
    description: "CPF do representante legal."
  },
  {
    token: "{{company.representative.role}}",
    label: "Cargo do representante",
    description: "Cargo/funcao do representante legal."
  },
  {
    token: "{{company.contractSignatureCity}}",
    label: "Cidade de assinatura",
    description: "Cidade usada na clausula de assinatura do contrato."
  }
];

export const TEMPLATE_VARIABLES: Record<TemplateScope, TemplateVariable[]> = {
  DRIVER_EMPLOYMENT: [
    { token: "{{driver.id}}", label: "ID do motorista", description: "Identificador interno." },
    { token: "{{driver.name}}", label: "Nome do motorista", description: "Nome completo do cadastro." },
    {
      token: "{{driver.role}}",
      label: "Cargo do motorista",
      description: "Cargo/funcao contratual do motorista."
    },
    { token: "{{driver.cpf}}", label: "CPF", description: "CPF informado no cadastro." },
    { token: "{{driver.phone}}", label: "Telefone", description: "Telefone principal do motorista." },
    { token: "{{driver.email}}", label: "E-mail", description: "E-mail cadastrado (se houver)." },
    { token: "{{driver.driverType}}", label: "Tipo de motorista", description: "Frota, agregado, etc." },
    { token: "{{driver.address.zipCode}}", label: "CEP do motorista", description: "CEP residencial do motorista." },
    { token: "{{driver.address.street}}", label: "Rua do motorista", description: "Logradouro residencial do motorista." },
    { token: "{{driver.address.number}}", label: "Numero do endereco", description: "Numero do endereco residencial." },
    { token: "{{driver.address.neighborhood}}", label: "Bairro do motorista", description: "Bairro residencial do motorista." },
    { token: "{{driver.address.complement}}", label: "Complemento do endereco", description: "Complemento residencial (quando houver)." },
    { token: "{{driver.address.city}}", label: "Cidade do motorista", description: "Cidade residencial do motorista." },
    { token: "{{driver.address.state}}", label: "UF do motorista", description: "UF residencial do motorista." },
    { token: "{{driver.address.type}}", label: "Tipo de endereco", description: "Tipo de endereco informado no cadastro." },
    { token: "{{driver.address.full}}", label: "Endereco completo do motorista", description: "Endereco completo do motorista em uma linha." },
    { token: "{{contract.startDate}}", label: "Inicio do contrato", description: "Data de inicio." },
    { token: "{{contract.endDate}}", label: "Fim do contrato", description: "Data final (quando houver)." },
    { token: "{{contract.profile}}", label: "Perfil contratual", description: "CLT, Intermitente ou MEI." },
    { token: "{{contract.salaryModel}}", label: "Modelo salarial", description: "Fixo, fixo + comissao, etc." },
    { token: "{{contract.paymentMethod}}", label: "Forma de pagamento", description: "Pix, transferencia, boleto..." },
    { token: "{{contract.paymentFrequency}}", label: "Frequencia de pagamento", description: "Diaria, semanal, quinzenal, mensal." },
    {
      token: "{{contract.intermittentPaymentMode}}",
      label: "Pagamento intermitente",
      description: "Modo de pagamento do perfil intermitente."
    },
    { token: "{{journey.shift}}", label: "Turno", description: "Turno operacional configurado." },
    { token: "{{journey.workStart}}", label: "Inicio da jornada", description: "Horario inicial configurado." },
    { token: "{{journey.workEnd}}", label: "Fim da jornada", description: "Horario final configurado." },
    { token: "{{generatedAt}}", label: "Data e hora da geracao", description: "Data/hora de emissao do documento." },
    { token: "{{generatedDate}}", label: "Data da geracao", description: "Somente data (dd/mm/aaaa)." },
    { token: "{{generatedTime}}", label: "Hora da geracao", description: "Somente hora (hh:mm)." },
    { token: "{{generatedDay}}", label: "Dia da geracao", description: "Dia numerico (dd)." },
    { token: "{{generatedMonth}}", label: "Mes da geracao", description: "Mes numerico (mm)." },
    { token: "{{generatedMonthName}}", label: "Mes por extenso", description: "Nome do mes (ex.: marco)." },
    { token: "{{generatedYear}}", label: "Ano da geracao", description: "Ano com 4 digitos." },
    ...companyTemplateVariables
  ],
  VEHICLE: [
    { token: "{{vehicle.id}}", label: "ID do veiculo", description: "Identificador interno do veiculo." },
    { token: "{{vehicle.label}}", label: "Nome/label", description: "Nome do veiculo." },
    { token: "{{vehicle.plate}}", label: "Placa", description: "Placa do veiculo." },
    { token: "{{driver.name}}", label: "Motorista", description: "Nome do motorista vinculado." },
    { token: "{{generatedAt}}", label: "Data e hora da geracao", description: "Data/hora de emissao." },
    { token: "{{generatedDate}}", label: "Data da geracao", description: "Somente data (dd/mm/aaaa)." },
    { token: "{{generatedTime}}", label: "Hora da geracao", description: "Somente hora (hh:mm)." },
    { token: "{{generatedDay}}", label: "Dia da geracao", description: "Dia numerico (dd)." },
    { token: "{{generatedMonth}}", label: "Mes da geracao", description: "Mes numerico (mm)." },
    { token: "{{generatedMonthName}}", label: "Mes por extenso", description: "Nome do mes." },
    { token: "{{generatedYear}}", label: "Ano da geracao", description: "Ano com 4 digitos." },
    ...companyTemplateVariables
  ],
  STAFF: [
    { token: "{{staff.id}}", label: "ID do colaborador", description: "Identificador interno." },
    { token: "{{staff.name}}", label: "Nome do colaborador", description: "Nome completo." },
    { token: "{{staff.cpf}}", label: "CPF", description: "CPF cadastrado." },
    { token: "{{generatedAt}}", label: "Data e hora da geracao", description: "Data/hora de emissao." },
    { token: "{{generatedDate}}", label: "Data da geracao", description: "Somente data (dd/mm/aaaa)." },
    { token: "{{generatedTime}}", label: "Hora da geracao", description: "Somente hora (hh:mm)." },
    { token: "{{generatedDay}}", label: "Dia da geracao", description: "Dia numerico (dd)." },
    { token: "{{generatedMonth}}", label: "Mes da geracao", description: "Mes numerico (mm)." },
    { token: "{{generatedMonthName}}", label: "Mes por extenso", description: "Nome do mes." },
    { token: "{{generatedYear}}", label: "Ano da geracao", description: "Ano com 4 digitos." },
    ...companyTemplateVariables
  ]
};

export function resolveScopeLabel(scope: TemplateScope): string {
  if (scope === "DRIVER_EMPLOYMENT") return "Motorista";
  if (scope === "VEHICLE") return "Veiculo";
  return "Outros funcionarios";
}

export function resolveTemplateVariableGroup(input: { token: string }): TemplateVariableGroup {
  if (input.token.startsWith("{{driver.")) return "DRIVER";
  if (input.token.startsWith("{{contract.")) return "CONTRACT";
  if (input.token.startsWith("{{journey.")) return "JOURNEY";
  if (input.token.startsWith("{{vehicle.")) return "VEHICLE";
  if (input.token.startsWith("{{staff.")) return "STAFF";
  if (input.token.startsWith("{{company.")) return "COMPANY";
  if (input.token.startsWith("{{generated")) return "GENERATED";
  return "OTHER";
}

export function resolveTemplateVariableGroupLabel(group: TemplateVariableGroup): string {
  if (group === "DRIVER") return "Dados do motorista";
  if (group === "CONTRACT") return "Dados de contrato";
  if (group === "JOURNEY") return "Dados de jornada";
  if (group === "VEHICLE") return "Dados do veiculo";
  if (group === "STAFF") return "Dados do colaborador";
  if (group === "COMPANY") return "Dados da empresa";
  if (group === "GENERATED") return "Dados de geracao";
  return "Outros dados";
}

function resolveTemplateVariableGroupOrder(group: TemplateVariableGroup): number {
  if (group === "DRIVER") return 0;
  if (group === "CONTRACT") return 1;
  if (group === "JOURNEY") return 2;
  if (group === "VEHICLE") return 3;
  if (group === "STAFF") return 4;
  if (group === "COMPANY") return 5;
  if (group === "GENERATED") return 6;
  return 7;
}

export function resolveTemplateStatusLabel(status: TemplateStatus): string {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "ARCHIVED") return "Arquivado";
  return "Rascunho";
}

export function resolveTemplateTone(status: TemplateStatus): string {
  if (status === "PUBLISHED") return "signed";
  if (status === "ARCHIVED") return "cancelled";
  return "draft";
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

export function incrementVersion(version: string): string {
  const raw = version.trim().toLowerCase().replace(/^v/, "");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return "v1";
  }
  return `v${Math.trunc(parsed) + 1}`;
}

export function generateTemplateKey(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "TEMPLATE";
}

export function loadDocumentTemplates(): DocumentTemplate[] {
  if (typeof window === "undefined") return [...defaultTemplates];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...defaultTemplates];

  try {
    const parsed = JSON.parse(raw) as DocumentTemplate[];
    if (!Array.isArray(parsed)) return [...defaultTemplates];
    return parsed;
  } catch {
    return [...defaultTemplates];
  }
}

export function saveDocumentTemplates(templates: DocumentTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function createDocumentTemplate(input: {
  name: string;
  scope: TemplateScope;
  content: string;
}): DocumentTemplate {
  return {
    id: `tpl_${Date.now()}`,
    key: generateTemplateKey(input.name),
    name: input.name.trim(),
    scope: input.scope,
    version: "v1",
    status: "DRAFT",
    updatedAt: new Date().toISOString(),
    content: input.content.trim()
  };
}

export function filterTemplateVariables(
  scopeFilter: TemplateScope | "ALL",
  query: string
): TemplateVariableEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  return (Object.entries(TEMPLATE_VARIABLES) as [TemplateScope, TemplateVariable[]][])
    .flatMap(([scope, items]) => items.map((item) => ({ ...item, scope })))
    .filter((item) => {
      const matchesScope = scopeFilter === "ALL" || item.scope === scopeFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [item.token, item.label, item.description, item.scope].join(" ").toLowerCase().includes(normalizedQuery);
      return matchesScope && matchesQuery;
    })
    .sort((a, b) => {
      const aGroup = resolveTemplateVariableGroup(a);
      const bGroup = resolveTemplateVariableGroup(b);
      const groupOrderDiff =
        resolveTemplateVariableGroupOrder(aGroup) - resolveTemplateVariableGroupOrder(bGroup);
      if (groupOrderDiff !== 0) {
        return groupOrderDiff;
      }
      return a.token.localeCompare(b.token);
    });
}

export function detectInlineTemplateCommand(value: string, cursorPosition: number): InlineTemplateCommand | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));
  const textBeforeCursor = value.slice(0, safeCursor);

  const slashIndex = textBeforeCursor.lastIndexOf("/");
  if (slashIndex < 0) {
    return null;
  }

  const query = textBeforeCursor.slice(slashIndex + 1);
  if (/\s/.test(query)) {
    return null;
  }

  if (!/^[\w.-]*$/u.test(query)) {
    return null;
  }

  const previousChar = slashIndex > 0 ? textBeforeCursor[slashIndex - 1] : "";
  if (previousChar && /[\p{L}\p{N}_]/u.test(previousChar)) {
    return null;
  }

  return {
    start: slashIndex,
    end: safeCursor,
    query
  };
}
