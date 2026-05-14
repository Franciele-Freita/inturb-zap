"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cargo, CargoPage, request } from "../lib/api";
import { AdminTableRowActions } from "./admin-table-row-actions";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from "./icons/common-icons";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type Feedback = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function buildPaginationTokens(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1
  ]);

  const orderedPages = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const tokens: Array<number | "ellipsis"> = [];
  for (let index = 0; index < orderedPages.length; index += 1) {
    const page = orderedPages[index];
    const previous = orderedPages[index - 1];
    if (typeof previous === "number" && page - previous > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(page);
  }

  return tokens;
}

export function AdministrativeCargoPage() {
  const [cargoItems, setCargoItems] = useState<Cargo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const listRequestIdRef = useRef(0);

  const loadCargos = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    const requestId = ++listRequestIdRef.current;
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (searchTerm.trim().length > 0) {
        params.set("q", searchTerm.trim());
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const rows = await request<CargoPage>(`/admin/cargos/paginated?${params.toString()}`);
      if (requestId !== listRequestIdRef.current) {
        return;
      }

      setCargoItems(rows.items);
      setTotalItems(rows.totalItems);
      setTotalPages(Math.max(rows.totalPages, 1));
      if (rows.page !== page) {
        setPage(rows.page);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) {
        return;
      }
      setCargoItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setPageError(error instanceof Error ? error.message : "Falha ao carregar cargos.");
    } finally {
      if (requestId === listRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    void loadCargos();
  }, [loadCargos]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  async function handleToggleStatus(item: Cargo) {
    setPendingId(item.id);
    try {
      const updated = await request<Cargo>(`/admin/cargos/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive })
      });
      setFeedback({
        type: "success",
        message: `Cargo "${updated.name}" ${updated.isActive ? "ativado" : "inativado"}.`
      });
      await loadCargos();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha ao atualizar cargo."
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(item: Cargo) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Excluir o cargo "${item.name}"?`);
      if (!confirmed) {
        return;
      }
    }

    setPendingId(item.id);
    try {
      await request<void>(`/admin/cargos/${item.id}`, { method: "DELETE" });
      setFeedback({
        type: "success",
        message: `Cargo "${item.name}" excluido.`
      });
      await loadCargos();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Falha ao excluir cargo."
      });
    } finally {
      setPendingId(null);
    }
  }

  const paginationTokens = useMemo(
    () => buildPaginationTokens(page, totalPages),
    [page, totalPages]
  );
  const canGoPrevious = page > 1 && !isLoading;
  const canGoNext = page < totalPages && !isLoading;
  const firstVisibleItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleItem = totalItems === 0 ? 0 : firstVisibleItem + cargoItems.length - 1;
  const hasActiveFilters = statusFilter !== "ALL" || searchTerm.trim().length > 0;
  const isEmpty = !isLoading && !pageError && cargoItems.length === 0;
  const shouldShowPagination = totalItems > 0;

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
              setPage(1);
            }}
          >
            Limpar filtros
          </button>
          <Link href="/administrative/cargo/new" className="button-link">
            + Novo cargo
          </Link>
        </div>
      </section>

      {feedback ? (
        <p
          className="overtime-list-status-message"
          role={feedback.type === "error" ? "alert" : "status"}
          style={
            feedback.type === "error"
              ? {
                  border: "1px solid rgba(219, 67, 103, 0.28)",
                  background: "rgba(255, 246, 249, 0.88)",
                  color: "#a13a49"
                }
              : undefined
          }
        >
          {feedback.message}
        </p>
      ) : null}

      {pageError ? (
        <div className="cargo-editor-alert" role="alert">
          <strong>Falha ao carregar cargos.</strong>
          <span style={{ display: "block", marginTop: "4px" }}>{pageError}</span>
          <button
            type="button"
            className="button-link secondary-link"
            style={{ marginTop: "10px" }}
            onClick={() => {
              void loadCargos();
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de cargos</h2>
              <span>
                {totalItems > 0
                  ? `Exibindo ${firstVisibleItem}-${lastVisibleItem} de ${totalItems} registro(s).`
                  : "Nenhum registro encontrado."}
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
            {isLoading ? (
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Cargo</th>
                    <th>Departamento</th>
                    <th>Niveis</th>
                    <th>Status</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5}>Carregando cargos...</td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {!isLoading && !isEmpty ? (
              <table className="drivers-table pricing-table cargo-list-table">
                <thead>
                  <tr>
                    <th>Cargo</th>
                    <th>Departamento</th>
                    <th>Niveis</th>
                    <th>Status</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{item.name}</strong>
                          <span className="cargo-list-description-line">
                            {item.description?.trim() || "Sem descricao cadastrada."}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cargo-list-muted-text">{item.department}</span>
                      </td>
                      <td>
                        <span className="cargo-list-muted-text">
                          {item.levels.length > 0 ? item.levels.join(", ") : "Sem niveis"}
                        </span>
                      </td>
                      <td>
                        <span className={item.isActive ? "status-pill status-pill-success" : "status-pill"}>
                          {item.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="cargo-actions-cell">
                        <AdminTableRowActions
                          menuLabel={`Acoes do cargo ${item.name}`}
                          items={[
                            {
                              id: `${item.id}_edit`,
                              label: "Editar",
                              href: `/administrative/cargo/${item.id}/edit`
                            },
                            {
                              id: `${item.id}_toggle`,
                              label:
                                pendingId === item.id
                                  ? "Salvando..."
                                  : item.isActive
                                    ? "Inativar"
                                  : "Ativar",
                              onClick: () => handleToggleStatus(item),
                              disabled: pendingId === item.id
                            },
                            {
                              id: `${item.id}_delete`,
                              label: "Excluir",
                              onClick: () => handleDelete(item),
                              disabled: pendingId === item.id,
                              danger: true
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {isEmpty ? (
              <div className="cargo-list-empty-state">
                {hasActiveFilters ? (
                  <>
                    <strong>Nenhum cargo corresponde aos filtros aplicados.</strong>
                    <p>Ajuste a busca ou limpe os filtros para visualizar novamente os cargos.</p>
                    <div className="cargo-list-empty-state-actions">
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
                    <strong>Nenhum cargo cadastrado ainda.</strong>
                    <p>Cadastre o primeiro cargo para liberar a configuracao de perfis de trabalho.</p>
                    <div className="cargo-list-empty-state-actions">
                      <Link href="/administrative/cargo/new" className="button-link">
                        Cadastrar primeiro cargo
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {shouldShowPagination ? <div className="cbo-pagination-bar">
            <label className="cbo-pagination-size">
              <span>Show</span>
              <select
                className="select"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                disabled={isLoading}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="cbo-pagination-nav" role="navigation" aria-label="Paginacao da tabela de cargos">
              <button
                type="button"
                className="cbo-pagination-button"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={!canGoPrevious}
                aria-label="Pagina anterior"
              >
                <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
              </button>

              {paginationTokens.map((token, index) =>
                token === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="cbo-pagination-ellipsis" aria-hidden="true">
                    ...
                  </span>
                ) : (
                  <button
                    key={token}
                    type="button"
                    className={token === page ? "cbo-pagination-button is-active" : "cbo-pagination-button"}
                    onClick={() => setPage(token)}
                    disabled={isLoading}
                    aria-current={token === page ? "page" : undefined}
                  >
                    {token}
                  </button>
                )
              )}

              <button
                type="button"
                className="cbo-pagination-button"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={!canGoNext}
                aria-label="Proxima pagina"
              >
                <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div> : null}
        </article>
      </section>
    </main>
  );
}
