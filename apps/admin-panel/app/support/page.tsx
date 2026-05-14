"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "../../components/icons/common-icons";
import { getStoredAdminSession } from "../../lib/admin-auth";
import {
  getSlaRiskClassName,
  isTicketOpen,
  resolveSlaView,
  supportPriorityMeta,
  supportStatusMeta,
  supportTypeFilterOrder,
  supportTypeMeta,
  type SupportTicket,
  type SupportTypeFilter
} from "./support-shared";
import { subscribeSupportTickets, supportService, type SupportActor } from "./support-service";

export default function SupportDashboardPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<SupportTypeFilter>("ALL");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typeFilters: SupportTypeFilter[] =
    Array.isArray(supportTypeFilterOrder) && supportTypeFilterOrder.length > 0
      ? supportTypeFilterOrder
      : ["ALL", "RIDE", "CUSTOMER", "DRIVER", "INTERNAL"];

  useEffect(() => {
    setTickets(supportService.listTickets());
    setIsLoading(false);

    return subscribeSupportTickets(() => {
      setTickets(supportService.listTickets());
    });
  }, []);

  const openTickets = useMemo(() => tickets.filter((ticket) => isTicketOpen(ticket)), [tickets]);

  const searchedTickets = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return openTickets;
    }

    return openTickets.filter((ticket) =>
      [
        ticket.code,
        ticket.title,
        ticket.summary,
        ticket.description,
        ticket.assignee ?? "",
        ticket.requester.name,
        ticket.requester.phone ?? "",
        ticket.relatedRideId ?? "",
        ticket.relatedDriverId ?? "",
        ticket.relatedCustomerId ?? "",
        ticket.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [openTickets, searchTerm]);

  const queueTickets = useMemo(() => {
    if (typeFilter === "ALL") {
      return searchedTickets;
    }
    return searchedTickets.filter((ticket) => ticket.type === typeFilter);
  }, [searchedTickets, typeFilter]);
  const currentActor = resolveCurrentActor();

  const typeCounts = useMemo(() => {
    return typeFilters.reduce<Record<SupportTypeFilter, number>>((accumulator, filter) => {
      if (filter === "ALL") {
        accumulator.ALL = openTickets.length;
      } else {
        accumulator[filter] = openTickets.filter((ticket) => ticket.type === filter).length;
      }
      return accumulator;
    }, { ALL: 0, RIDE: 0, CUSTOMER: 0, DRIVER: 0, INTERNAL: 0 });
  }, [openTickets, typeFilters]);

  const kpis = useMemo(
    () => ({
      newCount: openTickets.filter((ticket) => ticket.status === "NEW").length,
      criticalCount: openTickets.filter((ticket) => ticket.priority === "CRITICAL").length,
      waitingCount: openTickets.filter(
        (ticket) => ticket.status === "WAITING_CUSTOMER" || ticket.status === "WAITING_DRIVER"
      ).length
    }),
    [openTickets]
  );

  async function handleClaimAndOpen(ticketId: string) {
    setBusyTicketId(ticketId);
    setError(null);
    try {
      supportService.claimTicket(ticketId, currentActor);
      router.push(`/support/${ticketId}`);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Falha ao assumir ticket.");
    } finally {
      setBusyTicketId(null);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell support-v2-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Atendimento</h1>
          <p>Central de suporte para clientes e motoristas.</p>
        </div>

        <div className="cargo-list-page-header-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("ALL");
            }}
          >
            Limpar filtros
          </button>
          <button type="button" className="button-link secondary-link" onClick={() => setTickets(supportService.listTickets())}>
            Atualizar fila
          </button>
        </div>
      </section>

      <section className="grid grid-single">
        <article className="panel panel-wide drivers-table-panel drivers-table-panel-clean cargo-list-table-panel support-v2-card">
          <div className="drivers-table-head">
            <div className="drivers-table-head-copy">
              <h2>Cockpit de suporte</h2>
              <span>Fila unica priorizada por severidade, SLA e ordem de criacao para triagem rapida.</span>
            </div>
            <div className="drivers-table-tools">
              <label className="admin-header-search drivers-inline-search">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar ticket, solicitante, corrida, tags ou responsavel..."
                />
                <span className="admin-header-search-icon" aria-hidden="true">
                  <SearchIcon />
                </span>
              </label>
            </div>
          </div>

          <div className="support-v2-metrics">
            <article className="support-v2-metric">
              <span>Novos</span>
              <strong>{kpis.newCount}</strong>
            </article>
            <article className="support-v2-metric">
              <span>Criticos</span>
              <strong>{kpis.criticalCount}</strong>
            </article>
            <article className="support-v2-metric">
              <span>Aguardando retorno</span>
              <strong>{kpis.waitingCount}</strong>
            </article>
          </div>

          <div className="support-v2-pills-row" role="tablist" aria-label="Filtros por tipo">
            {typeFilters.map((filter) => {
              const meta = supportTypeMeta[filter];
              const isActive = typeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  className={isActive ? "support-v2-pill is-active" : "support-v2-pill"}
                  onClick={() => setTypeFilter(filter)}
                >
                  <span className="support-v2-pill-icon" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <span>{meta.label}</span>
                  <span className="support-v2-pill-count">{typeCounts[filter]}</span>
                </button>
              );
            })}
          </div>

          {error ? <p className="journey-list-status-message">{error}</p> : null}

          <div className="drivers-table-wrap support-v2-table-wrap">
            {isLoading ? (
              <table className="drivers-table pricing-table cargo-list-table support-v2-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Resumo</th>
                    <th>Responsavel</th>
                    <th>SLA</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={8}>Atualizando fila de suporte...</td>
                  </tr>
                </tbody>
              </table>
            ) : null}

            {!isLoading && queueTickets.length > 0 ? (
              <table className="drivers-table pricing-table cargo-list-table support-v2-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Tipo</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Resumo</th>
                    <th>Responsavel</th>
                    <th>SLA</th>
                    <th className="cargo-actions-col">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {queueTickets.map((ticket) => {
                    const sla = resolveSlaView(ticket);
                    const isUnassigned = !ticket.assignee?.trim();

                    return (
                      <tr key={ticket.id}>
                        <td className="text-tabular">{ticket.code}</td>
                        <td>
                          <span className="status-pill">{supportTypeMeta[ticket.type].label}</span>
                        </td>
                        <td>
                          <span className={resolvePriorityPillClass(ticket.priority)}>
                            {supportPriorityMeta[ticket.priority].label}
                          </span>
                        </td>
                        <td>
                          <div className="support-v2-status-stack">
                            <span className={resolveStatusPillClass(ticket.status)}>{supportStatusMeta[ticket.status].label}</span>
                            <small>{resolveResponseTrackingLabel(ticket, currentActor.name)}</small>
                          </div>
                        </td>
                        <td title={ticket.title}>
                          <div className="table-contact-cell">
                            <strong className="support-v2-summary-line">{ticket.title}</strong>
                            <span className="cargo-list-description-line">{ticket.requester.name}</span>
                          </div>
                        </td>
                        <td title={ticket.assignee ?? "Sem responsavel"}>
                          <span className="cargo-list-muted-text">{ticket.assignee ?? "Sem responsavel"}</span>
                        </td>
                        <td>
                          <span className={`${getSlaRiskClassName(sla.risk)} text-tabular`}>{sla.statusLabel}</span>
                        </td>
                        <td className="cargo-actions-cell">
                          {isUnassigned ? (
                            <button
                              type="button"
                              className="button-link secondary-link support-v2-row-action"
                              onClick={() => void handleClaimAndOpen(ticket.id)}
                              disabled={busyTicketId === ticket.id}
                            >
                              {busyTicketId === ticket.id ? "Atendendo..." : "Atender"}
                            </button>
                          ) : (
                            <Link href={`/support/${ticket.id}`} className="button-link secondary-link support-v2-row-action">
                              Continuar
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}

            {!isLoading && queueTickets.length === 0 ? (
              <div className="cargo-list-empty-state">
                <strong>Nenhum ticket na fila para os filtros atuais.</strong>
                <p>Altere o termo de busca ou tipo para visualizar tickets abertos.</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function resolveCurrentActor(): SupportActor {
  const session = getStoredAdminSession();
  if (session?.user.name?.trim()) {
    return { id: session.user.id, name: session.user.name.trim() };
  }
  return { name: "Operador Admin" };
}

function resolveResponseTrackingLabel(ticket: SupportTicket, currentActorName: string): string {
  if (!ticket.responses.length) {
    return "Sem resposta enviada";
  }

  const lastResponse = [...ticket.responses].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];
  if (!lastResponse) {
    return "Sem resposta enviada";
  }

  const author = lastResponse.author.trim().toLowerCase() === currentActorName.trim().toLowerCase() ? "voce" : lastResponse.author;
  const dateLabel = formatShortDateTime(lastResponse.createdAt);
  return `Respondido por ${author} em ${dateLabel}`;
}

function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function resolvePriorityPillClass(priority: SupportTicket["priority"]): string {
  if (priority === "CRITICAL") return "status-pill support-v2-pill-danger";
  if (priority === "HIGH") return "status-pill support-v2-pill-warning";
  return "status-pill";
}

function resolveStatusPillClass(status: SupportTicket["status"]): string {
  if (status === "RESOLVED") return "status-pill status-pill-success";
  if (status === "ESCALATED") return "status-pill support-v2-pill-danger";
  if (status === "WAITING_CUSTOMER" || status === "WAITING_DRIVER") return "status-pill support-v2-pill-warning";
  if (status === "IN_ANALYSIS") return "status-pill support-v2-pill-info";
  return "status-pill";
}

