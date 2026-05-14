"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DriverProfileEditorModal } from "../../../components/driver-profile-editor-modal";
import { FinancialActionModal } from "../../../components/financial-action-modal";
import {
  SupportResponseTemplatePicker,
  type SupportTemplateCatalogItem,
  type SupportTemplateCategory
} from "../../../components/support-response-template-picker";
import { formatDateTime } from "../../../lib/api";
import { getStoredAdminSession } from "../../../lib/admin-auth";
import {
  buildCustomerSupportHref,
  buildDriverSupportHref,
  buildRideSupportHref,
  getSlaRiskClassName,
  resolveSlaView,
  supportMessageChannelMeta,
  supportPriorityMeta,
  supportQuickActionsByType,
  supportResponseTemplates,
  supportStatusMeta,
  supportStatusTransitions,
  supportTypeMeta,
  type SupportMessageChannel,
  type SupportTicket,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTimelineEvent,
  type SupportTimelineEventType
} from "../support-shared";
import { subscribeSupportTickets, supportService, type SupportActor } from "../support-service";

type PendingQuickActionModal = {
  key: string;
  label: string;
  outcome: "ESCALATED" | "RESOLVED";
} | null;

type ThreadItem = {
  id: string;
  kind: "message" | "event";
  author: string;
  authorType: "Cliente" | "Motorista" | "Suporte" | "Sistema";
  createdAt: string;
  body: string;
  eventLabel?: string;
  toneClass?: string;
};

const SUPPORT_OPERATOR_OPTIONS = ["Operador Admin", "Ana Paula", "Rafael", "Juliana", "Operacao Manha"];
const SUPPORT_TEMPLATE_FAVORITES_KEY = "support-template-favorites-v1";
const SUPPORT_TEMPLATE_RECENT_KEY = "support-template-recent-v1";
const SUPPORT_TEMPLATE_USAGE_KEY = "support-template-usage-v1";

export default function SupportCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = Array.isArray(params.caseId) ? params.caseId[0] : params.caseId;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [responseChannel, setResponseChannel] = useState<SupportMessageChannel>("WHATSAPP");
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [channelDraft, setChannelDraft] = useState<SupportMessageChannel>("WHATSAPP");
  const [responseMessage, setResponseMessage] = useState("");
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateInlinePickerOpen, setTemplateInlinePickerOpen] = useState(false);
  const [templateInlineQuery, setTemplateInlineQuery] = useState("");
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [usageCountByTemplateId, setUsageCountByTemplateId] = useState<Record<string, number>>({});
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const responseTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [internalNote, setInternalNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pendingQuickActionModal, setPendingQuickActionModal] = useState<PendingQuickActionModal>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalDraft, setStatusModalDraft] = useState<SupportTicketStatus | "">("");
  const [statusModalReason, setStatusModalReason] = useState("");

  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [priorityModalDraft, setPriorityModalDraft] = useState<SupportTicketPriority>("MEDIUM");
  const [priorityModalNextAction, setPriorityModalNextAction] = useState("");

  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateAssignee, setEscalateAssignee] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateObservation, setEscalateObservation] = useState("");

  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [tagsDraft, setTagsDraft] = useState("");

  const [linkRideModalOpen, setLinkRideModalOpen] = useState(false);
  const [linkedRideDraft, setLinkedRideDraft] = useState("");

  const [moreActionsModalOpen, setMoreActionsModalOpen] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isQuickActionRunning, setIsQuickActionRunning] = useState<string | null>(null);

  useEffect(() => {
    const loaded = supportService.getTicketById(caseId);
    setTicket(loaded);
    if (loaded) {
      const defaultChannel = resolveChannelFromTicketSource(loaded.source);
      setResponseChannel(defaultChannel);
      setChannelDraft(defaultChannel);
      setPriorityModalDraft(loaded.priority);
      setPriorityModalNextAction(loaded.nextAction ?? "");
      setStatusModalDraft("");
      setTagsDraft(loaded.tags.join(", "));
      setLinkedRideDraft(loaded.relatedRideId ?? "");
    }

    return subscribeSupportTickets(() => {
      const refreshed = supportService.getTicketById(caseId);
      setTicket(refreshed);
      if (refreshed) {
        const defaultChannel = resolveChannelFromTicketSource(refreshed.source);
        setChannelDraft(defaultChannel);
        setPriorityModalDraft(refreshed.priority);
        setPriorityModalNextAction(refreshed.nextAction ?? "");
        setTagsDraft(refreshed.tags.join(", "));
        setLinkedRideDraft(refreshed.relatedRideId ?? "");
      }
    });
  }, [caseId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const favoritesRaw = window.localStorage.getItem(SUPPORT_TEMPLATE_FAVORITES_KEY);
      const recentRaw = window.localStorage.getItem(SUPPORT_TEMPLATE_RECENT_KEY);
      const usageRaw = window.localStorage.getItem(SUPPORT_TEMPLATE_USAGE_KEY);

      setFavoriteTemplateIds(favoritesRaw ? (JSON.parse(favoritesRaw) as string[]) : []);
      setRecentTemplateIds(recentRaw ? (JSON.parse(recentRaw) as string[]) : []);
      setUsageCountByTemplateId(usageRaw ? (JSON.parse(usageRaw) as Record<string, number>) : {});
    } catch {
      setFavoriteTemplateIds([]);
      setRecentTemplateIds([]);
      setUsageCountByTemplateId({});
    }
  }, []);

  const actor = resolveCurrentActor();

  const operatorOptions = useMemo(() => {
    const set = new Set<string>(SUPPORT_OPERATOR_OPTIONS);
    if (actor.name.trim()) set.add(actor.name.trim());
    if (ticket?.assignee?.trim()) set.add(ticket.assignee.trim());
    return Array.from(set);
  }, [actor.name, ticket?.assignee]);

  const templates = useMemo(() => {
    if (!ticket) return [];
    return supportResponseTemplates[ticket.type] ?? [];
  }, [ticket]);

  const templateCatalog = useMemo(() => buildTemplateCatalog(ticket?.type, templates), [ticket?.type, templates]);

  const availableTransitions = useMemo(() => {
    if (!ticket) return [];
    return supportStatusTransitions[ticket.status] ?? [];
  }, [ticket]);

  const threadItems = useMemo(() => {
    if (!ticket) return [];

    const timelineEntries: ThreadItem[] = ticket.timeline
      .filter((event) => event.type !== "INTERNAL_NOTE_CREATED" && event.type !== "RESPONSE_SENT")
      .map((event) => {
        const meta = resolveTimelineEventMeta(event);
        return {
          id: `event-${event.id}`,
          kind: "event",
          author: event.actor,
          authorType: event.actor === "Sistema" ? "Sistema" : "Suporte",
          createdAt: event.createdAt,
          body: event.description,
          eventLabel: meta.title,
          toneClass: meta.toneClass
        };
      });

    const responseEntries: ThreadItem[] = ticket.responses.map((response) => ({
      id: `response-${response.id}`,
      kind: "message",
      author: response.author,
      authorType: resolveAuthorType(response.author, ticket),
      createdAt: response.createdAt,
      body: response.content
    }));

    return [...timelineEntries, ...responseEntries].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [ticket]);

  useEffect(() => {
    function handleGlobalTemplateShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setTemplatePickerOpen(true);
      }
    }

    window.addEventListener("keydown", handleGlobalTemplateShortcut);
    return () => window.removeEventListener("keydown", handleGlobalTemplateShortcut);
  }, []);

  if (!ticket) {
    return (
      <main className="page-shell page-shell-wide cargo-list-page-shell support-conv-page-shell">
        <section className="cargo-list-page-header">
          <div className="cargo-list-page-header-copy">
            <h1>Atendimento</h1>
            <p>Central de suporte para clientes e motoristas.</p>
          </div>
        </section>

        <section className="cargo-editor-card">
          <div className="administrative-list-empty-state">
            <strong>Ticket nao encontrado.</strong>
            <p>O ticket solicitado nao existe mais ou foi removido.</p>
            <div className="administrative-list-empty-state-actions">
              <Link href="/support" className="button-link secondary-link">
                Voltar para fila
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const sla = resolveSlaView(ticket);
  const ticketId = ticket.id;
  const driverHref = buildDriverSupportHref(ticket);
  const rideHref = buildRideSupportHref(ticket);
  const customerHref = buildCustomerSupportHref(ticket);
  const isAssignedToActor = ticket.assignee?.trim().toLowerCase() === actor.name.trim().toLowerCase();

  async function handleClaimTicket() {
    try {
      setIsActionSubmitting(true);
      supportService.claimTicket(ticketId, actor);
      setFeedback("Ticket assumido com sucesso.");
      setError(null);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Falha ao assumir ticket.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleApplyStatusModal() {
    if (!statusModalDraft) {
      setError("Selecione um status para aplicar.");
      return;
    }

    if (statusModalDraft === "RESOLVED") {
      setStatusModalOpen(false);
      setResolveModalOpen(true);
      return;
    }

    if (statusModalDraft === "CANCELLED") {
      setStatusModalOpen(false);
      setCancelModalOpen(true);
      return;
    }

    try {
      setIsActionSubmitting(true);
      supportService.transitionStatus({
        ticketId,
        toStatus: statusModalDraft,
        actor,
        closureNote: statusModalReason.trim() || undefined
      });
      setFeedback("Status atualizado.");
      setError(null);
      setStatusModalOpen(false);
      setStatusModalReason("");
      setStatusModalDraft("");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Falha ao atualizar status.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleApplyPriorityModal() {
    if (!ticket) return;
    try {
      setIsActionSubmitting(true);
      supportService.updateWorkflow({
        ticketId,
        assignee: ticket.assignee?.trim() || actor.name,
        priority: priorityModalDraft,
        nextAction: priorityModalNextAction.trim() || ticket.nextAction || "Acompanhamento de prioridade.",
        actor
      });
      setFeedback("Prioridade atualizada.");
      setError(null);
      setPriorityModalOpen(false);
    } catch (priorityError) {
      setError(priorityError instanceof Error ? priorityError.message : "Falha ao atualizar prioridade.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleEscalateTicket() {
    if (!ticket) return;
    if (!escalateReason.trim()) {
      setError("Informe o motivo da escalacao.");
      return;
    }

    try {
      setIsActionSubmitting(true);
      supportService.updateWorkflow({
        ticketId,
        assignee: escalateAssignee.trim() || ticket.assignee?.trim() || actor.name,
        priority: ticket.priority,
        nextAction: escalateReason.trim(),
        actor
      });
      supportService.transitionStatus({
        ticketId,
        toStatus: "ESCALATED",
        actor
      });
      if (escalateObservation.trim()) {
        supportService.addInternalNote(ticketId, `Escalonamento: ${escalateObservation.trim()}`, actor);
      }
      setFeedback("Ticket escalado.");
      setError(null);
      setEscalateModalOpen(false);
      setEscalateReason("");
      setEscalateObservation("");
    } catch (escalateError) {
      setError(escalateError instanceof Error ? escalateError.message : "Falha ao escalar ticket.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleSaveTags() {
    try {
      setIsActionSubmitting(true);
      const nextTags = tagsDraft
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      supportService.updateTicketContext({
        ticketId,
        actor,
        tags: nextTags
      });

      setFeedback("Tags atualizadas.");
      setError(null);
      setTagsModalOpen(false);
    } catch (tagsError) {
      setError(tagsError instanceof Error ? tagsError.message : "Falha ao atualizar tags.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleLinkRide() {
    try {
      setIsActionSubmitting(true);
      supportService.updateTicketContext({
        ticketId,
        actor,
        relatedRideId: linkedRideDraft.trim() || null
      });
      setFeedback(linkedRideDraft.trim() ? "Corrida vinculada ao ticket." : "Vinculo de corrida removido.");
      setError(null);
      setLinkRideModalOpen(false);
    } catch (rideError) {
      setError(rideError instanceof Error ? rideError.message : "Falha ao vincular corrida.");
      setFeedback(null);
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleSendResponse() {
    try {
      setIsSendingResponse(true);
      supportService.sendResponse({
        ticketId,
        channel: responseChannel,
        content: responseMessage,
        actor
      });
      setFeedback("Resposta enviada.");
      setError(null);
      setResponseMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Falha ao enviar resposta.");
      setFeedback(null);
    } finally {
      setIsSendingResponse(false);
    }
  }

  function handleApplyTemplate(template: SupportTemplateCatalogItem) {
    setResponseMessage(template.message);
    setTemplateInlinePickerOpen(false);
    setTemplateInlineQuery("");

    const nextRecent = [template.id, ...recentTemplateIds.filter((id) => id !== template.id)].slice(0, 8);
    const nextUsage = {
      ...usageCountByTemplateId,
      [template.id]: (usageCountByTemplateId[template.id] ?? 0) + 1
    };

    setRecentTemplateIds(nextRecent);
    setUsageCountByTemplateId(nextUsage);
    persistTemplatePreferences(favoriteTemplateIds, nextRecent, nextUsage);
  }

  function handleToggleFavoriteTemplate(templateId: string) {
    const nextFavorites = favoriteTemplateIds.includes(templateId)
      ? favoriteTemplateIds.filter((id) => id !== templateId)
      : [templateId, ...favoriteTemplateIds].slice(0, 20);
    setFavoriteTemplateIds(nextFavorites);
    persistTemplatePreferences(nextFavorites, recentTemplateIds, usageCountByTemplateId);
  }

  function handleApplyChannelChange() {
    setResponseChannel(channelDraft);
    setChannelModalOpen(false);
  }

  function handleResponseKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setTemplatePickerOpen(true);
      return;
    }

    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.currentTarget;
      const cursor = target.selectionStart ?? 0;
      const beforeCursor = target.value.slice(0, cursor);
      const afterCursor = target.value.slice(cursor);
      const lastToken = beforeCursor.split(/\s/).pop() ?? "";
      const query = `${lastToken}${afterCursor.split(/\s/)[0] ?? ""}`.replace("/", "").trim();

      if (lastToken.startsWith("/") || beforeCursor.trim().length === 0) {
        event.preventDefault();
        setTemplateInlineQuery(query);
        setTemplateInlinePickerOpen(true);
      }
    }
  }

  async function handleAddInternalNote() {
    try {
      setIsSavingNote(true);
      supportService.addInternalNote(ticketId, internalNote, actor);
      setFeedback("Nota interna registrada.");
      setError(null);
      setInternalNote("");
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Falha ao registrar nota.");
      setFeedback(null);
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleRunQuickAction(actionKey: string, details?: string) {
    try {
      setIsQuickActionRunning(actionKey);
      supportService.executeQuickAction({
        ticketId,
        actionKey,
        details,
        actor
      });
      setFeedback("Acao executada.");
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Falha ao executar acao.");
      setFeedback(null);
    } finally {
      setIsQuickActionRunning(null);
    }
  }

  function handleQuickActionClick(action: { key: string; label: string; outcome?: "ESCALATED" | "RESOLVED" }) {
    if (!ticket) return;
    if (action.outcome === "ESCALATED" || action.outcome === "RESOLVED") {
      setModalError(null);
      setPendingQuickActionModal({ key: action.key, label: action.label, outcome: action.outcome });
      return;
    }
    void handleRunQuickAction(action.key, ticket.nextAction);
  }

  async function handleConfirmQuickAction(justification: string) {
    if (!ticket) return;
    if (!pendingQuickActionModal) return;
    try {
      setIsModalSubmitting(true);
      setModalError(null);
      await handleRunQuickAction(pendingQuickActionModal.key, justification || ticket.nextAction);
      setPendingQuickActionModal(null);
    } finally {
      setIsModalSubmitting(false);
    }
  }

  async function handleConfirmResolve(justification: string) {
    try {
      setIsModalSubmitting(true);
      setModalError(null);
      supportService.transitionStatus({
        ticketId,
        toStatus: "RESOLVED",
        closureNote: justification,
        actor
      });
      setResolveModalOpen(false);
      setFeedback("Caso encerrado como resolvido.");
      setError(null);
    } catch (resolveError) {
      setModalError(resolveError instanceof Error ? resolveError.message : "Falha ao encerrar ticket.");
    } finally {
      setIsModalSubmitting(false);
    }
  }

  async function handleConfirmCancel(justification: string) {
    try {
      setIsModalSubmitting(true);
      setModalError(null);
      supportService.transitionStatus({
        ticketId,
        toStatus: "CANCELLED",
        closureNote: justification,
        actor
      });
      setCancelModalOpen(false);
      setFeedback("Caso cancelado com registro de justificativa.");
      setError(null);
    } catch (cancelError) {
      setModalError(cancelError instanceof Error ? cancelError.message : "Falha ao cancelar ticket.");
    } finally {
      setIsModalSubmitting(false);
    }
  }

  return (
    <main className="page-shell page-shell-wide cargo-list-page-shell support-conv-page-shell">
      <section className="cargo-list-page-header">
        <div className="cargo-list-page-header-copy">
          <h1>Atendimento</h1>
          <p>Central de suporte para clientes e motoristas.</p>
        </div>
      </section>

      {feedback ? (
        <p className="journey-list-status-message" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="journey-list-status-message" role="alert">
          {error}
        </p>
      ) : null}

      <section className="cargo-editor-card support-conv-summary-card">
        <div className="support-conv-summary-top">
          <Link href="/support" className="support-conv-back-link">
            Voltar para fila
          </Link>
          <span className="support-conv-ticket-id">{ticket.code}</span>
        </div>

        <div className="support-conv-summary-copy">
          <h2>{ticket.title}</h2>
          <p>{ticket.summary}</p>
        </div>

        <div className="support-conv-summary-grid">
          <div className="support-conv-summary-item">
            <span>Status</span>
            <strong>{supportStatusMeta[ticket.status].label}</strong>
          </div>
          <div className="support-conv-summary-item">
            <span>Prioridade</span>
            <strong>{supportPriorityMeta[ticket.priority].label}</strong>
          </div>
          <div className="support-conv-summary-item">
            <span>Responsavel</span>
            <strong>{ticket.assignee ?? "Sem responsavel"}</strong>
          </div>
          <div className="support-conv-summary-item">
            <span>SLA</span>
            <strong className={getSlaRiskClassName(sla.risk)}>{sla.statusLabel}</strong>
          </div>
          <div className="support-conv-summary-item">
            <span>Prazo final</span>
            <strong className="text-tabular">{sla.dueAtLabel}</strong>
          </div>
          <div className="support-conv-summary-item">
            <span>Solicitante</span>
            <strong>{ticket.requester.name}</strong>
          </div>
        </div>

        <details className="support-conv-context-collapse">
          <summary>Ver contexto do ticket</summary>
          <div className="support-conv-context-body">
            <div className="support-conv-context-list">{renderContextByType(ticket)}</div>
            <div className="support-conv-context-links">
              {driverHref ? (
                <Link href={driverHref} className="table-inline-link">
                  Ver perfil do motorista
                </Link>
              ) : null}
              {rideHref ? (
                <Link href={rideHref} className="table-inline-link">
                  Ver detalhe da corrida
                </Link>
              ) : null}
              {customerHref ? (
                <Link href={customerHref} className="table-inline-link">
                  Ver perfil do cliente
                </Link>
              ) : null}
            </div>
          </div>
        </details>
      </section>

      <section className="cargo-editor-card support-conv-actionbar-card">
        <div className="support-conv-actionbar">
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => void handleClaimTicket()}
            disabled={isActionSubmitting || isAssignedToActor}
          >
            {isAssignedToActor ? "Ja assumido" : "Assumir"}
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setEscalateModalOpen(true)}
          >
            Escalar
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setStatusModalOpen(true)}
          >
            Alterar status
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setPriorityModalOpen(true)}
          >
            Alterar prioridade
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setTagsModalOpen(true)}
          >
            Tags
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setLinkRideModalOpen(true)}
          >
            Vincular corrida
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setResolveModalOpen(true)}
          >
            Encerrar caso
          </button>
          <button
            type="button"
            className="button-link secondary-link support-conv-action-btn"
            onClick={() => setMoreActionsModalOpen(true)}
          >
            Mais acoes
          </button>
        </div>
      </section>

      <section className="cargo-editor-card support-conv-response-card">
        <div className="panel-head">
          <h2>Responder atendimento</h2>
          <span>Envie a resposta e registre o contato no ticket.</span>
        </div>

        <div className="support-conv-response-grid">
          <div className="support-conv-channel-info">
            <span>Canal de envio</span>
            <strong>{supportMessageChannelMeta[responseChannel].label}</strong>
            <small>Origem do ticket: {ticket.source}</small>
            <button
              type="button"
              className="button-link secondary-link support-conv-action-btn"
              onClick={() => setChannelModalOpen(true)}
            >
              Alterar canal
            </button>
          </div>

          <div className="support-conv-template-trigger">
            <button
              ref={templateTriggerRef}
              type="button"
              className="button-link secondary-link support-conv-action-btn"
              onClick={() => setTemplatePickerOpen(true)}
            >
              Buscar resposta rapida
            </button>
            <small>Atalho: digite / na mensagem ou use Ctrl/Cmd + K</small>
          </div>

          <label className="cargo-editor-field cargo-editor-field-full">
            <span>Mensagem</span>
            <textarea
              ref={responseTextareaRef}
              value={responseMessage}
              onChange={(event) => setResponseMessage(event.target.value)}
              onKeyDown={handleResponseKeyDown}
              placeholder="Escreva a resposta para cliente ou motorista."
            />
          </label>

          <div className="support-conv-response-actions">
            <button type="button" className="button-link secondary-link" disabled>
              Anexar (em breve)
            </button>
            <button type="button" onClick={() => void handleSendResponse()} disabled={isSendingResponse}>
              {isSendingResponse ? "Enviando..." : "Enviar resposta"}
            </button>
          </div>
        </div>
      </section>

      <section className="cargo-editor-card support-conv-history-card">
        <div className="support-conv-history-head">
          <div className="panel-head">
            <h2>Historico</h2>
            <span>Conversa e eventos do atendimento (mais recentes primeiro).</span>
          </div>
          <div className="support-conv-history-head-actions">
            <button type="button" className="button-link secondary-link support-conv-action-btn" onClick={() => setIsNotesModalOpen(true)}>
              Ver notas internas
            </button>
            <button type="button" className="button-link secondary-link support-conv-action-btn" onClick={() => setIsNotesModalOpen(true)}>
              Adicionar nota interna
            </button>
          </div>
        </div>

        <div className="support-conv-thread">
          {threadItems.length === 0 ? (
            <div className="administrative-list-empty-state">
              <strong>Nenhuma interacao registrada ainda.</strong>
              <p>Use o bloco de resposta para iniciar o atendimento.</p>
            </div>
          ) : (
            threadItems.map((item) =>
              item.kind === "message" ? (
                <article key={item.id} className="support-conv-thread-message">
                  <div className="support-conv-avatar" aria-hidden="true">
                    {extractInitials(item.author)}
                  </div>
                  <div className="support-conv-bubble">
                    <div className="support-conv-bubble-head">
                      <strong>{item.author}</strong>
                      <span>{item.authorType}</span>
                      <small>{formatDateTime(item.createdAt)}</small>
                    </div>
                    <p>{item.body}</p>
                  </div>
                </article>
              ) : (
                <div key={item.id} className={`support-conv-thread-event ${item.toneClass ?? "is-neutral"}`}>
                  <span>{item.eventLabel}</span>
                  <p>{item.body}</p>
                  <small>{formatDateTime(item.createdAt)}</small>
                </div>
              )
            )
          )}
        </div>
      </section>

      <SupportResponseTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        templates={templateCatalog}
        onSelectTemplate={handleApplyTemplate}
        favoriteTemplateIds={favoriteTemplateIds}
        recentTemplateIds={recentTemplateIds}
        usageCountByTemplateId={usageCountByTemplateId}
        onToggleFavorite={handleToggleFavoriteTemplate}
        triggerRef={templateTriggerRef}
      />

      <SupportResponseTemplatePicker
        open={templateInlinePickerOpen}
        onClose={() => {
          setTemplateInlinePickerOpen(false);
          setTemplateInlineQuery("");
        }}
        templates={templateCatalog}
        onSelectTemplate={handleApplyTemplate}
        favoriteTemplateIds={favoriteTemplateIds}
        recentTemplateIds={recentTemplateIds}
        usageCountByTemplateId={usageCountByTemplateId}
        onToggleFavorite={handleToggleFavoriteTemplate}
        avoidRef={responseTextareaRef}
        initialQuery={templateInlineQuery}
      />

      <DriverProfileEditorModal
        open={channelModalOpen}
        onClose={() => setChannelModalOpen(false)}
        title="Alterar canal de resposta"
        description="Escolha um canal diferente apenas quando necessario."
        layoutVariant="quick"
        dialogWidth="min(480px, calc(100vw - 20px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setChannelModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={handleApplyChannelChange}>
              Aplicar canal
            </button>
          </>
        }
      >
        <label className="cargo-editor-field">
          <span>Canal</span>
          <select
            className="select"
            value={channelDraft}
            onChange={(event) => setChannelDraft(event.target.value as SupportMessageChannel)}
          >
            {(Object.keys(supportMessageChannelMeta) as SupportMessageChannel[]).map((channel) => (
              <option key={channel} value={channel}>
                {supportMessageChannelMeta[channel].label}
              </option>
            ))}
          </select>
        </label>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Alterar status"
        description="Atualize o status do ticket sem abrir formulario administrativo fixo."
        layoutVariant="quick"
        dialogWidth="min(560px, calc(100vw - 20px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setStatusModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleApplyStatusModal()} disabled={isActionSubmitting}>
              {isActionSubmitting ? "Aplicando..." : "Salvar status"}
            </button>
          </>
        }
      >
        <div className="support-conv-modal-grid">
          <label className="cargo-editor-field">
            <span>Novo status</span>
            <select
              className="select"
              value={statusModalDraft}
              onChange={(event) => setStatusModalDraft(event.target.value as SupportTicketStatus | "")}
            >
              <option value="">Selecionar...</option>
              {availableTransitions.map((status) => (
                <option key={status} value={status}>
                  {supportStatusMeta[status].label}
                </option>
              ))}
            </select>
          </label>
          <label className="cargo-editor-field">
            <span>Observacao (opcional)</span>
            <textarea
              value={statusModalReason}
              onChange={(event) => setStatusModalReason(event.target.value)}
              placeholder="Contexto da mudanca de status."
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={priorityModalOpen}
        onClose={() => setPriorityModalOpen(false)}
        title="Alterar prioridade"
        description="Defina a prioridade operacional do ticket."
        layoutVariant="quick"
        dialogWidth="min(560px, calc(100vw - 20px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setPriorityModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleApplyPriorityModal()} disabled={isActionSubmitting}>
              {isActionSubmitting ? "Salvando..." : "Salvar prioridade"}
            </button>
          </>
        }
      >
        <div className="support-conv-modal-grid">
          <label className="cargo-editor-field">
            <span>Prioridade</span>
            <select
              className="select"
              value={priorityModalDraft}
              onChange={(event) => setPriorityModalDraft(event.target.value as SupportTicketPriority)}
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Critica</option>
            </select>
          </label>
          <label className="cargo-editor-field">
            <span>Proxima acao</span>
            <input
              value={priorityModalNextAction}
              onChange={(event) => setPriorityModalNextAction(event.target.value)}
              placeholder="Defina o proximo passo operacional."
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        title="Escalar ticket"
        description="Encaminhe o atendimento para outra fila/area com rastreabilidade."
        layoutVariant="drawer"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setEscalateModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleEscalateTicket()} disabled={isActionSubmitting}>
              {isActionSubmitting ? "Escalando..." : "Confirmar escalacao"}
            </button>
          </>
        }
      >
        <div className="support-conv-modal-grid">
          <label className="cargo-editor-field">
            <span>Responsavel</span>
            <select className="select" value={escalateAssignee} onChange={(event) => setEscalateAssignee(event.target.value)}>
              <option value="">Selecionar...</option>
              {operatorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="cargo-editor-field">
            <span>Motivo da escalacao</span>
            <input
              value={escalateReason}
              onChange={(event) => setEscalateReason(event.target.value)}
              placeholder="Ex.: Divergencia financeira critica"
            />
          </label>
          <label className="cargo-editor-field">
            <span>Observacao</span>
            <textarea
              value={escalateObservation}
              onChange={(event) => setEscalateObservation(event.target.value)}
              placeholder="Contexto adicional para quem vai assumir."
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
        title="Atualizar tags"
        description="Separe as tags por virgula."
        layoutVariant="quick"
        dialogWidth="min(520px, calc(100vw - 20px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setTagsModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleSaveTags()} disabled={isActionSubmitting}>
              {isActionSubmitting ? "Salvando..." : "Salvar tags"}
            </button>
          </>
        }
      >
        <label className="cargo-editor-field">
          <span>Tags</span>
          <input
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder="Ex.: repasse, financeiro, urgente"
          />
        </label>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={linkRideModalOpen}
        onClose={() => setLinkRideModalOpen(false)}
        title="Vincular corrida"
        description="Associe ou remova o identificador de corrida do ticket."
        layoutVariant="quick"
        dialogWidth="min(520px, calc(100vw - 20px))"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setLinkRideModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" onClick={() => void handleLinkRide()} disabled={isActionSubmitting}>
              {isActionSubmitting ? "Salvando..." : "Salvar vinculo"}
            </button>
          </>
        }
      >
        <label className="cargo-editor-field">
          <span>ID da corrida</span>
          <input
            value={linkedRideDraft}
            onChange={(event) => setLinkedRideDraft(event.target.value)}
            placeholder="Ex.: ride_3281"
          />
        </label>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={moreActionsModalOpen}
        onClose={() => setMoreActionsModalOpen(false)}
        title="Mais acoes"
        description="Acoes menos frequentes do ticket."
        layoutVariant="quick"
        dialogWidth="min(620px, calc(100vw - 20px))"
      >
        <div className="support-conv-more-actions">
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setMoreActionsModalOpen(false);
              setCancelModalOpen(true);
            }}
          >
            Cancelar caso
          </button>
          <button
            type="button"
            className="button-link secondary-link"
            onClick={() => {
              setMoreActionsModalOpen(false);
              setIsNotesModalOpen(true);
            }}
          >
            Abrir notas internas
          </button>
          {supportQuickActionsByType[ticket.type].map((action) => (
            <button
              key={action.key}
              type="button"
              className="button-link secondary-link"
              onClick={() => handleQuickActionClick(action)}
              disabled={isQuickActionRunning === action.key}
            >
              {isQuickActionRunning === action.key ? "Executando..." : action.label}
            </button>
          ))}
        </div>
      </DriverProfileEditorModal>

      <DriverProfileEditorModal
        open={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="Notas internas"
        description="Registros privados da equipe de suporte."
        layoutVariant="drawer"
        footer={
          <>
            <button type="button" className="button-link secondary-link" onClick={() => setIsNotesModalOpen(false)}>
              Fechar
            </button>
            <button type="button" onClick={() => void handleAddInternalNote()} disabled={isSavingNote}>
              {isSavingNote ? "Salvando..." : "Adicionar nota"}
            </button>
          </>
        }
      >
        <div className="support-conv-notes-modal">
          <div className="support-conv-notes-list">
            {ticket.internalNotes.length === 0 ? (
              <div className="administrative-list-empty-state">
                <strong>Nenhuma nota interna.</strong>
                <p>Adicione notas para contexto interno do atendimento.</p>
              </div>
            ) : (
              ticket.internalNotes.map((note) => (
                <article key={note.id} className="support-conv-note-entry">
                  <strong>{note.author}</strong>
                  <span>{note.content}</span>
                  <small>{formatDateTime(note.createdAt)}</small>
                </article>
              ))
            )}
          </div>

          <label className="cargo-editor-field">
            <span>Nova nota</span>
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Escreva uma observacao interna para a equipe."
            />
          </label>
        </div>
      </DriverProfileEditorModal>

      <FinancialActionModal
        open={resolveModalOpen}
        title="Encerrar caso"
        description="Informe a justificativa final para concluir o atendimento."
        confirmLabel="Encerrar como resolvido"
        justificationRequired
        errorMessage={modalError}
        isSubmitting={isModalSubmitting}
        onClose={() => {
          setResolveModalOpen(false);
          setModalError(null);
        }}
        onConfirm={(justification) => void handleConfirmResolve(justification)}
      />

      <FinancialActionModal
        open={cancelModalOpen}
        title="Cancelar caso"
        description="Informe a justificativa de cancelamento para auditoria."
        confirmLabel="Confirmar cancelamento"
        justificationRequired
        errorMessage={modalError}
        isSubmitting={isModalSubmitting}
        onClose={() => {
          setCancelModalOpen(false);
          setModalError(null);
        }}
        onConfirm={(justification) => void handleConfirmCancel(justification)}
      />

      <FinancialActionModal
        open={Boolean(pendingQuickActionModal)}
        title={pendingQuickActionModal ? pendingQuickActionModal.label : "Acao rapida"}
        description="Confirme a acao e registre o contexto da execucao."
        confirmLabel="Executar acao"
        justificationRequired={pendingQuickActionModal?.outcome === "RESOLVED"}
        errorMessage={modalError}
        isSubmitting={isModalSubmitting}
        onClose={() => {
          setPendingQuickActionModal(null);
          setModalError(null);
        }}
        onConfirm={(justification) => void handleConfirmQuickAction(justification)}
      />
    </main>
  );
}

function buildTemplateCatalog(
  ticketType: SupportTicket["type"] | undefined,
  baseTemplates: Array<{ key: string; label: string; message: string }>
): SupportTemplateCatalogItem[] {
  const catalog: SupportTemplateCatalogItem[] = [
    {
      id: "tmpl-greeting-standard",
      label: "Saudacao padrao",
      description: "Abertura cordial de atendimento.",
      message: "Ola! Recebemos sua solicitacao e vamos apoiar voce por aqui.",
      category: "GREETING",
      tags: ["saudacao", "abertura"]
    },
    {
      id: "tmpl-closing-standard",
      label: "Encerramento do atendimento",
      description: "Confirma fechamento e disponibilidade futura.",
      message: "Perfeito, caso encerrado. Se precisar de algo mais, seguimos a disposicao.",
      category: "CLOSING",
      tags: ["encerramento", "fechamento"]
    },
    {
      id: "tmpl-charge-proof",
      label: "Cobranca em analise",
      description: "Solicita comprovante para validacao financeira.",
      message: "Estamos analisando a cobranca. Pode enviar o comprovante para confirmarmos o ajuste?",
      category: "CHARGE",
      tags: ["cobranca", "financeiro"]
    },
    {
      id: "tmpl-cancel-followup",
      label: "Cancelamento de corrida",
      description: "Explica acompanhamento de cancelamento.",
      message: "Estamos validando o cancelamento da corrida e retornaremos com a conclusao do caso.",
      category: "CANCEL",
      tags: ["cancelamento", "corrida"]
    },
    {
      id: "tmpl-refund-processing",
      label: "Reembolso em processamento",
      description: "Confirma abertura do fluxo de reembolso.",
      message: "Seu reembolso foi encaminhado e esta em processamento. Avisaremos assim que concluir.",
      category: "REFUND",
      tags: ["reembolso", "financeiro"]
    },
    {
      id: "tmpl-internal-escalation",
      label: "Escalada interna",
      description: "Atualiza internamente o repasse para outra area.",
      message: "Chamado escalado para area responsavel com prioridade operacional.",
      category: "INTERNAL",
      tags: ["interno", "escalacao"]
    }
  ];

  const mappedBase = baseTemplates.map((template) => ({
    id: `base-${template.key}`,
    label: template.label,
    description: resolveTemplateDescription(template.label, template.message),
    message: template.message,
    category: resolveTemplateCategory(ticketType, template.label, template.key),
    tags: resolveTemplateTags(template.label, template.key)
  }));

  return dedupeTemplateCatalog([...mappedBase, ...catalog]);
}

function dedupeTemplateCatalog(rows: SupportTemplateCatalogItem[]): SupportTemplateCatalogItem[] {
  const seen = new Set<string>();
  const unique: SupportTemplateCatalogItem[] = [];
  for (const item of rows) {
    const key = `${item.label.toLowerCase()}-${item.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function resolveTemplateDescription(label: string, message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length <= 88) return normalized;
  return `${normalized.slice(0, 85)}...`;
}

function resolveTemplateCategory(
  ticketType: SupportTicket["type"] | undefined,
  label: string,
  key: string
): SupportTemplateCategory {
  const normalized = `${label} ${key}`.toLowerCase();
  if (normalized.includes("cobr")) return "CHARGE";
  if (normalized.includes("cancel")) return "CANCEL";
  if (normalized.includes("reembolso") || normalized.includes("refund")) return "REFUND";
  if (normalized.includes("intern")) return "INTERNAL";
  if (ticketType === "DRIVER") return "DRIVER";
  if (ticketType === "CUSTOMER") return "CUSTOMER";
  if (ticketType === "RIDE") return "RIDE";
  return "INTERNAL";
}

function resolveTemplateTags(label: string, key: string): string[] {
  const base = `${label} ${key}`.toLowerCase();
  const tags: string[] = [];
  if (base.includes("cobr")) tags.push("cobranca");
  if (base.includes("cancel")) tags.push("cancelamento");
  if (base.includes("reembolso")) tags.push("reembolso");
  if (base.includes("repasse")) tags.push("repasse");
  if (tags.length === 0) tags.push("atendimento");
  return tags;
}

function resolveChannelFromTicketSource(source: string): SupportMessageChannel {
  const normalized = source.trim().toLowerCase();
  if (normalized.includes("whatsapp")) return "WHATSAPP";
  if (normalized.includes("motorista")) return "DRIVER_APP";
  if (normalized.includes("app")) return "DRIVER_APP";
  if (normalized.includes("email") || normalized.includes("e-mail")) return "EMAIL";
  if (normalized.includes("intern")) return "INTERNAL";
  if (normalized.includes("cliente")) return "WHATSAPP";
  return "WHATSAPP";
}

function persistTemplatePreferences(
  favoriteIds: string[],
  recentIds: string[],
  usageCountById: Record<string, number>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUPPORT_TEMPLATE_FAVORITES_KEY, JSON.stringify(favoriteIds));
  window.localStorage.setItem(SUPPORT_TEMPLATE_RECENT_KEY, JSON.stringify(recentIds));
  window.localStorage.setItem(SUPPORT_TEMPLATE_USAGE_KEY, JSON.stringify(usageCountById));
}

function resolveCurrentActor(): SupportActor {
  const session = getStoredAdminSession();
  if (session?.user.name?.trim()) {
    return { id: session.user.id, name: session.user.name.trim() };
  }
  return { name: "Operador Admin" };
}

function resolveTimelineEventMeta(event: SupportTimelineEvent): {
  title: string;
  toneClass: string;
} {
  const map: Record<SupportTimelineEventType, { title: string; toneClass: string }> = {
    TICKET_CREATED: { title: "Ticket criado", toneClass: "is-neutral" },
    STATUS_CHANGED: { title: "Status alterado", toneClass: "is-warning" },
    PRIORITY_CHANGED: { title: "Prioridade alterada", toneClass: "is-warning" },
    ASSIGNEE_CHANGED: { title: "Responsavel alterado", toneClass: "is-neutral" },
    INTERNAL_NOTE_CREATED: { title: "Nota interna", toneClass: "is-neutral" },
    RESPONSE_SENT: { title: "Resposta enviada", toneClass: "is-positive" },
    ESCALATED: { title: "Ticket escalado", toneClass: "is-danger" },
    RESOLVED: { title: "Ticket resolvido", toneClass: "is-positive" },
    QUICK_ACTION: { title: "Acao rapida", toneClass: "is-neutral" }
  };
  return map[event.type];
}

function resolveAuthorType(author: string, ticket: SupportTicket): "Cliente" | "Motorista" | "Suporte" | "Sistema" {
  const normalizedAuthor = author.trim().toLowerCase();
  if (normalizedAuthor === "sistema") return "Sistema";
  const requesterName = ticket.requester.name.trim().toLowerCase();
  if (normalizedAuthor === requesterName) {
    return ticket.type === "DRIVER" ? "Motorista" : "Cliente";
  }
  return "Suporte";
}

function extractInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "SU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function DriverContext({ ticket }: { ticket: SupportTicket }) {
  return (
    <>
      <ContextItem label="Motorista" value={ticket.relatedDriver?.name ?? ticket.requester.name} />
      <ContextItem label="Telefone" value={ticket.relatedDriver?.phone ?? ticket.requester.phone} />
      <ContextItem label="Status" value={ticket.relatedDriver?.status} />
      <ContextItem label="Veiculo" value={ticket.relatedDriver?.vehicleLabel} />
      <ContextItem label="Documentos" value={ticket.relatedDriver?.documentsState} />
    </>
  );
}

function CustomerContext({ ticket }: { ticket: SupportTicket }) {
  return (
    <>
      <ContextItem label="Cliente" value={ticket.relatedCustomer?.name ?? ticket.requester.name} />
      <ContextItem label="Telefone" value={ticket.relatedCustomer?.phone ?? ticket.requester.phone} />
      {typeof ticket.relatedCustomer?.recentRides === "number" && (
        <ContextItem label="Ultimas corridas" value={String(ticket.relatedCustomer.recentRides)} />
      )}
      {typeof ticket.relatedCustomer?.refundsCount === "number" && (
        <ContextItem label="Reembolsos" value={String(ticket.relatedCustomer.refundsCount)} />
      )}
    </>
  );
}

function RideContext({ ticket }: { ticket: SupportTicket }) {
  return (
    <>
      <ContextItem label="Corrida" value={ticket.relatedRide?.id ?? ticket.relatedRideId} />
      <ContextItem label="Status" value={ticket.relatedRide?.status} />
      {ticket.relatedRide?.origin && ticket.relatedRide?.destination ? (
        <ContextItem label="Rota" value={`${ticket.relatedRide.origin} -> ${ticket.relatedRide.destination}`} />
      ) : null}
      <ContextItem label="Pagamento" value={ticket.relatedRide?.paymentMethod} />
    </>
  );
}

function renderContextByType(ticket: SupportTicket) {
  if (ticket.type === "DRIVER") return <DriverContext ticket={ticket} />;
  if (ticket.type === "CUSTOMER") return <CustomerContext ticket={ticket} />;
  if (ticket.type === "RIDE") return <RideContext ticket={ticket} />;
  if (ticket.type === "INTERNAL") {
    return (
      <>
        <ContextItem label="Modulo afetado" value={ticket.internalContext?.module} />
        <ContextItem label="Severidade" value={ticket.internalContext?.severity} />
        <ContextItem label="Area responsavel" value={ticket.internalContext?.ownerArea} />
      </>
    );
  }
  return <ContextItem label="Contexto" value="Sem dados adicionais no ticket." />;
}

function ContextItem({
  label,
  value,
  className
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  const normalized = normalizeContextValue(value);
  if (!normalized) return null;
  return (
    <div className="support-conv-context-row">
      <span>{label}</span>
      <strong className={className}>{normalized}</strong>
    </div>
  );
}

function normalizeContextValue(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === "nao informado") return null;
  return normalized;
}
