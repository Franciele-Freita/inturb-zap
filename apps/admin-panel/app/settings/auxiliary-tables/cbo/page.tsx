"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CboImportResult,
  CboOccupation,
  CboOccupationPage,
  request,
  requestFormData
} from "../../../../lib/api";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from "../../../../components/icons/common-icons";

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

export default function CboSettingsPage() {
  const [items, setItems] = useState<CboOccupation[]>([]);
  const [statusMessage, setStatusMessage] = useState("Carregando tabela de CBO.");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRequestIdRef = useRef(0);

  const loadCboList = useCallback(async (statusPrefix?: string) => {
    setIsLoading(true);
    const requestId = ++listRequestIdRef.current;
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (searchTerm.trim().length > 0) {
        params.set("q", searchTerm.trim());
      }

      const loaded = await request<CboOccupationPage>(`/admin/cbo?${params.toString()}`);
      if (requestId !== listRequestIdRef.current) {
        return;
      }

      setItems(loaded.items);
      setTotalItems(loaded.totalItems);
      setTotalPages(Math.max(loaded.totalPages, 1));
      if (loaded.page !== page) {
        setPage(loaded.page);
      }

      const baseMessage = `Mostrando ${loaded.items.length} registro(s) de ${loaded.totalItems} CBO(s).`;
      setStatusMessage(statusPrefix ? `${statusPrefix} ${baseMessage}` : baseMessage);
    } catch (error) {
      if (requestId !== listRequestIdRef.current) {
        return;
      }
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar tabela de CBO.");
    } finally {
      if (requestId === listRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => {
    void loadCboList();
  }, [loadCboList]);

  const paginationTokens = useMemo(
    () => buildPaginationTokens(page, totalPages),
    [page, totalPages]
  );

  const canGoPrevious = page > 1 && !isLoading;
  const canGoNext = page < totalPages && !isLoading;
  const firstVisibleItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleItem = totalItems === 0 ? 0 : firstVisibleItem + items.length - 1;

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    setStatusMessage(`Importando arquivo ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", "CBO");

      const summary = await requestFormData<CboImportResult>("/admin/cbo/import", formData, {
        method: "POST"
      });

      await loadCboList(
        `Importacao concluida: ${summary.processed} registros processados (${summary.created} novos, ${summary.updated} atualizados).`
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao importar arquivo de CBO.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">{statusMessage}</p>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>CBO (Classificacao Brasileira)</h2>
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
                  placeholder="Buscar por codigo ou titulo..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <button
                type="button"
                className="button-link secondary-link"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting || isLoading}
              >
                {isImporting ? "Importando..." : "Importar CSV"}
              </button>

              <button
                type="button"
                className="button-link secondary-link"
                onClick={() => void loadCboList()}
                disabled={isLoading}
              >
                Recarregar
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void handleImportFile(event)}
            style={{ display: "none" }}
          />

          <div className="drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Titulo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={2}>Carregando CBOs...</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.title}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!isLoading && items.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum CBO encontrado.</strong>
                <p>Importe um CSV para popular a tabela ou ajuste o filtro de busca.</p>
              </div>
            ) : null}
          </div>

          <div className="cbo-pagination-bar">
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

            <div className="cbo-pagination-nav" role="navigation" aria-label="Paginacao da tabela de CBO">
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
          </div>
        </article>
      </section>
    </main>
  );
}
