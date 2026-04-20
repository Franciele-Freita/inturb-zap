"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DriverProfile, Ride, RideEvent, formatCurrency, formatDateTime, request } from "../../../lib/api";
import {
  DriverDecision,
  findMockRide,
  isRideAwaitingPrebook,
  mockDrivers,
  mockRideEventsById,
  resolveNextRideStageAction,
  resolveRideStageActionLabel,
  resolveRideStageLabel,
  resolveRideStagePathSuffix,
  resolveRideStatusLabel,
  resolveRideStatusPillClassName,
  RideStageAction
} from "../ride-shared";

export default function RideDetailsPage() {
  const params = useParams<{ rideId: string }>();
  const rideId = decodeURIComponent(params.rideId);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideEvents, setRideEvents] = useState<RideEvent[]>([]);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Carregando detalhes da corrida.");
  const [activeRequestKey, setActiveRequestKey] = useState("");

  const driversById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.isActive), [drivers]);

  useEffect(() => {
    void loadRideContext().catch((error: Error) => setStatusMessage(error.message));
  }, [rideId]);

  async function loadRideContext(): Promise<void> {
    try {
      const [driversData, rideData, eventsData] = await Promise.all([
        request<DriverProfile[]>("/admin/drivers"),
        request<Ride>(`/admin/rides/${encodeURIComponent(rideId)}`),
        request<RideEvent[]>(`/admin/rides/${encodeURIComponent(rideId)}/events`)
      ]);

      setDrivers(driversData);
      setRide(rideData);
      setRideEvents(eventsData);
      setIsUsingMockData(false);
      setStatusMessage(`Corrida ${rideData.id} carregada com ${eventsData.length} evento(s).`);
    } catch {
      const mockRide = findMockRide(rideId);
      if (!mockRide) {
        setRide(null);
        setRideEvents([]);
        setStatusMessage("Nao foi possivel localizar essa corrida.");
        return;
      }

      setDrivers(mockDrivers);
      setRide(mockRide);
      setRideEvents(mockRideEventsById[rideId] ?? []);
      setIsUsingMockData(true);
      setStatusMessage("Corrida mockada carregada para validacao visual.");
    }
  }

  async function handleDecision(driverId: string, decision: DriverDecision): Promise<void> {
    if (!ride) {
      return;
    }

    const requestKey = `${ride.id}:${driverId}:${decision}`;
    setActiveRequestKey(requestKey);

    try {
      await request<Ride>(`/admin/drivers/${driverId}/rides/${ride.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });

      setStatusMessage(
        decision === "ACCEPT"
          ? `Motorista ${driversById.get(driverId)?.name ?? driverId} aceitou a corrida ${ride.id}.`
          : `Motorista ${driversById.get(driverId)?.name ?? driverId} recusou a corrida ${ride.id}.`
      );

      await loadRideContext();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar a decisao da corrida.");
    } finally {
      setActiveRequestKey("");
    }
  }

  async function handleRideStageAction(action: RideStageAction): Promise<void> {
    if (!ride?.assignedDriverId) {
      return;
    }

    const suffix = resolveRideStagePathSuffix(action);
    const requestKey = `${ride.id}:${ride.assignedDriverId}:${action}`;
    setActiveRequestKey(requestKey);

    try {
      await request<Ride>(`/admin/drivers/${ride.assignedDriverId}/rides/${ride.id}/${suffix}`, {
        method: "POST"
      });

      setStatusMessage(`${resolveRideStageActionLabel(action)} na corrida ${ride.id}.`);
      await loadRideContext();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar o andamento da corrida.");
    } finally {
      setActiveRequestKey("");
    }
  }

  return (
    <main className="page-shell">
      <section className="drivers-page-topbar">
        <p className="drivers-page-status">
          {isUsingMockData ? "Mostrando detalhes mockados dessa corrida para revisar o layout." : statusMessage}
        </p>
      </section>

      <section className="toolbar rides-detail-toolbar">
        <Link href="/rides" className="button-link secondary-link">
          Voltar para operacao
        </Link>
      </section>

      {ride ? (
        <section className="grid grid-single">
          <article className="panel panel-wide rides-operations-panel">
            <div className="rides-operations-detail-section rides-operations-detail-page">
              <div className="rides-operations-detail-head">
                <div className="rides-operations-detail-badges">
                  <span className={resolveRideStatusPillClassName(ride.status)}>{resolveRideStatusLabel(ride.status)}</span>
                  {ride.driverStage ? (
                    <span className="rides-operations-stage-badge">{resolveRideStageLabel(ride.driverStage)}</span>
                  ) : null}
                </div>

                <div className="rides-operations-detail-copy">
                  <h1>{ride.customerName}</h1>
                  <span>{ride.id}</span>
                </div>
              </div>

              <div className="rides-operations-detail-grid">
                <div className="rides-operations-stat">
                  <span>Telefone</span>
                  <strong>{ride.customerPhone ?? "-"}</strong>
                </div>
                <div className="rides-operations-stat">
                  <span>Motorista</span>
                  <strong>
                    {ride.assignedDriverId ? driversById.get(ride.assignedDriverId)?.name ?? ride.assignedDriverId : "Nao atribuido"}
                  </strong>
                </div>
                <div className="rides-operations-stat">
                  <span>Agendada</span>
                  <strong>{formatDateTime(ride.scheduledAt)}</strong>
                </div>
                <div className="rides-operations-stat">
                  <span>Valor</span>
                  <strong>{formatCurrency(ride.quote?.amount)}</strong>
                </div>
                <div className="rides-operations-stat">
                  <span>Tipo de viagem</span>
                  <strong>{ride.tripTypeName ?? "Padrao"}</strong>
                </div>
                <div className="rides-operations-stat">
                  <span>Atualizada</span>
                  <strong>{formatDateTime(ride.updatedAt)}</strong>
                </div>
              </div>

              <div className="rides-operations-route-panel">
                <div className="rides-operations-route-line">
                  <span className="route-dot start" aria-hidden="true" />
                  <div>
                    <span>Origem</span>
                    <strong>{ride.origin}</strong>
                  </div>
                </div>
                <div className="rides-operations-route-line">
                  <span className="route-dot end" aria-hidden="true" />
                  <div>
                    <span>Destino</span>
                    <strong>{ride.destination}</strong>
                  </div>
                </div>
                {ride.decisionWindow ? (
                  <div className="rides-operations-route-note">
                    <span>Janela de decisao ate {formatDateTime(ride.decisionWindow.expiresAt)}</span>
                  </div>
                ) : null}
              </div>

              <div className="rides-operations-actions">
                <div className="panel-head">
                  <h2>Acoes operacionais</h2>
                  <span>Comandos disponiveis para a corrida selecionada.</span>
                </div>

                {ride.status === "PREBOOKED" ? (
                  activeDrivers.length > 0 ? (
                    <div className="rides-operations-driver-actions">
                      {activeDrivers.map((driver) => {
                        const acceptRequestKey = `${ride.id}:${driver.id}:ACCEPT`;
                        const rejectRequestKey = `${ride.id}:${driver.id}:REJECT`;

                        return (
                          <div key={driver.id} className="rides-operations-driver-item">
                            <div className="rides-operations-driver-copy">
                              <strong>{driver.name}</strong>
                              <span>{driver.phone}</span>
                            </div>
                            <div className="rides-operations-driver-buttons">
                              <button
                                type="button"
                                disabled={isUsingMockData || activeRequestKey !== ""}
                                onClick={() => void handleDecision(driver.id, "ACCEPT")}
                              >
                                {activeRequestKey === acceptRequestKey ? "Aceitando..." : "Aceitar"}
                              </button>
                              <button
                                type="button"
                                className="danger"
                                disabled={isUsingMockData || activeRequestKey !== ""}
                                onClick={() => void handleDecision(driver.id, "REJECT")}
                              >
                                {activeRequestKey === rejectRequestKey ? "Recusando..." : "Recusar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state rides-operations-empty">
                      <strong>Nenhum motorista ativo disponivel para decidir esta corrida.</strong>
                    </div>
                  )
                ) : null}

                {ride.status !== "PREBOOKED" && isRideAwaitingPrebook(ride) ? (
                  <div className="empty-state rides-operations-empty">
                    <strong>Essa corrida ainda nao entrou na fila de aceite dos motoristas.</strong>
                  </div>
                ) : null}

                {ride.status === "ACCEPTED" && ride.driverStage !== "COMPLETED" ? (
                  <RideStageActionPanel
                    ride={ride}
                    disabled={isUsingMockData}
                    activeRequestKey={activeRequestKey}
                    onStageAction={handleRideStageAction}
                  />
                ) : null}

                {ride.status === "COMPLETED" || (ride.status === "ACCEPTED" && ride.driverStage === "COMPLETED") ? (
                  <div className="empty-state rides-operations-empty">
                    <strong>Corrida concluida pelo motorista e pronta para consulta historica.</strong>
                  </div>
                ) : null}

                {(ride.status === "REJECTED" || ride.status === "EXPIRED" || ride.status === "CANCELLED") ? (
                  <div className="empty-state rides-operations-empty">
                    <strong>Corrida encerrada sem execucao operacional.</strong>
                  </div>
                ) : null}
              </div>

              <div className="panel-head">
                <h2>Timeline da corrida</h2>
                <span>{rideEvents.length} evento(s) no historico.</span>
              </div>

              <div className="timeline rides-operations-timeline">
                {rideEvents.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <div className="timeline-bullet" />
                    <div>
                      <strong>{event.eventType}</strong>
                      <span>{formatDateTime(event.createdAt)}</span>
                      {event.payload ? <pre>{JSON.stringify(event.payload, null, 2)}</pre> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="grid grid-single">
          <article className="panel panel-wide rides-operations-panel">
            <div className="empty-state rides-operations-empty rides-operations-empty-panel">
              <strong>Nao foi possivel localizar essa corrida.</strong>
              <p>Volte para a operacao e selecione outra corrida.</p>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

function RideStageActionPanel(props: {
  ride: Ride;
  disabled?: boolean;
  activeRequestKey: string;
  onStageAction: (action: RideStageAction) => Promise<void>;
}) {
  const stageAction = resolveNextRideStageAction(props.ride);

  if (!stageAction || !props.ride.assignedDriverId) {
    return (
      <div className="empty-state rides-operations-empty">
        <strong>Nao ha comando de andamento disponivel para esta corrida.</strong>
      </div>
    );
  }

  const requestKey = `${props.ride.id}:${props.ride.assignedDriverId}:${stageAction.action}`;

  return (
    <div className="rides-operations-stage-actions">
      <div className="rides-operations-stage-copy">
        <strong>{stageAction.title}</strong>
        <span>{stageAction.description}</span>
      </div>
      <button
        type="button"
        disabled={props.disabled || props.activeRequestKey !== ""}
        onClick={() => void props.onStageAction(stageAction.action)}
      >
        {props.activeRequestKey === requestKey ? "Atualizando..." : stageAction.buttonLabel}
      </button>
    </div>
  );
}
