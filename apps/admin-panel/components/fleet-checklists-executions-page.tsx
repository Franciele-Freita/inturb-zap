"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FleetOverviewMetrics, FleetVehicleOverview, formatDateTime, request } from "../lib/api";
import { SearchIcon } from "./icons/common-icons";

type ExecutionFilter = "ALL" | "COMPLETED" | "PENDING" | "NOT_REQUIRED";

export function FleetChecklistsExecutionsPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleOverview[]>([]);
  const [overview, setOverview] = useState<FleetOverviewMetrics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>("COMPLETED");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setPageError(null);

    void Promise.all([
      request<FleetOverviewMetrics>("/admin/fleet/overview"),
      request<FleetVehicleOverview[]>("/admin/fleet/vehicles")
    ])
      .then(([nextOverview, nextVehicles]) => {
        setOverview(nextOverview);
        setVehicles(nextVehicles);
      })
      .catch((error) => {
        setOverview(null);
        setVehicles([]);
        setPageError(error instanceof Error ? error.message : "Falha ao carregar checklists realizados.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const requiredCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.checklistProgress.required).length,
    [vehicles]
  );
  const completedCount = useMemo(
    () =>
      vehicles.filter(
        (vehicle) => vehicle.checklistProgress.required && vehicle.checklistProgress.isComplete
      ).length,
    [vehicles]
  );
  const pendingCount = useMemo(
    () =>
      vehicles.filter(
        (vehicle) => vehicle.checklistProgress.required && !vehicle.checklistProgress.isComplete
      ).length,
    [vehicles]
  );
  const notRequiredCount = useMemo(
    () => vehicles.filter((vehicle) => !vehicle.checklistProgress.required).length,
    [vehicles]
  );
  const completionRate = requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 100;

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return vehicles
      .filter((vehicle) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [
            vehicle.label,
            vehicle.plate,
            vehicle.currentAssignment?.driverName ?? "",
            vehicle.checklistProgress.dateKey
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesExecution =
          executionFilter === "ALL" ||
          (executionFilter === "COMPLETED" &&
            vehicle.checklistProgress.required &&
            vehicle.checklistProgress.isComplete) ||
          (executionFilter === "PENDING" &&
            vehicle.checklistProgress.required &&
            !vehicle.checklistProgress.isComplete) ||
          (executionFilter === "NOT_REQUIRED" && !vehicle.checklistProgress.required);

        return matchesSearch && matchesExecution;
      })
      .sort((left, right) => {
        const leftWeight = left.checklistProgress.required
          ? left.checklistProgress.isComplete
            ? 1
            : 0
          : 2;
        const rightWeight = right.checklistProgress.required
          ? right.checklistProgress.isComplete
            ? 1
            : 0
          : 2;

        if (leftWeight !== rightWeight) {
          return leftWeight - rightWeight;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [executionFilter, searchTerm, vehicles]);

  const hasActiveFilters = executionFilter !== "COMPLETED" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Checklists realizados</h1>
          <p>Acompanhe as execucoes concluidas, pendentes e os veiculos sem obrigatoriedade no dia.</p>
        </div>

        <div className="cargo-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setExecutionFilter("COMPLETED");
            }}
          >
            Limpar filtros
          </button>
          <Link href="/fleet/checklists" className="button-link secondary-link">
            Ver templates
          </Link>
        </div>
      </section>

      {pageError ? (
        <div className="cargo-editor-alert" role="alert">
          <strong>Falha ao carregar checklists realizados.</strong>
          <span style={{ display: "block", marginTop: "4px" }}>{pageError}</span>
        </div>
      ) : null}

      <section className="grid grid-single fleet-cargo-summary-section">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="fleet-module-summary-grid" aria-label="Resumo de execucao de checklists">
            <article className="fleet-module-summary-card">
              <span>Concluidos</span>
              <strong>{completedCount}</strong>
              <small>{requiredCount > 0 ? `${completionRate}% da base obrigatoria` : "Sem obrigatoriedade hoje"}</small>
            </article>
            <article className="fleet-module-summary-card">
              <span>Pendentes</span>
              <strong>{pendingCount}</strong>
              <small>{overview?.checklistPendingToday ?? pendingCount} com bloqueio operacional</small>
            </article>
            <article className="fleet-module-summary-card">
              <span>Sem obrigatoriedade</span>
              <strong>{notRequiredCount}</strong>
              <small>Veiculos sem checklist exigido</small>
            </article>
          </div>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Execucoes por veiculo</h2>
              <span>
                {vehicles.length > 0
                  ? `${filteredVehicles.length} de ${vehicles.length} veiculo(s)`
                  : "Nenhum veiculo carregado."}
              </span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por veiculo, placa, motorista ou data..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={executionFilter}
                onChange={(event) => setExecutionFilter(event.target.value as ExecutionFilter)}
                aria-label="Filtrar por status do checklist"
              >
                <option value="COMPLETED">Concluidos</option>
                <option value="PENDING">Pendentes</option>
                <option value="ALL">Todos</option>
                <option value="NOT_REQUIRED">Nao obrigatorios</option>
              </select>
            </div>
          </div>

          <div className="drivers-table-wrap">
            {isLoading ? (
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th>Motorista</th>
                    <th>Progresso</th>
                    <th>Status</th>
                    <th>Data base</th>
                    <th>Atualizado</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7}>Carregando execucoes...</td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {!isLoading && filteredVehicles.length > 0 ? (
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Veiculo</th>
                    <th>Motorista</th>
                    <th>Progresso</th>
                    <th>Status</th>
                    <th>Data base</th>
                    <th>Atualizado</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const progress = vehicle.checklistProgress;
                    const statusLabel = !progress.required
                      ? "Nao exigido"
                      : progress.isComplete
                        ? "Concluido"
                        : "Pendente";
                    const statusClassName = !progress.required
                      ? "status-pill"
                      : progress.isComplete
                        ? "status-pill status-pill-success"
                        : "status-pill rides-status-pill-warning";

                    return (
                      <tr key={vehicle.id}>
                        <td>
                          <div className="table-contact-cell">
                            <strong>{vehicle.label}</strong>
                            <span>{vehicle.plate}</span>
                          </div>
                        </td>
                        <td>{vehicle.currentAssignment?.driverName ?? "Sem motorista alocado"}</td>
                        <td>
                          {progress.required
                            ? `${progress.completedItems}/${progress.totalItems} item(ns)`
                            : "Sem rotina obrigatoria"}
                        </td>
                        <td>
                          <span className={statusClassName}>{statusLabel}</span>
                        </td>
                        <td>{progress.dateKey}</td>
                        <td>{formatDateTime(vehicle.updatedAt)}</td>
                        <td>
                          <Link href={`/fleet/veiculos/${vehicle.id}/checklists`} className="button-link secondary-link">
                            Abrir checklist
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {!isLoading && filteredVehicles.length === 0 ? (
              <div className="cargo-list-empty-state">
                <strong>Nenhum checklist encontrado para o filtro atual.</strong>
                <p>Altere os filtros para visualizar outras execucoes.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
