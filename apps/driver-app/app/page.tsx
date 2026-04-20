"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "../components/brand-logo";
import {
  DriverLoginResult,
  DriverProfile,
  NotificationItem,
  Ride,
  formatCurrency,
  formatDateTime,
  request
} from "../lib/api";
import {
  getPushReadiness,
  PushPermissionState,
  PushReadiness,
  subscribeDriverToPush,
  syncDriverPushSubscription,
  unregisterDriverPush
} from "../lib/push";
import {
  clearStoredDriverSession,
  loadStoredDriverSession,
  saveStoredDriverSession
} from "../lib/session";

type DriverSession = DriverLoginResult;
type AppTab = "available" | "mine" | "history";

type DashboardState = {
  availableRides: Ride[];
  myRides: Ride[];
  notifications: NotificationItem[];
};

const initialDashboardState: DashboardState = {
  availableRides: [],
  myRides: [],
  notifications: []
};

const ACTIVE_TAB_STORAGE_KEY = "driver-app-active-tab";

const appTabs: Array<{ id: AppTab; label: string; shortLabel: string }> = [
  { id: "available", label: "Fila aberta", shortLabel: "Fila" },
  { id: "mine", label: "Agenda", shortLabel: "Agenda" },
  { id: "history", label: "Historico", shortLabel: "Historico" }
];

function getFirstName(name: string): string {
  const [firstName] = name.trim().split(/\s+/);
  return firstName || name;
}

function getInitial(name: string): string {
  return getFirstName(name).charAt(0).toUpperCase();
}

function formatDateOnly(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatTimeOnly(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRideScheduleHeadline(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short"
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short"
  }).format(date);

  return `${dayMonth} • ${time}`;
}

function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatAgendaDay(date: Date): { weekday: string; day: string } {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short"
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit"
  }).format(date);

  return { weekday, day };
}

function formatAgendaMoment(value?: string, referenceMs?: number): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const dayKey = formatDayKey(date);
  const referenceDate = new Date(referenceMs ?? Date.now());
  const todayKey = formatDayKey(referenceDate);
  const tomorrowKey = formatDayKey(addDays(referenceDate, 1));
  const time = formatTimeOnly(value);

  if (dayKey === todayKey) {
    return `Hoje • ${time}`;
  }

  if (dayKey === tomorrowKey) {
    return `Amanha • ${time}`;
  }

  return formatRideScheduleHeadline(value);
}

function formatMinutesLabel(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}min`;
}

function formatTimeUntil(startMs: number, referenceMs: number): string {
  const diffMinutes = Math.max(0, Math.ceil((startMs - referenceMs) / 60_000));
  return formatMinutesLabel(diffMinutes);
}

type RideExecutionAction = "GO_TO_PICKUP" | "ARRIVED" | "START" | "COMPLETE";
type MapPickerState = {
  rideId: string;
  address: string;
  title: string;
};

function getRideStageLabel(stage?: Ride["driverStage"]): string {
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

  return "Agendada";
}

function getScheduleFitClassName(status?: NonNullable<Ride["scheduleFit"]>["status"]): string {
  if (status === "CONFLICT") {
    return "conflict";
  }

  if (status === "FLEXIBLE") {
    return "flexible";
  }

  if (status === "TIGHT") {
    return "tight";
  }

  return "ok";
}

function getScheduleFitSummary(scheduleFit?: Ride["scheduleFit"]): string | null {
  if (!scheduleFit) {
    return null;
  }

  const bufferLabel = scheduleFit.bufferMinutes >= 0 ? `${scheduleFit.bufferMinutes} min` : `${scheduleFit.bufferMinutes} min`;
  return `${scheduleFit.label} • margem ${bufferLabel}`;
}

function getScheduleFitDetails(scheduleFit?: Ride["scheduleFit"]): string | null {
  if (!scheduleFit) {
    return null;
  }

  return `Janela ${scheduleFit.windowMinutes} min • deslocamento ${scheduleFit.transferMinutes} min`;
}

function getRideExecutionAction(
  ride: Ride,
  nextRideId?: string
): { id: RideExecutionAction; label: string } | null {
  const stage = ride.driverStage ?? "SCHEDULED";

  if (stage === "EN_ROUTE_PICKUP") {
    return { id: "ARRIVED", label: "Cheguei" };
  }

  if (stage === "ARRIVED") {
    return { id: "START", label: "Iniciar corrida" };
  }

  if (stage === "IN_PROGRESS") {
    return { id: "COMPLETE", label: "Finalizar corrida" };
  }

  if (stage === "SCHEDULED" && ride.id === nextRideId) {
    return { id: "GO_TO_PICKUP", label: "Ir para local" };
  }

  return null;
}

function buildNavigationLinks(address: string): Array<{ id: string; label: string; href: string }> {
  const encodedAddress = encodeURIComponent(address);

  return [
    {
      id: "waze",
      label: "Abrir no Waze",
      href: `https://waze.com/ul?q=${encodedAddress}&navigate=yes`
    },
    {
      id: "google-maps",
      label: "Abrir no Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    },
    {
      id: "apple-maps",
      label: "Abrir no Apple Maps",
      href: `https://maps.apple.com/?daddr=${encodedAddress}`
    }
  ];
}

function getScheduleFitSummaryDisplay(scheduleFit?: Ride["scheduleFit"]): string | null {
  if (!scheduleFit) {
    return null;
  }

  if (scheduleFit.status === "FLEXIBLE") {
    return scheduleFit.label;
  }

  return `${scheduleFit.label} • margem ${scheduleFit.bufferMinutes} min`;
}

function getScheduleFitDetailsDisplay(scheduleFit?: Ride["scheduleFit"]): string | null {
  if (!scheduleFit) {
    return null;
  }

  if (scheduleFit.status === "FLEXIBLE" && scheduleFit.alternativeOptions?.length) {
    return `Sugestoes: ${scheduleFit.alternativeOptions.map((option) => option.label).join(" ou ")}`;
  }

  return `Janela ${scheduleFit.windowMinutes} min • deslocamento ${scheduleFit.transferMinutes} min`;
}

function shortenAddress(address: string): { street: string; number: string; secondary: string } {
  const [firstPart, secondPart] = address.split(",");
  const primary = firstPart?.trim() ?? address.trim();
  const secondary = secondPart?.trim() ?? "";

  const match = primary.match(/^(.*?)(\d+[A-Za-z/-]*)$/);
  const street = match?.[1]?.trim().replace(/[,-]$/, "") ?? primary;
  const number = match?.[2]?.trim() ?? "";

  return {
    street,
    number,
    secondary
  };
}

function renderAddress(address: string) {
  const parsed = shortenAddress(address);

  return (
    <span className="address-preview">
      <strong className="address-line">
        <span>{parsed.street}</span>
        {parsed.number ? <em>{parsed.number}</em> : null}
      </strong>
      {parsed.secondary ? <small>{parsed.secondary}</small> : null}
    </span>
  );
}

function getRideDecisionState(ride: Ride, nowMs: number): {
  expiresLabel: string;
  receivedLabel: string;
  progressPercent: number;
} {
  const startedAtMs = new Date(ride.decisionWindow?.startedAt ?? ride.updatedAt).getTime();
  const expiresAtMs = new Date(ride.decisionWindow?.expiresAt ?? ride.updatedAt).getTime();
  const totalSeconds = ride.decisionWindow?.totalSeconds ?? 30 * 60;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  const receivedMinutes = Math.max(0, Math.floor((nowMs - startedAtMs) / 60_000));
  const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  return {
    expiresLabel: `Expira em ${remainingMinutes}min`,
    receivedLabel: receivedMinutes <= 0 ? "Recebido agora" : `Recebido há ${receivedMinutes} min`,
    progressPercent
  };
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="menu-icon">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="user-icon">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TabIcon({ tab }: { tab: AppTab }) {
  if (tab === "available") {
    return <ListIcon />;
  }

  if (tab === "mine") {
    return <CalendarIcon />;
  }

  return <ClockIcon />;
}

export default function DriverAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [session, setSession] = useState<DriverSession | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>(initialDashboardState);
  const [activeTab, setActiveTab] = useState<AppTab>("available");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Use seu telefone cadastrado no admin para entrar.");
  const [isBusy, setIsBusy] = useState(false);
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<PushPermissionState>("unsupported");
  const [pushStatusMessage, setPushStatusMessage] = useState(
    "Ative as notificacoes para receber novas corridas mesmo fora da tela."
  );
  const [showPushModal, setShowPushModal] = useState(false);
  const [mapPicker, setMapPicker] = useState<MapPickerState | null>(null);
  const [focusedRideId, setFocusedRideId] = useState<string | null>(null);
  const [handledDeepLinkRideId, setHandledDeepLinkRideId] = useState<string | null>(null);
  const [selectedAgendaDayKey, setSelectedAgendaDayKey] = useState(() => formatDayKey(new Date()));
  const [copiedNavigationAddress, setCopiedNavigationAddress] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  function updatePushState(readiness: PushReadiness): void {
    setPushPermission(readiness.permission);
    setPushStatusMessage(readiness.message);
  }

  useEffect(() => {
    const parsed = loadStoredDriverSession();
    const storedTab =
      typeof window !== "undefined" ? window.sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY) : null;
    updatePushState(getPushReadiness());
    if (parsed) {
      setSession(parsed);
    }
    if (storedTab === "available" || storedTab === "mine" || storedTab === "history") {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const readiness = getPushReadiness();
    updatePushState(readiness);

    if (readiness.permission === "default" && readiness.canPrompt) {
      setShowPushModal(true);
    }

    if (readiness.permission === "granted") {
      void syncDriverPushSubscription(session.driver.id).catch((error: Error) => {
        setPushStatusMessage(error.message);
      });
    }

    void refreshDashboard(session.driver).catch((error: Error) => {
      setStatusMessage(error.message);
    });

    const intervalId = window.setInterval(() => {
      void refreshDashboard(session.driver).catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const rideIdFromNotification = searchParams.get("rideId");
    const tabFromNotification = searchParams.get("tab");

    if (!rideIdFromNotification || handledDeepLinkRideId === rideIdFromNotification) {
      return;
    }

    if (tabFromNotification === "mine" || tabFromNotification === "history" || tabFromNotification === "available") {
      setActiveTab(tabFromNotification);
    }

    const matchingRide = dashboard.availableRides.find((ride) => ride.id === rideIdFromNotification);
    if (!matchingRide) {
      return;
    }

    setFocusedRideId(rideIdFromNotification);
    setHandledDeepLinkRideId(rideIdFromNotification);

    window.setTimeout(() => {
      document.getElementById(`ride-card-${rideIdFromNotification}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 120);

    const timeoutId = window.setTimeout(() => {
      setFocusedRideId((current) => (current === rideIdFromNotification ? null : current));
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [dashboard.availableRides, handledDeepLinkRideId, searchParams, session]);

  async function refreshDashboard(driver: DriverProfile): Promise<void> {
    const [availableRides, myRides, notifications] = await Promise.all([
      request<Ride[]>(`/drivers/${driver.id}/available-rides`),
      request<Ride[]>(`/drivers/${driver.id}/my-rides`),
      request<NotificationItem[]>(`/notifications?driverId=${encodeURIComponent(driver.id)}`)
    ]);

    setDashboard({
      availableRides,
      myRides,
      notifications
    });

    setStatusMessage(`Atualizado para ${driver.name}.`);
  }

  async function handleEnablePush() {
    if (!session) {
      return;
    }

    setIsPushBusy(true);

    try {
      const permission = await subscribeDriverToPush(session.driver.id);
      updatePushState(getPushReadiness());
      if (permission !== "default") {
        setShowPushModal(false);
      }

      if (permission === "granted") {
        setStatusMessage("Notificacoes ativadas para novas corridas.");
      } else if (permission === "denied") {
        setStatusMessage("O navegador bloqueou as notificacoes deste aparelho.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao ativar notificacoes.";
      setStatusMessage(message);
      setPushStatusMessage(message);
    } finally {
      setIsPushBusy(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);

    try {
      const result = await request<DriverLoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone,
          pin
        })
      });

      setSession(result);
      setActiveTab("available");
      setIsMenuOpen(false);
      saveStoredDriverSession(result);
      setStatusMessage(`Sessao iniciada para ${result.driver.name}.`);
      setPhone("");
      setPin("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao entrar.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDecision(rideId: string, decision: "ACCEPT" | "REJECT") {
    if (!session) {
      return;
    }

    setIsBusy(true);

    try {
      await request<Ride>(`/drivers/${session.driver.id}/rides/${rideId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });

      setStatusMessage(
        decision === "ACCEPT"
          ? `Corrida ${rideId} aceita com sucesso.`
          : `Corrida ${rideId} recusada.`
      );

        if (decision === "ACCEPT") {
          setActiveTab("mine");
        }

        await refreshDashboard(session.driver);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao registrar decisao.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRideExecutionAction(ride: Ride, action: RideExecutionAction) {
    if (!session) {
      return;
    }

    setIsBusy(true);

    try {
      let path = "";
      let successMessage = "";
      let requestBody: string | undefined;

      if (action === "GO_TO_PICKUP") {
        path = `/drivers/${session.driver.id}/rides/${ride.id}/go-to-pickup`;
        successMessage = `Navegacao iniciada para ${ride.customerName}.`;
      } else if (action === "ARRIVED") {
        path = `/drivers/${session.driver.id}/rides/${ride.id}/arrived`;
        successMessage = `Chegada registrada para ${ride.customerName}.`;
      } else if (action === "START") {
        const informedPickupCode = window.prompt(
          `Informe o codigo de embarque de 4 digitos para iniciar a corrida de ${ride.customerName}.`,
          ""
        );
        const normalizedPickupCode = informedPickupCode?.replace(/\D/g, "").slice(0, 4) ?? "";

        if (normalizedPickupCode.length !== 4) {
          setStatusMessage("Codigo de embarque invalido. Informe os 4 digitos do cliente.");
          return;
        }

        path = `/drivers/${session.driver.id}/rides/${ride.id}/start`;
        successMessage = `Corrida iniciada para ${ride.customerName}.`;
        requestBody = JSON.stringify({ pickupCode: normalizedPickupCode });
      } else {
        path = `/drivers/${session.driver.id}/rides/${ride.id}/complete`;
        successMessage = `Corrida finalizada para ${ride.customerName}.`;
      }

      const updatedRide = await request<Ride>(path, {
        method: "POST",
        body: requestBody
      });

      if (action === "GO_TO_PICKUP") {
        setMapPicker({
          rideId: updatedRide.id,
          address: updatedRide.origin,
          title: "Como voce quer ir para o embarque?"
        });
        setCopiedNavigationAddress(false);
      } else if (action === "START") {
        setMapPicker({
          rideId: updatedRide.id,
          address: updatedRide.destination,
          title: "Como voce quer navegar durante a corrida?"
        });
        setCopiedNavigationAddress(false);
      } else if (mapPicker?.rideId === ride.id) {
        setMapPicker(null);
      }

      setStatusMessage(successMessage);
      await refreshDashboard(session.driver);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar etapa da corrida.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopyNavigationAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedNavigationAddress(true);
      window.setTimeout(() => setCopiedNavigationAddress(false), 1800);
    } catch {
      setStatusMessage("Nao foi possivel copiar o endereco.");
    }
  }

  async function handleReadNotification(notificationId: string) {
    if (!session) {
      return;
    }

    try {
      await request<NotificationItem>(`/notifications/${notificationId}/read`, {
        method: "POST"
      });
      await refreshDashboard(session.driver);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao marcar notificacao como lida.");
    }
  }

  function handleLogout() {
    if (session) {
      void unregisterDriverPush(session.driver.id);
    }

    setSession(null);
    setDashboard(initialDashboardState);
    setActiveTab("available");
    setIsMenuOpen(false);
    setStatusMessage("Sessao encerrada.");
    updatePushState(getPushReadiness());
    setShowPushModal(false);
    clearStoredDriverSession();
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    }
  }

  if (!session) {
    return (
      <main className="driver-app-shell">
        <section className="driver-login">
          <div className="driver-login-gradient" aria-hidden="true" />

          <div className="driver-login-brand">
            <span className="brand-badge" aria-hidden="true">
              <BrandLogo />
            </span>
            <div className="driver-copy">
              <p className="eyebrow">Inturb Driver</p>
              <h1>Entre para acompanhar corridas com cara de app no celular.</h1>
              <p>{statusMessage}</p>
            </div>
          </div>

          <form className="driver-login-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Telefone cadastrado</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="5511999999999"
                inputMode="tel"
              />
            </label>

            <label className="field">
              <span>PIN</span>
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="1234"
                inputMode="numeric"
              />
            </label>

            <div className="driver-login-hint">
              Neste MVP, o telefone precisa existir no admin. O PIN ainda e apenas um passo visual do fluxo.
            </div>

            <button type="submit" className="primary-cta" disabled={isBusy || !phone.trim() || !pin.trim()}>
              Entrar no app
            </button>
          </form>
        </section>
      </main>
    );
  }

  const driver = session.driver;
  const driverFirstName = getFirstName(driver.name);
  const today = new Date(nowMs);
  const agendaRides = [...dashboard.myRides]
    .filter((ride) => ride.status === "ACCEPTED" && ride.driverStage !== "COMPLETED")
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  const historyRides = [...dashboard.myRides]
    .filter((ride) => ride.status === "COMPLETED" || ride.driverStage === "COMPLETED")
    .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime());
  const unreadNotifications = dashboard.notifications.filter((item) => !item.readAt).length;
  const canEnablePush = pushPermission === "default";
  const nextRide = agendaRides[0];
  const nextRideStartsIn = nextRide ? formatTimeUntil(new Date(nextRide.scheduledAt).getTime(), nowMs) : null;
  const nextRideAction = nextRide ? getRideExecutionAction(nextRide, nextRide.id) : null;
  const agendaDaysBase = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const nextRideDayKey = nextRide ? formatDayKey(new Date(nextRide.scheduledAt)) : null;
  const agendaDays =
    nextRideDayKey && !agendaDaysBase.some((date) => formatDayKey(date) === nextRideDayKey)
      ? [...agendaDaysBase, new Date(nextRide.scheduledAt)].sort((left, right) => left.getTime() - right.getTime())
      : agendaDaysBase;
  const agendaCountsByDay = agendaRides.reduce<Record<string, number>>((counts, ride) => {
    const dayKey = formatDayKey(new Date(ride.scheduledAt));
    counts[dayKey] = (counts[dayKey] ?? 0) + 1;
    return counts;
  }, {});
  const selectedAgendaRides = agendaRides.filter(
    (ride) => formatDayKey(new Date(ride.scheduledAt)) === selectedAgendaDayKey
  );

  return (
    <main className="driver-app-shell">
      <div className="driver-app-frame">
        {showPushModal && canEnablePush ? (
          <>
            <button
              type="button"
              className="driver-modal-backdrop"
              aria-label="Fechar aviso de notificacoes"
              onClick={() => setShowPushModal(false)}
            />

            <section className="driver-modal" role="dialog" aria-modal="true" aria-labelledby="push-modal-title">
              <div className="driver-modal-copy">
                <p className="eyebrow">Atencao</p>
                <h2 id="push-modal-title">Ative as notificacoes de novas corridas</h2>
                <p>
                  Assim que entrar um pre-agendamento, o navegador pode avisar este motorista mesmo quando ele nao
                  estiver olhando a tela.
                </p>
              </div>

              <div className="driver-modal-actions">
                <button
                  type="button"
                  className="primary-cta"
                  onClick={() => void handleEnablePush()}
                  disabled={isPushBusy}
                >
                  {isPushBusy ? "Ativando..." : "Ativar notificacoes"}
                </button>

                <button type="button" className="secondary" onClick={() => setShowPushModal(false)}>
                  Agora nao
                </button>
              </div>
            </section>
          </>
        ) : null}

        {mapPicker ? (
          <>
            <button
              type="button"
              className="driver-modal-backdrop"
              aria-label="Fechar opcoes de navegacao"
              onClick={() => setMapPicker(null)}
            />

            <section className="driver-modal map-picker-modal" role="dialog" aria-modal="true" aria-labelledby="map-picker-title">
              <div className="driver-modal-copy">
                <p className="eyebrow">Navegacao</p>
                <h2 id="map-picker-title">{mapPicker.title}</h2>
                <p>{mapPicker.address}</p>
              </div>

              <div className="map-picker-list">
                {buildNavigationLinks(mapPicker.address).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="secondary map-picker-option"
                    onClick={() => {
                      window.open(option.href, "_blank", "noopener,noreferrer");
                      setMapPicker(null);
                    }}
                  >
                    {option.label}
                  </button>
                ))}

                <button
                  type="button"
                  className="secondary map-picker-option"
                  onClick={() => void handleCopyNavigationAddress(mapPicker.address)}
                >
                  {copiedNavigationAddress ? "Endereco copiado" : "Copiar endereco"}
                </button>
              </div>

              <div className="driver-modal-actions">
                <button type="button" className="secondary" onClick={() => setMapPicker(null)}>
                  Fechar
                </button>
              </div>
            </section>
          </>
        ) : null}

        {isMenuOpen ? (
          <>
            <button
              type="button"
              className="driver-sidebar-backdrop"
              aria-label="Fechar menu lateral"
              onClick={() => setIsMenuOpen(false)}
            />

            <aside className="driver-sidebar" aria-label="Menu do motorista">
              <div className="driver-sidebar-head">
                <p className="eyebrow">Motorista</p>
                <strong>{driver.name}</strong>
                <span>{driver.vehicle ?? "Sem veiculo ativo"}</span>
              </div>

              <button
                type="button"
                className="sidebar-action"
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/vehicles");
                }}
              >
                Veiculos
              </button>

              <button
                type="button"
                className="sidebar-action"
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/settings");
                }}
              >
                Configuracoes
              </button>

              <button
                type="button"
                className="sidebar-action"
                onClick={() => {
                  setIsMenuOpen(false);
                  void refreshDashboard(driver);
                }}
                disabled={isBusy}
              >
                Atualizar
              </button>

              <button
                type="button"
                className="sidebar-action"
                onClick={() => {
                  setIsMenuOpen(false);
                  setActiveTab("history");
                }}
              >
                Ir para historico
              </button>

              <button type="button" className="sidebar-action danger" onClick={handleLogout}>
                Sair
              </button>
            </aside>
          </>
        ) : null}

        <header className="driver-mobile-header">
          <h1 className="driver-header-title">Ola, {driverFirstName}!</h1>

          <div className="driver-header-menu">
            <button
              type="button"
              className="menu-button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label="Abrir menu do motorista"
            >
              <MenuIcon />
            </button>
          </div>
        </header>

        <section className="driver-content">
          {activeTab === "available" ? (
            <article className="driver-panel">
              <div className="driver-panel-header">
                <div className="driver-section-head">
                  <h2>Fila de corridas</h2>
                  <span>Pedidos que ainda esperam sua decisao.</span>
                </div>
              </div>

              <div className="ride-list">
                {dashboard.availableRides.length === 0 ? (
                  <div className="empty-state">Nenhuma corrida disponivel para aceite agora.</div>
                ) : (
                  dashboard.availableRides.map((ride) => {
                    const decisionState = getRideDecisionState(ride, nowMs);
                    const customerProfile = ride.customerProfile;

                    return (
                      <article
                        id={`ride-card-${ride.id}`}
                        key={ride.id}
                        className={`ride-card available-ride-card expandable-card${
                          focusedRideId === ride.id ? " focused-from-push" : ""
                        }`}
                      onClick={() => router.push(`/rides/${ride.id}`)}
                      >
                        <div className="ride-expiry-header">
                          <span className="ride-expiry-label">{decisionState.expiresLabel}</span>
                          <div className="ride-expiry-track" aria-hidden="true">
                            <span
                              className="ride-expiry-bar"
                              style={{ width: `${decisionState.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="minimal-ride-head">
                          <div className="minimal-ride-title">
                            <div className="client-identity">
                              <span className="client-avatar">{getInitial(ride.customerName)}</span>
                              <strong>{ride.customerName}</strong>
                            </div>
                            <div className="customer-tier-line">
                              <span>{customerProfile?.tierEmoji ?? "🆕"}</span>
                              <span>{customerProfile?.tierLabel ?? "Novo"}</span>
                              <span aria-hidden="true">&bull;</span>
                              <span>{customerProfile?.score ?? 50}/100</span>
                              <span aria-hidden="true">&bull;</span>
                              <span>{customerProfile?.totalRides ?? 0} solicitações</span>
                            </div>
                          </div>
                        </div>

                        <div className="ride-primary-row">
                          <span className="ride-primary-datetime">{formatRideScheduleHeadline(ride.scheduledAt)}</span>
                          <strong className="ride-summary-price">{formatCurrency(ride.quote?.amount)}</strong>
                        </div>

                        <div className="minimal-route compact-route">
                          <div className="minimal-route-marker" aria-hidden="true">
                            <span className="route-dot start" />
                            <span className="route-line" />
                            <span className="route-dot end" />
                          </div>

                          <div className="minimal-route-stops">
                            <div className="minimal-ride-stop">{renderAddress(ride.origin)}</div>
                            <div className="minimal-ride-stop destination">{renderAddress(ride.destination)}</div>
                          </div>
                        </div>

                        <div className="ride-compact-stats">
                          <span>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</span>
                          <span aria-hidden="true">&bull;</span>
                          <span>{ride.quote?.routeDurationMinutes ?? 0} min</span>
                        </div>

                        {ride.scheduleFit ? (
                          <div className={`ride-fit-chip ${getScheduleFitClassName(ride.scheduleFit.status)}`}>
                            <strong>{getScheduleFitSummaryDisplay(ride.scheduleFit)}</strong>
                            <span>{getScheduleFitDetailsDisplay(ride.scheduleFit)}</span>
                          </div>
                        ) : null}

                        <div className="ride-action-row split compact-pair">
                          <button
                            type="button"
                            className="secondary compact-action reject-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDecision(ride.id, "REJECT");
                            }}
                            disabled={isBusy}
                          >
                            Rejeitar
                          </button>
                          <button
                            type="button"
                            className="primary-cta compact-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDecision(ride.id, "ACCEPT");
                            }}
                            disabled={isBusy || ride.scheduleFit?.status === "CONFLICT" || ride.scheduleFit?.status === "FLEXIBLE"}
                          >
                            Aceitar
                          </button>
                        </div>

                        <div className="ride-received-label">{decisionState.receivedLabel}</div>
                      </article>
                    );
                  })
                )}
              </div>
            </article>
          ) : null}

          {activeTab === "mine" ? (
            <article className="driver-panel">
              <div className="driver-panel-header">
                <div className="driver-section-head">
                  <h2>Agenda</h2>
                  <span>Corridas aceitas que ainda estao por acontecer.</span>
                </div>
              </div>

              <section className="agenda-section">
                <p className="agenda-section-label">Proxima corrida</p>

                {nextRide ? (
                  <article className="ride-card available-ride-card agenda-next-card">
                    <div className="agenda-next-head">
                      <div className="agenda-next-title">
                        <span className="eyebrow agenda-card-eyebrow">Proxima corrida</span>
                        <strong>{formatAgendaMoment(nextRide.scheduledAt, nowMs)}</strong>
                      </div>
                      <span className="agenda-next-countdown">Em {nextRideStartsIn}</span>
                    </div>

                    <div className="minimal-ride-head">
                      <div className="minimal-ride-title">
                        <div className="client-identity">
                          <span className="client-avatar">{getInitial(nextRide.customerName)}</span>
                          <strong>{nextRide.customerName}</strong>
                        </div>
                        <div className="customer-tier-line neutral">
                          <span>{getRideStageLabel(nextRide.driverStage)}</span>
                          <span aria-hidden="true">&bull;</span>
                          <span>{formatDateOnly(nextRide.scheduledAt)}</span>
                        </div>
                      </div>
                      <strong className="ride-summary-price">{formatCurrency(nextRide.quote?.amount)}</strong>
                    </div>

                    <div className="agenda-next-route">
                      <strong>{shortenAddress(nextRide.origin).street}</strong>
                      <span aria-hidden="true">&rarr;</span>
                      <strong>{shortenAddress(nextRide.destination).street}</strong>
                    </div>

                    <div className="ride-compact-stats">
                      <span>{nextRide.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</span>
                      <span aria-hidden="true">&bull;</span>
                      <span>{nextRide.quote?.routeDurationMinutes ?? 0} min</span>
                    </div>

                    {nextRideAction ? (
                      <div className="ride-action-row">
                        <button
                          type="button"
                          className="primary-cta agenda-flow-button"
                          onClick={() => void handleRideExecutionAction(nextRide, nextRideAction.id)}
                          disabled={isBusy}
                        >
                          {nextRideAction.label}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ) : (
                  <div className="empty-state">Nenhuma proxima corrida definida no momento.</div>
                )}
              </section>

              <div className="agenda-divider" aria-hidden="true" />

              <section className="agenda-section">
                <p className="agenda-section-label">Calendario</p>

                <div className="agenda-day-strip" aria-label="Calendario horizontal da agenda">
                  {agendaDays.map((day) => {
                    const dayKey = formatDayKey(day);
                    const dayLabel = formatAgendaDay(day);
                    const rideCount = agendaCountsByDay[dayKey] ?? 0;

                    return (
                      <button
                        key={dayKey}
                        type="button"
                        className={selectedAgendaDayKey === dayKey ? "agenda-day-pill active" : "agenda-day-pill"}
                        onClick={() => setSelectedAgendaDayKey(dayKey)}
                      >
                        <span className="agenda-day-weekday">{dayLabel.weekday}</span>
                        <strong className="agenda-day-number">{dayLabel.day}</strong>
                        <small className="agenda-day-count">{rideCount}</small>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="agenda-divider" aria-hidden="true" />

              <section className="agenda-section">
                <p className="agenda-section-label">Corridas do dia</p>

                <div className="ride-list agenda-ride-list">
                {agendaRides.length === 0 ? (
                  <div className="empty-state">Voce ainda nao tem corridas aceitas na agenda.</div>
                ) : selectedAgendaRides.length === 0 ? (
                  <div className="empty-state">Nenhuma corrida neste dia. Escolha outra data acima.</div>
                ) : (
                  selectedAgendaRides.map((ride, index) => {
                    const nextRideOnDay = selectedAgendaRides[index + 1];
                    const rideAction = getRideExecutionAction(ride, nextRide?.id);

                    return (
                      <div key={ride.id} className="agenda-item-block">
                        <article className="ride-card available-ride-card agenda-ride-card">
                          <div className="agenda-ride-card-top">
                            <span className="agenda-status-badge">{getRideStageLabel(ride.driverStage)}</span>
                            <span className="ride-primary-datetime">{formatAgendaMoment(ride.scheduledAt, nowMs)}</span>
                          </div>

                          <div className="minimal-ride-head">
                            <div className="minimal-ride-title">
                              <div className="client-identity">
                                <span className="client-avatar">{getInitial(ride.customerName)}</span>
                                <strong>{ride.customerName}</strong>
                              </div>
                              <div className="customer-tier-line neutral">
                                <span>Embarque as {formatTimeOnly(ride.scheduledAt)}</span>
                              </div>
                            </div>
                            <strong className="ride-summary-price">{formatCurrency(ride.quote?.amount)}</strong>
                          </div>

                          <div className="minimal-route compact-route">
                            <div className="minimal-route-marker" aria-hidden="true">
                              <span className="route-dot start" />
                              <span className="route-line" />
                              <span className="route-dot end" />
                            </div>

                            <div className="minimal-route-stops">
                              <div className="minimal-ride-stop">{renderAddress(ride.origin)}</div>
                              <div className="minimal-ride-stop destination">{renderAddress(ride.destination)}</div>
                            </div>
                          </div>

                          <div className="ride-compact-stats">
                            <span>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</span>
                            <span aria-hidden="true">&bull;</span>
                            <span>{ride.quote?.routeDurationMinutes ?? 0} min</span>
                          </div>

                          {rideAction ? (
                            <div className="ride-action-row">
                              <button
                                type="button"
                                className="primary-cta agenda-flow-button"
                                onClick={() => void handleRideExecutionAction(ride, rideAction.id)}
                                disabled={isBusy}
                              >
                                {rideAction.label}
                              </button>
                            </div>
                          ) : null}
                        </article>

                        {ride.scheduleFit ? (
                          <div className={`agenda-gap-card ${getScheduleFitClassName(ride.scheduleFit.status)}`}>
                            <span className="agenda-gap-dot" aria-hidden="true" />
                            <strong>{getScheduleFitSummaryDisplay(ride.scheduleFit)}</strong>
                            <span>{getScheduleFitDetailsDisplay(ride.scheduleFit)}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
                </div>
              </section>
            </article>
          ) : null}

          {activeTab === "history" ? (
            <article className="driver-panel">
              <div className="driver-panel-header">
                <div className="driver-section-head">
                  <h2>Historico</h2>
                  <span>Corridas passadas e atividade recente do seu perfil.</span>
                </div>
              </div>

              <div className="ride-list">
                {historyRides.length === 0 ? (
                  <div className="empty-state">Nenhuma corrida passada no seu historico ainda.</div>
                ) : (
                  historyRides.map((ride) => (
                    <article key={ride.id} className="ride-card">
                      <div className="ride-card-head">
                        <div>
                          <strong>{ride.customerName}</strong>
                          <p className="meta">{ride.id}</p>
                        </div>
                        <span className="ride-status">{getRideStageLabel(ride.driverStage)}</span>
                      </div>

                      <div className="ride-route">
                        <div className="ride-route-line">
                          <span>Origem</span>
                          <strong>{ride.origin}</strong>
                        </div>
                        <div className="ride-route-line">
                          <span>Destino</span>
                          <strong>{ride.destination}</strong>
                        </div>
                      </div>

                      <div className="ride-meta-grid">
                        <div>
                          <span className="eyebrow">Horario</span>
                          <strong>{formatDateTime(ride.scheduledAt)}</strong>
                        </div>
                        <div>
                          <span className="eyebrow">Valor</span>
                          <strong>{formatCurrency(ride.quote?.amount)}</strong>
                        </div>
                        <div>
                          <span className="eyebrow">Distancia</span>
                          <strong>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="driver-panel-divider" />

              <div className="driver-push-strip">
                <div className="driver-push-copy">
                  <strong>Alertas de novas corridas</strong>
                  <span>{pushStatusMessage}</span>
                </div>

                {canEnablePush ? (
                  <button
                    type="button"
                    className="secondary compact-action"
                    onClick={() => void handleEnablePush()}
                    disabled={isPushBusy}
                  >
                    {isPushBusy ? "Ativando..." : "Ativar"}
                  </button>
                ) : null}
              </div>

              <div className="driver-panel-divider" />

              <div className="driver-panel-header">
                <div className="driver-section-head">
                  <h2>Atividade recente</h2>
                  <span>{unreadNotifications} notificacoes ainda nao lidas.</span>
                </div>
              </div>

              <div className="notification-list">
                {dashboard.notifications.length === 0 ? (
                  <div className="empty-state">Nenhuma atualizacao recente para este motorista.</div>
                ) : (
                  dashboard.notifications.map((notification) => (
                    <article key={notification.id} className="notification-card">
                      <div className="ride-card-head">
                        <div>
                          <strong>{notification.title}</strong>
                          <p className="meta">{notification.body}</p>
                        </div>
                        <span className="ride-status">{notification.readAt ? "Lida" : "Nova"}</span>
                      </div>

                      <div className="ride-meta-grid">
                        <div>
                          <span className="eyebrow">Corrida</span>
                          <strong>{notification.rideId}</strong>
                        </div>
                        <div>
                          <span className="eyebrow">Quando</span>
                          <strong>{formatDateTime(notification.createdAt)}</strong>
                        </div>
                        <div>
                          <span className="eyebrow">Tipo</span>
                          <strong>{notification.type}</strong>
                        </div>
                      </div>

                      {!notification.readAt ? (
                        <div className="ride-action-row">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void handleReadNotification(notification.id)}
                          >
                            Marcar como lida
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </article>
          ) : null}
        </section>

        <nav className="driver-bottom-nav" aria-label="Secoes do app do motorista">
          <div className="driver-bottom-handle" aria-hidden="true" />
          <div className="driver-bottom-actions">
            {appTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "nav-pill active" : "nav-pill"}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
              >
                <TabIcon tab={tab.id} />
                <span className="nav-label">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
