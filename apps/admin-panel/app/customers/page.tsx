"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomerSummary, formatDateTime, request } from "../../lib/api";
import { useIsMobileLayout } from "../../lib/use-mobile-layout";
import { FilterIcon, OpenIcon, SearchIcon } from "../../components/icons/common-icons";

export default function CustomersPage() {
  const isMobileLayout = useIsMobileLayout();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState("Clientes identificados pelo telefone.");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobilityFilter, setMobilityFilter] = useState<"ALL" | "WITH_MOBILITY" | "WITHOUT_MOBILITY">("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void request<CustomerSummary[]>("/admin/customers")
      .then((data) => {
        setCustomers(data);
        setStatusMessage(`${data.length} cliente(s) identificados pelo telefone.`);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          customer.name,
          customer.phone,
          customer.lastOrigin ?? "",
          customer.lastDestination ?? "",
          customer.lastRideStatus ?? "",
          ...customer.favorites.map((favorite) => `${favorite.label} ${favorite.address}`)
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesMobility =
        mobilityFilter === "ALL" ||
        (mobilityFilter === "WITH_MOBILITY" && customer.hasReducedMobility) ||
        (mobilityFilter === "WITHOUT_MOBILITY" && !customer.hasReducedMobility);

      return matchesSearch && matchesMobility;
    });
  }, [customers, searchTerm, mobilityFilter]);

  const customersWithMobility = useMemo(
    () => customers.filter((customer) => customer.hasReducedMobility).length,
    [customers]
  );
  const customersWithRides = useMemo(
    () => customers.filter((customer) => customer.totalRides > 0).length,
    [customers]
  );
  const customersWithFavorites = useMemo(
    () => customers.filter((customer) => customer.favorites.length > 0).length,
    [customers]
  );
  const hasActiveFilters = mobilityFilter !== "ALL";

  return (
    <main className="page-shell">
      <section className="customers-page-topbar">
        <p className="customers-page-status">{statusMessage}</p>
      </section>

      <section className="customers-overview-strip">
        <article className="customers-overview-item">
          <span>Total</span>
          <strong>{customers.length}</strong>
        </article>
        <article className="customers-overview-item">
          <span>Com corridas</span>
          <strong>{customersWithRides}</strong>
        </article>
        <article className="customers-overview-item">
          <span>Favoritos</span>
          <strong>{customersWithFavorites}</strong>
        </article>
        <article className="customers-overview-item">
          <span>Mobilidade reduzida</span>
          <strong>{customersWithMobility}</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide customers-table-panel customers-table-panel-clean">
          <div className="customers-table-head">
            <div className="customers-table-head-copy">
              <h2>Clientes cadastrados</h2>
              <span>{filteredCustomers.length} registro(s) visiveis na listagem.</span>
            </div>

            <div className="customers-table-tools">
              <label className="admin-header-search customers-inline-search">
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
                    ? "customers-filter-toggle admin-header-icon-button is-active"
                    : "customers-filter-toggle admin-header-icon-button"
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
            <div className="customers-table-filters">
              <div className="filter-field">
                <span>Mobilidade</span>
                <select
                  className="select"
                  value={mobilityFilter}
                  onChange={(event) =>
                    setMobilityFilter(event.target.value as "ALL" | "WITH_MOBILITY" | "WITHOUT_MOBILITY")
                  }
                >
                  <option value="ALL">Todos</option>
                  <option value="WITH_MOBILITY">Com registro</option>
                  <option value="WITHOUT_MOBILITY">Sem registro</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="customers-table-wrap">
            {!isMobileLayout ? (
              <table className="customers-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Historico</th>
                  <th>Perfil do cliente</th>
                  <th>Score</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.phone}>
                    <td>
                      <div className="table-driver-cell">
                        <div className="driver-avatar">{customer.name.slice(0, 1).toUpperCase()}</div>
                        <div className="table-driver-copy">
                          <strong>{customer.name}</strong>
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-contact-cell">
                        <strong>{customer.totalRides} corrida(s)</strong>
                        <span>{customer.favorites.length} favorito(s)</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-status-stack customer-profile-stack">
                        <span className="customer-tier-line neutral">
                          <span>{customer.customerProfile.tierLabel}</span>
                        </span>
                        <span className="table-status-meta">
                          {customer.customerProfile.totalRides} solicitações
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-vehicle-cell">
                        <strong>{customer.customerProfile.score}</strong>
                        <span>{customer.hasReducedMobility ? "Mobilidade registrada" : "Sem alerta"}</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/customers/${encodeURIComponent(customer.phone)}`}
                        className="table-inline-link table-inline-icon-link"
                        aria-label={`Abrir perfil de ${customer.name}`}
                        title="Abrir perfil"
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
              {filteredCustomers.map((customer) => (
                <div key={customer.phone} className="list-card driver-card">
                  <div className="driver-card-top">
                    <div className="table-driver-cell">
                      <div className="driver-avatar">{customer.name.slice(0, 1).toUpperCase()}</div>
                      <div className="table-driver-copy">
                        <strong>{customer.name}</strong>
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                    <Link
                      href={`/customers/${encodeURIComponent(customer.phone)}`}
                      className="table-inline-link table-inline-icon-link"
                      aria-label={`Abrir perfil de ${customer.name}`}
                      title="Abrir perfil"
                    >
                      <OpenIcon />
                    </Link>
                  </div>

                    <div className="driver-card-grid">
                      <div className="driver-info-block">
                        <span className="info-label">Historico</span>
                        <strong>{customer.totalRides} corrida(s)</strong>
                        <span>{customer.favorites.length} favorito(s)</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Perfil do cliente</span>
                        <strong>{customer.customerProfile.tierLabel}</strong>
                        <span>{customer.customerProfile.totalRides} solicitações</span>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Score</span>
                        <strong>{customer.customerProfile.score}</strong>
                        <span>{customer.hasReducedMobility ? "Mobilidade registrada" : "Sem alerta"}</span>
                      </div>
                    </div>
                </div>
              ))}
              </div>
            ) : null}

            {filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum cliente encontrado.</strong>
                <p>Ajuste a busca ou o filtro para localizar outro perfil.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
