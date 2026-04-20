import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Location from "expo-location";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { RideRouteMap } from "../../components/ride-route-map";
import {
  driverEmergencyCancellationReasonOptions,
  formatCurrency,
  request,
  type DriverEmergencyCancellationReason,
  type DriverLoginResult,
  type Ride,
  type RideEvent,
  type RideMapPreview
} from "../../lib/api";
import { getCachedRideMapPreview, setCachedRideMapPreview } from "../../lib/ride-map-preview-cache";
import { loadStoredDriverSession } from "../../lib/session";
import { colors } from "../../theme/tokens";

function MessageIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 6.5C5 5.7 5.7 5 6.5 5H17.5C18.3 5 19 5.7 19 6.5V14.5C19 15.3 18.3 16 17.5 16H9L5 19V6.5Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhoneIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.8 5H5.8C5.4 5 5 5.3 5 5.8C5 13.1 10.9 19 18.2 19C18.7 19 19 18.6 19 18.2V16.2C19 15.8 18.7 15.5 18.3 15.4L14.9 14.6C14.5 14.5 14.1 14.7 13.9 15L12.7 16.5C10.6 15.5 8.9 13.8 7.9 11.7L9.4 10.5C9.7 10.3 9.9 9.9 9.8 9.5L9 6.1C8.9 5.7 8.4 5 7.8 5Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SummaryMoneyIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7.5C4 6.7 4.7 6 5.5 6H18.5C19.3 6 20 6.7 20 7.5V16.5C20 17.3 19.3 18 18.5 18H5.5C4.7 18 4 17.3 4 16.5V7.5Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M12 9.5V14.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M14 11.5C14 10.4 13.1 9.5 12 9.5C10.9 9.5 10 10.4 10 11.5C10 12.6 10.9 13.5 12 13.5C13.1 13.5 14 14.4 14 15.5C14 16.6 13.1 17.5 12 17.5C10.9 17.5 10 16.6 10 15.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SummaryDistanceIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M7 17L17 7" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 10V17H14" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 14V7H10" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SummaryTimeIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6V12L15.5 14" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 12C20 16.4 16.4 20 12 20C7.6 20 4 16.4 4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12Z" stroke={stroke} strokeWidth={2} />
    </Svg>
  );
}

function SummaryWindowIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4V7" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 4V7" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M5 8.5C5 7.7 5.7 7 6.5 7H17.5C18.3 7 19 7.7 19 8.5V17.5C19 18.3 18.3 19 17.5 19H6.5C5.7 19 5 18.3 5 17.5V8.5Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M5 10.5H19" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ReportPinIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C15.5 17.6 18 14.7 18 11.5C18 8.5 15.3 6 12 6C8.7 6 6 8.5 6 11.5C6 14.7 8.5 17.6 12 21Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M12 13.2C13 13.2 13.8 12.4 13.8 11.4C13.8 10.4 13 9.6 12 9.6C11 9.6 10.2 10.4 10.2 11.4C10.2 12.4 11 13.2 12 13.2Z" stroke={stroke} strokeWidth={2} />
    </Svg>
  );
}

function ReportUserIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 12C14.2 12 16 10.2 16 8C16 5.8 14.2 4 12 4C9.8 4 8 5.8 8 8C8 10.2 9.8 12 12 12Z" stroke={stroke} strokeWidth={2} />
      <Path d="M5.5 19C6.4 16.7 8.7 15 12 15C15.3 15 17.6 16.7 18.5 19" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18.5 5.5L5.5 18.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ReportSupportIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19C8.1 19 5 15.9 5 12C5 8.1 8.1 5 12 5C15.9 5 19 8.1 19 12C19 15.9 15.9 19 12 19Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M9.5 10.2C9.5 8.8 10.6 7.8 12 7.8C13.4 7.8 14.5 8.8 14.5 10.1C14.5 11.8 12.7 12.2 12.2 13.1" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16.2H12.01" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function ReportAlertIcon({ stroke = "#D84F3F" }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M12 8V12" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16H12.01" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRightSmallIcon({ stroke = "#8B83A6" }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6L15 12L9 18" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapRouteIcon({ stroke = colors.white }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M7 18C8.1 18 9 17.1 9 16C9 14.9 8.1 14 7 14C5.9 14 5 14.9 5 16C5 17.1 5.9 18 7 18Z" stroke={stroke} strokeWidth={2} />
      <Path d="M17 10C18.1 10 19 9.1 19 8C19 6.9 18.1 6 17 6C15.9 6 15 6.9 15 8C15 9.1 15.9 10 17 10Z" stroke={stroke} strokeWidth={2} />
      <Path d="M8.8 14.9L15.2 9.1" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ExpandMapIcon({ stroke = colors.white }: { stroke?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M14 5H19V10" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 5L13 11" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 19H5V14" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 19L11 13" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function getStageLabel(ride: Ride): string {
  if (ride.status === "PREBOOKED") {
    return "Aguardando aceite";
  }

  if (ride.driverStage === "EN_ROUTE_PICKUP") {
    return "A caminho";
  }

  if (ride.driverStage === "ARRIVED") {
    return "Cheguei";
  }

  if (ride.driverStage === "IN_PROGRESS") {
    return "Em andamento";
  }

  if (ride.driverStage === "COMPLETED") {
    return "Concluida";
  }

  return ride.status === "ACCEPTED" ? "Agendada" : ride.status;
}

function getNextAction(ride: Ride): { label: string; endpoint: string } | null {
  if (ride.status === "PREBOOKED") {
    return null;
  }

  if (ride.driverStage === "IN_PROGRESS") {
    return { label: "Finalizar corrida", endpoint: "complete" };
  }

  if (ride.driverStage === "ARRIVED") {
    return { label: "Iniciar corrida", endpoint: "start" };
  }

  if (ride.driverStage === "EN_ROUTE_PICKUP") {
    return { label: "Marcar chegada", endpoint: "arrived" };
  }

  if (!ride.driverStage || ride.driverStage === "SCHEDULED") {
    return { label: "Ir para embarque", endpoint: "go-to-pickup" };
  }

  return null;
}

function getStageTone(ride: Ride): "default" | "warning" | "success" {
  if (ride.status === "PREBOOKED" || ride.driverStage === "ARRIVED") {
    return "warning";
  }

  if (ride.driverStage === "IN_PROGRESS" || ride.driverStage === "COMPLETED") {
    return "success";
  }

  return "default";
}

function formatDecisionCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getDecisionWindowRemainingSeconds(ride: Ride, nowMs: number): number {
  if (!ride.decisionWindow?.expiresAt) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(ride.decisionWindow.expiresAt).getTime() - nowMs) / 1000));
}

function formatTimeUntilLabel(value?: string, nowMs = Date.now()): string {
  if (!value) {
    return "-";
  }

  const diffMinutes = Math.round((new Date(value).getTime() - nowMs) / 60000);

  if (diffMinutes < 0) {
    return "Em atraso";
  }

  if (diffMinutes === 0) {
    return "Agora";
  }

  if (diffMinutes < 60) {
    return `Faltam ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `Faltam ${hours}h ${minutes}min` : `Faltam ${hours}h`;
}

function formatClockTime(value?: string): string {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatFullDate(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date(value));
}

function formatCompactAddress(value?: string): string {
  if (!value) {
    return "-";
  }

  const trimmed = value.replace(/\s*,\s*Brasil$/i, "").trim();
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return trimmed;
  }

  const street = parts[0] ?? "";
  const district = parts.length >= 2 ? parts[1] : "";
  return district ? `${street} • ${district}` : street;
}

function digitsOnly(value?: string): string {
  return value?.replace(/\D/g, "") ?? "";
}

function getRideTimelineEventLabel(event: RideEvent): string | null {
  if (event.eventType === "DRIVER_DECISION") {
    return event.payload?.decision === "ACCEPT" ? "Corrida aceita" : null;
  }

  if (event.eventType === "DRIVER_EN_ROUTE_PICKUP") {
    return "Motorista a caminho do embarque";
  }

  if (event.eventType === "DRIVER_ARRIVED_PICKUP") {
    return "Motorista chegou ao embarque";
  }

  if (event.eventType === "RIDE_STARTED") {
    return "Corrida iniciada";
  }

  if (event.eventType === "RIDE_COMPLETED") {
    return "Corrida finalizada";
  }

  if (event.eventType === "RIDE_NO_SHOW") {
    return "Passageiro nao embarcou";
  }

  if (event.eventType === "DRIVER_EMERGENCY_CANCELLATION") {
    return "Cancelamento emergencial";
  }

  return null;
}

function formatTimelineDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatTimelineTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function canDriverEmergencyCancelRide(ride: Ride): boolean {
  return (
    ride.status === "ACCEPTED" &&
    (!ride.driverStage || ["SCHEDULED", "EN_ROUTE_PICKUP", "ARRIVED"].includes(ride.driverStage))
  );
}

function canMarkPassengerNoShow(ride: Ride): boolean {
  return ride.status === "ACCEPTED" && ride.driverStage === "ARRIVED" && ride.executionAlert?.code === "WAITING_PASSENGER";
}

function computeDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

type NavigationProvider = "google_maps" | "waze" | "other";
type PendingNavigationAction = {
  label: string;
  targetLabel: string;
  destinationAddress: string;
  endpoint?: string;
  requiresLocationPermission?: boolean;
};

export default function RideDetailScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [session, setSession] = useState<DriverLoginResult | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [mapPreview, setMapPreview] = useState<RideMapPreview | null>(null);
  const [rideEvents, setRideEvents] = useState<RideEvent[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [isEmergencyCancelModalOpen, setIsEmergencyCancelModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<PendingNavigationAction | null>(null);
  const [isPickupCodeModalOpen, setIsPickupCodeModalOpen] = useState(false);
  const [pickupCodeInput, setPickupCodeInput] = useState("");
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isArrivalPromptOpen, setIsArrivalPromptOpen] = useState(false);
  const [arrivalPromptSnoozeUntilMs, setArrivalPromptSnoozeUntilMs] = useState(0);
  const [selectedEmergencyCancelReason, setSelectedEmergencyCancelReason] =
    useState<DriverEmergencyCancellationReason>("DRIVER_ILLNESS");
  const [statusMessage, setStatusMessage] = useState("");
  const [mapStatusMessage, setMapStatusMessage] = useState("");
  const canTrackPickupArrival =
    ride?.driverStage === "EN_ROUTE_PICKUP" && !!mapPreview?.origin && hasLocationPermission;

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;

    void Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (isActive) {
          setHasLocationPermission(permission.granted);
        }
      })
      .catch(() => {
        if (isActive) {
          setHasLocationPermission(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadRide() {
      try {
        const storedSession = await loadStoredDriverSession();
        if (!storedSession) {
          router.replace("/");
          return;
        }

        if (!isActive) {
          return;
        }

        setSession(storedSession);

        let resolvedRide: Ride | null = null;

        try {
          resolvedRide = await request<Ride>(
            `/drivers/${storedSession.driver.id}/available-rides/${encodeURIComponent(String(rideId))}?includeScheduleFit=false`
          );
        } catch {
          const myRides = await request<Ride[]>(`/drivers/${storedSession.driver.id}/my-rides?includeScheduleFit=false`);
          resolvedRide = myRides.find((entry) => entry.id === rideId) ?? null;
        }

        if (!isActive) {
          return;
        }

        setRide(resolvedRide);
        setStatusMessage(resolvedRide ? "" : "Corrida nao encontrada para este motorista.");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar a corrida.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRide();

    return () => {
      isActive = false;
    };
  }, [rideId]);

  useEffect(() => {
    let isActive = true;

    async function loadMapPreview() {
      if (!session?.driver.id || !ride?.id) {
        return;
      }

      const cachedPreview = getCachedRideMapPreview(session.driver.id, ride.id);
      if (cachedPreview) {
        setMapPreview(cachedPreview);
        setMapStatusMessage(cachedPreview.available ? "" : cachedPreview.error ?? "Mapa indisponivel no momento.");
        setIsMapLoading(false);
        return;
      }

      setIsMapLoading(true);

      try {
        const preview = await request<RideMapPreview>(
          `/drivers/${session.driver.id}/rides/${ride.id}/map-preview`
        );

        if (!isActive) {
          return;
        }

        setCachedRideMapPreview(session.driver.id, ride.id, preview);
        setMapPreview(preview);
        setMapStatusMessage(preview.available ? "" : preview.error ?? "Mapa indisponivel no momento.");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMapPreview(null);
        setMapStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o mapa da corrida.");
      } finally {
        if (isActive) {
          setIsMapLoading(false);
        }
      }
    }

    void loadMapPreview();

    return () => {
      isActive = false;
    };
  }, [session?.driver.id, ride?.id]);

  useEffect(() => {
    let isActive = true;

    async function loadRideEvents() {
      if (!session?.driver.id || !ride?.id) {
        return;
      }

      setIsTimelineLoading(true);

      try {
        const events = await request<RideEvent[]>(`/drivers/${session.driver.id}/rides/${ride.id}/events`);
        if (!isActive) {
          return;
        }

        setRideEvents(events);
      } catch {
        if (isActive) {
          setRideEvents([]);
        }
      } finally {
        if (isActive) {
          setIsTimelineLoading(false);
        }
      }
    }

    void loadRideEvents();

    return () => {
      isActive = false;
    };
  }, [session?.driver.id, ride?.id]);

  useEffect(() => {
    if (ride?.driverStage !== "EN_ROUTE_PICKUP") {
      setIsArrivalPromptOpen(false);
      setArrivalPromptSnoozeUntilMs(0);
    }
  }, [ride?.driverStage]);

  useEffect(() => {
    if (!canTrackPickupArrival) {
      return;
    }

    let isActive = true;
    let subscription: Location.LocationSubscription | null = null;

    function evaluateArrival(latitude: number, longitude: number) {
      if (!isActive || !mapPreview?.origin || Date.now() < arrivalPromptSnoozeUntilMs || isArrivalPromptOpen) {
        return;
      }

      const distanceMeters = computeDistanceMeters(
        latitude,
        longitude,
        mapPreview.origin.lat,
        mapPreview.origin.lng
      );

      if (distanceMeters <= 100) {
        setIsArrivalPromptOpen(true);
      }
    }

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 30,
        timeInterval: 15_000
      },
      (position) => evaluateArrival(position.coords.latitude, position.coords.longitude)
    )
      .then((watcher) => {
        subscription = watcher;
      })
      .catch(() => {
        setStatusMessage("Nao foi possivel acompanhar sua localizacao para detectar a chegada.");
      });

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [arrivalPromptSnoozeUntilMs, canTrackPickupArrival, isArrivalPromptOpen, mapPreview?.origin]);

  useEffect(() => {
    if (!canTrackPickupArrival) {
      return;
    }

    let currentAppState = AppState.currentState;
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      const isReturningToForeground =
        (currentAppState === "background" || currentAppState === "inactive") && nextAppState === "active";

      currentAppState = nextAppState;

      if (!isReturningToForeground || !mapPreview?.origin || Date.now() < arrivalPromptSnoozeUntilMs || isArrivalPromptOpen) {
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        const distanceMeters = computeDistanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          mapPreview.origin.lat,
          mapPreview.origin.lng
        );

        if (distanceMeters <= 100) {
          setIsArrivalPromptOpen(true);
        }
      } catch {
        // Ignore foreground location check failures and keep the flow manual.
      }
    });

    return () => subscription.remove();
  }, [arrivalPromptSnoozeUntilMs, canTrackPickupArrival, isArrivalPromptOpen, mapPreview?.origin]);

  const nextAction = useMemo(() => (ride ? getNextAction(ride) : null), [ride]);
  const stageTone = useMemo(() => (ride ? getStageTone(ride) : "default"), [ride]);
  const decisionRemainingSeconds = useMemo(
    () => (ride ? getDecisionWindowRemainingSeconds(ride, nowMs) : 0),
    [nowMs, ride]
  );
  const decisionProgress = useMemo(() => {
    if (!ride?.decisionWindow?.totalSeconds) {
      return 0;
    }

    return Math.max(0, Math.min(1, decisionRemainingSeconds / ride.decisionWindow.totalSeconds));
  }, [decisionRemainingSeconds, ride]);
  const customerTierLabel = ride?.customerProfile?.tierLabel ?? "Novo";
  const customerScore = ride?.customerProfile?.score ?? "-";
  const customerCompletedRides = ride?.customerProfile?.completedRides ?? 0;
  const timelineEvents = useMemo(
    () =>
      [...rideEvents]
        .map((event) => ({
          ...event,
          label: getRideTimelineEventLabel(event)
        }))
        .filter((event): event is RideEvent & { label: string } => Boolean(event.label))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [rideEvents]
  );
  const isPrebooked = ride?.status === "PREBOOKED";
  const canShowClientContactActions =
    !isPrebooked &&
    !!ride &&
    ["EN_ROUTE_PICKUP", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(ride.driverStage ?? "");
  const canEmergencyCancelCurrentRide = ride ? canDriverEmergencyCancelRide(ride) : false;
  const canRegisterPassengerNoShow = ride ? canMarkPassengerNoShow(ride) : false;

  function openExternalMap(): void {
    if (!ride) {
      return;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
      `&origin=${encodeURIComponent(ride.origin)}` +
      `&destination=${encodeURIComponent(ride.destination)}`;

    Linking.openURL(url).catch(() => {
      setMapStatusMessage("Nao foi possivel abrir o mapa externo.");
    });
  }

  async function ensureForegroundLocationPermission(): Promise<boolean> {
    try {
      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.granted) {
        setHasLocationPermission(true);
        return true;
      }

      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(requestedPermission.granted);

      if (!requestedPermission.granted) {
        setStatusMessage("Permita a localizacao para detectar quando voce chegar ao embarque.");
      }

      return requestedPermission.granted;
    } catch {
      setHasLocationPermission(false);
      setStatusMessage("Nao foi possivel solicitar permissao de localizacao.");
      return false;
    }
  }

  async function openNavigationProvider(provider: NavigationProvider, destinationAddress: string): Promise<void> {
    const encodedDestination = encodeURIComponent(destinationAddress);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodedDestination}`;
    const wazeUrl = `https://waze.com/ul?q=${encodedDestination}&navigate=yes`;
    const otherUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`
        : `geo:0,0?q=${encodedDestination}`;

    const targetUrl = provider === "google_maps" ? googleMapsUrl : provider === "waze" ? wazeUrl : otherUrl;

    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      await Linking.openURL(canOpen ? targetUrl : googleMapsUrl);
    } catch {
      setStatusMessage("Nao foi possivel abrir o app de navegacao selecionado.");
    }
  }

  function handleMessage(): void {
    const phone = digitsOnly(ride?.customerPhone);
    if (!phone) {
      setStatusMessage("Telefone do cliente indisponivel para mensagem.");
      return;
    }

    Linking.openURL(`sms:${phone}`).catch(() => {
      setStatusMessage("Nao foi possivel abrir o app de mensagem.");
    });
  }

  function handleCall(): void {
    const phone = digitsOnly(ride?.customerPhone);
    if (!phone) {
      setStatusMessage("Telefone do cliente indisponivel para chamada.");
      return;
    }

    Linking.openURL(`tel:${phone}`).catch(() => {
      setStatusMessage("Nao foi possivel iniciar a chamada.");
    });
  }

  function handleQuickReport(label: string): void {
    setStatusMessage(`Reporte registrado: ${label}.`);
  }

  async function handleDecision(decision: "ACCEPT" | "REJECT") {
    if (!session?.driver.id || !ride || isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const updatedRide = await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });

      setRide(updatedRide);
      setStatusMessage(
        decision === "ACCEPT" ? "Corrida aceita com sucesso." : "Corrida recusada com sucesso."
      );

      if (decision === "REJECT") {
        router.replace("/home");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao responder a corrida.");
    } finally {
      setIsBusy(false);
      setPendingDecision(null);
    }
  }

  async function handleNextAction() {
    if (!session?.driver.id || !ride || !nextAction || isBusy) {
      return;
    }

    if (nextAction.endpoint === "go-to-pickup") {
      setPendingNavigationAction({
        label: nextAction.label,
        endpoint: nextAction.endpoint,
        destinationAddress: ride.origin,
        targetLabel: "o embarque",
        requiresLocationPermission: true
      });
      return;
    }

    if (nextAction.endpoint === "start") {
      setPickupCodeInput("");
      setIsPickupCodeModalOpen(true);
      return;
    }

    setIsBusy(true);

    try {
      const updatedRide = await request<Ride>(
        `/drivers/${session.driver.id}/rides/${ride.id}/${nextAction.endpoint}`,
        { method: "POST" }
      );

      setRide(updatedRide);
      setStatusMessage(`${nextAction.label} executado com sucesso.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar a corrida.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleNavigationChoice(provider: NavigationProvider) {
    if (!session?.driver.id || !ride || !pendingNavigationAction || isBusy) {
      return;
    }

    setIsBusy(true);

    try {
      const navigationAction = pendingNavigationAction;
      let updatedRide = ride;

      if (navigationAction.endpoint) {
        updatedRide = await request<Ride>(
          `/drivers/${session.driver.id}/rides/${ride.id}/${navigationAction.endpoint}`,
          { method: "POST" }
        );

        setRide(updatedRide);
        setStatusMessage(`${navigationAction.label} executado com sucesso.`);

        if (navigationAction.requiresLocationPermission) {
          void ensureForegroundLocationPermission();
        }
      }

      setPendingNavigationAction(null);
      await openNavigationProvider(provider, navigationAction.destinationAddress);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar a corrida.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePickupCodeStart() {
    if (!session?.driver.id || !ride || isBusy) {
      return;
    }

    const normalizedPickupCode = digitsOnly(pickupCodeInput).slice(0, 4);
    if (normalizedPickupCode.length !== 4) {
      setStatusMessage("Informe o codigo de embarque com 4 digitos.");
      return;
    }

    setIsBusy(true);

    try {
      const updatedRide = await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/start`, {
        method: "POST",
        body: JSON.stringify({ pickupCode: normalizedPickupCode })
      });

      setRide(updatedRide);
      setPickupCodeInput("");
      setIsPickupCodeModalOpen(false);
      setPendingNavigationAction({
        label: "Navegacao iniciada",
        targetLabel: "o destino",
        destinationAddress: updatedRide.destination
      });
      setStatusMessage("Codigo validado. Corrida iniciada com sucesso.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao validar o codigo de embarque.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleArrivalConfirmation() {
    if (!session?.driver.id || !ride || isBusy || ride.driverStage !== "EN_ROUTE_PICKUP") {
      return;
    }

    setIsBusy(true);

    try {
      const updatedRide = await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/arrived`, {
        method: "POST"
      });

      setRide(updatedRide);
      setIsArrivalPromptOpen(false);
      setArrivalPromptSnoozeUntilMs(0);
      setStatusMessage("Chegada ao embarque confirmada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao marcar chegada.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEmergencyCancellation() {
    if (!session?.driver.id || !ride || isBusy || !canEmergencyCancelCurrentRide) {
      return;
    }

    setIsBusy(true);

    try {
      await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/emergency-cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: selectedEmergencyCancelReason })
      });

      setIsEmergencyCancelModalOpen(false);
      router.replace("/home");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar o cancelamento emergencial.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePassengerNoShow() {
    if (!session?.driver.id || !ride || isBusy || !canRegisterPassengerNoShow) {
      return;
    }

    setIsBusy(true);

    try {
      await request<Ride>(`/drivers/${session.driver.id}/rides/${ride.id}/no-show`, {
        method: "POST"
      });

      setIsNoShowModalOpen(false);
      router.replace("/home");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar passageiro ausente.");
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right"]}>
        <ActivityIndicator color={colors.highlight} />
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right"]}>
        <Text style={styles.messageText}>{statusMessage || "Corrida nao encontrada."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroCountdownCard}>
            <Text style={styles.heroCountdownLabel}>Horario da corrida</Text>
            <Text style={styles.heroCountdownValue}>{formatTimeUntilLabel(ride.scheduledAt, nowMs)}</Text>
          </View>

          <Text style={styles.sectionTitle}>{isPrebooked ? "Nova solicitacao" : "Agendamento"}</Text>

          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{formatClockTime(ride.scheduledAt)}</Text>
              <Text style={styles.heroDateLabel}>{formatFullDate(ride.scheduledAt)}</Text>
            </View>

            <View style={styles.heroPriceCard}>
              <Text style={styles.heroPriceValue}>{formatCurrency(ride.quote?.amount)}</Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            {getStageLabel(ride) !== "Agendada" ? (
              <View style={styles.badgeWrap}>
                <View
                  style={[
                    styles.badge,
                    stageTone === "warning" ? styles.badgeWarning : null,
                    stageTone === "success" ? styles.badgeSuccess : null
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeLabel,
                      stageTone === "warning" ? styles.badgeLabelWarning : null,
                      stageTone === "success" ? styles.badgeLabelSuccess : null
                    ]}
                  >
                    {getStageLabel(ride)}
                  </Text>
                </View>
              </View>
            ) : null}

            {ride.executionAlert ? (
              <View
                style={[
                  styles.executionAlertCard,
                  ride.executionAlert.tone === "critical" ? styles.executionAlertCardCritical : null
                ]}
              >
                <Text
                  style={[
                    styles.executionAlertTitle,
                    ride.executionAlert.tone === "critical" ? styles.executionAlertTitleCritical : null
                  ]}
                >
                  {ride.executionAlert.label}
                </Text>
                <Text style={styles.executionAlertBody}>{ride.executionAlert.description}</Text>
              </View>
            ) : null}

            <View style={styles.heroCustomerInlineHidden}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarLabel}>{ride.customerName.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.heroCustomerCopy}>
                <Text style={styles.heroCustomerName}>{ride.customerName}</Text>
                {ride.customerProfile ? (
                  <Text style={styles.heroCustomerMeta}>
                    {ride.customerProfile.tierEmoji} {ride.customerProfile.tierLabel} • Score {ride.customerProfile.score} •{" "}
                    {ride.customerProfile.completedRides} corridas
                  </Text>
                ) : null}
              </View>
            </View>

            {ride.status === "PREBOOKED" && ride.decisionWindow?.expiresAt ? (
              <View style={styles.deadlineCard}>
                <View style={styles.deadlineRow}>
                  <Text style={styles.deadlineLabel}>Aceitar ate {new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  }).format(new Date(ride.decisionWindow.expiresAt))}</Text>
                  <Text style={styles.deadlineValue}>{formatDecisionCountdown(decisionRemainingSeconds)}</Text>
                </View>
                <View style={styles.deadlineTrack}>
                  <View style={[styles.deadlineFill, { width: `${decisionProgress * 100}%` as const }]} />
                </View>
              </View>
            ) : null}

            {isPrebooked ? (
              <View style={styles.prebookActionsRow}>
                <Pressable
                  style={[styles.primaryButton, styles.prebookActionButton, isBusy ? styles.buttonDisabled : null]}
                  onPress={() => setPendingDecision("ACCEPT")}
                  disabled={isBusy}
                >
                  {isBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Aceitar</Text>}
                </Pressable>

                <Pressable
                  style={[styles.secondaryButton, styles.prebookActionButton, isBusy ? styles.buttonDisabled : null]}
                  onPress={() => setPendingDecision("REJECT")}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonLabel}>Recusar</Text>
                </Pressable>
              </View>
            ) : nextAction ? (
              <Pressable
                style={[styles.primaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleNextAction()}
                disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>{nextAction.label}</Text>}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.heroCustomerRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarLabel}>{ride.customerName.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.heroCustomerCopy}>
              <Text style={styles.heroCustomerName}>{ride.customerName}</Text>
              <View style={styles.customerMetricsRow}>
                <Text style={styles.customerMetricText}>{customerTierLabel}</Text>
                <Text style={styles.customerMetricDot}>•</Text>
                <Text style={styles.customerMetricText}>Score {customerScore}</Text>
                <Text style={styles.customerMetricDot}>•</Text>
                <Text style={styles.customerMetricText}>{customerCompletedRides} corridas finalizadas</Text>
              </View>
              {ride.customerProfile ? (
                <>
                <View style={styles.heroCustomerMetaRow}>
                  <Text style={styles.heroCustomerMeta}>
                    {ride.customerProfile.tierEmoji} {ride.customerProfile.tierLabel}
                  </Text>
                  <Text style={styles.heroCustomerMetaDot}>•</Text>
                  <Text style={styles.heroCustomerMeta}>Score {ride.customerProfile.score}</Text>
                  <Text style={styles.heroCustomerMetaDot}>•</Text>
                  <Text style={styles.heroCustomerMeta}>{ride.customerProfile.completedRides} corridas finalizadas</Text>
                </View>
                <Text style={styles.heroCustomerMetaHidden}>
                  {ride.customerProfile.tierEmoji} {ride.customerProfile.tierLabel} â€¢ Score {ride.customerProfile.score} â€¢{" "}
                  {ride.customerProfile.completedRides} corridas
                </Text>
                </>
              ) : null}
            </View>
          </View>

          {canShowClientContactActions ? (
            <View style={styles.clientActionRow}>
              <Pressable
                style={[styles.clientActionButton, !ride.customerPhone ? styles.buttonDisabled : null]}
                onPress={handleMessage}
                disabled={!ride.customerPhone}
              >
                <View style={styles.clientActionButtonInner}>
                  <MessageIcon />
                  <Text style={styles.clientActionButtonLabel}>Mensagem</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.clientActionButton, !ride.customerPhone ? styles.buttonDisabled : null]}
                onPress={handleCall}
                disabled={!ride.customerPhone}
              >
                <View style={styles.clientActionButtonInner}>
                  <PhoneIcon />
                  <Text style={styles.clientActionButtonLabel}>Chamada</Text>
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mapa da corrida</Text>
          </View>

          {isMapLoading ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={colors.highlight} />
            </View>
          ) : mapPreview?.available ? (
            <Pressable
              style={styles.mapPreviewCard}
              onPress={() => {
                if (session?.driver.id) {
                  setCachedRideMapPreview(session.driver.id, ride.id, mapPreview);
                }

                router.push(`/ride-map/${ride.id}` as never);
              }}
            >
              <View style={styles.mapFrame}>
                <RideRouteMap preview={mapPreview} />
                <View style={styles.mapTopOverlay}>
                  <View style={styles.mapExpandBadge}>
                    <ExpandMapIcon />
                  </View>
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.mapFallbackCard}>
              <Text style={styles.mapFallbackTitle}>Mapa indisponivel no app agora</Text>
              <Text style={styles.mapFallbackBody}>
                {mapStatusMessage || "Ainda nao foi possivel resolver as coordenadas dessa corrida."}
              </Text>
              <Pressable style={styles.mapFallbackButton} onPress={openExternalMap}>
                <Text style={styles.mapFallbackButtonLabel}>Abrir rota no Google Maps</Text>
              </Pressable>
            </View>
          )}

          {mapPreview?.available && mapPreview.provider === "fallback" ? (
            <View style={styles.mapFallbackHintCard}>
              <Text style={styles.mapFallbackHintTitle}>Rota aproximada</Text>
              <Text style={styles.mapFallbackHintBody}>
                A linha no mapa esta simplificada entre origem e destino. Use navegacao externa para ver o trajeto real.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linha do tempo da rota</Text>
          <View style={styles.routeTimeline}>
            <View style={styles.routeTimelineItem}>
              <View style={styles.routeTimelineRail}>
                <View style={styles.routeTimelineDotStart} />
                <View style={styles.routeTimelineLine} />
              </View>
              <View style={styles.routeTimelineCopy}>
                <Text style={styles.routeLabel}>Origem</Text>
                <Text style={styles.routeValue}>{formatCompactAddress(ride.origin)}</Text>
                <Text style={styles.routeFullValue}>{ride.origin}</Text>
              </View>
            </View>

            <View style={styles.routeTimelineItem}>
              <View style={styles.routeTimelineRail}>
                <View style={styles.routeTimelineDotEnd} />
              </View>
              <View style={styles.routeTimelineCopy}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeValue}>{formatCompactAddress(ride.destination)}</Text>
                <Text style={styles.routeFullValue}>{ride.destination}</Text>
              </View>
            </View>
          </View>

          <View style={styles.routeMetaPills}>
            <View style={styles.summaryChip}>
              <View style={styles.summaryChipIconWrap}>
                <SummaryDistanceIcon />
              </View>
              <View style={styles.summaryChipCopy}>
                <Text style={styles.summaryChipValue}>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</Text>
                <Text style={styles.summaryChipLabel}>Distancia</Text>
              </View>
            </View>
            <View style={styles.summaryChip}>
              <View style={styles.summaryChipIconWrap}>
                <SummaryTimeIcon />
              </View>
              <View style={styles.summaryChipCopy}>
                <Text style={styles.summaryChipValue}>{ride.quote?.routeDurationMinutes ?? 0} min</Text>
                <Text style={styles.summaryChipLabel}>Tempo</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo operacional</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardIconWrap}>
                <SummaryMoneyIcon />
              </View>
              <View style={styles.summaryCardCopy}>
                <Text style={styles.summaryValue}>{formatCurrency(ride.quote?.amount)}</Text>
                <Text style={styles.summaryLabel}>Valor</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardIconWrap}>
                <SummaryDistanceIcon />
              </View>
              <View style={styles.summaryCardCopy}>
                <Text style={styles.summaryValue}>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</Text>
                <Text style={styles.summaryLabel}>Distancia</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardIconWrap}>
                <SummaryTimeIcon />
              </View>
              <View style={styles.summaryCardCopy}>
                <Text style={styles.summaryValue}>{ride.quote?.routeDurationMinutes ?? 0} min</Text>
                <Text style={styles.summaryLabel}>Tempo</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardIconWrap}>
                <SummaryWindowIcon />
              </View>
              <View style={styles.summaryCardCopy}>
                <Text style={styles.summaryValue}>{formatTimeUntilLabel(ride.scheduledAt, nowMs).replace("Faltam ", "")}</Text>
                <Text style={styles.summaryLabel}>Janela</Text>
              </View>
            </View>
          </View>
        </View>

        {!isPrebooked || canEmergencyCancelCurrentRide ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporte</Text>
            <Text style={styles.reportBody}>Se algo estiver errado, registre rapido antes de seguir com a corrida.</Text>

            <View style={styles.reportActions}>
              {!isPrebooked ? (
                <Pressable style={styles.reportButton} onPress={() => handleQuickReport("Endereco incorreto")}>
                  <View style={styles.reportButtonInner}>
                    <View style={styles.reportButtonLead}>
                      <View style={styles.reportButtonIconWrap}>
                        <ReportPinIcon />
                      </View>
                      <View style={styles.reportButtonCopy}>
                        <Text style={styles.reportButtonLabel}>Endereco incorreto</Text>
                        <Text style={styles.reportButtonBody}>Atualize a operacao se o ponto de embarque ou destino estiver errado.</Text>
                      </View>
                    </View>
                    <ChevronRightSmallIcon />
                  </View>
                </Pressable>
              ) : null}
              {canRegisterPassengerNoShow ? (
                <Pressable
                  style={[styles.reportButton, styles.reportButtonDangerSoft, isBusy ? styles.buttonDisabled : null]}
                  onPress={() => setIsNoShowModalOpen(true)}
                  disabled={isBusy}
                >
                  <View style={styles.reportButtonInner}>
                    <View style={styles.reportButtonLead}>
                      <View style={[styles.reportButtonIconWrap, styles.reportButtonIconWrapDangerSoft]}>
                        <ReportUserIcon stroke="#B33A2B" />
                      </View>
                      <View style={styles.reportButtonCopy}>
                        <Text style={[styles.reportButtonLabel, styles.reportButtonLabelDanger]}>Passageiro nao embarcou</Text>
                        <Text style={styles.reportButtonBody}>
                          Encerre como no-show apos o tempo minimo de espera no embarque.
                        </Text>
                      </View>
                    </View>
                    <ChevronRightSmallIcon stroke={isBusy ? "#B7B0CD" : "#B33A2B"} />
                  </View>
                </Pressable>
              ) : null}
              {!isPrebooked ? (
                <Pressable style={styles.reportButton} onPress={() => handleQuickReport("Preciso de suporte")}>
                  <View style={styles.reportButtonInner}>
                    <View style={styles.reportButtonLead}>
                      <View style={styles.reportButtonIconWrap}>
                        <ReportSupportIcon />
                      </View>
                      <View style={styles.reportButtonCopy}>
                        <Text style={styles.reportButtonLabel}>Preciso de suporte</Text>
                        <Text style={styles.reportButtonBody}>Fale com a operacao para qualquer problema durante a corrida.</Text>
                      </View>
                    </View>
                    <ChevronRightSmallIcon />
                  </View>
                </Pressable>
              ) : null}
              {canEmergencyCancelCurrentRide ? (
                <Pressable
                  style={[styles.reportButton, styles.reportButtonDanger, isBusy ? styles.buttonDisabled : null]}
                  onPress={() => setIsEmergencyCancelModalOpen(true)}
                  disabled={isBusy}
                >
                  <View style={styles.reportButtonInner}>
                    <View style={styles.reportButtonLead}>
                      <View style={[styles.reportButtonIconWrap, styles.reportButtonIconWrapDanger]}>
                        <ReportAlertIcon />
                      </View>
                      <View style={styles.reportButtonCopy}>
                        <Text style={[styles.reportButtonLabel, styles.reportButtonLabelDanger]}>Cancelar corrida</Text>
                        <Text style={styles.reportButtonBody}>
                          Use apenas em caso de doenca, acidente ou sinistro grave.
                        </Text>
                      </View>
                    </View>
                    <ChevronRightSmallIcon stroke={isBusy ? "#B7B0CD" : "#D84F3F"} />
                  </View>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historico da corrida</Text>
          <Text style={styles.reportBody}>Trocas de status com data e horario registrados na operacao.</Text>

          {isTimelineLoading ? (
            <View style={styles.timelineLoading}>
              <ActivityIndicator color={colors.highlight} />
            </View>
          ) : timelineEvents.length > 0 ? (
            <View style={styles.timelineList}>
              {timelineEvents.map((event, index) => (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={styles.timelineDateColumn}>
                    <Text style={styles.timelineDateLabel}>{formatTimelineDate(event.createdAt)}</Text>
                    <Text style={styles.timelineTimeLabel}>{formatTimelineTime(event.createdAt)}</Text>
                  </View>

                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, index === 0 ? styles.timelineDotActive : null]} />
                    {index < timelineEvents.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>

                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineEventLabel, index === 0 ? styles.timelineEventLabelActive : null]}>
                      {event.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.timelineEmptyLabel}>Ainda nao ha movimentacoes registradas para esta corrida.</Text>
          )}
        </View>

        {statusMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        ) : null}

      </ScrollView>

      <Modal
        transparent
        visible={pendingNavigationAction !== null}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setPendingNavigationAction(null);
          }
        }}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setPendingNavigationAction(null);
              }
            }}
          />

          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalEyebrow}>Navegacao</Text>
            <Text style={styles.confirmModalTitle}>Qual mapa voce deseja abrir?</Text>
            <Text style={styles.confirmModalBody}>
              Escolha o app para navegar ate {pendingNavigationAction?.targetLabel}.
            </Text>

            <View style={styles.navigationProviderList}>
              <Pressable
                style={[styles.navigationProviderButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleNavigationChoice("google_maps")}
                disabled={isBusy}
              >
                <Text style={styles.navigationProviderTitle}>Google Maps</Text>
                <Text style={styles.navigationProviderBody}>Abrir navegacao com rota por voz e trajeto detalhado.</Text>
              </Pressable>
              <Pressable
                style={[styles.navigationProviderButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleNavigationChoice("waze")}
                disabled={isBusy}
              >
                <Text style={styles.navigationProviderTitle}>Waze</Text>
                <Text style={styles.navigationProviderBody}>Usar o Waze para navegar com foco em transito e incidentes.</Text>
              </Pressable>
              <Pressable
                style={[styles.navigationProviderButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleNavigationChoice("other")}
                disabled={isBusy}
              >
                <Text style={styles.navigationProviderTitle}>Outro app</Text>
                <Text style={styles.navigationProviderBody}>Abrir o app de mapa padrao disponivel neste aparelho.</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isPickupCodeModalOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setIsPickupCodeModalOpen(false);
            setPickupCodeInput("");
          }
        }}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setIsPickupCodeModalOpen(false);
                setPickupCodeInput("");
              }
            }}
          />

          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalEyebrow}>Embarque</Text>
            <Text style={styles.confirmModalTitle}>Confirme o codigo do cliente</Text>
            <Text style={styles.confirmModalBody}>
              Peça ao cliente o codigo de embarque com 4 digitos para liberar o inicio da corrida.
            </Text>

            <View style={styles.confirmModalInputGroup}>
              <Text style={styles.confirmModalInputLabel}>Codigo de embarque</Text>
              <TextInput
                value={pickupCodeInput}
                onChangeText={(value) => setPickupCodeInput(digitsOnly(value).slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                placeholder="0000"
                placeholderTextColor="#B5ACD4"
                style={styles.confirmModalInput}
                textAlign="center"
              />
              <Text style={styles.confirmModalInputHint}>O cliente informa esse codigo no momento do embarque.</Text>
            </View>

            <View style={styles.confirmModalActions}>
              <Pressable
                style={[styles.confirmModalSecondaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => {
                  setIsPickupCodeModalOpen(false);
                  setPickupCodeInput("");
                }}
                disabled={isBusy}
              >
                <Text style={styles.confirmModalSecondaryButtonLabel}>Voltar</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, styles.confirmModalPrimaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handlePickupCodeStart()}
                disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Iniciar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isArrivalPromptOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setIsArrivalPromptOpen(false);
            setArrivalPromptSnoozeUntilMs(Date.now() + 2 * 60_000);
          }
        }}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setIsArrivalPromptOpen(false);
                setArrivalPromptSnoozeUntilMs(Date.now() + 2 * 60_000);
              }
            }}
          />

          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalEyebrow}>Embarque</Text>
            <Text style={styles.confirmModalTitle}>Voce chegou ao ponto de embarque?</Text>
            <Text style={styles.confirmModalBody}>
              Detectamos que voce esta proximo da origem da corrida. Confirme a chegada para avisar o cliente.
            </Text>

            <View style={styles.confirmModalActions}>
              <Pressable
                style={[styles.confirmModalSecondaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => {
                  setIsArrivalPromptOpen(false);
                  setArrivalPromptSnoozeUntilMs(Date.now() + 2 * 60_000);
                }}
                disabled={isBusy}
              >
                <Text style={styles.confirmModalSecondaryButtonLabel}>Agora nao</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, styles.confirmModalPrimaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleArrivalConfirmation()}
                disabled={isBusy}
              >
                {isBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Cheguei</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={pendingDecision !== null}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setPendingDecision(null);
          }
        }}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setPendingDecision(null);
              }
            }}
          />

          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalEyebrow}>Confirmar acao</Text>
            <Text style={styles.confirmModalTitle}>
              {pendingDecision === "ACCEPT" ? "Aceitar corrida?" : "Recusar corrida?"}
            </Text>
            <Text style={styles.confirmModalBody}>
              {pendingDecision === "ACCEPT"
                ? `A corrida de ${ride.customerName} sera adicionada a sua agenda imediatamente.`
                : `A corrida de ${ride.customerName} sera removida das suas solicitacoes pendentes.`}
            </Text>

            <View style={styles.confirmModalActions}>
              <Pressable
                style={[styles.confirmModalSecondaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => setPendingDecision(null)}
                disabled={isBusy}
              >
                <Text style={styles.confirmModalSecondaryButtonLabel}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  pendingDecision === "ACCEPT" ? styles.primaryButton : styles.secondaryButton,
                  styles.confirmModalPrimaryButton,
                  isBusy ? styles.buttonDisabled : null
                ]}
                onPress={() => {
                  if (!pendingDecision) {
                    return;
                  }

                  void handleDecision(pendingDecision);
                }}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color={pendingDecision === "ACCEPT" ? colors.white : colors.highlight} size="small" />
                ) : pendingDecision === "ACCEPT" ? (
                  <Text style={styles.primaryButtonLabel}>Confirmar aceite</Text>
                ) : (
                  <Text style={styles.secondaryButtonLabel}>Confirmar recusa</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isNoShowModalOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setIsNoShowModalOpen(false);
          }
        }}
      >
        <View style={styles.emergencyModalRoot}>
          <Pressable
            style={styles.emergencyModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setIsNoShowModalOpen(false);
              }
            }}
          />

          <View style={styles.emergencyModalCard}>
            <Text style={styles.emergencyModalEyebrow}>Passageiro ausente</Text>
            <Text style={styles.emergencyModalTitle}>Registrar no-show desta corrida?</Text>
            <Text style={styles.emergencyModalBody}>
              A corrida sera encerrada como passageiro nao embarcado e saira da sua agenda ativa.
            </Text>

            <View style={styles.emergencyModalActions}>
              <Pressable
                style={[styles.emergencyModalSecondaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => setIsNoShowModalOpen(false)}
                disabled={isBusy}
              >
                <Text style={styles.emergencyModalSecondaryButtonLabel}>Voltar</Text>
              </Pressable>

              <Pressable
                style={[styles.emergencyModalPrimaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handlePassengerNoShow()}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.emergencyModalPrimaryButtonLabel}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isEmergencyCancelModalOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!isBusy) {
            setIsEmergencyCancelModalOpen(false);
          }
        }}
      >
        <View style={styles.emergencyModalRoot}>
          <Pressable
            style={styles.emergencyModalBackdrop}
            onPress={() => {
              if (!isBusy) {
                setIsEmergencyCancelModalOpen(false);
              }
            }}
          />

          <View style={styles.emergencyModalCard}>
            <Text style={styles.emergencyModalEyebrow}>Cancelamento emergencial</Text>
            <Text style={styles.emergencyModalTitle}>Cancelar somente esta corrida?</Text>
            <Text style={styles.emergencyModalBody}>
              A corrida sera retirada da sua agenda e devolvida para redistribuicao operacional.
            </Text>

            <View style={styles.emergencyReasonList}>
              {driverEmergencyCancellationReasonOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.emergencyReasonOption,
                    selectedEmergencyCancelReason === option.value ? styles.emergencyReasonOptionSelected : null
                  ]}
                  onPress={() => setSelectedEmergencyCancelReason(option.value)}
                  disabled={isBusy}
                >
                  <Text
                    style={[
                      styles.emergencyReasonOptionTitle,
                      selectedEmergencyCancelReason === option.value ? styles.emergencyReasonOptionTitleSelected : null
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.emergencyReasonOptionBody}>{option.description}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.emergencyModalActions}>
              <Pressable
                style={[styles.emergencyModalSecondaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => setIsEmergencyCancelModalOpen(false)}
                disabled={isBusy}
              >
                <Text style={styles.emergencyModalSecondaryButtonLabel}>Voltar</Text>
              </Pressable>

              <Pressable
                style={[styles.emergencyModalPrimaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleEmergencyCancellation()}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.emergencyModalPrimaryButtonLabel}>Cancelar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 24
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16
  },
  heroCard: {
    gap: 16,
    padding: 16,
    borderRadius: 28,
    backgroundColor: colors.white
  },
  heroCountdownCard: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#F3EEFF"
  },
  heroCountdownLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  heroCountdownValue: {
    color: colors.highlight,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  heroCopy: {
    flex: 1,
    gap: 2,
    justifyContent: "center"
  },
  heroOverline: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  heroTitle: {
    color: colors.textStrong,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold"
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_600SemiBold"
  },
  heroDateLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  heroPriceCard: {
    alignItems: "flex-end",
    justifyContent: "center"
  },
  heroPriceValue: {
    color: colors.highlight,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold"
  },
  heroFooter: {
    gap: 12
  },
  badgeWrap: {
    alignSelf: "flex-start"
  },
  section: {
    gap: 10,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  sectionTitle: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F1EDFF"
  },
  badgeWarning: {
    backgroundColor: "#FFF4D6"
  },
  badgeSuccess: {
    backgroundColor: "#EAFBF1"
  },
  badgeLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  badgeLabelWarning: {
    color: "#8C5A00"
  },
  badgeLabelSuccess: {
    color: "#167A47"
  },
  executionAlertCard: {
    gap: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF4D6"
  },
  executionAlertCardCritical: {
    backgroundColor: "#FDEAE8"
  },
  executionAlertTitle: {
    color: "#8C5A00",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  executionAlertTitleCritical: {
    color: "#B33A2B"
  },
  executionAlertBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  heroCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  heroCustomerInlineHidden: {
    display: "none"
  },
  heroAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE8FF"
  },
  heroAvatarLabel: {
    color: colors.highlight,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  heroCustomerCopy: {
    flex: 1,
    gap: 2
  },
  heroCustomerName: {
    color: colors.textStrong,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  heroCustomerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  heroCustomerMetaRow: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 2
  },
  customerMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 2
  },
  customerMetricText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  customerMetricDot: {
    color: "#C2B9E6",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  heroCustomerMetaDot: {
    color: "#C2B9E6",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  heroCustomerMetaHidden: {
    display: "none"
  },
  clientActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  clientActionButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#F0ECFF"
  },
  clientActionButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  clientActionButtonLabel: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  deadlineCard: {
    gap: 8
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  deadlineLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  deadlineValue: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  deadlineTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E8DDFF"
  },
  deadlineFill: {
    height: "100%",
    backgroundColor: colors.highlight
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  summaryCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#FBFAFF"
  },
  summaryCardIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F0EAFF"
  },
  summaryCardCopy: {
    flex: 1,
    gap: 2
  },
  summaryValue: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  summaryLabel: {
    color: "#6E6392",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  routeGrid: {
    gap: 10
  },
  routeCard: {
    gap: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F7F4FF"
  },
  routeLabel: {
    color: colors.highlight,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  routeValue: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  routeFullValue: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  routeArrow: {
    alignSelf: "center",
    color: colors.highlight,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  routeTimeline: {
    gap: 4
  },
  routeTimelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12
  },
  routeTimelineRail: {
    width: 16,
    alignItems: "center"
  },
  routeTimelineDotStart: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  routeTimelineDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FF9F1C"
  },
  routeTimelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    backgroundColor: "#D9CEF9"
  },
  routeTimelineCopy: {
    flex: 1,
    gap: 4,
    paddingBottom: 12
  },
  routeMetaPills: {
    flexDirection: "row",
    gap: 10
  },
  summaryChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F7F4FF"
  },
  summaryChipIconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#ECE4FF"
  },
  summaryChipCopy: {
    flex: 1,
    gap: 1
  },
  summaryChipValue: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  summaryChipLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  mapHintLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  mapPlaceholder: {
    height: 224,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#F2EEFF"
  },
  mapPreviewCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE7FF",
    backgroundColor: colors.white,
    shadowColor: "#221B43",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  mapFrame: {
    height: 224,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#F2EEFF"
  },
  mapTopOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end"
  },
  mapExpandBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(43,34,33,0.58)"
  },
  mapFallbackCard: {
    gap: 10,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#F2EDFF"
  },
  mapFallbackTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  mapFallbackBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular"
  },
  mapFallbackButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  mapFallbackButtonLabel: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  mapFallbackHintCard: {
    gap: 4,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF6E8"
  },
  mapFallbackHintTitle: {
    color: "#8C5A00",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  mapFallbackHintBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  confirmModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  confirmModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,19,44,0.42)"
  },
  confirmModalCard: {
    gap: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  confirmModalEyebrow: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  confirmModalTitle: {
    color: colors.textStrong,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold"
  },
  confirmModalBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  confirmModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  confirmModalSecondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F5F2FF"
  },
  confirmModalSecondaryButtonLabel: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  confirmModalPrimaryButton: {
    flex: 1
  },
  navigationProviderList: {
    gap: 10
  },
  confirmModalInputGroup: {
    gap: 8
  },
  confirmModalInputLabel: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  confirmModalInput: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DED6F7",
    backgroundColor: "#F7F4FF",
    color: colors.textStrong,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 8,
    paddingHorizontal: 18
  },
  confirmModalInputHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  navigationProviderButton: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F7F4FF"
  },
  navigationProviderTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  navigationProviderBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular"
  },
  emergencyModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  emergencyModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,19,44,0.42)"
  },
  emergencyModalCard: {
    gap: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  emergencyModalEyebrow: {
    color: "#AA3A2A",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  emergencyModalTitle: {
    color: colors.textStrong,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold"
  },
  emergencyModalBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  emergencyReasonList: {
    gap: 10
  },
  emergencyReasonOption: {
    gap: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#E6DEFF"
  },
  emergencyReasonOptionSelected: {
    backgroundColor: "#FFF2F0",
    borderColor: "#D84F3F"
  },
  emergencyReasonOptionTitle: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  emergencyReasonOptionTitleSelected: {
    color: "#AA3A2A"
  },
  emergencyReasonOptionBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  emergencyModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  emergencyModalSecondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F5F2FF"
  },
  emergencyModalSecondaryButtonLabel: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  emergencyModalPrimaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#D84F3F"
  },
  emergencyModalPrimaryButtonLabel: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  messageCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF4D6"
  },
  messageText: {
    color: "#8A6400",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  reportBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  reportActions: {
    gap: 12
  },
  reportButton: {
    minHeight: 82,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE9FB",
    backgroundColor: "#FCFBFF"
  },
  reportButtonDanger: {
    borderColor: "#F5E1DD",
    backgroundColor: "#FFFBFA"
  },
  reportButtonDangerSoft: {
    borderColor: "#F3DDD8",
    backgroundColor: "#FFF8F6"
  },
  reportButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  reportButtonLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  reportButtonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F1FF"
  },
  reportButtonIconWrapDanger: {
    backgroundColor: "#FDEEEE"
  },
  reportButtonIconWrapDangerSoft: {
    backgroundColor: "#FCEAE8"
  },
  reportButtonCopy: {
    flex: 1,
    gap: 3
  },
  reportButtonLabel: {
    color: colors.highlight,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  reportButtonLabelDanger: {
    color: "#C74637"
  },
  reportButtonBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  timelineLoading: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  timelineList: {
    gap: 2,
    backgroundColor: "#FCFBFF",
    padding: 16,
  
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE9FB",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12
  },
  timelineDateColumn: {
    width: 62,
    paddingTop: 2,
    paddingBottom: 14
  },
  timelineDateLabel: {
    color: colors.textStrong,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  timelineTimeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  timelineRail: {
    width: 18,
    alignItems: "center"
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#D8D2E9",
    marginTop: 4
  },
  timelineDotActive: {
    backgroundColor: colors.highlight
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
    marginBottom: -2,
    backgroundColor: "#E7E1F7"
  },
  timelineCopy: {
    flex: 1,
    paddingBottom: 14
  },
  timelineEventLabel: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  timelineEventLabelActive: {
    color: colors.textStrong,
    fontFamily: "Poppins_700Bold"
  },
  timelineEmptyLabel: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  actionGroup: {
    gap: 12
  },
  prebookActionsRow: {
    flexDirection: "row",
    gap: 10
  },
  prebookActionButton: {
    flex: 1
  },
  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.highlight
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  secondaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#F0ECFF"
  },
  secondaryButtonLabel: {
    color: colors.highlight,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
