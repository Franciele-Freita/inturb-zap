"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { SearchIcon } from "./icons/common-icons";
import {
  Benefit,
  BenefitType,
  formatCurrency,
  formatDateTime,
  request
} from "../lib/api";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | BenefitType;

export function BenefitsPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void loadBenefits();
  }, []);

  async function loadBenefits() {
    try {
      const data = await request<Benefit[]>("/admin/benefits");
      setBenefits(data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar beneficios.");
    }
  }

  async function toggleStatus(benefit: Benefit) {
    setPendingId(benefit.id);
    try {
      const updated = await request<Benefit>(`/admin/benefits/${benefit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !benefit.isActive })
      });
      setBenefits((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar status.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteBenefit(benefit: Benefit) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Excluir o beneficio "${benefit.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    setPendingId(benefit.id);
    try {
      await request(`/admin/benefits/${benefit.id}`, {
        method: "DELETE"
      });
      setBenefits((current) => current.filter((item) => item.id !== benefit.id));
      setStatusMessage(`Beneficio "${benefit.name}" excluido.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao excluir beneficio.");
    } finally {
      setPendingId(null);
    }
  }

  const filteredBenefits = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return benefits.filter((benefit) => {
      const matchesSearch =
        query.length === 0 ||
        [
          benefit.name,
          benefit.description ?? "",
          benefit.summary,
          benefit.workProfiles.join(" "),
          benefit.contractProfiles.join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && benefit.isActive) ||
        (statusFilter === "INACTIVE" && !benefit.isActive);
      const matchesType = typeFilter === "ALL" || benefit.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [benefits, searchTerm, statusFilter, typeFilter]);

  const activeCount = useMemo(
    () => benefits.filter((benefit) => benefit.isActive).length,
    [benefits]
  );
  const inactiveCount = Math.max(benefits.length - activeCount, 0);
  const hasActiveFilters =
    statusFilter !== "ALL" || typeFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide benefit-list-page-shell">
      <section className="benefit-list-page-header">
        <div className="benefit-list-page-header-copy">
          <h1>Beneficios</h1>
          <p>Cadastre e gerencie beneficios reutilizaveis para contratos e colaboradores.</p>
        </div>
        <div className="benefit-list-page-header-actions">
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
          <Link href="/administrative/benefits/new" className="button-link">
            + Novo beneficio
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="benefit-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean benefit-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de beneficios</h2>
              <span>
                {filteredBenefits.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
              </span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, descricao ou resumo..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={
                  hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"
                }
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              >
                <option value="ALL">Todos os tipos</option>
                <option value="FIXED">Valor fixo</option>
                <option value="PERCENTAGE">Percentual</option>
                <option value="VARIABLE">Variavel</option>
                <option value="INFORMATIVE">Informativo</option>
              </select>
              <select
                className={
                  hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"
                }
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
                  <th>Beneficio</th>
                  <th>Tipo e valor</th>
                  <th>Frequencia / aplicar por</th>
                  <th>Status</th>
                  <th>Atualizacao</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredBenefits.map((benefit) => (
                  <tr key={benefit.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{benefit.name}</strong>
                        <span>{benefit.description || "Sem descricao."}</span>
                      </div>
                    </td>
                    <td>{buildValueLabel(benefit)}</td>
                    <td>{`${resolveFrequencyLabel(benefit.frequency)} | ${resolveApplicationLabel(
                      benefit.applicationMode
                    )}`}</td>
                    <td>
                      <span className={benefit.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {benefit.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{formatDateTime(benefit.updatedAt)}</td>
                    <td>
                      <AdminTableRowActions
                        primary={{
                          id: `${benefit.id}_edit`,
                          label: "Editar",
                          href: `/administrative/benefits/${benefit.id}/edit`
                        }}
                        items={[
                          {
                            id: `${benefit.id}_view`,
                            label: "Visualizar",
                            href: `/administrative/benefits/${benefit.id}`
                          },
                          {
                            id: `${benefit.id}_toggle`,
                            label:
                              pendingId === benefit.id
                                ? "Salvando..."
                                : benefit.isActive
                                  ? "Inativar"
                                  : "Ativar",
                            onClick: () => void toggleStatus(benefit),
                            disabled: pendingId === benefit.id
                          },
                          {
                            id: `${benefit.id}_delete`,
                            label: pendingId === benefit.id ? "Excluindo..." : "Excluir",
                            onClick: () => void deleteBenefit(benefit),
                            disabled: pendingId === benefit.id,
                            danger: true
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBenefits.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum beneficio encontrado.</strong>
                <p>Cadastre beneficios reutilizaveis para contratos e colaboradores.</p>
                <Link href="/administrative/benefits/new" className="button-link">
                  Criar beneficio
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function buildValueLabel(benefit: Benefit): string {
  if (benefit.type === "FIXED") {
    return `Valor fixo: ${formatCurrency(benefit.valueConfig.fixedAmount)}`;
  }
  if (benefit.type === "PERCENTAGE") {
    const base =
      benefit.valueConfig.percentageBase === "SALARY"
        ? "salario"
        : benefit.valueConfig.percentageBase === "REVENUE"
          ? "faturamento"
          : benefit.valueConfig.percentageBaseOther || "outro";
    return `${benefit.valueConfig.percentageValue ?? 0}% sobre ${base}`;
  }
  if (benefit.type === "VARIABLE") {
    if (benefit.valueConfig.fixedAmount !== undefined) {
      return `Valor variavel: ${formatCurrency(benefit.valueConfig.fixedAmount)}`;
    }
    return benefit.valueConfig.variableRuleDescription || "Regra variavel";
  }
  return benefit.valueConfig.informativeDescription || "Informativo";
}

function resolveFrequencyLabel(value: Benefit["frequency"]): string {
  if (value === "DAILY") return "Diario";
  if (value === "PER_USE") return "Por uso";
  if (value === "PER_TRIP") return "Por viagem";
  if (value === "ONE_TIME") return "Unico";
  return "Mensal";
}

function resolveApplicationLabel(value: Benefit["applicationMode"]): string {
  if (value === "PER_DAY_WORKED") return "Por dia trabalhado";
  if (value === "PER_TRIP") return "Por viagem";
  return "Por colaborador";
}
