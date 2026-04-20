"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CustomerProfile } from "../../../lib/api";
import { formatCurrency, formatDateTime, request } from "../../../lib/api";
import { CustomerSidebarArrowIcon } from "../../../components/icons/domain/customer-icons";

type CustomerTab = "profile" | "favorites" | "rides" | "score" | "logs";

const CUSTOMER_SCORE_BASE = 50;
const ACTIVE_MONTH_LOOKBACK_DAYS = 30;
const CUSTOMER_AGE_BONUS_DAYS = 60;

const customerTabs: Array<{ id: CustomerTab; label: string }> = [
  { id: "profile", label: "Perfil do cliente" },
  { id: "favorites", label: "Enderecos salvos" },
  { id: "rides", label: "Historico de corridas" },
  { id: "score", label: "Resumo de score" },
  { id: "logs", label: "Logs de atendimento" }
];

function formatBooleanLabel(value?: boolean, positive = "Sim", negative = "Nao"): string {
  if (value === undefined) {
    return "-";
  }

  return value ? positive : negative;
}

function buildScoreBreakdown(profile: CustomerProfile) {
  const now = Date.now();
  const activeMonthThreshold = now - ACTIVE_MONTH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const oldCustomerThreshold = now - CUSTOMER_AGE_BONUS_DAYS * 24 * 60 * 60 * 1000;
  const completedRides = profile.rides.filter((ride) => ride.status === "COMPLETED").length;
  const monthlyCompletedRides = profile.rides.filter(
    (ride) =>
      ride.status === "COMPLETED" &&
      typeof ride.createdAt === "string" &&
      new Date(ride.createdAt).getTime() >= activeMonthThreshold
  ).length;
  const cancelledRides = profile.rides.filter((ride) => ride.status === "CANCELLED").length;
  const quoteDropoffs = profile.rides.filter((ride) => ride.status === "EXPIRED" || ride.status === "QUOTED").length;
  const firstActivityTime =
    typeof profile.firstRideAt === "string" && profile.firstRideAt.length > 0
      ? new Date(profile.firstRideAt).getTime()
      : undefined;

  return [
    {
      label: "Cadastro na base",
      detail: "Pontuacao inicial do cliente ao entrar na operacao.",
      points: CUSTOMER_SCORE_BASE,
      tone: "positive" as const
    },
    {
      label: "Corridas finalizadas",
      detail: `${completedRides} corrida(s) concluida(s), 5 pontos por corrida com teto de 20.`,
      points: Math.min(20, completedRides * 5),
      tone: "positive" as const
    },
    {
      label: "Recorrencia no ultimo mes",
      detail: monthlyCompletedRides >= 3 ? "Cliente completou pelo menos 3 corridas nos ultimos 30 dias." : "Ainda sem bonus de recorrencia recente.",
      points: monthlyCompletedRides >= 3 ? 5 : 0,
      tone: "positive" as const
    },
    {
      label: "Tempo de base",
      detail:
        firstActivityTime && firstActivityTime <= oldCustomerThreshold
          ? "Cliente com mais de 60 dias de historico conhecido."
          : "Historico ainda sem bonus de tempo de base.",
      points: firstActivityTime && firstActivityTime <= oldCustomerThreshold ? 5 : 0,
      tone: "positive" as const
    },
    {
      label: "Cancelamentos",
      detail: `${cancelledRides} cancelamento(s), desconto de 10 por evento com teto de 30.`,
      points: -Math.min(30, cancelledRides * 10),
      tone: "negative" as const
    },
    {
      label: "Cotacoes perdidas",
      detail: `${quoteDropoffs} cotacao(oes) expirada(s) ou abandonada(s), desconto de 2 com teto de 10.`,
      points: -Math.min(10, quoteDropoffs * 2),
      tone: "negative" as const
    }
  ];
}

export default function CustomerProfilePage() {
  const params = useParams<{ phone: string }>();
  const phone = decodeURIComponent(params.phone);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState("Carregando perfil do cliente.");
  const [activeTab, setActiveTab] = useState<CustomerTab>("profile");

  useEffect(() => {
    void request<CustomerProfile>(`/admin/customers/${encodeURIComponent(phone)}`)
      .then((data) => {
        setProfile(data);
        setStatusMessage(`Perfil carregado com ${data.rides.length} corrida(s) e ${data.conversationLogs.length} log(s).`);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, [phone]);

  const sidebarSignals = useMemo(() => {
    if (!profile) {
      return [];
    }

    return [
      { label: "Cadastro identificado", complete: profile.name.trim().length > 0 },
      { label: "Historico de corridas", complete: profile.totalRides > 0 },
      { label: "Score calculado", complete: profile.customerProfile.score > 0 }
    ];
  }, [profile]);

  const scoreBreakdown = useMemo(() => (profile ? buildScoreBreakdown(profile) : []), [profile]);
  const heroSubtitle = profile
    ? `Cliente • Nivel: ${profile.customerProfile.tierLabel} • Score: ${profile.customerProfile.score}`
    : phone;
  const heroOperationalStatus = profile
    ? profile.totalRides > 0
      ? `${profile.totalRides} corrida(s) registrada(s)`
      : "Sem corridas ainda"
    : statusMessage;

  return (
    <main className="page-shell">
      <section className="customer-profile-hero">
        <div className="customer-profile-hero-copy">
          <h1>{profile?.name ?? "Cliente"}</h1>
          <p className="customer-profile-hero-meta">{heroSubtitle}</p>
          <p className="customer-profile-hero-note">{heroOperationalStatus}</p>
          {profile ? (
            <div className="customer-profile-summary-inline">
              <span>Corridas: {profile.totalRides}</span>
              <span aria-hidden="true">•</span>
              <span>Favoritos: {profile.favorites.length}</span>
              <span aria-hidden="true">•</span>
              <span>Status: {formatBooleanLabel(profile.hasReducedMobility, "Com alerta", "Sem alerta")}</span>
              <span aria-hidden="true">•</span>
              <span>Ultima atividade: {formatDateTime(profile.lastRideAt)}</span>
            </div>
          ) : null}
        </div>
      </section>

      {profile ? (
        <section className="customer-profile-layout">
          <div className="customer-profile-content">
            <div className="customer-profile-tabs" role="tablist" aria-label="Abas do perfil do cliente">
              {customerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={activeTab === tab.id ? "customer-profile-tab is-active" : "customer-profile-tab"}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "profile" ? (
              <article className="panel panel-wide customer-profile-panel">
                <div className="panel-head">
                  <h2>Perfil do cliente</h2>
                  <span>Informacoes principais, score atual e contexto operacional.</span>
                </div>

                <div className="customer-profile-vertical-summary">
                  <div className="customer-profile-vertical-item">
                    <span className="info-label">Telefone</span>
                    <strong>{profile.phone}</strong>
                    <span>Primeiro contato: {formatDateTime(profile.firstRideAt)}</span>
                  </div>
                  <div className="customer-profile-vertical-item">
                    <span className="info-label">Nivel</span>
                    <strong>
                      {profile.customerProfile.tierLabel} (Score {profile.customerProfile.score})
                    </strong>
                  </div>
                  <div className="customer-profile-vertical-item">
                    <span className="info-label">Mobilidade</span>
                    <strong>{formatBooleanLabel(profile.hasReducedMobility, "Mobilidade reduzida", "Sem alerta")}</strong>
                  </div>
                  <div className="customer-profile-vertical-item">
                    <span className="info-label">Ultima rota</span>
                    <strong>{profile.lastOrigin ?? "-"}</strong>
                    <span>Destino: {profile.lastDestination ?? "-"}</span>
                  </div>
                </div>
              </article>
            ) : null}

            {activeTab === "favorites" ? (
              <article className="panel panel-wide customer-profile-panel">
                <div className="panel-head">
                  <h2>Enderecos salvos</h2>
                  <span>Favoritos usados para acelerar origem e destino no atendimento.</span>
                </div>

                <div className="list">
                  {profile.favorites.map((favorite) => (
                    <div key={favorite.id} className="list-card">
                      <strong>{favorite.label}</strong>
                      <span>{favorite.address}</span>
                      <span>Atualizado em {formatDateTime(favorite.updatedAt)}</span>
                    </div>
                  ))}

                  {profile.favorites.length === 0 ? (
                    <div className="empty-state">
                      <strong>Nenhum endereco favorito salvo.</strong>
                      <p>Os favoritos aparecem aqui quando o cliente autoriza salvar origem ou destino.</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ) : null}

            {activeTab === "rides" ? (
              <article className="panel panel-wide customer-profile-panel">
                <div className="panel-head">
                  <h2>Historico de corridas</h2>
                  <span>Corridas registradas com origem, destino, operacao e eventos.</span>
                </div>

                <div className="list">
                  {profile.rides.map((ride) => (
                    <div key={ride.id} className="list-card ride-history-card">
                      <div className="ride-history-head">
                        <div>
                          <strong>{ride.tripTypeName ?? "Comum"}</strong>
                          <span>
                            {ride.status} - {formatDateTime(ride.scheduledAt)}
                          </span>
                        </div>
                        <span className="chip chip-soft">{formatCurrency(ride.quote?.amount)}</span>
                      </div>

                      <div className="customer-profile-grid">
                        <div className="driver-info-block">
                          <span className="info-label">Origem</span>
                          <strong>{ride.origin}</strong>
                          <span>Destino: {ride.destination}</span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Pessoas e apoio</span>
                          <strong>{ride.passengerCount ?? 1} passageiro(s)</strong>
                          <span>
                            {ride.companionNeedsSpecialAttention
                              ? `Acompanhante: ${ride.companionSpecialAttentionDetails ?? "precisa de atencao especial"}`
                              : "Sem alerta de acompanhante"}
                          </span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Bagagem e pet</span>
                          <strong>
                            {ride.baggageCount
                              ? `${ride.baggageCount} mala(s) ${ride.baggageSize ?? ""}`.trim()
                              : ride.petType
                                ? `${ride.petType} ${ride.petSize ?? ""}`.trim()
                                : "Sem adicional informado"}
                          </strong>
                          <span>
                            {ride.customerHasReducedMobility ? "Cliente com mobilidade reduzida" : "Sem alerta de mobilidade"}
                          </span>
                        </div>
                        <div className="driver-info-block">
                          <span className="info-label">Operacao</span>
                          <strong>{ride.driverStage ?? "Sem motorista"}</strong>
                          <span>
                            {ride.hasIntermediateStops
                              ? `Paradas: ${ride.intermediateStopsSummary ?? "Sim"}`
                              : "Sem paradas intermediarias"}
                          </span>
                        </div>
                      </div>

                      <div className="ride-meta-list">
                        <span>ID: {ride.id}</span>
                        <span>Motorista: {ride.assignedDriverId ?? "-"}</span>
                        <span>Criada em: {formatDateTime(ride.createdAt)}</span>
                        <span>Atualizada em: {formatDateTime(ride.updatedAt)}</span>
                        <span>
                          Trajeto: {ride.quote?.routeDistanceKm?.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) ?? "-"} km
                          {" - "}
                          {ride.quote?.routeDurationMinutes ?? "-"} min
                        </span>
                      </div>

                      <details className="customer-profile-disclosure">
                        <summary>Ver eventos da corrida</summary>
                        <div className="list">
                          {ride.events.map((event) => (
                            <div key={event.id} className="list-card compact-log-card">
                              <strong>{event.eventType}</strong>
                              <span>{formatDateTime(event.createdAt)}</span>
                              <pre>{JSON.stringify(event.payload ?? {}, null, 2)}</pre>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}

                  {profile.rides.length === 0 ? (
                    <div className="empty-state">
                      <strong>Nenhuma corrida registrada.</strong>
                      <p>As corridas aparecem aqui assim que o cliente chega ao orcamento.</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ) : null}

            {activeTab === "score" ? (
              <article className="panel panel-wide customer-profile-panel">
                <div className="panel-head">
                  <h2>Resumo de score</h2>
                  <span>Composicao da pontuacao atual com base nas regras operacionais do sistema.</span>
                </div>

                <div className="customer-score-strip">
                  <article className="customer-score-card">
                    <span>Pontuacao atual</span>
                    <strong>{profile.customerProfile.score}</strong>
                    <small>{profile.customerProfile.tierLabel}</small>
                  </article>
                  <article className="customer-score-card">
                    <span>Base de cadastro</span>
                    <strong>+{CUSTOMER_SCORE_BASE}</strong>
                    <small>Novo cadastro identificado</small>
                  </article>
                  <article className="customer-score-card">
                    <span>Solicitacoes</span>
                    <strong>{profile.customerProfile.totalRides}</strong>
                    <small>Historico total usado na conta</small>
                  </article>
                </div>

                <div className="list">
                  {scoreBreakdown.map((entry) => (
                    <div key={entry.label} className="list-card customer-score-entry">
                      <div>
                        <strong>{entry.label}</strong>
                        <span>{entry.detail}</span>
                      </div>
                      <span className={entry.points >= 0 ? "chip chip-soft customer-score-chip-positive" : "chip chip-soft customer-score-chip-negative"}>
                        {entry.points > 0 ? `+${entry.points}` : entry.points}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {activeTab === "logs" ? (
              <article className="panel panel-wide customer-profile-panel">
                <div className="panel-head">
                  <h2>Logs de atendimento</h2>
                  <span>Conversas, resumo operacional e registros de cada atendimento.</span>
                </div>

                <div className="list">
                  {profile.conversationLogs.map((log) => (
                    <div key={log.id} className="list-card conversation-log-card">
                      <div className="ride-history-head">
                        <div>
                          <strong>{log.channel}</strong>
                          <span>
                            {formatDateTime(log.createdAt)} - etapa {log.currentStep}
                          </span>
                        </div>
                        <div className="toolbar">
                          <span className="chip chip-soft">{log.messages.length} registro(s)</span>
                          {log.latestRideId ? <span className="chip chip-soft">Ride {log.latestRideId}</span> : null}
                        </div>
                      </div>

                      <div className="driver-info-block">
                        <span className="info-label">Resumo</span>
                        <strong>{log.summary}</strong>
                        <span>Ultima atualizacao: {formatDateTime(log.updatedAt)}</span>
                      </div>

                      <details className="customer-profile-disclosure">
                        <summary>Ver registros deste atendimento</summary>
                        <div className="conversation-log-messages">
                          {log.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`list-card compact-log-card conversation-log-message-card conversation-log-line-${message.role}`}
                            >
                              <strong>{message.role === "bot" ? "Inturb" : message.role === "user" ? "Cliente" : "Sistema"}</strong>
                              <span>{message.text}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}

                  {profile.conversationLogs.length === 0 ? (
                    <div className="empty-state">
                      <strong>Nenhum log de conversa encontrado.</strong>
                      <p>Os atendimentos do simulador e dos canais futuros aparecem aqui para auditoria.</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="customer-profile-sidebar">
            <div className="customer-profile-sidebar-card">
              <div className="customer-profile-sidebar-section">
                <span className="customer-profile-sidebar-title">Resumo</span>
                <div className="customer-profile-sidebar-summary">
                  <strong>{profile.name}</strong>
                  <span>{profile.phone}</span>
                  <span>{profile.customerProfile.tierLabel} - Score {profile.customerProfile.score}</span>
                </div>
              </div>

              <div className="customer-profile-sidebar-section">
                <span className="customer-profile-sidebar-title">Situacao</span>
                <div className="customer-profile-sidebar-checks">
                  {sidebarSignals.map((signal) => (
                    <div key={signal.label} className={`customer-profile-sidebar-check ${signal.complete ? "is-complete" : ""}`}>
                      <span className="customer-profile-sidebar-check-mark" aria-hidden="true">
                        {signal.complete ? "✓" : "•"}
                      </span>
                      <strong>{signal.label}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="customer-profile-sidebar-section">
                <span className="customer-profile-sidebar-title">Navegacao</span>
                <div className="customer-profile-sidebar-nav">
                  {customerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={activeTab === tab.id ? "is-active" : ""}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <CustomerSidebarArrowIcon />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="customer-profile-sidebar-section">
                <span className="customer-profile-sidebar-title">Acoes</span>
                <div className="customer-profile-sidebar-actions">
                  <Link href="/customers" className="button-link secondary-link">
                    Voltar para clientes
                  </Link>
                  {profile.lastRideId ? (
                    <Link href={`/rides/${profile.lastRideId}`} className="button-link secondary-link">
                      Abrir ultima corrida
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
