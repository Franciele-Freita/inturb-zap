"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { SearchIcon } from "./icons/common-icons";
import {
  JourneyType,
  WorkJourneyTemplate,
  loadWorkJourneys,
  resolveJourneyTypeLabel,
  saveWorkJourneys,
  summarizeWorkJourney
} from "../lib/work-journeys";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | JourneyType;

export function WorkJourneysPage() {
  const [journeys, setJourneys] = useState<WorkJourneyTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadWorkJourneys();
    setJourneys(loaded);
  }, []);

  function persist(next: WorkJourneyTemplate[]) {
    const sorted = [...next].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    setJourneys(sorted);
    saveWorkJourneys(sorted);
  }

  function toggleStatus(item: WorkJourneyTemplate) {
    setPendingId(item.id);
    const updated = journeys.map((journey) =>
      journey.id === item.id ? { ...journey, isActive: !journey.isActive, updatedAt: new Date().toISOString() } : journey
    );
    persist(updated);
    setStatusMessage(`Jornada "${item.name}" ${item.isActive ? "inativada" : "ativada"}.`);
    setPendingId(null);
  }

  function deleteJourney(item: WorkJourneyTemplate) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Excluir a jornada "${item.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    setPendingId(item.id);
    const updated = journeys.filter((journey) => journey.id !== item.id);
    persist(updated);
    setStatusMessage(`Jornada "${item.name}" excluida.`);
    setPendingId(null);
  }

  const filteredJourneys = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return journeys.filter((journey) => {
      const matchesSearch =
        query.length === 0 ||
        [journey.name, journey.description ?? "", journey.notes ?? "", resolveJourneyTypeLabel(journey.type)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && journey.isActive) ||
        (statusFilter === "INACTIVE" && !journey.isActive);
      const matchesType = typeFilter === "ALL" || journey.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [journeys, searchTerm, statusFilter, typeFilter]);

  const activeCount = useMemo(() => journeys.filter((item) => item.isActive).length, [journeys]);
  const inactiveCount = Math.max(journeys.length - activeCount, 0);
  const hasActiveFilters =
    statusFilter !== "ALL" || typeFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide journey-list-page-shell">
      <section className="journey-list-page-header">
        <div className="journey-list-page-header-copy">
          <h1>Jornadas</h1>
          <p>Cadastre e organize jornadas reutilizaveis para perfis de trabalho e contratos.</p>
        </div>
        <div className="journey-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setTypeFilter("ALL");
              setStatusMessage(null);
            }}
          >
            Limpar filtros
          </button>
          <Link href="/administrative/scales/new" className="button-link">
            + Nova jornada
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="journey-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean journey-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de jornadas</h2>
              <span>
                {filteredJourneys.length} visivel(is), {activeCount} ativa(s), {inactiveCount} inativa(s).
              </span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, descricao ou regra..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              >
                <option value="ALL">Todos os tipos</option>
                <option value="FIXED">Fixa</option>
                <option value="FLEXIBLE">Flexivel</option>
                <option value="INTERMITTENT">Intermitente</option>
              </select>
              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="ALL">Todos status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table pricing-table">
              <thead>
                <tr>
                  <th>Jornada</th>
                  <th>Tipo</th>
                  <th>Resumo</th>
                  <th>Status</th>
                  <th>Atualizacao</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredJourneys.map((journey) => {
                  const summary = summarizeWorkJourney(journey);
                  return (
                    <tr key={journey.id}>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{journey.name}</strong>
                          <span>{journey.description || "Sem descricao."}</span>
                        </div>
                      </td>
                      <td>{resolveJourneyTypeLabel(journey.type)}</td>
                      <td>{summary.slice(0, 2).join(" | ")}</td>
                      <td>
                        <span className={journey.isActive ? "status-pill status-pill-success" : "status-pill"}>
                          {journey.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td>{formatDateTime(journey.updatedAt)}</td>
                      <td>
                        <AdminTableRowActions
                          primary={{
                            id: `${journey.id}_edit`,
                            label: "Editar",
                            href: `/administrative/scales/${journey.id}/edit`
                          }}
                          items={[
                            {
                              id: `${journey.id}_view`,
                              label: "Visualizar",
                              href: `/administrative/scales/${journey.id}`
                            },
                            {
                              id: `${journey.id}_toggle`,
                              label: journey.isActive ? "Inativar" : "Ativar",
                              onClick: () => toggleStatus(journey),
                              disabled: pendingId === journey.id
                            },
                            {
                              id: `${journey.id}_delete`,
                              label: "Excluir",
                              onClick: () => deleteJourney(journey),
                              disabled: pendingId === journey.id,
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

            {filteredJourneys.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma jornada encontrada.</strong>
                <p>Cadastre uma jornada para reutilizar em perfis de trabalho.</p>
                <Link href="/administrative/scales/new" className="button-link">
                  Criar jornada
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
