"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Holiday, HolidayScopeType, request } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { AdministrativeListPagination } from "./administrative-list-pagination";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ScopeFilter = "ALL" | HolidayScopeType;

export function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void loadHolidays();
  }, []);

  async function loadHolidays() {
    try {
      const data = await request<Holiday[]>("/admin/holidays");
      setHolidays(data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar feriados.");
    }
  }

  async function toggleStatus(holiday: Holiday) {
    setPendingId(holiday.id);
    try {
      const updated = await request<Holiday>(`/admin/holidays/${holiday.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !holiday.isActive })
      });
      setHolidays((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar status.");
    } finally {
      setPendingId(null);
    }
  }

  async function removeHoliday(holiday: Holiday) {
    const confirmed = window.confirm(`Excluir feriado "${holiday.name}" (${formatDateOnly(holiday.date)})?`);
    if (!confirmed) return;

    setPendingId(holiday.id);
    try {
      await request(`/admin/holidays/${holiday.id}`, { method: "DELETE" });
      setHolidays((current) => current.filter((item) => item.id !== holiday.id));
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao excluir feriado.");
    } finally {
      setPendingId(null);
    }
  }

  const filteredHolidays = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return holidays.filter((holiday) => {
      const searchable = [
        holiday.name,
        holiday.date,
        resolveHolidayScopeLabel(holiday.scopeType),
        resolveHolidayLocation(holiday)
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = query.length === 0 || searchable.includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && holiday.isActive) ||
        (statusFilter === "INACTIVE" && !holiday.isActive);
      const matchesScope = scopeFilter === "ALL" || holiday.scopeType === scopeFilter;
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [holidays, searchTerm, statusFilter, scopeFilter]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredHolidays.length / pageSize)),
    [filteredHolidays.length, pageSize]
  );
  const paginatedHolidays = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHolidays.slice(start, start + pageSize);
  }, [filteredHolidays, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCount = useMemo(() => holidays.filter((holiday) => holiday.isActive).length, [holidays]);
  const inactiveCount = Math.max(holidays.length - activeCount, 0);
  const hasActiveFilters =
    statusFilter !== "ALL" || scopeFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide overtime-list-page-shell">
      <section className="overtime-list-page-header">
        <div className="overtime-list-page-header-copy">
          <h1>Feriados</h1>
          <p>Cadastre feriados nacionais, estaduais e municipais para uso nas regras trabalhistas.</p>
        </div>
        <div className="overtime-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setScopeFilter("ALL");
              setPage(1);
              setStatusMessage(null);
            }}
          >
            Limpar filtros
          </button>
          <Link href="/administrative/holidays/new" className="button-link">
            + Novo feriado
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="overtime-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean overtime-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de feriados</h2>
              <span>
                {filteredHolidays.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
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
                  placeholder="Buscar por nome, data ou local..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={scopeFilter}
                onChange={(event) => {
                  setScopeFilter(event.target.value as ScopeFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos os escopos</option>
                <option value="NATIONAL">Nacional</option>
                <option value="STATE">Estadual</option>
                <option value="CITY">Municipal</option>
              </select>
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
                  <th>Feriado</th>
                  <th>Data</th>
                  <th>Escopo</th>
                  <th>Localizacao</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHolidays.map((holiday) => (
                  <tr key={holiday.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{holiday.name}</strong>
                        <span>{resolveHolidaySummary(holiday)}</span>
                      </div>
                    </td>
                    <td>{formatDateOnly(holiday.date)}</td>
                    <td>{resolveHolidayScopeLabel(holiday.scopeType)}</td>
                    <td>{resolveHolidayLocation(holiday)}</td>
                    <td>
                      <span className={holiday.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {holiday.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <AdminTableRowActions
                        items={[
                          {
                            id: `${holiday.id}_edit`,
                            label: "Editar",
                            href: `/administrative/holidays/${holiday.id}/edit`
                          },
                          {
                            id: `${holiday.id}_view`,
                            label: "Visualizar",
                            href: `/administrative/holidays/${holiday.id}`
                          },
                          {
                            id: `${holiday.id}_toggle`,
                            label:
                              pendingId === holiday.id
                                ? "Salvando..."
                                : holiday.isActive
                                  ? "Inativar"
                                  : "Ativar",
                            onClick: () => void toggleStatus(holiday),
                            disabled: pendingId === holiday.id
                          },
                          {
                            id: `${holiday.id}_delete`,
                            label: pendingId === holiday.id ? "Excluindo..." : "Excluir",
                            onClick: () => void removeHoliday(holiday),
                            disabled: pendingId === holiday.id,
                            danger: true
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredHolidays.length === 0 ? (
              <div className="administrative-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhum feriado corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar os feriados cadastrados.</p>
                    <div className="administrative-list-empty-state-actions">
                      <button
                        type="button"
                        className="button-link secondary-link"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setScopeFilter("ALL");
                          setPage(1);
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>Nenhum feriado encontrado.</strong>
                    <p>Cadastre o primeiro feriado para centralizar regras de trabalho por localidade.</p>
                    <div className="administrative-list-empty-state-actions">
                      <Link href="/administrative/holidays/new" className="button-link">
                        Criar feriado
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
            totalItems={filteredHolidays.length}
            label="Paginacao da tabela de feriados"
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

function resolveHolidaySummary(holiday: Holiday): string {
  if (holiday.scopeType === "CITY") {
    return `Municipal em ${holiday.cityCode ?? "cidade"} - ${holiday.stateCode ?? "UF"}`;
  }
  if (holiday.scopeType === "STATE") {
    return `Estadual em ${holiday.stateCode ?? "UF"}`;
  }
  return "Nacional";
}

function resolveHolidayScopeLabel(scopeType: HolidayScopeType): string {
  if (scopeType === "CITY") return "Municipal";
  if (scopeType === "STATE") return "Estadual";
  return "Nacional";
}

function resolveHolidayLocation(holiday: Holiday): string {
  if (holiday.scopeType === "CITY") {
    return `${holiday.cityCode ?? "Cidade"} - ${holiday.stateCode ?? "UF"}`;
  }
  if (holiday.scopeType === "STATE") {
    return holiday.stateCode ?? "UF";
  }
  return "Brasil";
}

function formatDateOnly(value: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(parsed);
}
