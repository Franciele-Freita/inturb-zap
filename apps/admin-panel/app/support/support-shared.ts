export type SupportCaseStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "RESOLVED";
export type SupportCaseType = "CUSTOMER" | "DRIVER" | "RIDE" | "OPERATIONAL";
export type SupportCasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SupportCaseContact = {
  name: string;
  phone?: string;
  note?: string;
  href?: string;
};

export type SupportCaseRide = {
  id: string;
  status: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  href?: string;
};

export type SupportCaseTimelineEntry = {
  id: string;
  title: string;
  detail: string;
  at: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
};

export type SupportCase = {
  id: string;
  ticketNumber: string;
  title: string;
  summary: string;
  type: SupportCaseType;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  source: string;
  openedAt: string;
  dueAt: string;
  updatedAt: string;
  assignedTo?: string;
  reason: string;
  customer?: SupportCaseContact;
  driver?: SupportCaseContact;
  ride?: SupportCaseRide;
  internalNotes: string[];
  nextAction: string;
  timeline: SupportCaseTimelineEntry[];
};

export const supportStatusOrder: SupportCaseStatus[] = ["NEW", "IN_PROGRESS", "WAITING", "RESOLVED"];

export const supportStatusMeta: Record<SupportCaseStatus, { label: string; description: string }> = {
  NEW: {
    label: "Novo",
    description: "Casos que acabaram de entrar na fila."
  },
  IN_PROGRESS: {
    label: "Em atendimento",
    description: "Ocorrencias com operador atuando agora."
  },
  WAITING: {
    label: "Aguardando retorno",
    description: "Casos pausados esperando resposta externa."
  },
  RESOLVED: {
    label: "Resolvido",
    description: "Atendimentos encerrados e registrados."
  }
};

export const supportTypeLabel: Record<SupportCaseType, string> = {
  CUSTOMER: "Cliente",
  DRIVER: "Motorista",
  RIDE: "Corrida",
  OPERATIONAL: "Operacional"
};

export const supportPriorityLabel: Record<SupportCasePriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica"
};

export const mockSupportCases: SupportCase[] = [
  {
    id: "support-101",
    ticketNumber: "SUP-20260317-0101",
    title: "Duvida sobre corrida cancelada",
    summary: "Cliente relata que a corrida foi cancelada e quer entender se havera nova tentativa de envio.",
    type: "CUSTOMER",
    status: "NEW",
    priority: "HIGH",
    source: "WhatsApp",
    openedAt: "2026-03-17T08:12:00.000Z",
    dueAt: "2026-03-17T09:00:00.000Z",
    updatedAt: "2026-03-17T08:19:00.000Z",
    reason: "Corrida cancelada sem retorno automatico",
    customer: {
      name: "Franciele Bungenstab de Freita",
      phone: "5527995330712",
      note: "Cliente nova com score 50",
      href: "/customers"
    },
    driver: {
      name: "Clovis Ricardo Dias Junior",
      phone: "552799990001",
      note: "Motorista vinculado na ultima tentativa",
      href: "/drivers"
    },
    ride: {
      id: "ride_3281",
      status: "CANCELLED",
      origin: "Jardim Camburi",
      destination: "Aeroporto de Vitoria",
      scheduledAt: "2026-03-17T08:00:00.000Z",
      href: "/rides"
    },
    internalNotes: [
      "Validar se houve cancelamento pelo motorista ou expiracao da janela.",
      "Confirmar com a cliente se deseja reabrir a solicitacao."
    ],
    nextAction: "Retornar para a cliente com orientacao e, se necessario, recriar o atendimento operacional da corrida.",
    timeline: [
      {
        id: "support-101-1",
        title: "Caso criado",
        detail: "Atendimento aberto automaticamente a partir da conversa com a cliente.",
        at: "2026-03-17T08:12:00.000Z",
        tone: "neutral"
      },
      {
        id: "support-101-2",
        title: "Mensagem recebida",
        detail: "Cliente informou que ficou sem retorno apos o cancelamento.",
        at: "2026-03-17T08:15:00.000Z",
        tone: "warning"
      },
      {
        id: "support-101-3",
        title: "Fila priorizada",
        detail: "Caso marcado como alta prioridade por impactar solicitacao ativa.",
        at: "2026-03-17T08:19:00.000Z",
        tone: "warning"
      }
    ]
  },
  {
    id: "support-102",
    ticketNumber: "SUP-20260317-0102",
    title: "Motorista sem veiculo operacional",
    summary: "Perfil segue ativo, mas nao ha nenhum veiculo marcado como operacional no cadastro.",
    type: "DRIVER",
    status: "IN_PROGRESS",
    priority: "HIGH",
    source: "Painel admin",
    openedAt: "2026-03-17T07:40:00.000Z",
    dueAt: "2026-03-17T08:40:00.000Z",
    updatedAt: "2026-03-17T08:05:00.000Z",
    assignedTo: "Ana Paula",
    reason: "Cadastro inconsistene entre perfil e frota",
    driver: {
      name: "Mateus Fernandes",
      phone: "5527999554400",
      note: "Motorista ativo sem veiculo em operacao",
      href: "/drivers"
    },
    internalNotes: [
      "Solicitar confirmacao da placa operacional antes de reativar a disponibilidade.",
      "Revisar se houve troca recente de veiculo nao concluida no cadastro."
    ],
    nextAction: "Atualizar o cadastro do motorista com o veiculo operacional correto e confirmar disponibilidade.",
    timeline: [
      {
        id: "support-102-1",
        title: "Alerta operacional",
        detail: "Sistema encontrou motorista ativo sem veiculo operacional.",
        at: "2026-03-17T07:40:00.000Z",
        tone: "danger"
      },
      {
        id: "support-102-2",
        title: "Responsavel definido",
        detail: "Ana Paula assumiu o atendimento e iniciou validacao cadastral.",
        at: "2026-03-17T07:48:00.000Z",
        tone: "neutral"
      },
      {
        id: "support-102-3",
        title: "Contato com motorista",
        detail: "Motorista informou troca de carro ainda nao refletida no painel.",
        at: "2026-03-17T08:05:00.000Z",
        tone: "positive"
      }
    ]
  },
  {
    id: "support-103",
    ticketNumber: "SUP-20260317-0103",
    title: "Corrida expirada aguardando retorno da cliente",
    summary: "Caso de pre-agendamento expirado que exige confirmar se a passageira ainda deseja atendimento.",
    type: "RIDE",
    status: "WAITING",
    priority: "MEDIUM",
    source: "Operacao",
    openedAt: "2026-03-17T06:55:00.000Z",
    dueAt: "2026-03-17T07:55:00.000Z",
    updatedAt: "2026-03-17T07:22:00.000Z",
    assignedTo: "Operacao Manha",
    reason: "Expiracao da janela de aceite",
    customer: {
      name: "Luciana Souza",
      phone: "5527999651288",
      href: "/customers"
    },
    ride: {
      id: "ride_3274",
      status: "EXPIRED",
      origin: "Praia do Canto",
      destination: "Rodoviaria de Vitoria",
      scheduledAt: "2026-03-17T07:10:00.000Z",
      href: "/rides"
    },
    internalNotes: [
      "A cliente pediu retorno antes de gerar nova tentativa.",
      "Caso pode voltar para novo se houver confirmacao de interesse."
    ],
    nextAction: "Aguardar confirmacao da cliente para decidir entre reabrir a corrida ou encerrar o caso.",
    timeline: [
      {
        id: "support-103-1",
        title: "Corrida expirou",
        detail: "Nenhum motorista aceitou dentro da janela prevista.",
        at: "2026-03-17T06:55:00.000Z",
        tone: "warning"
      },
      {
        id: "support-103-2",
        title: "Tentativa de contato",
        detail: "Mensagem enviada para a cliente explicando a expiracao e propondo nova tentativa.",
        at: "2026-03-17T07:10:00.000Z",
        tone: "neutral"
      },
      {
        id: "support-103-3",
        title: "Caso pausado",
        detail: "Atendimento movido para aguardando retorno.",
        at: "2026-03-17T07:22:00.000Z",
        tone: "neutral"
      }
    ]
  },
  {
    id: "support-104",
    ticketNumber: "SUP-20260316-0098",
    title: "Score ajustado apos revisao cadastral",
    summary: "Cliente questionou pontuacao inicial e recebeu explicacao sobre cadastro novo e ausencia de corridas.",
    type: "CUSTOMER",
    status: "RESOLVED",
    priority: "LOW",
    source: "Manual",
    openedAt: "2026-03-16T18:20:00.000Z",
    dueAt: "2026-03-16T19:20:00.000Z",
    updatedAt: "2026-03-16T18:52:00.000Z",
    assignedTo: "Juliana",
    reason: "Duvida sobre score e tier do cliente",
    customer: {
      name: "Renata Lima",
      phone: "5527999448811",
      note: "Cliente novo sem corridas finalizadas",
      href: "/customers"
    },
    internalNotes: [
      "Nao houve ajuste manual no score; apenas orientacao.",
      "Cliente entendeu a regra de pontuacao inicial."
    ],
    nextAction: "Sem acao pendente.",
    timeline: [
      {
        id: "support-104-1",
        title: "Caso aberto manualmente",
        detail: "Operadora registrou a duvida de score enviada por telefone.",
        at: "2026-03-16T18:20:00.000Z",
        tone: "neutral"
      },
      {
        id: "support-104-2",
        title: "Explicacao enviada",
        detail: "Cliente recebeu detalhamento da composicao do score inicial.",
        at: "2026-03-16T18:36:00.000Z",
        tone: "positive"
      },
      {
        id: "support-104-3",
        title: "Atendimento encerrado",
        detail: "Sem pendencias adicionais registradas.",
        at: "2026-03-16T18:52:00.000Z",
        tone: "positive"
      }
    ]
  },
  {
    id: "support-105",
    ticketNumber: "SUP-20260317-0104",
    title: "Divergencia de repasse apos corrida finalizada",
    summary: "Motorista informou que o valor esperado do repasse nao bate com o fechamento visto no painel.",
    type: "DRIVER",
    status: "NEW",
    priority: "CRITICAL",
    source: "WhatsApp",
    openedAt: "2026-03-17T08:02:00.000Z",
    dueAt: "2026-03-17T08:45:00.000Z",
    updatedAt: "2026-03-17T08:18:00.000Z",
    reason: "Questionamento financeiro pos-corrida",
    driver: {
      name: "Clovis Ricardo Dias Junior",
      phone: "552799990001",
      note: "Repasse esperado de 25%",
      href: "/drivers"
    },
    ride: {
      id: "ride_3280",
      status: "COMPLETED",
      origin: "Centro de Vitoria",
      destination: "Mata da Praia",
      scheduledAt: "2026-03-17T07:15:00.000Z",
      href: "/rides"
    },
    internalNotes: [
      "Validar se a corrida usou regra global ou regra personalizada do motorista.",
      "Escalar para financeiro se houver divergencia real no fechamento."
    ],
    nextAction: "Revisar a configuracao de repasse aplicada na corrida e retornar ao motorista com o calculo detalhado.",
    timeline: [
      {
        id: "support-105-1",
        title: "Mensagem do motorista",
        detail: "Motorista questionou o valor visualizado logo apos a finalizacao.",
        at: "2026-03-17T08:02:00.000Z",
        tone: "warning"
      },
      {
        id: "support-105-2",
        title: "Caso sinalizado",
        detail: "Ocorrencia financeira marcada como critica por impacto em repasse.",
        at: "2026-03-17T08:18:00.000Z",
        tone: "danger"
      }
    ]
  },
  {
    id: "support-106",
    ticketNumber: "SUP-20260317-0105",
    title: "Falha de login no app do motorista",
    summary: "Motorista ativo nao consegue concluir o login e relata erro logo apos informar telefone.",
    type: "OPERATIONAL",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    source: "Telefone",
    openedAt: "2026-03-17T07:12:00.000Z",
    dueAt: "2026-03-17T08:12:00.000Z",
    updatedAt: "2026-03-17T07:39:00.000Z",
    assignedTo: "Rafael",
    reason: "Acesso bloqueado no app do motorista",
    driver: {
      name: "Paulo Roberto Gomes",
      phone: "5527999332201",
      note: "Perfil ativo com push cadastrado",
      href: "/drivers"
    },
    internalNotes: [
      "Verificar se o app esta com cache antigo ou se houve alteracao de versao.",
      "Validar o estado do cadastro do motorista antes de resetar acesso."
    ],
    nextAction: "Testar novo fluxo de login com o motorista e registrar a causa raiz do erro.",
    timeline: [
      {
        id: "support-106-1",
        title: "Contato inicial",
        detail: "Motorista informou falha no acesso durante a primeira tentativa da manha.",
        at: "2026-03-17T07:12:00.000Z",
        tone: "warning"
      },
      {
        id: "support-106-2",
        title: "Triagem tecnica",
        detail: "Suporte orientou limpeza local e validacao de versao do app.",
        at: "2026-03-17T07:27:00.000Z",
        tone: "neutral"
      },
      {
        id: "support-106-3",
        title: "Reproducao parcial",
        detail: "Erro ocorre apenas em um aparelho especifico e segue em analise.",
        at: "2026-03-17T07:39:00.000Z",
        tone: "neutral"
      }
    ]
  }
];

export function getSupportCaseById(caseId: string): SupportCase | undefined {
  return mockSupportCases.find((supportCase) => supportCase.id === caseId);
}
