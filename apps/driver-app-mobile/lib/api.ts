import Constants from "expo-constants";
import { loadStoredDriverSession } from "./session";

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

export type DriverType = "AGREGADO" | "FROTA";
export type FleetAssignmentMode = "FIXED" | "FLEX";

export type DriverFleetDefaultVehicleSummary = {
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  checkinCode: string;
};

export type DriverFleetVehicleSummary = {
  assignmentId: string;
  vehicleId: string;
  label: string;
  plate: string;
  color?: string;
  year?: number;
  status: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";
  validationMethod: "QR_CODE" | "PLATE" | "ADMIN";
  startedAt: string;
};

export type DriverFleetChecklistItem = {
  itemKey: string;
  label: string;
  description?: string;
  category?: string;
  routine: "START_OF_DAY" | "END_OF_DAY";
  inputType: "BOOLEAN" | "ODOMETER";
  sortOrder: number;
  isRequired: boolean;
  dateKey: string;
  isChecked: boolean;
  numericValue?: number;
  checkedAt?: string;
  notes?: string;
};

export type DriverFleetVehicleDetails = DriverFleetVehicleSummary & {
  checklist: DriverFleetChecklistItem[];
};

export type DriverProfile = {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  hasPassword: boolean;
  birthDate?: string;
  gender?: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
  driverType: DriverType;
  fleetAssignmentMode?: FleetAssignmentMode;
  defaultFleetVehicle?: DriverFleetDefaultVehicleSummary;
  vehicle?: string;
  vehicles?: DriverVehicle[];
  currentFleetVehicle?: DriverFleetVehicleSummary;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DriverLoginResult = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  driver: DriverProfile;
};

export type StartFleetVehicleSessionInput = {
  qrCodeToken?: string;
  plate?: string;
};

export type DriverEmergencyCancellationReason =
  | "DRIVER_ILLNESS"
  | "DRIVER_ACCIDENT"
  | "VEHICLE_INCIDENT";

export const driverEmergencyCancellationReasonOptions: Array<{
  value: DriverEmergencyCancellationReason;
  label: string;
  description: string;
}> = [
  {
    value: "DRIVER_ILLNESS",
    label: "Motorista doente",
    description: "Use quando o motorista passou mal ou ficou clinicamente impossibilitado de dirigir."
  },
  {
    value: "DRIVER_ACCIDENT",
    label: "Acidente com motorista",
    description: "Use quando houve acidente ou lesao que impede o atendimento da corrida."
  },
  {
    value: "VEHICLE_INCIDENT",
    label: "Sinistro ou avaria grave",
    description: "Use quando o veiculo ficou indisponivel por sinistro, colisao ou falha grave."
  }
];

export type Ride = {
  id: string;
  customerName: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerPhone?: string;
  assignedDriverId?: string;
  driverStage?: "SCHEDULED" | "EN_ROUTE_PICKUP" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";
  pickupCode?: string;
  pickupCodeVerifiedAt?: string;
  navigationStartedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  quote?: {
    amount: number;
    currency: string;
    routeDistanceKm: number;
    routeDurationMinutes: number;
    quotedAt: string;
  };
  decisionWindow?: {
    startedAt: string;
    expiresAt: string;
    expiresInSeconds: number;
    totalSeconds: number;
  };
  customerProfile?: {
    score: number;
    tier: "NEW" | "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
    tierLabel: string;
    tierEmoji: string;
    completedRides: number;
    totalRides: number;
  };
  executionAlert?: {
    code: "LATE_PICKUP" | "WAITING_PASSENGER" | "OVERDUE_COMPLETION";
    label: string;
    description: string;
    tone: "warning" | "critical";
  };
};

export type RideMapPoint = {
  lat: number;
  lng: number;
  label: string;
};

export type RideMapPathPoint = {
  lat: number;
  lng: number;
};

export type RideMapPreview = {
  available: boolean;
  provider: "google_maps" | "fallback";
  origin?: RideMapPoint;
  destination?: RideMapPoint;
  path?: RideMapPathPoint[];
  error?: string;
};

export type RideEvent = {
  id: string;
  rideId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

function parseRequestErrorMessage(text: string, status: number): string {
  const fallback = `Falha HTTP ${status}`;
  const normalized = text.trim();

  if (!normalized) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(normalized) as { message?: unknown };
    const message = parsed?.message;

    if (Array.isArray(message)) {
      return message.map((item) => String(item)).join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    return normalized;
  }

  return fallback;
}

function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const linkingHost = Constants.linkingUri?.replace(/^[a-z]+:\/\//i, "");
  const host = (hostUri ?? linkingHost)?.split(":")[0];

  if (host) {
    return `http://${host}:3000/api`;
  }

  return "http://localhost:3000/api";
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const storedSession = await loadStoredDriverSession();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("ngrok-skip-browser-warning")) {
    headers.set("ngrok-skip-browser-warning", "1");
  }
  if (storedSession?.accessToken && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${storedSession.accessToken}`);
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseRequestErrorMessage(text, response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpfInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11)
  ].filter(Boolean);

  if (parts.length <= 1) {
    return digits;
  }

  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}`;
  }

  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
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
