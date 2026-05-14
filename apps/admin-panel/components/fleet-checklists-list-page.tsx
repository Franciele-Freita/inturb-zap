"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetChecklistTemplate, formatDateTime, request } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type RoutineFilter = "ALL" | "START_OF_DAY" | "END_OF_DAY";
type Feedback = {
  type: "success" | "error";
  message: string;
};

type FleetChecklistTemplateExtended = FleetChecklistTemplate & {
  description?: string;
  linkedVehiclesCount?: number;
  vehicleCount?: number;
  boundVehiclesCount?: number;
  tags?: string[];
  isMandatory?: boolean;
  mandatory?: boolean;
};

type TemplateRowView = {
  template: FleetChecklistTemplateExtended;
  displayName: string;
  description: string;
  badges: string[];
  linkedVehiclesCount: number;
};

type TemplateDisplayOverride = {
  displayName: string;
  description: string;
  linkedVehiclesCount: number;
  badges: string[];
};

const TEMPLATE_DISPLAY_OVERRIDES: Record<string, TemplateDisplayOverride> = {
  "rotina de saida do veiculo": {
    displayName: "Checklist diario operacional",
    description: "Inspecao obrigatoria antes da primeira rota do dia.",
    linkedVehiclesCount: 8,
    badges: ["Obrigatorio", "Operacional", "Pre-viagem"]
  },
  "checklist tecnico de abertura": {
    displayName: "Checklist tecnico de seguranca",
    description: "Validacao tecnica antes da liberacao do veiculo para operacao.",
    linkedVehiclesCount: 6,
    badges: ["Obrigatorio", "Seguranca", "Tecnico"]
  },
  "preparacao operacional": {
    displayName: "Checklist de preparacao operacional",
    description: "Conferencia de itens de apoio e prontidao de atendimento.",
    linkedVehiclesCount: 4,
    badges: ["Operacional", "Pre-viagem"]
  },
  "fechamento e ocorrencias": {
    displayName: "Checklist pos-operacao",
    description: "Verificacao obrigatoria no encerramento da operacao.",
    linkedVehiclesCount: 5,
    badges: ["Obrigatorio", "Operacional"]
  }
};

function resolveRoutineLabel(value: FleetChecklistTemplate["routine"]): string {
  return value === "START_OF_DAY" ? "Inicio do turno" : "Fim do turno";
}

function normalizeTemplateKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveLinkedVehiclesCount(template: FleetChecklistTemplateExtended, fallbackCount: number): number {
  if (typeof template.linkedVehiclesCount === "number") {
    return Math.max(0, template.linkedVehiclesCount);
  }
  if (typeof template.vehicleCount === "number") {
    return Math.max(0, template.vehicleCount);
  }
  if (typeof template.boundVehiclesCount === "number") {
    return Math.max(0, template.boundVehiclesCount);
  }
  return Math.max(0, fallbackCount);
}

function resolveLinkedVehiclesLabel(count: number): string {
  if (count <= 0) {
    return "Nenhum";
  }
  if (count === 1) {
    return "1 veiculo";
  }
  return `${count} veiculos`;
}

function resolveItemsLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "itens"}`;
}

function buildTemplateRowView(rawTemplate: FleetChecklistTemplate): TemplateRowView {
  const template = rawTemplate as FleetChecklistTemplateExtended;
  const override = TEMPLATE_DISPLAY_OVERRIDES[normalizeTemplateKey(template.name)];
  const hasRequiredItems = template.items.some((item) => item.isRequired);
  const displayName = override?.displayName ?? template.name;
  const description =
    template.description?.trim() ||
    override?.description ||
    `Modelo ${template.category.toLowerCase()} para ${resolveRoutineLabel(template.routine).toLowerCase()}.`;

  const apiTags = (template.tags ?? []).filter((item) => item.trim().length > 0);
  const fallbackBadges = override?.badges ?? [template.category];
  const badges = Array.from(new Set([...apiTags, ...fallbackBadges]))
    .slice(0, 3);

  if ((template.isMandatory ?? template.mandatory ?? hasRequiredItems) && !badges.includes("Obrigatorio")) {
    badges.unshift("Obrigatorio");
  }

  return {
    template,
    displayName,
    description,
    badges: badges.slice(0, 4),
    linkedVehiclesCount: resolveLinkedVehiclesCount(template, override?.linkedVehiclesCount ?? 0)
  };
}

export function FleetChecklistsListPage() {
  const [templates, setTemplates] = useState<FleetChecklistTemplateExtended[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [routineFilter, setRoutineFilter] = useState<RoutineFilter>("ALL");
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await request<FleetChecklistTemplateExtended[]>("/admin/fleet/checklist-templates");
      setTemplates(response);
    } catch (error) {
      setTemplates([]);
      setPageError(error instanceof Error ? error.message : "Falha ao carregar checklists.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  async function handleToggleStatus(template: FleetChecklistTemplateExtended) {
    setPendingTemplateId(template.id);

    try {
      const nextTemplates = await request<FleetChecklistTemplateExtended[]>(`/admin/fleet/checklist-templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: template.name,
          category: template.category,
          routine: template.routine,
          isActive: !template.isActive
        })
      });

      setTemplates(nextTemplates);
      setFeedback({
        type: "success",
        message: `Checklist "${template.name}" ${template.isActive ? "inativado" : "ativado"}.`
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : `Falha ao atualizar checklist "${template.name}".`
      });
    } finally {
      setPendingTemplateId(null);
    }
  }

  async function handleDuplicateTemplate(row: TemplateRowView) {
    const source = row.template;
    setPendingTemplateId(source.id);

    try {
      const existingNames = new Set(templates.map((item) => normalizeTemplateKey(item.name)));
      const baseName = `${row.displayName} - copia`;
      let copyName = baseName;
      let suffix = 2;
      while (existingNames.has(normalizeTemplateKey(copyName))) {
        copyName = `${baseName} ${suffix}`;
        suffix += 1;
      }

      let nextTemplates = await request<FleetChecklistTemplateExtended[]>("/admin/fleet/checklist-templates", {
        method: "POST",
        body: JSON.stringify({
          name: copyName,
          category: source.category,
          routine: source.routine,
          isActive: false
        })
      });

      const createdTemplate = [...nextTemplates]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .find((item) => normalizeTemplateKey(item.name) === normalizeTemplateKey(copyName));

      if (createdTemplate) {
        for (const task of source.items) {
          nextTemplates = await request<FleetChecklistTemplateExtended[]>(
            `/admin/fleet/checklist-templates/${createdTemplate.id}/tasks`,
            {
              method: "POST",
              body: JSON.stringify({
                label: task.label,
                description: task.description || undefined,
                inputType: task.inputType,
                actionType: task.actionType,
                selectOptions: task.selectOptions,
                builderConfig: task.builderConfig,
                sortOrder: task.sortOrder,
                isRequired: task.isRequired,
                isActive: task.isActive
              })
            }
          );
        }
      }

      setTemplates(nextTemplates);
      setFeedback({
        type: "success",
        message: `Template "${row.displayName}" duplicado com sucesso.`
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : `Falha ao duplicar template "${row.displayName}".`
      });
    } finally {
      setPendingTemplateId(null);
    }
  }

  const templateRows = useMemo(
    () => templates.map((item) => buildTemplateRowView(item)),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return templateRows
      .filter((item) => {
        const searchKeywords = [
          item.displayName,
          item.description,
          item.template.category,
          resolveRoutineLabel(item.template.routine),
          ...item.badges
        ];

        const matchesSearch =
          normalizedSearch.length === 0 ||
          searchKeywords.join(" ").toLowerCase().includes(normalizedSearch);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && item.template.isActive) ||
          (statusFilter === "INACTIVE" && !item.template.isActive);

        const matchesRoutine = routineFilter === "ALL" || item.template.routine === routineFilter;

        return matchesSearch && matchesStatus && matchesRoutine;
      })
      .sort((left, right) => {
        const updatedDelta =
          new Date(right.template.updatedAt).getTime() - new Date(left.template.updatedAt).getTime();
        if (updatedDelta !== 0) {
          return updatedDelta;
        }
        return left.displayName.localeCompare(right.displayName);
      });
  }, [routineFilter, searchTerm, statusFilter, templateRows]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilter !== "ALL" || routineFilter !== "ALL";
  const isEmpty = !isLoading && !pageError && filteredTemplates.length === 0;
  const activeTemplates = templates.filter((item) => item.isActive).length;

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Templates de checklist</h1>
          <p>Cadastre e gerencie modelos de checklist utilizados nas inspecoes operacionais da frota.</p>
        </div>

        <div className="cargo-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setRoutineFilter("ALL");
            }}
          >
            Limpar filtros
          </button>
          <Link href="/fleet/checklists/realizados" className="button-link secondary-link">
            Ver realizados
          </Link>
          <Link href="/fleet/checklists/nova" className="button-link">
            + Novo template
          </Link>
        </div>
      </section>

      {feedback ? (
        <p
          className="overtime-list-status-message"
          role={feedback.type === "error" ? "alert" : "status"}
          style={
            feedback.type === "error"
              ? {
                  border: "1px solid rgba(219, 67, 103, 0.28)",
                  background: "rgba(255, 246, 249, 0.88)",
                  color: "#a13a49"
                }
              : undefined
          }
        >
          {feedback.message}
        </p>
      ) : null}

      {pageError ? (
        <div className="cargo-editor-alert" role="alert">
          <strong>Falha ao carregar checklists.</strong>
          <span style={{ display: "block", marginTop: "4px" }}>{pageError}</span>
          <button type="button" className="button-link secondary-link" style={{ marginTop: "10px" }} onClick={() => void loadTemplates()}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de templates</h2>
              <span>
                {templates.length > 0
                  ? `${filteredTemplates.length} de ${templates.length} template(s) | ${activeTemplates} ativo(s).`
                  : "Nenhum template cadastrado."}
              </span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, categoria, frequencia ou tag..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={routineFilter}
                onChange={(event) => setRoutineFilter(event.target.value as RoutineFilter)}
                aria-label="Filtrar por frequencia"
              >
                <option value="ALL">Todas as frequencias</option>
                <option value="START_OF_DAY">Inicio do turno</option>
                <option value="END_OF_DAY">Fim do turno</option>
              </select>

              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filtrar por status"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
          </div>

          <div className="drivers-table-wrap">
            {isLoading ? (
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Checklist</th>
                    <th>Frequencia</th>
                    <th>Itens</th>
                    <th>Vinculados</th>
                    <th>Status</th>
                    <th>Atualizacao</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7}>Carregando templates...</td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {!isLoading && !isEmpty ? (
              <table className="drivers-table pricing-table cargo-list-table fleet-checklists-list-table">
                <thead>
                  <tr>
                    <th>Checklist</th>
                    <th>Frequencia</th>
                    <th>Itens</th>
                    <th>Vinculados</th>
                    <th>Status</th>
                    <th>Atualizacao</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((row) => {
                    const item = row.template;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-contact-cell">
                            <strong>{row.displayName}</strong>
                            <span className="cargo-list-description-line">
                              {row.description}
                            </span>
                            {row.badges.length > 0 ? (
                              <div className="chips fleet-checklist-template-badges">
                                {row.badges.map((badge) => (
                                  <span key={`${item.id}-${badge}`} className="chip chip-soft">
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className="cargo-list-muted-text">{resolveRoutineLabel(item.routine)}</span>
                        </td>
                        <td>
                          <span className="cargo-list-muted-text">{resolveItemsLabel(item.items.length)}</span>
                        </td>
                        <td>
                          <span className="cargo-list-muted-text">
                            {resolveLinkedVehiclesLabel(row.linkedVehiclesCount)}
                          </span>
                        </td>
                        <td>
                          <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>
                            {item.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td>
                          <span className="cargo-list-muted-text">{formatDateTime(item.updatedAt)}</span>
                        </td>
                        <td className="cargo-actions-cell">
                          <AdminTableRowActions
                            menuLabel={`Acoes do template ${row.displayName}`}
                            items={[
                              {
                                id: `${item.id}_view`,
                                label: "Visualizar",
                                href: `/fleet/checklists/${item.id}`
                              },
                              {
                                id: `${item.id}_edit`,
                                label: "Editar",
                                href: `/fleet/checklists/${item.id}`
                              },
                              {
                                id: `${item.id}_duplicate`,
                                label: pendingTemplateId === item.id ? "Duplicando..." : "Duplicar template",
                                onClick: () => void handleDuplicateTemplate(row),
                                disabled: pendingTemplateId === item.id
                              },
                              {
                                id: `${item.id}_bind_vehicles`,
                                label: "Vincular veiculos",
                                onClick: () =>
                                  setFeedback({
                                    type: "success",
                                    message: `Fluxo de vinculacao do template "${row.displayName}" sera disponibilizado na proxima iteracao.`
                                  })
                              },
                              {
                                id: `${item.id}_archive`,
                                label:
                                  pendingTemplateId === item.id
                                    ? "Salvando..."
                                    : "Arquivar",
                                onClick: () => void handleToggleStatus(item),
                                disabled: pendingTemplateId === item.id || !item.isActive
                              },
                              {
                                id: `${item.id}_delete`,
                                label: "Excluir",
                                onClick: () =>
                                  setFeedback({
                                    type: "error",
                                    message: `Exclusao definitiva de template ainda nao esta disponivel por API. Use "Arquivar" para retirar da operacao.`
                                  }),
                                danger: true
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {isEmpty ? (
              <div className="cargo-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhum checklist corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar novamente os templates.</p>
                    <div className="cargo-list-empty-state-actions">
                      <button
                        type="button"
                        className="button-link secondary-link"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setRoutineFilter("ALL");
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>Nenhum template cadastrado ainda.</strong>
                    <p>Crie o primeiro template para iniciar a rotina de inspecoes da frota.</p>
                    <div className="cargo-list-empty-state-actions">
                      <Link href="/fleet/checklists/nova" className="button-link">
                        Cadastrar primeiro template
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
