import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "../../../lib/api";
import {
  getSupportCaseById,
  supportPriorityLabel,
  supportStatusMeta,
  supportTypeLabel,
  type SupportCaseTimelineEntry
} from "../support-shared";

type SupportCasePageProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export default async function SupportCasePage({ params }: SupportCasePageProps) {
  const { caseId } = await params;
  const supportCase = getSupportCaseById(caseId);

  if (!supportCase) {
    notFound();
  }

  const statusMeta = supportStatusMeta[supportCase.status];

  return (
    <main className="page-shell support-case-page">
      <section className="support-case-hero">
        <div className="support-case-hero-copy">
          <Link href="/support" className="support-back-link">
            Voltar para a fila
          </Link>
          <span className="support-case-ticket">Ticket {supportCase.ticketNumber}</span>
          <div className="chips">
            <span className="chip chip-soft">{supportTypeLabel[supportCase.type]}</span>
            <span className={getPriorityClassName(supportCase.priority)}>{supportPriorityLabel[supportCase.priority]}</span>
            <span className="chip chip-soft">{statusMeta.label}</span>
          </div>
          <h1>{supportCase.title}</h1>
          <p>{supportCase.summary}</p>
        </div>

        <aside className="support-case-aside">
          <section className="support-case-aside-section">
            <span className="support-case-aside-title">Resumo</span>
            <strong>{supportCase.assignedTo ?? "Sem responsavel"}</strong>
            <span>{statusMeta.description}</span>
            <span>Origem: {supportCase.source}</span>
          </section>

          <section className="support-case-aside-section">
            <span className="support-case-aside-title">Tempos</span>
            <span>Aberto em {formatDateTime(supportCase.openedAt)}</span>
            <span>Prazo de atendimento {formatDateTime(supportCase.dueAt)}</span>
            <span>Atualizado em {formatDateTime(supportCase.updatedAt)}</span>
          </section>
        </aside>
      </section>

      <section className="support-case-layout">
        <div className="support-case-main">
          <article className="panel support-case-section">
            <div className="panel-head">
              <h2>Resumo do atendimento</h2>
              <span>{supportCase.reason}</span>
            </div>

            <div className="support-case-summary-grid">
              <div className="support-case-summary-item">
                <span>Ticket</span>
                <strong>{supportCase.ticketNumber}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Status</span>
                <strong>{statusMeta.label}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Prioridade</span>
                <strong>{supportPriorityLabel[supportCase.priority]}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Origem</span>
                <strong>{supportCase.source}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Responsavel</span>
                <strong>{supportCase.assignedTo ?? "Sem responsavel"}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Abertura</span>
                <strong>{formatDateTime(supportCase.openedAt)}</strong>
              </div>
              <div className="support-case-summary-item">
                <span>Prazo</span>
                <strong>{formatDateTime(supportCase.dueAt)}</strong>
              </div>
            </div>
          </article>

          {supportCase.customer ? (
            <article className="panel support-case-section">
              <div className="panel-head">
                <h2>Cliente</h2>
                <span>Contexto do passageiro dentro deste atendimento.</span>
              </div>

              <div className="support-case-context-list">
                <div className="support-case-context-item">
                  <span>Nome</span>
                  <strong>{supportCase.customer.name}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Telefone</span>
                  <strong>{supportCase.customer.phone ?? "-"}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Observacao</span>
                  <strong>{supportCase.customer.note ?? "Sem observacoes."}</strong>
                </div>
              </div>

              {supportCase.customer.href ? (
                <div className="support-case-links">
                  <Link href={supportCase.customer.href} className="support-inline-link">
                    Abrir perfil do cliente
                  </Link>
                </div>
              ) : null}
            </article>
          ) : null}

          {supportCase.driver ? (
            <article className="panel support-case-section">
              <div className="panel-head">
                <h2>Motorista</h2>
                <span>Contexto do motorista vinculado ao caso.</span>
              </div>

              <div className="support-case-context-list">
                <div className="support-case-context-item">
                  <span>Nome</span>
                  <strong>{supportCase.driver.name}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Telefone</span>
                  <strong>{supportCase.driver.phone ?? "-"}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Observacao</span>
                  <strong>{supportCase.driver.note ?? "Sem observacoes."}</strong>
                </div>
              </div>

              {supportCase.driver.href ? (
                <div className="support-case-links">
                  <Link href={supportCase.driver.href} className="support-inline-link">
                    Abrir perfil do motorista
                  </Link>
                </div>
              ) : null}
            </article>
          ) : null}

          {supportCase.ride ? (
            <article className="panel support-case-section">
              <div className="panel-head">
                <h2>Corrida</h2>
                <span>Detalhes operacionais vinculados ao atendimento.</span>
              </div>

              <div className="support-case-context-list">
                <div className="support-case-context-item">
                  <span>ID</span>
                  <strong>{supportCase.ride.id}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Status</span>
                  <strong>{supportCase.ride.status}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Rota</span>
                  <strong>{`${supportCase.ride.origin} -> ${supportCase.ride.destination}`}</strong>
                </div>
                <div className="support-case-context-item">
                  <span>Agendada para</span>
                  <strong>{formatDateTime(supportCase.ride.scheduledAt)}</strong>
                </div>
              </div>

              {supportCase.ride.href ? (
                <div className="support-case-links">
                  <Link href={supportCase.ride.href} className="support-inline-link">
                    Abrir corrida
                  </Link>
                </div>
              ) : null}
            </article>
          ) : null}

          <article className="panel support-case-section">
            <div className="panel-head">
              <h2>Historico</h2>
              <span>Linha do tempo do atendimento.</span>
            </div>

            <div className="support-case-timeline">
              {supportCase.timeline.map((entry) => (
                <div key={entry.id} className={`support-case-timeline-item ${getTimelineToneClass(entry)}`}>
                  <div className="support-case-timeline-dot" aria-hidden="true" />
                  <div className="support-case-timeline-copy">
                    <strong>{entry.title}</strong>
                    <span>{entry.detail}</span>
                    <small>{formatDateTime(entry.at)}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="support-case-sidebar">
          <article className="panel support-case-section">
            <div className="panel-head">
              <h2>Acoes internas</h2>
              <span>Orientacoes para o operador.</span>
            </div>

            <div className="support-case-notes">
              {supportCase.internalNotes.map((note) => (
                <div key={note} className="support-case-note">
                  {note}
                </div>
              ))}
            </div>

            <div className="support-case-next-action">
              <span>Proximo passo</span>
              <strong>{supportCase.nextAction}</strong>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

function getPriorityClassName(priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): string {
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

function getTimelineToneClass(entry: SupportCaseTimelineEntry): string {
  if (entry.tone === "danger") {
    return "is-danger";
  }

  if (entry.tone === "warning") {
    return "is-warning";
  }

  if (entry.tone === "positive") {
    return "is-positive";
  }

  return "";
}
