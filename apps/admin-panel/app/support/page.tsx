"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDateTime } from "../../lib/api";
import { SearchIcon } from "../../components/icons/common-icons";
import {
  mockSupportCases,
  supportPriorityLabel,
  supportStatusMeta,
  supportStatusOrder,
  supportTypeLabel,
  type SupportCase,
  type SupportCasePriority
} from "./support-shared";

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState<"NEW" | "IN_PROGRESS" | "WAITING" | "RESOLVED">("NEW");

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return mockSupportCases;
    }

    return mockSupportCases.filter((supportCase) =>
      [
        supportCase.title,
        supportCase.summary,
        supportCase.reason,
        supportCase.source,
        supportCase.assignedTo ?? "",
        supportCase.customer?.name ?? "",
        supportCase.customer?.phone ?? "",
        supportCase.driver?.name ?? "",
        supportCase.driver?.phone ?? "",
        supportCase.ride?.id ?? "",
        supportCase.ride?.origin ?? "",
        supportCase.ride?.destination ?? "",
        ...supportCase.internalNotes
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [searchTerm]);

  const openCases = filteredCases.filter((supportCase) => supportCase.status !== "RESOLVED").length;
  const criticalCases = filteredCases.filter((supportCase) => supportCase.priority === "CRITICAL").length;
  const waitingCases = filteredCases.filter((supportCase) => supportCase.status === "WAITING").length;
  const assignedCases = filteredCases.filter((supportCase) => Boolean(supportCase.assignedTo)).length;
  const casesInActiveStatus = filteredCases.filter((supportCase) => supportCase.status === activeStatus);
  const activeStatusMeta = supportStatusMeta[activeStatus];

  return (
    <main className="page-shell support-page-shell">
      <section className="support-queue-hero">
        <div className="support-queue-hero-copy">
          <h1>Central de Suporte</h1>
          <p>Fila unica de atendimento para clientes, motoristas, corridas e ocorrencias operacionais.</p>
        </div>

        <label className="admin-header-search support-queue-search">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, motivo, corrida ou responsavel..."
          />
          <span className="admin-header-search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
        </label>
      </section>

      <section className="support-queue-metrics">
        <article className="support-queue-metric">
          <span>Abertos</span>
          <strong>{openCases}</strong>
        </article>
        <article className="support-queue-metric">
          <span>Criticos</span>
          <strong>{criticalCases}</strong>
        </article>
        <article className="support-queue-metric">
          <span>Aguardando retorno</span>
          <strong>{waitingCases}</strong>
        </article>
        <article className="support-queue-metric">
          <span>Com responsavel</span>
          <strong>{assignedCases}</strong>
        </article>
      </section>

      <section className="support-queue-panel">
        <div className="support-tabs" role="tablist" aria-label="Status dos atendimentos">
          {supportStatusOrder.map((status) => (
            <button
              key={status}
              type="button"
              className={activeStatus === status ? "support-tab is-active" : "support-tab"}
              onClick={() => setActiveStatus(status)}
            >
              {supportStatusMeta[status].label}
              <span className="support-tab-count">{filteredCases.filter((supportCase) => supportCase.status === status).length}</span>
            </button>
          ))}
        </div>

        <div className="support-active-status-head">
          <div>
            <h2>{activeStatusMeta.label}</h2>
            <p>{activeStatusMeta.description}</p>
          </div>
          <span className="support-column-count">{casesInActiveStatus.length}</span>
        </div>

        <div className="support-ticket-list">
          {casesInActiveStatus.map((supportCase) => (
            <Link key={supportCase.id} href={`/support/${supportCase.id}`} className="support-case-card">
              <div className="support-case-card-top">
                <div className="support-case-card-ticket">
                  <span>Ticket</span>
                  <strong>{supportCase.ticketNumber}</strong>
                </div>
                <div className="chips">
                  <span className="chip chip-soft">{supportTypeLabel[supportCase.type]}</span>
                  <span className={getPriorityClassName(supportCase.priority)}>{supportPriorityLabel[supportCase.priority]}</span>
                </div>
              </div>

              <div className="support-case-card-copy">
                <strong>{supportCase.title}</strong>
                <p>{supportCase.summary}</p>
              </div>

              <div className="support-case-card-meta">
                <span>{buildCaseAnchorLabel(supportCase)}</span>
                <span>{supportCase.assignedTo ? `Responsavel: ${supportCase.assignedTo}` : "Sem responsavel"}</span>
              </div>

              <div className="support-case-card-timeline">
                <div className="support-case-card-timeblock">
                  <span>Abertura</span>
                  <strong>{formatDateTime(supportCase.openedAt)}</strong>
                </div>
                <div className="support-case-card-timeblock">
                  <span>Prazo</span>
                  <strong>{formatDateTime(supportCase.dueAt)}</strong>
                </div>
                <div className="support-case-card-timeblock">
                  <span>Tempo aberto</span>
                  <strong>{formatRelativeOpenTime(supportCase.openedAt)}</strong>
                </div>
              </div>

              <div className="support-case-card-footer">
                <span>{supportCase.reason}</span>
                <span className="support-case-card-link">Abrir atendimento</span>
              </div>
            </Link>
          ))}

          {casesInActiveStatus.length === 0 ? (
            <div className="support-column-empty">
              <strong>Nenhum atendimento nesta etapa.</strong>
              <p>Os novos casos aparecerao aqui conforme entrarem na fila.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function buildCaseAnchorLabel(supportCase: SupportCase): string {
  if (supportCase.customer && supportCase.driver) {
    return `${supportCase.customer.name} + ${supportCase.driver.name}`;
  }

  if (supportCase.customer) {
    return supportCase.customer.name;
  }

  if (supportCase.driver) {
    return supportCase.driver.name;
  }

  if (supportCase.ride) {
    return `Corrida ${supportCase.ride.id}`;
  }

  return "Caso operacional";
}

function formatRelativeOpenTime(value: string): string {
  const openedAt = new Date(value).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - openedAt) / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

function getPriorityClassName(priority: SupportCasePriority): string {
  if (priority === "CRITICAL") {
    return "chip support-priority-chip support-priority-chip-critical";
  }

  if (priority === "HIGH") {
    return "chip support-priority-chip support-priority-chip-high";
  }

  if (priority === "MEDIUM") {
    return "chip support-priority-chip support-priority-chip-medium";
  }

  return "chip support-priority-chip";
}
