"use client";

import {
  isTicketOpen,
  mockSupportTickets,
  resolveSlaDueAtByPriority,
  resolveSlaView,
  supportQuickActionsByType,
  supportStatusTransitions,
  type SupportInternalNote,
  type SupportMessageChannel,
  type SupportTicket,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTimelineEvent,
  type SupportTimelineEventType
} from "./support-shared";

const SUPPORT_STORAGE_KEY = "admin_panel_support_tickets_v2";
export const SUPPORT_TICKETS_UPDATED_EVENT = "admin-panel:support-tickets-updated";

export type SupportActor = {
  id?: string;
  name: string;
};

export type SupportWorkflowUpdateInput = {
  ticketId: string;
  assignee: string;
  priority: SupportTicketPriority;
  nextAction: string;
  actor: SupportActor;
};

export type SupportStatusTransitionInput = {
  ticketId: string;
  toStatus: SupportTicketStatus;
  actor: SupportActor;
  closureNote?: string;
};

export type SupportResponseInput = {
  ticketId: string;
  channel: SupportMessageChannel;
  content: string;
  actor: SupportActor;
};

export type SupportQuickActionInput = {
  ticketId: string;
  actionKey: string;
  details?: string;
  actor: SupportActor;
};

export type SupportTicketContextUpdateInput = {
  ticketId: string;
  actor: SupportActor;
  tags?: string[];
  relatedRideId?: string | null;
};

export type SupportServiceContract = {
  listTickets: () => SupportTicket[];
  getTicketById: (ticketId: string) => SupportTicket | null;
  claimTicket: (ticketId: string, actor: SupportActor) => SupportTicket;
  updateWorkflow: (input: SupportWorkflowUpdateInput) => SupportTicket;
  transitionStatus: (input: SupportStatusTransitionInput) => SupportTicket;
  addInternalNote: (ticketId: string, content: string, actor: SupportActor) => SupportTicket;
  sendResponse: (input: SupportResponseInput) => SupportTicket;
  executeQuickAction: (input: SupportQuickActionInput) => SupportTicket;
  updateTicketContext: (input: SupportTicketContextUpdateInput) => SupportTicket;
};

export const supportService: SupportServiceContract = {
  listTickets() {
    const { tickets, changed } = applyAutomaticSlaEscalation(readSupportTicketsFromStorage());
    if (changed) {
      writeSupportTicketsToStorage(tickets);
    }
    return [...tickets].sort(sortSupportQueue);
  },

  getTicketById(ticketId) {
    const { tickets, changed } = applyAutomaticSlaEscalation(readSupportTicketsFromStorage());
    if (changed) {
      writeSupportTicketsToStorage(tickets);
    }
    return tickets.find((item) => item.id === ticketId) ?? null;
  },

  claimTicket(ticketId, actor) {
    return mutateSupportTicket(ticketId, (ticket) => {
      const now = new Date().toISOString();
      const timeline: SupportTimelineEvent[] = [];
      let status = ticket.status;

      if (ticket.assignee !== actor.name) {
        timeline.push(
          createTimelineEvent({
            type: "ASSIGNEE_CHANGED",
            description: `Responsavel alterado para ${actor.name}.`,
            actor: actor.name,
            createdAt: now
          })
        );
      }

      if (ticket.status === "NEW") {
        status = "IN_ANALYSIS";
        timeline.push(
          createTimelineEvent({
            type: "STATUS_CHANGED",
            description: "Status alterado de Novo para Em analise no atendimento.",
            actor: actor.name,
            createdAt: now
          })
        );
      }

      return {
        ...ticket,
        assignee: actor.name,
        status,
        updatedAt: now,
        timeline: [...ticket.timeline, ...timeline]
      };
    });
  },

  updateWorkflow(input) {
    return mutateSupportTicket(input.ticketId, (ticket) => {
      const nextAssignee = input.assignee.trim();
      const nextAction = input.nextAction.trim();
      if (!nextAssignee) {
        throw new Error("Informe o responsavel.");
      }
      if (!nextAction) {
        throw new Error("Informe a proxima acao.");
      }

      const now = new Date().toISOString();
      const timeline: SupportTimelineEvent[] = [];

      if (ticket.assignee !== nextAssignee) {
        timeline.push(
          createTimelineEvent({
            type: "ASSIGNEE_CHANGED",
            description: `Responsavel alterado de ${ticket.assignee ?? "Sem responsavel"} para ${nextAssignee}.`,
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if (ticket.priority !== input.priority) {
        timeline.push(
          createTimelineEvent({
            type: "PRIORITY_CHANGED",
            description: `Prioridade alterada de ${ticket.priority} para ${input.priority}.`,
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if ((ticket.nextAction ?? "") !== nextAction) {
        timeline.push(
          createTimelineEvent({
            type: "QUICK_ACTION",
            description: `Proxima acao definida: ${nextAction}.`,
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if (!timeline.length) {
        return ticket;
      }

      return {
        ...ticket,
        assignee: nextAssignee,
        priority: input.priority,
        nextAction,
        updatedAt: now,
        timeline: [...ticket.timeline, ...timeline]
      };
    });
  },

  transitionStatus(input) {
    return mutateSupportTicket(input.ticketId, (ticket) => {
      validateStatusTransition(ticket.status, input.toStatus, input.closureNote);

      const now = new Date().toISOString();
      const timeline: SupportTimelineEvent[] = [
        createTimelineEvent({
          type: "STATUS_CHANGED",
          description: `Status alterado de ${ticket.status} para ${input.toStatus}.`,
          actor: input.actor.name,
          createdAt: now
        })
      ];

      if (input.toStatus === "ESCALATED") {
        timeline.push(
          createTimelineEvent({
            type: "ESCALATED",
            description: "Ticket escalado para fila de excecao operacional.",
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if (input.toStatus === "RESOLVED") {
        timeline.push(
          createTimelineEvent({
            type: "RESOLVED",
            description: input.closureNote?.trim() ?? "Ticket resolvido.",
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      return {
        ...ticket,
        status: input.toStatus,
        updatedAt: now,
        resolvedAt: input.toStatus === "RESOLVED" ? now : undefined,
        tags: input.toStatus === "ESCALATED" ? appendTag(ticket.tags, "escalated") : ticket.tags,
        timeline: [...ticket.timeline, ...timeline]
      };
    });
  },

  addInternalNote(ticketId, content, actor) {
    return mutateSupportTicket(ticketId, (ticket) => {
      const normalized = content.trim();
      if (!normalized) {
        throw new Error("Informe a nota interna.");
      }

      const now = new Date().toISOString();
      const note: SupportInternalNote = {
        id: `note-${randomId()}`,
        author: actor.name,
        content: normalized,
        createdAt: now
      };

      return {
        ...ticket,
        updatedAt: now,
        internalNotes: [...ticket.internalNotes, note],
        timeline: [
          ...ticket.timeline,
          createTimelineEvent({
            type: "INTERNAL_NOTE_CREATED",
            description: "Nota interna registrada no ticket.",
            actor: actor.name,
            createdAt: now
          })
        ]
      };
    });
  },

  sendResponse(input) {
    return mutateSupportTicket(input.ticketId, (ticket) => {
      const normalized = input.content.trim();
      if (!normalized) {
        throw new Error("Informe a mensagem de resposta.");
      }

      const now = new Date().toISOString();
      const waitingStatus = resolveWaitingStatusAfterReply(ticket);
      const shouldMoveToWaiting =
        ticket.status === "NEW" ||
        ticket.status === "IN_ANALYSIS" ||
        ticket.status === "WAITING_CUSTOMER" ||
        ticket.status === "WAITING_DRIVER";
      const nextStatus = shouldMoveToWaiting ? waitingStatus : ticket.status;
      const statusTimeline =
        nextStatus !== ticket.status
          ? [
              createTimelineEvent({
                type: "STATUS_CHANGED",
                description: `Status alterado de ${ticket.status} para ${nextStatus} apos resposta enviada.`,
                actor: input.actor.name,
                createdAt: now
              })
            ]
          : [];

      return {
        ...ticket,
        status: nextStatus,
        updatedAt: now,
        responses: [
          ...ticket.responses,
          {
            id: `response-${randomId()}`,
            channel: input.channel,
            content: normalized,
            author: input.actor.name,
            createdAt: now
          }
        ],
        timeline: [
          ...ticket.timeline,
          ...statusTimeline,
          createTimelineEvent({
            type: "RESPONSE_SENT",
            description: `Resposta enviada via ${input.channel}.`,
            actor: input.actor.name,
            createdAt: now
          })
        ]
      };
    });
  },

  executeQuickAction(input) {
    return mutateSupportTicket(input.ticketId, (ticket) => {
      const action = supportQuickActionsByType[ticket.type].find((item) => item.key === input.actionKey);
      if (!action) {
        throw new Error("Acao rapida nao encontrada para este tipo de ticket.");
      }

      const now = new Date().toISOString();
      const timeline: SupportTimelineEvent[] = [
        createTimelineEvent({
          type: "QUICK_ACTION",
          description: `Acao rapida executada: ${action.label}.`,
          actor: input.actor.name,
          createdAt: now
        })
      ];

      let nextStatus = ticket.status;
      let resolvedAt = ticket.resolvedAt;
      let tags = ticket.tags;

      if (action.outcome === "ESCALATED" && ticket.status !== "ESCALATED") {
        validateStatusTransition(ticket.status, "ESCALATED");
        nextStatus = "ESCALATED";
        tags = appendTag(tags, "escalated");
        timeline.push(
          createTimelineEvent({
            type: "STATUS_CHANGED",
            description: `Status alterado de ${ticket.status} para ESCALATED por acao rapida.`,
            actor: input.actor.name,
            createdAt: now
          }),
          createTimelineEvent({
            type: "ESCALATED",
            description: input.details?.trim() || "Ticket escalado por acao rapida.",
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if (action.outcome === "RESOLVED" && ticket.status !== "RESOLVED") {
        const closureNote = input.details?.trim();
        if (!closureNote) {
          throw new Error("Informe a justificativa para resolver o ticket nesta acao.");
        }
        validateStatusTransition(ticket.status, "RESOLVED", closureNote);
        nextStatus = "RESOLVED";
        resolvedAt = now;
        timeline.push(
          createTimelineEvent({
            type: "STATUS_CHANGED",
            description: `Status alterado de ${ticket.status} para RESOLVED por acao rapida.`,
            actor: input.actor.name,
            createdAt: now
          }),
          createTimelineEvent({
            type: "RESOLVED",
            description: closureNote,
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      return {
        ...ticket,
        status: nextStatus,
        resolvedAt,
        tags,
        updatedAt: now,
        timeline: [...ticket.timeline, ...timeline]
      };
    });
  },

  updateTicketContext(input) {
    return mutateSupportTicket(input.ticketId, (ticket) => {
      const nextTags = normalizeTags(input.tags ?? ticket.tags);
      const nextRideId =
        typeof input.relatedRideId === "string" ? input.relatedRideId.trim() : ticket.relatedRideId ?? "";
      const normalizedRideId = nextRideId.length > 0 ? nextRideId : undefined;

      const tagsChanged = nextTags.join("|") !== normalizeTags(ticket.tags).join("|");
      const rideChanged = (ticket.relatedRideId ?? "") !== (normalizedRideId ?? "");

      if (!tagsChanged && !rideChanged) {
        return ticket;
      }

      const now = new Date().toISOString();
      const timeline: SupportTimelineEvent[] = [];

      if (tagsChanged) {
        timeline.push(
          createTimelineEvent({
            type: "QUICK_ACTION",
            description:
              nextTags.length > 0
                ? `Tags atualizadas: ${nextTags.join(", ")}.`
                : "Tags removidas do ticket.",
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      if (rideChanged) {
        timeline.push(
          createTimelineEvent({
            type: "QUICK_ACTION",
            description: normalizedRideId
              ? `Corrida vinculada ao ticket: ${normalizedRideId}.`
              : "Vinculo de corrida removido do ticket.",
            actor: input.actor.name,
            createdAt: now
          })
        );
      }

      return {
        ...ticket,
        tags: nextTags,
        relatedRideId: normalizedRideId,
        updatedAt: now,
        timeline: [...ticket.timeline, ...timeline]
      };
    });
  }
};

export function subscribeSupportTickets(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(SUPPORT_TICKETS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SUPPORT_TICKETS_UPDATED_EVENT, handler);
}

function resolveWaitingStatusAfterReply(ticket: SupportTicket): SupportTicketStatus {
  if (ticket.type === "DRIVER") return "WAITING_DRIVER";
  if (ticket.type === "INTERNAL") return "IN_ANALYSIS";
  return "WAITING_CUSTOMER";
}

function mutateSupportTicket(ticketId: string, mutator: (ticket: SupportTicket) => SupportTicket): SupportTicket {
  const { tickets, changed } = applyAutomaticSlaEscalation(readSupportTicketsFromStorage());
  const sourceTickets = changed ? tickets : readSupportTicketsFromStorage();
  const index = sourceTickets.findIndex((item) => item.id === ticketId);

  if (index < 0) {
    throw new Error("Ticket nao encontrado.");
  }

  const nextTickets = [...sourceTickets];
  nextTickets[index] = mutator(nextTickets[index]);
  writeSupportTicketsToStorage(nextTickets);
  return nextTickets[index];
}

function readSupportTicketsFromStorage(): SupportTicket[] {
  if (typeof window === "undefined") {
    return mockSupportTickets;
  }

  const raw = window.localStorage.getItem(SUPPORT_STORAGE_KEY);
  if (!raw) {
    writeSupportTicketsToStorage(mockSupportTickets);
    return [...mockSupportTickets];
  }

  try {
    const parsed = JSON.parse(raw) as SupportTicket[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      writeSupportTicketsToStorage(mockSupportTickets);
      return [...mockSupportTickets];
    }

    return parsed.map((ticket) => ({
      ...ticket,
      dueAt: ticket.dueAt || resolveSlaDueAtByPriority(ticket.createdAt, ticket.priority),
      timeline: Array.isArray(ticket.timeline) ? ticket.timeline : [],
      internalNotes: Array.isArray(ticket.internalNotes) ? ticket.internalNotes : [],
      responses: Array.isArray(ticket.responses) ? ticket.responses : [],
      tags: Array.isArray(ticket.tags) ? ticket.tags : []
    }));
  } catch {
    writeSupportTicketsToStorage(mockSupportTickets);
    return [...mockSupportTickets];
  }
}

function writeSupportTicketsToStorage(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets));
  window.dispatchEvent(new Event(SUPPORT_TICKETS_UPDATED_EVENT));
}

function validateStatusTransition(
  fromStatus: SupportTicketStatus,
  toStatus: SupportTicketStatus,
  closureNote?: string
): void {
  if (fromStatus === toStatus) {
    throw new Error("O ticket ja esta neste status.");
  }

  const allowed = supportStatusTransitions[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Transicao invalida: ${fromStatus} -> ${toStatus}.`);
  }

  if (toStatus === "RESOLVED" && !closureNote?.trim()) {
    throw new Error("Nao e permitido resolver sem justificativa de fechamento.");
  }
}

function createTimelineEvent(input: {
  type: SupportTimelineEventType;
  description: string;
  actor: string;
  createdAt: string;
}): SupportTimelineEvent {
  return {
    id: `timeline-${randomId()}`,
    type: input.type,
    description: input.description,
    actor: input.actor,
    createdAt: input.createdAt
  };
}

function appendTag(tags: string[], tag: string): string[] {
  if (tags.includes(tag)) {
    return tags;
  }
  return [...tags, tag];
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    )
  );
}

function applyAutomaticSlaEscalation(tickets: SupportTicket[]): { tickets: SupportTicket[]; changed: boolean } {
  let changed = false;
  const now = new Date().toISOString();

  const nextTickets: SupportTicket[] = tickets.map((ticket): SupportTicket => {
    if (!isTicketOpen(ticket) || ticket.status === "ESCALATED") {
      return ticket;
    }

    const sla = resolveSlaView(ticket);
    if (!sla.isOverdue) {
      return ticket;
    }

    const allowed = supportStatusTransitions[ticket.status] ?? [];
    if (!allowed.includes("ESCALATED")) {
      const nextTags = appendTag(ticket.tags, "sla-overdue");
      if (nextTags.length !== ticket.tags.length) {
        changed = true;
      }
      return {
        ...ticket,
        tags: nextTags
      };
    }

    changed = true;
    return {
      ...ticket,
      status: "ESCALATED",
      updatedAt: now,
      tags: appendTag(appendTag(ticket.tags, "sla-overdue"), "escalated"),
      timeline: [
        ...ticket.timeline,
        createTimelineEvent({
          type: "STATUS_CHANGED",
          description: `Status alterado de ${ticket.status} para ESCALATED por SLA vencido.`,
          actor: "Sistema",
          createdAt: now
        }),
        createTimelineEvent({
          type: "ESCALATED",
          description: `SLA vencido (${sla.statusLabel}). Ticket escalado automaticamente.`,
          actor: "Sistema",
          createdAt: now
        })
      ]
    };
  });

  return { tickets: nextTickets, changed };
}

function sortSupportQueue(left: SupportTicket, right: SupportTicket): number {
  const priorityScore = (priority: SupportTicketPriority): number => {
    if (priority === "CRITICAL") return 4;
    if (priority === "HIGH") return 3;
    if (priority === "MEDIUM") return 2;
    return 1;
  };

  const priorityDiff = priorityScore(right.priority) - priorityScore(left.priority);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const dueDiff = +new Date(left.dueAt) - +new Date(right.dueAt);
  if (dueDiff !== 0) {
    return dueDiff;
  }

  return +new Date(left.createdAt) - +new Date(right.createdAt);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

