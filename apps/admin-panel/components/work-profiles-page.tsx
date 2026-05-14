"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkProfile, formatCurrency, request } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { AdministrativeListPagination } from "./administrative-list-pagination";
import { SearchIcon } from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function WorkProfilesPage() {
  const [profiles, setProfiles] = useState<WorkProfile[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const data = await request<WorkProfile[]>("/admin/work-profiles");
      setProfiles(data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar perfis.");
    }
  }

  async function toggleStatus(profile: WorkProfile) {
    setPendingId(profile.id);
    try {
      const updated = await request<WorkProfile>(`/admin/work-profiles/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !profile.isActive })
      });
      setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`Perfil "${updated.name}" ${updated.isActive ? "ativado" : "inativado"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar status.");
    } finally {
      setPendingId(null);
    }
  }

  const filteredProfiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesSearch =
        query.length === 0 ||
        [
          profile.name,
          profile.description ?? "",
          profile.cargoName,
          profile.cargoLevel ?? "",
          profile.journeyTemplateName ?? "",
          profile.overtimeTemplateName ?? "",
          profile.summary
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && profile.isActive) ||
        (statusFilter === "INACTIVE" && !profile.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [profiles, searchTerm, statusFilter]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProfiles.length / pageSize)),
    [filteredProfiles.length, pageSize]
  );
  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCount = useMemo(() => profiles.filter((profile) => profile.isActive).length, [profiles]);
  const inactiveCount = Math.max(profiles.length - activeCount, 0);
  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide overtime-list-page-shell">
      <section className="overtime-list-page-header">
        <div className="overtime-list-page-header-copy">
          <h1>Perfis de trabalho</h1>
          <p>Cadastre perfis reutilizaveis com cargo, vinculo, jornada, remuneracao e beneficios.</p>
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
          <Link href="/administrative/work-profiles/new" className="button-link">
            + Novo perfil
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="overtime-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean overtime-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de perfis</h2>
              <span>
                {filteredProfiles.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
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
                  placeholder="Buscar por nome, cargo, jornada ou descricao..."
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
                  <th>Perfil</th>
                  <th>Estrutura</th>
                  <th>Jornada</th>
                  <th>Pagamento</th>
                  <th>Beneficios</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{profile.name}</strong>
                        <span>{profile.description || "Sem descricao."}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{profile.cargoName}</strong>
                        <span>
                          {[profile.cargoLevel, resolveContractTypeLabel(profile.contractType)]
                            .filter(Boolean)
                            .join(" | ")}
                        </span>
                      </div>
                    </td>
                    <td>{profile.journeyTemplateName || "Nao definida"}</td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{resolveRemunerationLabel(profile)}</strong>
                        <span>{resolveOvertimeLabel(profile)}</span>
                      </div>
                    </td>
                    <td>{profile.benefits.length > 0 ? `${profile.benefits.length} selecionado(s)` : "Nenhum"}</td>
                    <td>
                      <span className={profile.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {profile.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <AdminTableRowActions
                        items={[
                          {
                            id: `${profile.id}_edit`,
                            label: "Editar",
                            href: `/administrative/work-profiles/${profile.id}/edit`
                          },
                          {
                            id: `${profile.id}_view`,
                            label: "Visualizar",
                            href: `/administrative/work-profiles/${profile.id}`
                          },
                          {
                            id: `${profile.id}_toggle`,
                            label:
                              pendingId === profile.id
                                ? "Salvando..."
                                : profile.isActive
                                  ? "Inativar"
                                  : "Ativar",
                            onClick: () => void toggleStatus(profile),
                            disabled: pendingId === profile.id
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProfiles.length === 0 ? (
              <div className="administrative-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhum perfil corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar os perfis de trabalho.</p>
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
                    <strong>Nenhum perfil encontrado.</strong>
                    <p>Crie um perfil para centralizar cargo, jornada, remuneracao, hora extra e beneficios.</p>
                    <div className="administrative-list-empty-state-actions">
                      <Link href="/administrative/work-profiles/new" className="button-link">
                        Criar perfil
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
            totalItems={filteredProfiles.length}
            label="Paginacao da tabela de perfis de trabalho"
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

function resolveContractTypeLabel(value: WorkProfile["contractType"]): string {
  if (value === "CLT_INTERMITENTE") return "CLT Intermitente";
  if (value === "MEI") return "MEI";
  if (value === "PJ") return "PJ";
  if (value === "AUTONOMO") return "Autonomo";
  return "CLT";
}

function resolveRemunerationLabel(profile: WorkProfile): string {
  const remuneration = profile.remuneration;
  const isIntermittent = profile.contractType === "CLT_INTERMITENTE";

  if (isIntermittent) {
    const baseValue = remuneration.fixedSalary !== undefined ? formatCurrency(remuneration.fixedSalary) : "";
    const baseLabel =
      remuneration.baseType === "DAILY"
        ? "Por diaria"
        : remuneration.baseType === "EVENT"
          ? "Por evento/servico"
          : "Por hora";
    if (remuneration.model === "FIXED_PLUS_COMMISSION") {
      return `${baseLabel}${baseValue ? ` ${baseValue}` : ""} + variavel`;
    }
    return `${baseLabel}${baseValue ? ` ${baseValue}` : ""}`;
  }

  if (remuneration.model === "FIXED") {
    return remuneration.fixedSalary !== undefined ? formatCurrency(remuneration.fixedSalary) : "Fixo";
  }
  if (remuneration.model === "FIXED_PLUS_COMMISSION") {
    return "Fixo + comissao";
  }
  return "Somente comissao";
}

function resolveOvertimeLabel(profile: WorkProfile): string {
  if (!profile.usesOvertime) {
    return "Sem politica de hora extra";
  }
  return profile.overtimeTemplateName ? `Hora extra: ${profile.overtimeTemplateName}` : "Hora extra ativa";
}
