export type RideStatus =
  | "NEW"
  | "QUOTED"
  | "PREBOOKED"
  | "ACCEPTED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type DriverDecision = "ACCEPT" | "REJECT";
export type DriverEmergencyCancellationReason =
  | "DRIVER_ILLNESS"
  | "DRIVER_ACCIDENT"
  | "VEHICLE_INCIDENT";
export const PREBOOK_DECISION_WINDOW_MINUTES = 30;
export type DriverRideStage = "SCHEDULED" | "EN_ROUTE_PICKUP" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";
export type RideScheduleFitStatus = "OK" | "TIGHT" | "FLEXIBLE" | "CONFLICT";
export type RideExecutionAlertCode = "LATE_PICKUP" | "WAITING_PASSENGER" | "OVERDUE_COMPLETION";
export type RideExecutionAlertTone = "warning" | "critical";

export type CustomerTier = "NEW" | "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export interface RideQuote {
  amount: number;
  currency: string;
  routeDistanceKm: number;
  routeDurationMinutes: number;
  quotedAt: string;
}

export interface RideDecisionWindow {
  startedAt: string;
  expiresAt: string;
  expiresInSeconds: number;
  totalSeconds: number;
}

export interface RideMapPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface RideMapPathPoint {
  lat: number;
  lng: number;
}

export interface RideMapPreview {
  available: boolean;
  provider: "google_maps" | "fallback";
  origin?: RideMapPoint;
  destination?: RideMapPoint;
  path?: RideMapPathPoint[];
  error?: string;
}

export interface RideCustomerProfile {
  score: number;
  tier: CustomerTier;
  tierLabel: string;
  tierEmoji: string;
  completedRides: number;
  totalRides: number;
}

export interface RideScheduleFit {
  status: RideScheduleFitStatus;
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
}

export interface RideExecutionAlert {
  code: RideExecutionAlertCode;
  label: string;
  description: string;
  tone: RideExecutionAlertTone;
}

export interface Ride {
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
  status: RideStatus;
  createdAt: string;
  updatedAt: string;
  customerPhone?: string;
  assignedDriverId?: string;
  driverStage?: DriverRideStage;
  pickupCode?: string;
  pickupCodeVerifiedAt?: string;
  navigationStartedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  quote?: RideQuote;
  decisionWindow?: RideDecisionWindow;
  customerProfile?: RideCustomerProfile;
  scheduleFit?: RideScheduleFit;
  executionAlert?: RideExecutionAlert;
}

export interface RideEvent {
  id: string;
  rideId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}
