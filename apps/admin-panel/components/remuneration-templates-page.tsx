"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RemunerationTemplate, formatDateTime, request } from "../lib/api";
import { SearchIcon } from "./icons/common-icons";

export function RemunerationTemplatesPage() {
  const [templates, setTemplates] = useState<RemunerationTemplate[]>([]);
  const [statusMessage, setStatusMessage] = useState("Carregando templates de remuneracao.");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await request<RemunerationTemplate[]>("/admin/remuneration-templates");
      setTemplates(data);
      setStatusMessage(`${data.length} template(s) carregado(s).`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar templates.");
    }
  }

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [template.name, template.description ?? "", template.contractProfile ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && template.isActive) ||
        (statusFilter === "INACTIVE" && !template.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, statusFilter]);

  const activeCount = useMemo(() => templates.filter((template) => template.isActive).length, [templates]);
  const hasActiveFilters = statusFilter !== "ALL";

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">{statusMessage}</p>
        <div className="drivers-page-head-actions">
          <button type="button" className="button-link secondary-link" onClick={() => void loadTemplates()}>
            Atualizar lista
          </button>
          <Link href="/compensation/new" className="button-link">
            + Novo template
          </Link>
        </div>
      </section>

      <section className="drivers-overview-strip pricing-overview-strip">
        <article className="drivers-overview-item">
          <span>Templates</span>
          <strong>{templates.length}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Ativos</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Inativos</span>
          <strong>{Math.max(templates.length - activeCount, 0)}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Escopo atual</span>
          <strong>Motoristas</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Templates de remuneracao</h2>
              <span>{filteredTemplates.length} template(s) visiveis.</span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, perfil ou tipo..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
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
                  <th>Template</th>
                  <th>Escopo</th>
                  <th>Status</th>
                  <th>Atualizacao</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{template.name}</strong>
                        <span>{template.description || "Sem descricao."}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{template.workerType === "DRIVER" ? "Motorista" : template.workerType}</strong>
                        <span>{template.contractProfile ?? "Todos os perfis"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={template.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {template.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{formatDateTime(template.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTemplates.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum template encontrado.</strong>
                <p>Crie o primeiro template de remuneracao para padronizar o step 6 do cadastro de motorista.</p>
                <Link href="/compensation/new" className="button-link">
                  Criar template
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
