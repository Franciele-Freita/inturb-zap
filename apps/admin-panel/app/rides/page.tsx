"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DriverProfile, Ride, request } from "../../lib/api";
import { SearchIcon } from "../../components/icons/common-icons";
import {
  buildRideBoardCounts,
  groupRidesForBoard,
  mockDrivers,
  mockRides,
  normalizeSearch,
  resolveRideStageLabel,
  resolveRideStatusLabel,
  resolveRideStatusPillClassName,
  rideBoardMeta,
  rideBoardOrder,
  RideBoardKey
} from "./ride-shared";
import { formatCurrency, formatDateTime } from "../../lib/api";

export default function RidesPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [activeTab, setActiveTab] = useState<RideBoardKey>("CREATED");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState("Central operacional monitorando corridas em tempo real.");

  const driversById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const overview = useMemo(() => buildRideBoardCounts(rides), [rides]);

  const filteredRides = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);
    if (!normalizedSearch) {
      return rides;
    }

    return rides.filter((ride) => {
      const driverName = ride.assignedDriverId ? driversById.get(ride.assignedDriverId)?.name ?? "" : "";
      const haystack = [
        ride.id,
        ride.customerName,
        ride.customerPhone ?? "",
        ride.origin,
        ride.destination,
        ride.tripTypeName ?? "",
        resolveRideStatusLabel(ride.status),
        resolveRideStageLabel(ride.driverStage),
        driverName
      ]
        .map(normalizeSearch)
        .join(" ");

      return haystack.includes(normalizedSearch);
    });
  }, [driversById, rides, searchTerm]);

  const groupedRides = useMemo(() => groupRidesForBoard(filteredRides), [filteredRides]);
  const activeTabRides = groupedRides[activeTab];

  useEffect(() => {
    void refresh().catch((error: Error) => setStatusMessage(error.message));
  }, []);

  async function refresh(): Promise<void> {
    try {
      const [driversData, ridesData] = await Promise.all([
        request<DriverProfile[]>("/admin/drivers"),
        request<Ride[]>("/admin/rides")
      ]);

      if (ridesData.length === 0) {
        setDrivers(mockDrivers);
        setRides(mockRides);
        setIsUsingMockData(true);
        setStatusMessage("Modo demonstracao habilitado para validar o layout.");
        return;
      }

      setDrivers(driversData);
      setRides(ridesData);
      setIsUsingMockData(false);
    } catch {
      setDrivers(mockDrivers);
      setRides(mockRides);
      setIsUsingMockData(true);
      setStatusMessage("Nao foi possivel carregar corridas reais. Exibindo mock para revisao visual.");
    }
  }

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">
          {isUsingMockData ? "Mostrando corridas mockadas para validar o layout da operacao." : statusMessage}
        </p>
      </section>

      <section className="drivers-overview-strip rides-operations-overview">
        <article className="drivers-overview-item">
          <span>Total</span>
          <strong>{rides.length}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Geradas</span>
          <strong>{overview.CREATED}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Aceitas</span>
          <strong>{overview.ACCEPTED}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Rej./exp.</span>
          <strong>{overview.CLOSED}</strong>
        </article>
        <article className="drivers-overview-item">
          <span>Finalizadas</span>
          <strong>{overview.COMPLETED}</strong>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide rides-operations-panel">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Operacao de Corridas</h2>
              <span>{activeTabRides.length} corrida(s) visiveis na aba selecionada.</span>
            </div>

            <label className="admin-header-search rides-operations-search">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente, telefone, rota ou id..."
              />
              <span className="admin-header-search-icon" aria-hidden="true">
                <SearchIcon />
              </span>
            </label>
          </div>

          <div className="rides-operations-tabs" role="tablist" aria-label="Status das corridas">
            {rideBoardOrder.map((groupKey) => {
              const groupMeta = rideBoardMeta[groupKey];
              const count = groupedRides[groupKey].length;
              const isActive = activeTab === groupKey;

              return (
                <button
                  key={groupKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? "rides-operations-tab is-active" : "rides-operations-tab"}
                  onClick={() => setActiveTab(groupKey)}
                >
                  <span>{groupMeta.title}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>

          <div className="rides-operations-tab-summary">
            <div>
              <h3>{rideBoardMeta[activeTab].title}</h3>
              <p>{rideBoardMeta[activeTab].description}</p>
            </div>
            <span>{activeTabRides.length}</span>
          </div>

          {activeTabRides.length === 0 ? (
            <div className="empty-state rides-operations-empty rides-operations-empty-panel">
              <strong>{rideBoardMeta[activeTab].emptyMessage}</strong>
              <p>Ajuste a busca ou aguarde novas corridas entrarem nessa etapa.</p>
            </div>
          ) : (
            <div className="rides-operations-cards">
              {activeTabRides.map((ride) => {
                const driverName = ride.assignedDriverId ? driversById.get(ride.assignedDriverId)?.name : undefined;

                return (
                  <Link
                    key={ride.id}
                    href={`/rides/${encodeURIComponent(ride.id)}`}
                    className={`rides-operations-card ${rideBoardMeta[activeTab].toneClassName}`}
                  >
                    <div className="rides-operations-card-meta">
                      <span className={resolveRideStatusPillClassName(ride.status)}>{resolveRideStatusLabel(ride.status)}</span>
                      {ride.driverStage ? (
                        <span className="rides-operations-stage-badge">{resolveRideStageLabel(ride.driverStage)}</span>
                      ) : null}
                    </div>

                    <div className="rides-operations-card-copy">
                      <strong>{ride.customerName}</strong>
                      <span>{ride.customerPhone ?? "Telefone nao informado"}</span>
                    </div>

                    <div className="rides-operations-card-route">
                      <span>{ride.origin}</span>
                      <span>{ride.destination}</span>
                    </div>

                    <div className="rides-operations-card-footer">
                      <span>{formatDateTime(ride.scheduledAt)}</span>
                      <span>{formatCurrency(ride.quote?.amount)}</span>
                      <span>{driverName ?? "Sem motorista"}</span>
                    </div>

                    <div className="rides-operations-card-link">
                      <span>Abrir detalhes</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
