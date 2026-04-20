import { loadStoredDriverSession } from "./session";

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

export type DriverProfile = {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  hasPassword: boolean;
  driverType: DriverType;
  fleetAssignmentMode?: FleetAssignmentMode;
  defaultFleetVehicle?: DriverFleetDefaultVehicleSummary;
  vehicle?: string;
  vehicles: DriverVehicle[];
  currentFleetVehicle?: DriverFleetVehicleSummary;
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
  origin: string;
  destination: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerPhone?: string;
  assignedDriverId?: string;
  driverStage?: "SCHEDULED" | "EN_ROUTE_PICKUP" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";
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
    totalRides: number;
  };
  scheduleFit?: {
    status: "OK" | "TIGHT" | "FLEXIBLE" | "CONFLICT";
    label: string;
    windowMinutes: number;
    transferMinutes: number;
    bufferMinutes: number;
    marginMinutes: number;
    referenceRideId?: string;
    alternativeOptions?: Array<{
      scheduledAt: string;
      deltaMinutes: number;
      label: string;
    }>;
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

export type RideEvent = {
  id: string;
  rideId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type DriverLoginResult = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  driver: DriverProfile;
};

function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }

  return "http://localhost:3000/api";
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const storedSession = loadStoredDriverSession();
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
