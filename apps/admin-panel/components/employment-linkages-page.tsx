"use client";

import { useEffect, useMemo, useState } from "react";
import { CompanyEmploymentLinkage, CompanyProfileConfig, WorkProfile, request } from "../lib/api";
import {
  buildUsageByLinkageKey,
  normalizeEmploymentLinkages,
  resolveEmploymentLinkageTitle
} from "../lib/employment-linkages";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { AdministrativeListPagination } from "./administrative-list-pagination";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function EmploymentLinkagesPage() {
  const [items, setItems] = useState<CompanyEmploymentLinkage[]>([]);
  const [workProfiles, setWorkProfiles] = useState<WorkProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<CompanyEmploymentLinkage["key"] | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [profile, profiles] = await Promise.all([
        request<CompanyProfileConfig>("/admin/company-profile"),
        request<WorkProfile[]>("/admin/work-profiles")
      ]);
      setItems(normalizeEmploymentLinkages(profile.employmentLinkages));
      setWorkProfiles(profiles);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar vinculos trabalhistas.");
    } finally {
      setIsLoading(false);
    }
  }

  async function persist(nextItems: CompanyEmploymentLinkage[], successMessage?: string) {
    const updated = await request<CompanyProfileConfig>("/admin/company-profile", {
      method: "PATCH",
      body: JSON.stringify({
        employmentLinkages: nextItems.map((item) => ({
          key: item.key,
          label: item.label.trim(),
          description: item.description?.trim(),
          isActive: item.isActive,
          sortOrder: item.sortOrder
        }))
      })
    });

    setItems(normalizeEmploymentLinkages(updated.employmentLinkages));
    if (successMessage) {
      setStatusMessage(successMessage);
    }
  }

  async function toggleStatus(item: CompanyEmploymentLinkage) {
    setPendingKey(item.key);
    try {
      const next = items.map((row) => (row.key === item.key ? { ...row, isActive: !row.isActive } : row));
      await persist(next, `Vinculo "${resolveEmploymentLinkageTitle(item.key)}" ${item.isActive ? "inativado" : "ativado"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar status do vinculo.");
    } finally {
      setPendingKey(null);
    }
  }

  const usageByKey = useMemo(() => buildUsageByLinkageKey(workProfiles), [workProfiles]);
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        `${resolveEmploymentLinkageTitle(item.key)} ${item.label} ${item.description ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive) ||
        (statusFilter === "INACTIVE" && !item.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize]
  );
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);
  const inactiveCount = Math.max(items.length - activeCount, 0);
  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Vinculos trabalhistas</h1>
          <p>Gerencie os vinculos exibidos no sistema e a ordem usada nos fluxos administrativos.</p>
        </div>
        <div className="cargo-list-page-header-actions">
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
          <button type="button" className="button-link secondary-link" onClick={() => void loadData()} disabled={isLoading}>
            Recarregar
          </button>
        </div>
      </section>

      {statusMessage ? <p className="overtime-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de vinculos</h2>
              <span>
                {filteredItems.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
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
                  placeholder="Buscar por nome, descricao ou codigo..."
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
                  <th>Vinculo</th>
                  <th>Descricao</th>
                  <th>Perfis vinculados</th>
                  <th>Ordem</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{item.label}</strong>
                        <span>{resolveEmploymentLinkageTitle(item.key)}</span>
                      </div>
                    </td>
                    <td>{item.description || "Sem descricao cadastrada."}</td>
                    <td>{usageByKey[item.key]}</td>
                    <td>{item.sortOrder}</td>
                    <td>
                      <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <AdminTableRowActions
                        items={[
                          {
                            id: `${item.key}_edit`,
                            label: "Editar",
                            href: `/settings/employment-linkages/${item.key}`
                          },
                          {
                            id: `${item.key}_toggle`,
                            label: pendingKey === item.key ? "Salvando..." : item.isActive ? "Inativar" : "Ativar",
                            onClick: () => void toggleStatus(item),
                            disabled: pendingKey === item.key
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLoading && filteredItems.length === 0 ? (
              <div className="administrative-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhum vinculo corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar os vinculos trabalhistas.</p>
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
                    <strong>Nenhum vinculo encontrado.</strong>
                    <p>Recarregue os dados para sincronizar a configuracao de vinculos.</p>
                    <div className="administrative-list-empty-state-actions">
                      <button type="button" className="button-link" onClick={() => void loadData()}>
                        Atualizar listagem
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <AdministrativeListPagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            isLoading={isLoading}
            label="Paginacao da tabela de vinculos trabalhistas"
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
