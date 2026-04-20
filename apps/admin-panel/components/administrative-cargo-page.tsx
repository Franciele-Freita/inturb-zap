"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import { SearchIcon } from "./icons/common-icons";
import {
  CargoCatalogItem,
  loadCargoCatalogItems,
  resolveCargoLevelLabel,
  saveCargoCatalogItems,
  sortCargoCatalogByName
} from "../lib/cargo-catalog";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function AdministrativeCargoPage() {
  const [cargoItems, setCargoItems] = useState<CargoCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    setCargoItems(loadCargoCatalogItems());
  }, []);

  function persist(next: CargoCatalogItem[]) {
    const sorted = sortCargoCatalogByName(next);
    setCargoItems(sorted);
    saveCargoCatalogItems(sorted);
  }

  function handleToggleStatus(item: CargoCatalogItem) {
    setPendingId(item.id);
    const updated = cargoItems.map((cargo) =>
      cargo.id === item.id
        ? { ...cargo, isActive: !cargo.isActive, updatedAt: new Date().toISOString() }
        : cargo
    );
    persist(updated);
    setPendingId(null);
  }

  function handleDelete(item: CargoCatalogItem) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Excluir o cargo "${item.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    persist(cargoItems.filter((cargo) => cargo.id !== item.id));
  }

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return cargoItems.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        [item.name, item.description ?? "", item.department, item.level, item.levels.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive) ||
        (statusFilter === "INACTIVE" && !item.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [cargoItems, searchTerm, statusFilter]);

  const activeCount = useMemo(
    () => cargoItems.filter((item) => item.isActive).length,
    [cargoItems]
  );
  const inactiveCount = Math.max(cargoItems.length - activeCount, 0);
  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim().length > 0;

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Cargos</h1>
          <p>Cadastre e organize cargos para padronizar perfis de trabalho e contratos.</p>
        </div>

        <div className="cargo-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
            }}
          >
            Limpar filtros
          </button>
          <Link href="/administrative/cargo/new" className="button-link">
            + Novo cargo
          </Link>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de cargos</h2>
              <span>
                {filteredItems.length} visivel(is), {activeCount} ativo(s), {inactiveCount} inativo(s).
              </span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, departamento, descricao ou categoria..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
              <select
                className={
                  hasActiveFilters
                    ? "select drivers-filter-toggle is-active"
                    : "select drivers-filter-toggle"
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
                  <th>Cargo</th>
                  <th>Departamento</th>
                  <th>Categoria e niveis</th>
                  <th>Status</th>
                  <th>Atualizacao</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{item.name}</strong>
                        <span>{item.description?.trim() || "Sem descricao cadastrada."}</span>
                      </div>
                    </td>
                    <td>{item.department}</td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{resolveCargoLevelLabel(item.level)}</strong>
                        <span>{item.levels.length > 0 ? item.levels.join(", ") : "Sem niveis"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <AdminTableRowActions
                        primary={{
                          id: `${item.id}_edit`,
                          label: "Editar",
                          href: `/administrative/cargo/${item.id}/edit`
                        }}
                        items={[
                          {
                            id: `${item.id}_toggle`,
                            label: item.isActive ? "Inativar" : "Ativar",
                            onClick: () => handleToggleStatus(item),
                            disabled: pendingId === item.id
                          },
                          {
                            id: `${item.id}_delete`,
                            label: "Excluir",
                            onClick: () => handleDelete(item),
                            danger: true
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum cargo encontrado.</strong>
                <p>Crie um cargo para iniciar o cadastro administrativo.</p>
                <Link href="/administrative/cargo/new" className="button-link">
                  Criar cargo
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
