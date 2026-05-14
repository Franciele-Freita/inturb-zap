export type SupportTicketType = "RIDE" | "CUSTOMER" | "DRIVER" | "INTERNAL";
export type SupportTicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SupportTicketStatus =
  | "NEW"
  | "IN_ANALYSIS"
  | "WAITING_CUSTOMER"
  | "WAITING_DRIVER"
  | "ESCALATED"
  | "RESOLVED"
  | "CANCELLED";

export type SupportTimelineEventType =
  | "TICKET_CREATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "INTERNAL_NOTE_CREATED"
  | "RESPONSE_SENT"
  | "ESCALATED"
  | "RESOLVED"
  | "QUICK_ACTION";

export type SupportMessageChannel = "WHATSAPP" | "DRIVER_APP" | "EMAIL" | "INTERNAL";
export type SupportTypeFilter = "ALL" | SupportTicketType;

export type SupportRequester = {
  id?: string;
  name: string;
  phone?: string;
};

export type SupportTimelineEvent = {
  id: string;
  type: SupportTimelineEventType;
  description: string;
  actor: string;
  createdAt: string;
};

export type SupportInternalNote = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type SupportResponseMessage = {
  id: string;
  channel: SupportMessageChannel;
  content: string;
  author: string;
  createdAt: string;
};

export type SupportRelatedRide = {
  id: string;
  status: string;
  origin: string;
  destination: string;
  fareAmount?: number;
  paymentMethod?: string;
  scheduledAt: string;
};

export type SupportRelatedDriver = {
  id: string;
  name: string;
  phone?: string;
  status?: string;
  vehicleLabel?: string;
  documentsState?: string;
  operationHistory?: string;
};

export type SupportRelatedCustomer = {
  id: string;
  name: string;
  phone?: string;
  recentRides?: number;
  refundsCount?: number;
  previousComplaints?: number;
};

export type SupportInternalContext = {
  module: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ownerArea: string;
};

export type SupportTicket = {
  id: string;
  code: string;
  type: SupportTicketType;
  title: string;
  summary: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignee?: string;
  requester: SupportRequester;
  relatedRideId?: string;
  relatedDriverId?: string;
  relatedCustomerId?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  resolvedAt?: string;
  nextAction?: string;
  tags: string[];
  timeline: SupportTimelineEvent[];
  internalNotes: SupportInternalNote[];
  responses: SupportResponseMessage[];
  relatedRide?: SupportRelatedRide;
  relatedDriver?: SupportRelatedDriver;
  relatedCustomer?: SupportRelatedCustomer;
  internalContext?: SupportInternalContext;
};

export const supportTypeFilterOrder: SupportTypeFilter[] = ["ALL", "RIDE", "CUSTOMER", "DRIVER", "INTERNAL"];

export const supportTypeMeta: Record<
  SupportTypeFilter,
  { label: string; icon: string; description: string; badgeClassName: string }
> = {
  ALL: { label: "Todos", icon: "#", description: "Fila unica", badgeClassName: "badge-neutral" },
  RIDE: { label: "Corrida", icon: "RD", description: "Viagens", badgeClassName: "badge-warning" },
  CUSTOMER: { label: "Cliente", icon: "CL", description: "Clientes", badgeClassName: "badge-neutral" },
  DRIVER: { label: "Motorista", icon: "MT", description: "Motoristas", badgeClassName: "badge-success" },
  INTERNAL: { label: "Interno", icon: "IN", description: "Interno", badgeClassName: "badge-danger" }
};

export const supportStatusMeta: Record<
  SupportTicketStatus,
  { label: string; description: string; badgeClassName: string }
> = {
  NEW: { label: "Novo", description: "Aguardando triagem.", badgeClassName: "badge-neutral" },
  IN_ANALYSIS: { label: "Em analise", description: "Em atendimento.", badgeClassName: "badge-neutral" },
  WAITING_CUSTOMER: { label: "Aguardando cliente", description: "Pendente cliente.", badgeClassName: "badge-neutral" },
  WAITING_DRIVER: { label: "Aguardando motorista", description: "Pendente motorista.", badgeClassName: "badge-neutral" },
  ESCALATED: { label: "Escalado", description: "Escalado por risco/SLA.", badgeClassName: "badge-danger" },
  RESOLVED: { label: "Resolvido", description: "Concluido.", badgeClassName: "badge-success" },
  CANCELLED: { label: "Cancelado", description: "Encerrado sem resolucao.", badgeClassName: "badge-neutral" }
};

export const supportStatusTransitions: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  NEW: ["IN_ANALYSIS", "CANCELLED"],
  IN_ANALYSIS: ["WAITING_CUSTOMER", "WAITING_DRIVER", "ESCALATED", "RESOLVED", "CANCELLED"],
  WAITING_CUSTOMER: ["IN_ANALYSIS", "ESCALATED", "RESOLVED", "CANCELLED"],
  WAITING_DRIVER: ["IN_ANALYSIS", "ESCALATED", "RESOLVED", "CANCELLED"],
  ESCALATED: ["IN_ANALYSIS", "RESOLVED", "CANCELLED"],
  RESOLVED: [],
  CANCELLED: []
};

export const supportPriorityMeta: Record<
  SupportTicketPriority,
  { label: string; badgeClassName: string; description: string; rank: number }
> = {
  CRITICAL: {
    label: "Critica",
    badgeClassName: "badge-danger",
    description: "Dinheiro, corrida ativa, repasse e seguranca.",
    rank: 4
  },
  HIGH: {
    label: "Alta",
    badgeClassName: "badge-warning",
    description: "Impedimento operacional.",
    rank: 3
  },
  MEDIUM: {
    label: "Media",
    badgeClassName: "badge-info",
    description: "Solicitacao comum.",
    rank: 2
  },
  LOW: {
    label: "Baixa",
    badgeClassName: "badge-neutral",
    description: "Baixa urgencia.",
    rank: 1
  }
};

export const supportMessageChannelMeta: Record<SupportMessageChannel, { label: string }> = {
  WHATSAPP: { label: "WhatsApp" },
  DRIVER_APP: { label: "Aplicativo" },
  EMAIL: { label: "E-mail" },
  INTERNAL: { label: "Interno" }
};

export const supportSlaMinutesByPriority: Record<SupportTicketPriority, number> = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 120,
  LOW: 1440
};

export const supportQuickActionsByType: Record<
  SupportTicketType,
  Array<{ key: string; label: string; outcome?: "ESCALATED" | "RESOLVED" }>
> = {
  RIDE: [
    { key: "OPEN_RIDE_DETAILS", label: "Ver detalhes da corrida" },
    { key: "CHECK_PAYMENT", label: "Conferir pagamento" },
    { key: "CHECK_REPASSE", label: "Conferir repasse" },
    { key: "REPROCESS_PAYMENT", label: "Reprocessar pagamento", outcome: "ESCALATED" },
    { key: "ESCALATE_FINANCE", label: "Escalar para financeiro", outcome: "ESCALATED" },
    { key: "RESOLVE_FIXED", label: "Resolver como corrigido", outcome: "RESOLVED" }
  ],
  DRIVER: [
    { key: "OPEN_DRIVER_PROFILE", label: "Ver perfil do motorista" },
    { key: "OPEN_DRIVER_DOCUMENTS", label: "Ver documentos" },
    { key: "OPEN_DRIVER_VEHICLE", label: "Ver veiculo" },
    { key: "CHECK_DRIVER_REPASSE", label: "Conferir repasse" },
    { key: "ESCALATE_OPERATIONS", label: "Escalar para operacao", outcome: "ESCALATED" },
    { key: "RESPOND_DRIVER", label: "Responder motorista" }
  ],
  CUSTOMER: [
    { key: "OPEN_CUSTOMER_PROFILE", label: "Ver perfil do cliente" },
    { key: "OPEN_RELATED_RIDE", label: "Ver corrida relacionada" },
    { key: "CHECK_CHARGE", label: "Conferir cobranca" },
    { key: "APPLY_REFUND", label: "Aplicar reembolso", outcome: "ESCALATED" },
    { key: "RESPOND_CUSTOMER", label: "Responder cliente" },
    { key: "ESCALATE_FINANCE", label: "Escalar para financeiro", outcome: "ESCALATED" }
  ],
  INTERNAL: [
    { key: "LINK_MODULE", label: "Vincular modulo" },
    { key: "SET_OWNER_AREA", label: "Definir area responsavel" },
    { key: "SET_SEVERITY", label: "Definir severidade" },
    { key: "CREATE_INTERNAL_TASK", label: "Criar tarefa interna" },
    { key: "MARK_RESOLVED", label: "Marcar como resolvido", outcome: "RESOLVED" }
  ]
};

export const supportResponseTemplates: Record<
  SupportTicketType,
  Array<{ key: string; label: string; message: string }>
> = {
  DRIVER: [
    {
      key: "driver-repasse-divergence",
      label: "Divergencia de repasse",
      message:
        "Ola, estamos conferindo os valores da corrida e o calculo do repasse. Assim que validarmos, retornaremos com a atualizacao."
    }
  ],
  CUSTOMER: [
    {
      key: "customer-charge-review",
      label: "Cobranca indevida",
      message:
        "Ola, identificamos sua solicitacao e vamos conferir a cobranca vinculada a corrida. Caso seja confirmado erro, seguiremos com o ajuste."
    },
    {
      key: "customer-ride-cancelled",
      label: "Corrida cancelada",
      message:
        "Ola, estamos verificando o motivo do cancelamento e se houve cobranca ou impacto no repasse."
    }
  ],
  RIDE: [
    {
      key: "ride-cancelled",
      label: "Corrida cancelada",
      message: "Ola, estamos verificando o motivo do cancelamento e o historico operacional dessa corrida."
    }
  ],
  INTERNAL: [
    {
      key: "internal-escalation",
      label: "Escalada interna",
      message: "Incidente registrado e encaminhado para a area responsavel com prioridade operacional."
    }
  ]
};

function minAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function buildDueAt(createdAt: string, priority: SupportTicketPriority): string {
  return resolveSlaDueAtByPriority(createdAt, priority);
}

const created1 = minAgo(18);
const created2 = minAgo(35);
const created3 = minAgo(70);

export const mockSupportTickets: SupportTicket[] = [
  {
    id: "support-101",
    code: "SUP-20260430-0101",
    type: "RIDE",
    title: "Corrida cancelada sem retorno ao cliente",
    summary: "Cliente reporta cancelamento sem novo envio.",
    description: "Necessario validar cancelamento e tratativa de reenvio.",
    status: "NEW",
    priority: "HIGH",
    requester: { id: "5527995330712", name: "Franciele Bungenstab", phone: "5527995330712" },
    relatedRideId: "ride_3281",
    relatedDriverId: "drv_001",
    relatedCustomerId: "5527995330712",
    source: "WhatsApp",
    createdAt: created1,
    updatedAt: minAgo(10),
    dueAt: buildDueAt(created1, "HIGH"),
    nextAction: "Solicitar confirmacao da cliente para nova tentativa.",
    tags: ["cancelamento", "corrida"],
    timeline: [
      {
        id: "timeline-101-1",
        type: "TICKET_CREATED",
        description: "Ticket criado automaticamente apos fallback do bot.",
        actor: "Sistema",
        createdAt: created1
      }
    ],
    internalNotes: [],
    responses: [],
    relatedRide: {
      id: "ride_3281",
      status: "CANCELLED",
      origin: "Jardim Camburi",
      destination: "Aeroporto de Vitoria",
      fareAmount: 42.5,
      paymentMethod: "PIX",
      scheduledAt: minAgo(30)
    }
  },
  {
    id: "support-102",
    code: "SUP-20260430-0102",
    type: "DRIVER",
    title: "Divergencia de repasse",
    summary: "Motorista questiona valor do repasse.",
    description: "Possivel impacto financeiro no extrato.",
    status: "IN_ANALYSIS",
    priority: "CRITICAL",
    assignee: "Ana Paula",
    requester: { id: "drv_001", name: "Clovis Ricardo Dias Junior", phone: "552799990001" },
    relatedRideId: "ride_3280",
    relatedDriverId: "drv_001",
    source: "WhatsApp",
    createdAt: created2,
    updatedAt: minAgo(20),
    dueAt: buildDueAt(created2, "CRITICAL"),
    nextAction: "Escalar para financeiro com memorial.",
    tags: ["repasse", "financeiro"],
    timeline: [
      {
        id: "timeline-102-1",
        type: "TICKET_CREATED",
        description: "Ticket criado por mensagem do motorista.",
        actor: "Sistema",
        createdAt: created2
      }
    ],
    internalNotes: [],
    responses: []
  },
  {
    id: "support-103",
    code: "SUP-20260430-0103",
    type: "CUSTOMER",
    title: "Cobranca em analise",
    summary: "Cliente solicita conferencia de cobranca.",
    description: "Validar transacao e regra de cancelamento.",
    status: "WAITING_CUSTOMER",
    priority: "MEDIUM",
    assignee: "Rafael",
    requester: { id: "5527999651288", name: "Luciana Souza", phone: "5527999651288" },
    relatedCustomerId: "5527999651288",
    source: "App Cliente",
    createdAt: created3,
    updatedAt: minAgo(15),
    dueAt: buildDueAt(created3, "MEDIUM"),
    nextAction: "Aguardar comprovante da cliente.",
    tags: ["cobranca", "cliente"],
    timeline: [
      {
        id: "timeline-103-1",
        type: "TICKET_CREATED",
        description: "Solicitacao registrada pelo app do cliente.",
        actor: "Sistema",
        createdAt: created3
      }
    ],
    internalNotes: [],
    responses: []
  }
];

export function buildDriverSupportHref(ticket: SupportTicket): string | null {
  if (!ticket.relatedDriverId) return null;
  return `/drivers/${encodeURIComponent(ticket.relatedDriverId)}?fromTicket=${encodeURIComponent(ticket.id)}`;
}

export function buildRideSupportHref(ticket: SupportTicket): string | null {
  if (!ticket.relatedRideId) return null;
  return `/rides/${encodeURIComponent(ticket.relatedRideId)}?fromTicket=${encodeURIComponent(ticket.id)}`;
}

export function buildCustomerSupportHref(ticket: SupportTicket): string | null {
  if (!ticket.relatedCustomerId) return null;
  return `/customers/${encodeURIComponent(ticket.relatedCustomerId)}?fromTicket=${encodeURIComponent(ticket.id)}`;
}

export function isTicketOpen(ticket: SupportTicket): boolean {
  return ticket.status !== "RESOLVED" && ticket.status !== "CANCELLED";
}

export function resolveSlaDueAtByPriority(createdAt: string, priority: SupportTicketPriority): string {
  return new Date(new Date(createdAt).getTime() + supportSlaMinutesByPriority[priority] * 60 * 1000).toISOString();
}

export function resolveSlaView(ticket: SupportTicket): {
  dueAtLabel: string;
  statusLabel: string;
  risk: "ok" | "warning" | "danger";
  isOverdue: boolean;
} {
  const now = Date.now();
  const dueAtMs = new Date(ticket.dueAt).getTime();
  const remainingMs = dueAtMs - now;
  const remainingMinutes = Math.ceil(Math.abs(remainingMs) / 60000);
  const warningThreshold = Math.max(5, Math.floor(supportSlaMinutesByPriority[ticket.priority] * 0.25));

  if (remainingMs < 0) {
    return {
      dueAtLabel: new Date(ticket.dueAt).toLocaleString("pt-BR"),
      statusLabel: `Atrasado ha ${remainingMinutes} min`,
      risk: "danger",
      isOverdue: true
    };
  }

  if (remainingMinutes <= warningThreshold) {
    return {
      dueAtLabel: new Date(ticket.dueAt).toLocaleString("pt-BR"),
      statusLabel: `${remainingMinutes} min restantes`,
      risk: "warning",
      isOverdue: false
    };
  }

  return {
    dueAtLabel: new Date(ticket.dueAt).toLocaleString("pt-BR"),
    statusLabel: "Dentro do prazo",
    risk: "ok",
    isOverdue: false
  };
}

export function getSlaRiskClassName(risk: "ok" | "warning" | "danger"): string {
  if (risk === "danger") return "support-sla-pill is-danger";
  if (risk === "warning") return "support-sla-pill is-warning";
  return "support-sla-pill is-ok";
}

export function filterSupportTickets(tickets: SupportTicket[], query: string): SupportTicket[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tickets;
  return tickets.filter(t => 
    t.code.toLowerCase().includes(normalized) || 
    t.title.toLowerCase().includes(normalized) ||
    t.requester.name.toLowerCase().includes(normalized)
  );
}
