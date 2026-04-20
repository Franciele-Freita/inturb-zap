"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TripType, formatCurrency, formatDateTime, request } from "../../lib/api";
import { useIsMobileLayout } from "../../lib/use-mobile-layout";
import { FilterIcon, OpenIcon, SearchIcon } from "../../components/icons/common-icons";

export default function TripTypesPage() {
  const isMobileLayout = useIsMobileLayout();
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [statusMessage, setStatusMessage] = useState("Carregando os tipos de viagem da operacao.");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function loadTripTypes(): Promise<void> {
    const data = await request<TripType[]>("/admin/trip-types");
    setTripTypes(data);
    setStatusMessage(`${data.length} tipo(s) carregado(s).`);
  }

  useEffect(() => {
    void loadTripTypes().catch((error: Error) => setStatusMessage(error.message));
  }, []);

  const filteredTripTypes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tripTypes.filter((tripType) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [tripType.name, tripType.slug, tripType.description ?? ""].join(" ").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && tripType.isActive) ||
        (statusFilter === "INACTIVE" && !tripType.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [tripTypes, searchTerm, statusFilter]);

  const activeTripTypes = useMemo(() => tripTypes.filter((tripType) => tripType.isActive).length, [tripTypes]);
  const inactiveTripTypes = useMemo(() => tripTypes.filter((tripType) => !tripType.isActive).length, [tripTypes]);
  const paidTripTypes = useMemo(() => tripTypes.filter((tripType) => tripType.surchargeAmount > 0).length, [tripTypes]);
  const hasActiveFilters = statusFilter !== "ALL";

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">{statusMessage}</p>
        <div className="drivers-page-head-actions">
          <Link href="/trip-types/new" className="button-link">
            + Novo tipo
          </Link>
        </div>
      </section>

      <section className="drivers-overview-strip">
        <article className="drivers-overview-item">
          <span>Total</span>
          <strong>{tripTypes.length}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Ativos</span>
          <strong>{activeTripTypes}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Inativos</span>
          <strong>{inactiveTripTypes}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Com acrescimo</span>
          <strong>{paidTripTypes}</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Tipos de viagem cadastrados</h2>
              <span>{filteredTripTypes.length} registro(s) visiveis na listagem.</span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by date, name or id..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <button
                type="button"
                className={
                  hasActiveFilters || filtersOpen
                    ? "drivers-filter-toggle admin-header-icon-button is-active"
                    : "drivers-filter-toggle admin-header-icon-button"
                }
                onClick={() => setFiltersOpen((current) => !current)}
                aria-label="Abrir filtros"
                aria-expanded={filtersOpen}
              >
                <FilterIcon />
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="drivers-table-filters">
              <div className="filter-field">
                <span>Status</span>
                <select
                  className="select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                >
                  <option value="ALL">Todos</option>
                  <option value="ACTIVE">Ativos</option>
                  <option value="INACTIVE">Inativos</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="drivers-table-wrap">
            {!isMobileLayout ? (
              <table className="drivers-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descricao</th>
                  <th>Acrescimo</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredTripTypes.map((tripType) => (
                  <tr key={tripType.id}>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{tripType.name}</strong>
                        <span>Slug {tripType.slug}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{tripType.description || "Sem descricao operacional"}</strong>
                        <span>Atualizado em {formatDateTime(tripType.updatedAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{formatCurrency(tripType.surchargeAmount)}</strong>
                        <span>{tripType.surchargeAmount > 0 ? "Cobrado no orcamento" : "Sem acrescimo"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-status-stack">
                        <span className={tripType.isActive ? "status-pill status-pill-success" : "status-pill"}>
                          {tripType.isActive ? "Ativo" : "Inativo"}
                        </span>
                        <span className="table-status-meta">{tripType.isDefault ? "Tipo padrao" : "Tipo adicional"}</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/trip-types/${tripType.id}`}
                        className="table-inline-link table-inline-icon-link"
                        aria-label={`Abrir cadastro do tipo ${tripType.name}`}
                        title="Abrir cadastro"
                      >
                        <OpenIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            ) : null}

            {isMobileLayout ? (
              <div className="drivers-mobile-list">
                {filteredTripTypes.map((tripType) => (
                  <div key={tripType.id} className="list-card driver-card">
                    <div className="driver-card-top">
                      <div className="table-contact-cell">
                        <strong>{tripType.name}</strong>
                        <span>Slug {tripType.slug}</span>
                      </div>
                      <Link
                        href={`/trip-types/${tripType.id}`}
                        className="table-inline-link table-inline-icon-link"
                        aria-label={`Abrir cadastro do tipo ${tripType.name}`}
                        title="Abrir cadastro"
                      >
                        <OpenIcon />
                      </Link>
                    </div>

                    <div className="driver-card-grid">
                      <div className="driver-info-block">
                        <span className="info-label">Descricao</span>
                        <strong>{tripType.description || "Sem descricao operacional"}</strong>
                        <span>Atualizado em {formatDateTime(tripType.updatedAt)}</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Acrescimo</span>
                        <strong>{formatCurrency(tripType.surchargeAmount)}</strong>
                        <span>{tripType.surchargeAmount > 0 ? "Cobrado no orcamento" : "Sem acrescimo"}</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Status</span>
                        <strong>{tripType.isActive ? "Ativo" : "Inativo"}</strong>
                        <span>{tripType.isDefault ? "Tipo padrao" : "Tipo adicional"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {filteredTripTypes.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum tipo de viagem encontrado.</strong>
                <p>Ajuste a busca ou os filtros, ou cadastre um novo tipo para a operacao.</p>
                <Link href="/trip-types/new" className="button-link">
                  Cadastrar tipo
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
