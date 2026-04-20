export type DriverProfile = {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  vehicle?: string;
  vehicles: DriverVehicle[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DriverVehicle = {
  id: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Ride = {
  id: string;
  customerName: string;
  tripTypeSlug?: string;
  tripTypeName?: string;
  tripTypeSurchargeAmount?: number;
  baggageCount?: number;
  baggageSize?: string;
  petType?: string;
  petSize?: string;
  customerHasReducedMobility?: boolean;
  passengerCount?: number;
  companionNeedsSpecialAttention?: boolean;
  companionSpecialAttentionDetails?: string;
  hasIntermediateStops?: boolean;
  intermediateStopsSummary?: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  status: string;
  customerPhone?: string;
  assignedDriverId?: string;
  quote?: {
    amount: number;
    currency: string;
    routeDistanceKm: number;
    routeDurationMinutes: number;
    quotedAt: string;
  };
};

export type NotificationItem = {
  id: string;
  type: string;
  rideId: string;
  driverId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type CustomerSummary = {
  phone: string;
  name: string;
  totalRides: number;
  lastRideId?: string;
  lastRideStatus?: string;
  lastOrigin?: string;
  lastDestination?: string;
  firstRideAt?: string;
  lastRideAt?: string;
  favorites: CustomerFavoriteAddress[];
};

export type CustomerFavoriteAddress = {
  id: string;
  label: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type TripType = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  surchargeAmount: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RideEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type SimulateResult = {
  actions: Array<{
    rideId?: string;
    type: string;
    details: string;
  }>;
  outboundMessages: Array<{
    to: string;
    text: string;
  }>;
};

export type ConversationMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
};

export type ConversationStep =
  | "intro"
  | "phone"
  | "existingCustomerConfirm"
  | "customerName"
  | "customerPreferredName"
  | "customerAccessibilityProfile"
  | "originFavoriteSelect"
  | "origin"
  | "originFavoriteConfirm"
  | "originFavoriteLabel"
  | "destinationFavoriteSelect"
  | "destination"
  | "destinationFavoriteConfirm"
  | "destinationFavoriteLabel"
  | "tripTypeSelect"
  | "baggageCount"
  | "baggageSize"
  | "petType"
  | "petSize"
  | "passengerCount"
  | "companionSpecialAttention"
  | "intermediateStopsConfirm"
  | "intermediateStopsDetails"
  | "scheduledAt"
  | "quoteReady"
  | "confirmed";

export type ConversationSession = {
  id: string;
  currentStep: ConversationStep;
  latestRideId: string;
  customerPhone?: string;
  messages: ConversationMessage[];
  matchedCustomer: CustomerSummary | null;
  favoriteAddresses: CustomerFavoriteAddress[];
  availableTripTypes: TripType[];
  composerPlaceholder: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Falha HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function formatCurrency(value?: number): string {
  if (value === undefined) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
