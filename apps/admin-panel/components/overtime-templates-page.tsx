"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OvertimeTemplate, request } from "../lib/api";
import { isOvertimeTemplateCategory } from "../lib/overtime-policy-settings";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { AdministrativeListPagination } from "./administrative-list-pagination";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function OvertimeTemplatesPage() {
  const [templates, setTemplates] = useState<OvertimeTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await request<OvertimeTemplate[]>("/admin/overtime-templates?category=OVERTIME");
      setTemplates(data.filter((item) => isOvertimeTemplateCategory(item, "OVERTIME")));
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar politicas.");
    }
  }

  async function toggleStatus(template: OvertimeTemplate) {
    setPendingId(template.id);
    try {
      const updated = await request<OvertimeTemplate>(`/admin/overtime-templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !template.isActive })
      });
      setTemplates((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .filter((item) => isOvertimeTemplateCategory(item, "OVERTIME"))
      );
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar status.");
    } finally {
      setPendingId(null);
    }
  }

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return templates.filter((template) => {
      const dynamicSummary = summarizeOvertimePolicy(template.settings);
      const matchesSearch =
        query.length === 0 ||
        [template.name, dynamicSummary]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && template.isActive) ||
        (statusFilter === "INACTIVE" && !template.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, statusFilter]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTemplates.length / pageSize)),
    [filteredTemplates.length, pageSize]
  );
  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCount = useMemo(() => templates.filter((template) => template.isActive).length, [templates]);
  const inactiveCount = Math.max(templates.length - activeCount, 0);
  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide overtime-list-page-shell">
      <section className="overtime-list-page-header">
        <div className="overtime-list-page-header-copy">
          <h1>Politicas de hora extra</h1>
          <p>Cadastre politicas reutilizaveis para padronizar regras de hora extra.</p>
        </div>
        <div className="overtime-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setPage(1);
              setStatusMessage(null);
            }}
          >
            Limpar filtros
          </button>
          <Link href="/administrative/overtime/new" className="button-link">
            + Nova politica
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="overtime-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean overtime-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de politicas</h2>
              <span>
                {filteredTemplates.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
              </span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nome ou parametros..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table pricing-table">
              <thead>
                <tr>
                  <th>Politica</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{template.name}</strong>
                        <span>{summarizeOvertimePolicy(template.settings)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={template.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {template.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <AdminTableRowActions
                        items={[
                          {
                            id: `${template.id}_edit`,
                            label: "Editar",
                            href: `/administrative/overtime/${template.id}/edit`
                          },
                          {
                            id: `${template.id}_view`,
                            label: "Visualizar",
                            href: `/administrative/overtime/${template.id}`
                          },
                          {
                            id: `${template.id}_toggle`,
                            label:
                              pendingId === template.id
                                ? "Salvando..."
                                : template.isActive
                                  ? "Inativar"
                                  : "Ativar",
                            onClick: () => void toggleStatus(template),
                            disabled: pendingId === template.id
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTemplates.length === 0 ? (
              <div className="administrative-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhuma politica corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar as politicas de hora extra.</p>
                    <div className="administrative-list-empty-state-actions">
                      <button
                        type="button"
                        className="button-link secondary-link"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setPage(1);
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>Nenhuma politica encontrada.</strong>
                    <p>Cadastre a primeira politica para padronizar hora extra na operacao.</p>
                    <div className="administrative-list-empty-state-actions">
                      <Link href="/administrative/overtime/new" className="button-link">
                        Criar politica
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <AdministrativeListPagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredTemplates.length}
            label="Paginacao da tabela de politicas de hora extra"
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        </article>
      </section>
    </main>
  );
}

function summarizeOvertimePolicy(settings: Record<string, unknown>): string {
  const overtime = asRecord(settings.overtime);
  const percentages = asRecord(settings.percentages);
  const rules = asRecord(settings.rules);
  const rounding = asRecord(settings.rounding);
  const bankHours = asRecord(settings.bankHours);

  const enabled = toBoolean(overtime.enabled, true);
  if (!enabled) {
    return "Hora extra desativada.";
  }

  const destination =
    overtime.destination === "BANK_HOURS"
      ? "Banco de horas"
      : overtime.destination === "BOTH"
        ? "Pagamento + banco"
        : "Pagamento";
  const overtime50 = toNumber(percentages.overtime50, 50);
  const overtime100 = toNumber(percentages.overtime100, 100);
  const afterDailyHours = toNumber(overtime.afterDailyHours, 8);
  const afterWeeklyHours = toNumber(overtime.afterWeeklyHours, 44);
  const maxExtraHoursPerDay = toOptionalNumber(rules.maxExtraHoursPerDay);
  const requiresApproval = toBoolean(rules.requiresApproval, false);
  const compensateDelayWithOvertime = toBoolean(rules.compensateDelayWithOvertime, false);
  const toleranceMinutes = toInteger(rules.toleranceMinutes, 0);
  const roundingType =
    rounding.type === "UP" ? "para cima" : rounding.type === "DOWN" ? "para baixo" : "mais proximo";
  const roundingIntervalMinutes = toInteger(rounding.intervalMinutes, 15);
  const bankEnabled = toBoolean(
    bankHours.enabled,
    overtime.destination === "BANK_HOURS" || overtime.destination === "BOTH"
  );

  const parts = [
    `Gatilho ${formatNumber(afterDailyHours)}h/dia e ${formatNumber(afterWeeklyHours)}h/semana`,
    `Destino ${destination}`,
    `Adicionais ${formatNumber(overtime50)}% e ${formatNumber(overtime100)}%`,
    `Arredondamento ${roundingType} (${roundingIntervalMinutes} min)`
  ];

  if (maxExtraHoursPerDay !== undefined) {
    parts.push(`Limite ${formatNumber(maxExtraHoursPerDay)}h/dia`);
  }
  if (toleranceMinutes > 0) {
    parts.push(`Tolerancia ${toleranceMinutes} min`);
  }
  if (requiresApproval) {
    parts.push("Exige aprovacao");
  }
  if (compensateDelayWithOvertime) {
    parts.push("Compensa atraso");
  }
  if (bankEnabled) {
    const termValue = toInteger(bankHours.compensationTermValue, 30);
    const termUnit = bankHours.compensationTermUnit === "MONTHS" ? "meses" : "dias";
    const priority = bankHours.priority === "PAY" ? "pagar" : "compensar";
    parts.push(`Banco ${termValue} ${termUnit} (${priority})`);
  }

  return parts.join(" | ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function formatNumber(value: number): string {
  const asInteger = Math.trunc(value);
  if (Math.abs(value - asInteger) < 0.0001) {
    return String(asInteger);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}
