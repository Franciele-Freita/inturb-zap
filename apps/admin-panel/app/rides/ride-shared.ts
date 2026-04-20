import { DriverProfile, Ride, RideEvent } from "../../lib/api";

export type RideBoardKey = "CREATED" | "ACCEPTED" | "CLOSED" | "COMPLETED";
export type DriverDecision = "ACCEPT" | "REJECT";
export type RideStageAction = "GO_TO_PICKUP" | "ARRIVED" | "START" | "COMPLETE";

export const rideBoardOrder: RideBoardKey[] = ["CREATED", "ACCEPTED", "CLOSED", "COMPLETED"];

export const rideBoardMeta: Record<
  RideBoardKey,
  { title: string; description: string; emptyMessage: string; toneClassName: string }
> = {
  CREATED: {
    title: "Geradas / aguardando aceite",
    description: "Corridas novas, cotadas ou pre-agendadas que ainda nao encerraram a decisao.",
    emptyMessage: "Nenhuma corrida aguardando tratamento operacional.",
    toneClassName: "is-created"
  },
  ACCEPTED: {
    title: "Aceitas",
    description: "Corridas atribuidas e ainda em execucao pelo motorista.",
    emptyMessage: "Nenhuma corrida em andamento operacional.",
    toneClassName: "is-accepted"
  },
  CLOSED: {
    title: "Rejeitadas / expiradas",
    description: "Corridas encerradas sem execucao por recusa, expiracao ou cancelamento.",
    emptyMessage: "Nenhuma corrida rejeitada, expirada ou cancelada.",
    toneClassName: "is-closed"
  },
  COMPLETED: {
    title: "Finalizadas",
    description: "Corridas concluidas pelo motorista e fechadas na operacao.",
    emptyMessage: "Nenhuma corrida finalizada ate o momento.",
    toneClassName: "is-completed"
  }
};

const mockNow = Date.now();

export const mockDrivers: DriverProfile[] = [
  {
    id: "mock-driver-1",
    userId: "mock-user-1",
    name: "Marcos Lima",
    cpf: "00000000001",
    phone: "(27) 99911-2233",
    email: "marcos@inturb.local",
    hasPassword: true,
    driverType: "AGREGADO",
    operationalStatus: "ACTIVE",
    vehicle: "Spin prata",
    vehicles: [],
    isActive: true,
    operationEligibility: {
      eligible: true,
      blockingIssues: []
    },
    operationSummary: {
      activeAssignedRides: 1,
      completedRides: 12,
      cancelledRides: 1,
      noShowRides: 0,
      emergencyCancellations: 0,
      openExecutionAlerts: 0
    },
    compensation: {
      useGlobalConfig: false,
      customModel: "PERCENT",
      customValue: 20,
      customNotes: "Template padrao.",
      globalModel: "PERCENT",
      globalValue: 20,
      globalIsActive: true,
      effectiveSource: "CUSTOM",
      effectiveModel: "PERCENT",
      effectiveValue: 20,
      effectiveIsActive: true
    },
    createdAt: toIsoHoursAgo(240),
    updatedAt: toIsoHoursAgo(2)
  },
  {
    id: "mock-driver-2",
    userId: "mock-user-2",
    name: "Camila Nunes",
    cpf: "00000000002",
    phone: "(27) 99822-3344",
    email: "camila@inturb.local",
    hasPassword: true,
    driverType: "AGREGADO",
    operationalStatus: "ACTIVE",
    vehicle: "Sedan branco",
    vehicles: [],
    isActive: true,
    operationEligibility: {
      eligible: true,
      blockingIssues: []
    },
    operationSummary: {
      activeAssignedRides: 1,
      completedRides: 9,
      cancelledRides: 2,
      noShowRides: 1,
      emergencyCancellations: 0,
      openExecutionAlerts: 0
    },
    compensation: {
      useGlobalConfig: false,
      customModel: "FLAT",
      customValue: 18,
      customNotes: "Repasse especial de contrato.",
      globalModel: "PERCENT",
      globalValue: 20,
      globalIsActive: true,
      effectiveSource: "CUSTOM",
      effectiveModel: "FLAT",
      effectiveValue: 18,
      effectiveIsActive: true
    },
    createdAt: toIsoHoursAgo(200),
    updatedAt: toIsoHoursAgo(3)
  }
];

export const mockRides: Ride[] = [
  {
    id: "MOCK-001",
    customerName: "Franciele Souza",
    customerPhone: "(27) 99999-1111",
    origin: "Jardim Camburi, Vitoria",
    destination: "Praia do Canto, Vitoria",
    scheduledAt: toIsoHoursFromNow(2),
    status: "PREBOOKED",
    createdAt: toIsoHoursAgo(1),
    updatedAt: toIsoMinutesAgo(10),
    tripTypeName: "Pre-agendamento",
    quote: { amount: 38.5, currency: "BRL", routeDistanceKm: 9.4, routeDurationMinutes: 22, quotedAt: toIsoHoursAgo(1) },
    decisionWindow: {
      startedAt: toIsoMinutesAgo(10),
      expiresAt: toIsoMinutesFromNow(20),
      expiresInSeconds: 20 * 60,
      totalSeconds: 30 * 60
    }
  },
  {
    id: "MOCK-002",
    customerName: "Joao Pedro Alves",
    customerPhone: "(27) 98888-2222",
    origin: "Mata da Praia, Vitoria",
    destination: "Aeroporto de Vitoria",
    scheduledAt: toIsoHoursFromNow(4),
    status: "QUOTED",
    createdAt: toIsoHoursAgo(2),
    updatedAt: toIsoMinutesAgo(50),
    tripTypeName: "Aeroporto",
    quote: { amount: 52, currency: "BRL", routeDistanceKm: 13.2, routeDurationMinutes: 28, quotedAt: toIsoHoursAgo(2) }
  },
  {
    id: "MOCK-003",
    customerName: "Patricia Gomes",
    customerPhone: "(27) 97777-3333",
    origin: "Centro, Vila Velha",
    destination: "Jardim da Penha, Vitoria",
    scheduledAt: toIsoMinutesFromNow(45),
    status: "ACCEPTED",
    assignedDriverId: "mock-driver-1",
    driverStage: "EN_ROUTE_PICKUP",
    createdAt: toIsoHoursAgo(4),
    updatedAt: toIsoMinutesAgo(12),
    navigationStartedAt: toIsoMinutesAgo(8),
    tripTypeName: "Corrida urbana",
    quote: { amount: 29.9, currency: "BRL", routeDistanceKm: 8.1, routeDurationMinutes: 19, quotedAt: toIsoHoursAgo(4) }
  },
  {
    id: "MOCK-004",
    customerName: "Luciana Ferraz",
    customerPhone: "(27) 96666-4444",
    origin: "Praia da Costa, Vila Velha",
    destination: "Shopping Vitoria",
    scheduledAt: toIsoMinutesFromNow(75),
    status: "ACCEPTED",
    assignedDriverId: "mock-driver-2",
    driverStage: "IN_PROGRESS",
    createdAt: toIsoHoursAgo(5),
    updatedAt: toIsoMinutesAgo(6),
    startedAt: toIsoMinutesAgo(5),
    tripTypeName: "Shopping",
    quote: { amount: 33.4, currency: "BRL", routeDistanceKm: 10.2, routeDurationMinutes: 24, quotedAt: toIsoHoursAgo(5) }
  },
  {
    id: "MOCK-005",
    customerName: "Renato Melo",
    customerPhone: "(27) 95555-5555",
    origin: "Itaparica, Vila Velha",
    destination: "Centro, Vitoria",
    scheduledAt: toIsoHoursAgo(3),
    status: "REJECTED",
    createdAt: toIsoHoursAgo(6),
    updatedAt: toIsoHoursAgo(3),
    tripTypeName: "Executiva",
    quote: { amount: 41.2, currency: "BRL", routeDistanceKm: 11.7, routeDurationMinutes: 27, quotedAt: toIsoHoursAgo(6) }
  },
  {
    id: "MOCK-006",
    customerName: "Helena Castro",
    customerPhone: "(27) 94444-6666",
    origin: "Bento Ferreira, Vitoria",
    destination: "Serra sede",
    scheduledAt: toIsoHoursAgo(2),
    status: "EXPIRED",
    createdAt: toIsoHoursAgo(4),
    updatedAt: toIsoHoursAgo(2),
    tripTypeName: "Intermunicipal",
    quote: { amount: 58.9, currency: "BRL", routeDistanceKm: 21.1, routeDurationMinutes: 36, quotedAt: toIsoHoursAgo(4) }
  },
  {
    id: "MOCK-007",
    customerName: "Bianca Araujo",
    customerPhone: "(27) 93333-7777",
    origin: "Jardim Limoeiro, Serra",
    destination: "UFES, Vitoria",
    scheduledAt: toIsoHoursAgo(8),
    status: "ACCEPTED",
    assignedDriverId: "mock-driver-2",
    driverStage: "COMPLETED",
    createdAt: toIsoHoursAgo(10),
    updatedAt: toIsoHoursAgo(7),
    startedAt: toIsoHoursAgo(8),
    completedAt: toIsoHoursAgo(7),
    tripTypeName: "Universidade",
    quote: { amount: 47.7, currency: "BRL", routeDistanceKm: 15.6, routeDurationMinutes: 31, quotedAt: toIsoHoursAgo(10) }
  },
  {
    id: "MOCK-008",
    customerName: "Carlos Eduardo",
    customerPhone: "(27) 92222-8888",
    origin: "Enseada do Sua, Vitoria",
    destination: "Rodoviaria de Vitoria",
    scheduledAt: toIsoHoursAgo(12),
    status: "ACCEPTED",
    assignedDriverId: "mock-driver-1",
    driverStage: "COMPLETED",
    createdAt: toIsoHoursAgo(13),
    updatedAt: toIsoHoursAgo(11),
    startedAt: toIsoHoursAgo(12),
    completedAt: toIsoHoursAgo(11),
    tripTypeName: "Rodoviaria",
    quote: { amount: 25.3, currency: "BRL", routeDistanceKm: 6.8, routeDurationMinutes: 17, quotedAt: toIsoHoursAgo(13) }
  }
];

export const mockRideEventsById: Record<string, RideEvent[]> = {
  "MOCK-001": [
    buildMockEvent("MOCK-001", "RIDE_QUOTED", 60, { amount: 38.5, route: "Jardim Camburi -> Praia do Canto" }),
    buildMockEvent("MOCK-001", "RIDE_PREBOOKED", 10, { customerConfirmed: true })
  ],
  "MOCK-003": [
    buildMockEvent("MOCK-003", "RIDE_PREBOOKED", 240, { customerConfirmed: true }),
    buildMockEvent("MOCK-003", "DRIVER_DECISION", 18, { driverId: "mock-driver-1", decision: "ACCEPT" }),
    buildMockEvent("MOCK-003", "DRIVER_EN_ROUTE_PICKUP", 8, { stage: "EN_ROUTE_PICKUP" })
  ],
  "MOCK-004": [
    buildMockEvent("MOCK-004", "DRIVER_DECISION", 90, { driverId: "mock-driver-2", decision: "ACCEPT" }),
    buildMockEvent("MOCK-004", "DRIVER_ARRIVED_PICKUP", 20, { stage: "ARRIVED" }),
    buildMockEvent("MOCK-004", "RIDE_STARTED", 5, { stage: "IN_PROGRESS" })
  ],
  "MOCK-005": [
    buildMockEvent("MOCK-005", "RIDE_PREBOOKED", 360, { customerConfirmed: true }),
    buildMockEvent("MOCK-005", "DRIVER_DECISION", 180, { driverId: "mock-driver-2", decision: "REJECT" })
  ],
  "MOCK-006": [
    buildMockEvent("MOCK-006", "RIDE_PREBOOKED", 240, { customerConfirmed: true }),
    buildMockEvent("MOCK-006", "RIDE_EXPIRED", 120, { reason: "DECISION_WINDOW_ELAPSED" })
  ],
  "MOCK-007": [
    buildMockEvent("MOCK-007", "DRIVER_DECISION", 540, { driverId: "mock-driver-2", decision: "ACCEPT" }),
    buildMockEvent("MOCK-007", "RIDE_STARTED", 490, { stage: "IN_PROGRESS" }),
    buildMockEvent("MOCK-007", "RIDE_COMPLETED", 430, { stage: "COMPLETED" })
  ],
  "MOCK-008": [
    buildMockEvent("MOCK-008", "DRIVER_DECISION", 780, { driverId: "mock-driver-1", decision: "ACCEPT" }),
    buildMockEvent("MOCK-008", "RIDE_STARTED", 740, { stage: "IN_PROGRESS" }),
    buildMockEvent("MOCK-008", "RIDE_COMPLETED", 680, { stage: "COMPLETED" })
  ]
};

export function buildRideBoardCounts(rides: Ride[]): Record<RideBoardKey, number> {
  const counts: Record<RideBoardKey, number> = {
    CREATED: 0,
    ACCEPTED: 0,
    CLOSED: 0,
    COMPLETED: 0
  };

  for (const ride of rides) {
    counts[classifyRideBoard(ride)] += 1;
  }

  return counts;
}

export function groupRidesForBoard(rides: Ride[]): Record<RideBoardKey, Ride[]> {
  const groups: Record<RideBoardKey, Ride[]> = {
    CREATED: [],
    ACCEPTED: [],
    CLOSED: [],
    COMPLETED: []
  };

  for (const ride of rides) {
    groups[classifyRideBoard(ride)].push(ride);
  }

  return groups;
}

export function classifyRideBoard(ride: Ride): RideBoardKey {
  if (ride.status === "COMPLETED" || ride.driverStage === "COMPLETED") {
    return "COMPLETED";
  }

  if (ride.status === "ACCEPTED") {
    return "ACCEPTED";
  }

  if (ride.status === "REJECTED" || ride.status === "EXPIRED" || ride.status === "CANCELLED") {
    return "CLOSED";
  }

  return "CREATED";
}

export function resolveRideStatusLabel(status: Ride["status"]): string {
  switch (status) {
    case "NEW":
      return "Nova";
    case "QUOTED":
      return "Cotada";
    case "PREBOOKED":
      return "Aguardando aceite";
    case "ACCEPTED":
      return "Aceita";
    case "COMPLETED":
      return "Concluida";
    case "REJECTED":
      return "Rejeitada";
    case "EXPIRED":
      return "Expirada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

export function resolveRideStatusPillClassName(status: Ride["status"]): string {
  if (status === "ACCEPTED" || status === "COMPLETED") {
    return "status-pill status-pill-success";
  }

  if (status === "EXPIRED" || status === "REJECTED" || status === "CANCELLED") {
    return "status-pill rides-status-pill-danger";
  }

  if (status === "PREBOOKED") {
    return "status-pill rides-status-pill-warning";
  }

  return "status-pill";
}

export function resolveRideStageLabel(stage?: Ride["driverStage"]): string {
  if (stage === "EN_ROUTE_PICKUP") {
    return "Indo ao embarque";
  }

  if (stage === "ARRIVED") {
    return "Cheguei";
  }

  if (stage === "IN_PROGRESS") {
    return "Em andamento";
  }

  if (stage === "COMPLETED") {
    return "Finalizada";
  }

  if (stage === "SCHEDULED") {
    return "Agendada";
  }

  return "Sem etapa";
}

export function resolveNextRideStageAction(
  ride: Ride
): { action: RideStageAction; title: string; description: string; buttonLabel: string } | null {
  if (ride.status !== "ACCEPTED") {
    return null;
  }

  if (ride.driverStage === "EN_ROUTE_PICKUP") {
    return {
      action: "ARRIVED",
      title: "Confirmar chegada no embarque",
      description: "Use quando o motorista estiver no local de coleta.",
      buttonLabel: "Marcar chegada"
    };
  }

  if (ride.driverStage === "ARRIVED") {
    return {
      action: "START",
      title: "Iniciar corrida",
      description: "Passageiro embarcou e a corrida comecou.",
      buttonLabel: "Iniciar corrida"
    };
  }

  if (ride.driverStage === "IN_PROGRESS") {
    return {
      action: "COMPLETE",
      title: "Finalizar corrida",
      description: "Viagem concluida e pronta para entrar no historico.",
      buttonLabel: "Finalizar corrida"
    };
  }

  if (ride.driverStage === "COMPLETED") {
    return null;
  }

  return {
    action: "GO_TO_PICKUP",
    title: "Marcar motorista a caminho",
    description: "Use quando o motorista sair para o ponto de embarque.",
    buttonLabel: "Ir ao embarque"
  };
}

export function resolveRideStagePathSuffix(action: RideStageAction): string {
  switch (action) {
    case "GO_TO_PICKUP":
      return "go-to-pickup";
    case "ARRIVED":
      return "arrived";
    case "START":
      return "start";
    case "COMPLETE":
      return "complete";
    default:
      return "go-to-pickup";
  }
}

export function resolveRideStageActionLabel(action: RideStageAction): string {
  switch (action) {
    case "GO_TO_PICKUP":
      return "Motorista marcado a caminho";
    case "ARRIVED":
      return "Chegada ao embarque registrada";
    case "START":
      return "Corrida iniciada";
    case "COMPLETE":
      return "Corrida finalizada";
    default:
      return "Andamento atualizado";
  }
}

export function isRideAwaitingPrebook(ride: Ride): boolean {
  return ride.status === "NEW" || ride.status === "QUOTED";
}

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function findMockRide(rideId: string): Ride | undefined {
  return mockRides.find((ride) => ride.id === rideId);
}

function buildMockEvent(rideId: string, eventType: string, minutesAgo: number, payload?: Record<string, unknown>): RideEvent {
  return {
    id: `${rideId}-${eventType}-${minutesAgo}`,
    eventType,
    payload,
    createdAt: new Date(mockNow - minutesAgo * 60_000).toISOString()
  };
}

function toIsoHoursAgo(hours: number): string {
  return new Date(mockNow - hours * 60 * 60_000).toISOString();
}

function toIsoHoursFromNow(hours: number): string {
  return new Date(mockNow + hours * 60 * 60_000).toISOString();
}

function toIsoMinutesAgo(minutes: number): string {
  return new Date(mockNow - minutes * 60_000).toISOString();
}

function toIsoMinutesFromNow(minutes: number): string {
  return new Date(mockNow + minutes * 60_000).toISOString();
}
