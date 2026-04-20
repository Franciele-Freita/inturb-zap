"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminTableRowActions } from "../../components/admin-table-row-actions";
import { SearchIcon } from "../../components/icons/common-icons";
import { DriverOperationalStatus, DriverProfile, request } from "../../lib/api";
import { useIsMobileLayout } from "../../lib/use-mobile-layout";

type StatusFilter = "ALL" | DriverOperationalStatus;
type ContractProfileFilter = "ALL" | "CLT" | "INTERMITENTE" | "MEI";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>("Carregando motoristas...");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [contractProfileFilter, setContractProfileFilter] = useState<ContractProfileFilter>("ALL");
  const isMobileLayout = useIsMobileLayout();

  useEffect(() => {
    void loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      const data = await request<DriverProfile[]>("/admin/drivers");
      setDrivers(data);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar motoristas.");
    }
  }

  const filteredDrivers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return drivers.filter((driver) => {
      const profileFilterValue = resolveDriverProfileFilterValue(driver);
      const matchesSearch =
        query.length === 0 ||
        [
          driver.name,
          driver.cpf,
          driver.phone,
          driver.email ?? "",
          resolveDriverProfileLabel(driver),
          resolveOperationalVehicleLabel(driver),
          driver.operationalNotes ?? "",
          ...driver.vehicles.map((vehicle) => `${vehicle.label} ${vehicle.plate}`)
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "ALL" || driver.operationalStatus === statusFilter;
      const matchesProfile = contractProfileFilter === "ALL" || profileFilterValue === contractProfileFilter;

      return matchesSearch && matchesStatus && matchesProfile;
    });
  }, [contractProfileFilter, drivers, searchTerm, statusFilter]);

  const activeCount = useMemo(
    () => drivers.filter((driver) => driver.operationalStatus === "ACTIVE").length,
    [drivers]
  );
  const blockedCount = useMemo(
    () => drivers.filter((driver) => driver.operationalStatus === "SUSPENDED").length,
    [drivers]
  );
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "ALL" ||
    contractProfileFilter !== "ALL";

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("ALL");
    setContractProfileFilter("ALL");
    setStatusMessage(null);
  }

  return (
    <main className="page-shell page-shell-wide overtime-list-page-shell">
      <section className="overtime-list-page-header">
        <div className="overtime-list-page-header-copy">
          <h1>Motoristas</h1>
          <p>Cadastre e acompanhe motoristas com filtros simples e foco operacional.</p>
        </div>
        <div className="overtime-list-page-header-actions">
          <button type="button" className="button-link secondary-link" onClick={clearFilters}>
            Limpar filtros
          </button>
          <Link href="/drivers/new" className="button-link">
            + Novo motorista
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="overtime-list-status-message">{statusMessage}</p> : null}

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean overtime-list-table-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Lista de motoristas</h2>
              <span>
                {filteredDrivers.length} visivel(is), {activeCount} ativo(s), {blockedCount} bloqueado(s).
              </span>
            </div>

            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, CPF, contato ou veiculo..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>

              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={contractProfileFilter}
                onChange={(event) => setContractProfileFilter(event.target.value as ContractProfileFilter)}
              >
                <option value="ALL">Todos os vinculos</option>
                <option value="CLT">CLT</option>
                <option value="INTERMITENTE">Intermitente</option>
                <option value="MEI">MEI</option>
              </select>

              <select
                className={hasActiveFilters ? "select drivers-filter-toggle is-active" : "select drivers-filter-toggle"}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Afastado</option>
                <option value="LEAVE">Ferias</option>
                <option value="SUSPENDED">Bloqueado</option>
              </select>
            </div>
          </div>

          <div className="drivers-table-wrap">
            {!isMobileLayout ? (
              <table className="drivers-table pricing-table">
                <thead>
                  <tr>
                    <th>Motorista</th>
                    <th>Perfil</th>
                    <th>Veiculo operacional</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id}>
                      <td>
                        <div className="table-driver-cell">
                          <div className="driver-avatar">{driver.name.slice(0, 1).toUpperCase()}</div>
                          <div className="table-driver-copy">
                            <strong>{driver.name}</strong>
                            <span>CPF {driver.cpf || "pendente"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{resolveDriverProfileLabel(driver)}</td>
                      <td>{resolveOperationalVehicleLabel(driver)}</td>
                      <td>
                        <div className="table-contact-cell">
                          <strong>{driver.email ?? "Sem e-mail informado"}</strong>
                          <span>{driver.phone}</span>
                        </div>
                      </td>
                      <td>
                        <span className={resolveDriverStatusClassName(driver.operationalStatus)}>
                          {resolveDriverStatusLabel(driver.operationalStatus)}
                        </span>
                      </td>
                      <td>
                        <AdminTableRowActions
                          primary={{
                            id: `${driver.id}_edit`,
                            label: "Editar",
                            href: `/drivers/${driver.id}/cadastro`
                          }}
                          items={[
                            {
                              id: `${driver.id}_finance`,
                              label: "Financeiro",
                              href: `/drivers/${driver.id}/financeiro`
                            },
                            {
                              id: `${driver.id}_history`,
                              label: "Historico",
                              href: `/drivers/${driver.id}/historico`
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="drivers-mobile-list">
                {filteredDrivers.map((driver) => (
                  <div key={driver.id} className="list-card driver-card">
                    <div className="driver-card-top">
                      <div className="table-driver-cell">
                        <div className="driver-avatar">{driver.name.slice(0, 1).toUpperCase()}</div>
                        <div className="table-driver-copy">
                          <strong>{driver.name}</strong>
                          <span>CPF {driver.cpf || "pendente"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="driver-card-grid">
                      <div className="driver-info-block">
                        <span className="info-label">Perfil</span>
                        <strong>{resolveDriverProfileLabel(driver)}</strong>
                      </div>
                      <div className="driver-info-block">
                        <span className="info-label">Status</span>
                        <strong className={resolveDriverStatusClassName(driver.operationalStatus)}>
                          {resolveDriverStatusLabel(driver.operationalStatus)}
                        </strong>
                      </div>
                    </div>

                    <div className="driver-contract-actions">
                      <Link href={`/drivers/${driver.id}/cadastro`} className="button-link secondary-link">
                        Editar cadastro
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredDrivers.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum motorista encontrado.</strong>
                <p>Ajuste os filtros ou cadastre um novo motorista.</p>
                <Link href="/drivers/new" className="button-link">
                  Cadastrar motorista
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function resolveDriverStatusLabel(status: DriverOperationalStatus): string {
  switch (status) {
    case "INACTIVE":
      return "Afastado";
    case "LEAVE":
      return "Ferias";
    case "SUSPENDED":
      return "Bloqueado";
    default:
      return "Ativo";
  }
}

function resolveDriverStatusClassName(status: DriverOperationalStatus): string {
  if (status === "ACTIVE") {
    return "status-pill status-pill-success";
  }

  if (status === "LEAVE") {
    return "status-pill status-pill-warning";
  }

  if (status === "SUSPENDED") {
    return "status-pill rides-status-pill-danger";
  }

  return "status-pill";
}

function resolveDriverProfileLabel(driver: DriverProfile): string {
  if (driver.contractProfile === "CLT") {
    return "CLT";
  }

  if (driver.contractProfile === "INTERMITENTE") {
    return "Intermitente";
  }

  if (driver.contractProfile === "MEI") {
    return "MEI";
  }

  if (driver.compensation.effectiveModel === "INTERMITTENT") {
    return "Intermitente";
  }

  return "CLT";
}

function resolveDriverProfileFilterValue(driver: DriverProfile): ContractProfileFilter {
  const label = resolveDriverProfileLabel(driver);
  if (label === "Intermitente") return "INTERMITENTE";
  if (label === "MEI") return "MEI";
  return "CLT";
}

function resolveOperationalVehicleLabel(driver: DriverProfile): string {
  if (driver.currentFleetVehicle?.label) {
    return driver.currentFleetVehicle.label;
  }
  const activeVehicle = driver.vehicles.find((vehicle) => vehicle.isActive);
  if (!activeVehicle) {
    return "Sem veiculo ativo";
  }

  return `${activeVehicle.label} (${activeVehicle.plate})`;
}
