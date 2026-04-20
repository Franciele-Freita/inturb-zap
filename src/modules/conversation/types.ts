import { CustomerFavoriteAddressSummary, CustomerSummary, TripTypeSummary } from "../admin/types";

export type ConversationRole = "bot" | "user" | "system";

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  text: string;
}

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

export interface ConversationDraft {
  customerName: string;
  preferredName: string;
  from: string;
  tripTypeSlug: string;
  tripTypeName: string;
  baggageCount: number | null;
  baggageSize: string;
  petType: string;
  petSize: string;
  customerHasReducedMobility: boolean | null;
  passengerCount: number;
  companionNeedsSpecialAttention: boolean | null;
  companionSpecialAttentionDetails: string;
  hasIntermediateStops: boolean | null;
  intermediateStopsSummary: string;
  origin: string;
  destination: string;
  scheduledAt: string;
}

export interface ConversationState {
  draft: ConversationDraft;
  matchedCustomer: CustomerSummary | null;
  favoriteAddresses: CustomerFavoriteAddressSummary[];
  availableTripTypes: TripTypeSummary[];
  pendingFavoriteTarget: "origin" | "destination" | null;
  pendingFavoriteAddress: string;
}

export interface ConversationSessionView {
  id: string;
  currentStep: ConversationStep;
  latestRideId: string;
  customerPhone?: string;
  messages: ConversationMessage[];
  matchedCustomer: CustomerSummary | null;
  favoriteAddresses: CustomerFavoriteAddressSummary[];
  availableTripTypes: TripTypeSummary[];
  composerPlaceholder: string;
}
