"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OvertimeTemplate, request } from "../lib/api";
import {
  isOvertimeTemplateCategory,
  readNightPolicySnapshot
} from "../lib/overtime-policy-settings";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { AdministrativeListPagination } from "./administrative-list-pagination";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function NightPolicyTemplatesPage() {
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
      const data = await request<OvertimeTemplate[]>("/admin/overtime-templates?category=NIGHT");
      setTemplates(data.filter((item) => isOvertimeTemplateCategory(item, "NIGHT")));
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
          .filter((item) => isOvertimeTemplateCategory(item, "NIGHT"))
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
      const snapshot = readNightPolicySnapshot(template.settings);
      const matchesSearch =
        query.length === 0 ||
        [
          template.name,
          template.description ?? "",
          template.workProfiles.join(" "),
          snapshot.enabled ? "ativo" : "inativo",
          snapshot.startTime,
          snapshot.endTime
        ]
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
          <h1>Politicas de adicional noturno</h1>
          <p>Cadastre politicas reutilizaveis para padronizar regras de adicional noturno.</p>
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
          <Link href="/administrative/night-policies/new" className="button-link">
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
                  placeholder="Buscar por nome, descricao ou perfil..."
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
                  <th>Faixa noturna</th>
                  <th>Percentual</th>
                  <th>Acumula com hora extra</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.map((template) => {
                  const snapshot = readNightPolicySnapshot(template.settings);
                  return (
                    <tr key={template.id}>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{template.name}</strong>
                          <span>{template.description || "Sem descricao."}</span>
                        </div>
                      </td>
                      <td>{snapshot.enabled ? `${snapshot.startTime} ate ${snapshot.endTime}` : "Desativado"}</td>
                      <td>{snapshot.enabled ? `${snapshot.percent}%` : "-"}</td>
                      <td>{snapshot.enabled ? (snapshot.accumulatesWithOvertime ? "Sim" : "Nao") : "-"}</td>
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
                              href: `/administrative/night-policies/${template.id}/edit`
                            },
                            {
                              id: `${template.id}_view`,
                              label: "Visualizar",
                              href: `/administrative/night-policies/${template.id}`
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
                  );
                })}
              </tbody>
            </table>

            {filteredTemplates.length === 0 ? (
              <div className="administrative-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhuma politica corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar as politicas de adicional noturno.</p>
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
                    <p>Cadastre a primeira politica para padronizar adicional noturno por perfil.</p>
                    <div className="administrative-list-empty-state-actions">
                      <Link href="/administrative/night-policies/new" className="button-link">
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
            label="Paginacao da tabela de politicas de adicional noturno"
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
