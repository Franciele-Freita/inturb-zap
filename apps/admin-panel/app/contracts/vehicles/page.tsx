"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FleetVehicleOverview, request } from "../../../lib/api";

type ContractFilter = "ALL" | "WITH_CONTRACT" | "WITHOUT_CONTRACT";

function normalizeContractNote(vehicle: FleetVehicleOverview): string {
  return vehicle.notes?.trim() ?? "";
}

function hasVehicleContractConfigured(vehicle: FleetVehicleOverview): boolean {
  return normalizeContractNote(vehicle).length > 0;
}

function resolveVehicleStatusLabel(status: FleetVehicleOverview["status"]): string {
  if (status === "AVAILABLE") return "Disponivel";
  if (status === "ALLOCATED") return "Alocado";
  if (status === "MAINTENANCE") return "Em manutencao";
  return "Inativo";
}

function resolveVehicleStatusTone(status: FleetVehicleOverview["status"]): "success" | "warning" | "danger" | "neutral" {
  if (status === "AVAILABLE") return "success";
  if (status === "ALLOCATED" || status === "MAINTENANCE") return "warning";
  if (status === "INACTIVE") return "danger";
  return "neutral";
}

export default function VehicleContractsPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Carregando contratos de veiculos.");
  const [searchInput, setSearchInput] = useState("");
  const [contractFilter, setContractFilter] = useState<ContractFilter>("ALL");

  useEffect(() => {
    let isMounted = true;

    async function loadVehicles() {
      setIsLoading(true);
      try {
        const data = await request<FleetVehicleOverview[]>("/admin/fleet/vehicles");
        if (!isMounted) {
          return;
        }
        setVehicles(data);
        setStatusMessage(`${data.length} veiculo(s) carregado(s) para gestao contratual.`);
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error instanceof Error ? error.message : "Nao foi possivel carregar contratos de veiculos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadVehicles();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const hasContract = hasVehicleContractConfigured(vehicle);
      const matchesSearch =
        query.length === 0 ||
        [vehicle.label, vehicle.plate, vehicle.currentAssignment?.driverName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesFilter =
        contractFilter === "ALL" ||
        (contractFilter === "WITH_CONTRACT" && hasContract) ||
        (contractFilter === "WITHOUT_CONTRACT" && !hasContract);

      return matchesSearch && matchesFilter;
    });
  }, [contractFilter, searchInput, vehicles]);

  const overview = useMemo(() => {
    const total = vehicles.length;
    const withContract = vehicles.filter((vehicle) => hasVehicleContractConfigured(vehicle)).length;
    const withoutContract = total - withContract;
    const allocated = vehicles.filter((vehicle) => vehicle.status === "ALLOCATED").length;

    return { total, withContract, withoutContract, allocated };
  }, [vehicles]);

  return (
    <main className="page-shell driver-contracts-shell">
      <section className="drivers-page-topbar driver-list-topbar">
        <div className="driver-list-topbar-copy">
          <div className="driver-list-topbar-header">
            <div className="driver-list-topbar-heading">
              <p className="eyebrow">Contratos - Veiculos</p>
              <h1>Contratos de veiculos</h1>
              <p className="drivers-page-status">
                Central para acompanhar o registro contratual dos veiculos da frota. {statusMessage}
              </p>
            </div>
            <div className="drivers-page-head-actions">
              <Link href="/fleet/veiculos" className="button-link secondary-link">
                Ir para frota
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="drivers-overview-strip driver-list-overview-strip">
        <article className="drivers-overview-item">
          <span>Total</span>
          <strong>{overview.total}</strong>
          <small>Veiculos listados.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Com contrato</span>
          <strong>{overview.withContract}</strong>
          <small>Registro em observacoes.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Sem contrato</span>
          <strong>{overview.withoutContract}</strong>
          <small>Pendente de cadastro.</small>
        </article>
        <article className="drivers-overview-item">
          <span>Alocados</span>
          <strong>{overview.allocated}</strong>
          <small>Com motorista vinculado.</small>
        </article>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Esteira de contratos de veiculos</h2>
              <span>{filteredVehicles.length} registro(s) visiveis na listagem atual.</span>
            </div>
            <div className="drivers-table-tools driver-contracts-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por veiculo, placa ou motorista..."
                />
              </label>
              <label>
                <span>Contrato</span>
                <select
                  className="select"
                  value={contractFilter}
                  onChange={(event) => setContractFilter(event.target.value as ContractFilter)}
                >
                  <option value="ALL">Todos</option>
                  <option value="WITH_CONTRACT">Com contrato</option>
                  <option value="WITHOUT_CONTRACT">Sem contrato</option>
                </select>
              </label>
            </div>
          </div>

          <div className="drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>Veiculo</th>
                  <th>Status operacional</th>
                  <th>Motorista atual</th>
                  <th>Contrato</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const contractNote = normalizeContractNote(vehicle);
                  const hasContract = contractNote.length > 0;

                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <strong>{vehicle.label}</strong>
                        <small>{vehicle.plate}</small>
                      </td>
                      <td>
                        <span className={`driver-contract-status is-${resolveVehicleStatusTone(vehicle.status)}`}>
                          {resolveVehicleStatusLabel(vehicle.status)}
                        </span>
                      </td>
                      <td>
                        {vehicle.currentAssignment ? (
                          <>
                            <strong>{vehicle.currentAssignment.driverName}</strong>
                            <small>Desde {new Date(vehicle.currentAssignment.startedAt).toLocaleDateString("pt-BR")}</small>
                          </>
                        ) : (
                          <span>Sem motorista alocado</span>
                        )}
                      </td>
                      <td>
                        {hasContract ? (
                          <>
                            <strong>Registrado</strong>
                            <small>{contractNote}</small>
                          </>
                        ) : (
                          <>
                            <strong>Pendente</strong>
                            <small>Contrato ainda nao informado no cadastro do veiculo.</small>
                          </>
                        )}
                      </td>
                      <td>
                        <div className="driver-contract-actions">
                          <Link href={`/fleet/veiculos/${vehicle.id}/cadastro`} className="button-link secondary-link">
                            Abrir cadastro
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredVehicles.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum veiculo encontrado.</strong>
              <p>Revise os filtros para visualizar contratos de veiculos.</p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
