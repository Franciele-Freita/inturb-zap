import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { router, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
  PanResponder,
  type AppStateStatus,
  type DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "../components/brand-logo";
import {
  driverEmergencyCancellationReasonOptions,
  formatCurrency,
  formatDateTime,
  request,
  type DriverEmergencyCancellationReason,
  type DriverFleetVehicleDetails,
  type DriverLoginResult,
  type DriverProfile,
  type Ride
} from "../lib/api";
import { registerDriverPushNotifications, unregisterDriverPushNotifications } from "../lib/notifications";
import { clearStoredDriverSession, loadStoredDriverSession, saveStoredDriverSession } from "../lib/session";
import { colors } from "../theme/tokens";

type HomeTab = "home" | "queue" | "agenda";
const AUTO_REFRESH_INTERVAL_MS = 15_000;
const HOME_TAB_ORDER: HomeTab[] = ["home", "queue", "agenda"];
const TAB_SWIPE_ACTIVATION_PX = 14;
const TAB_SWIPE_TRIGGER_PX = 72;
const TAB_TRANSITION_OFFSET_PX = 44;
const TAB_TRANSITION_OUT_DURATION_MS = 110;
const TAB_TRANSITION_IN_DURATION_MS = 180;

function HomeIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.highlight : colors.textMuted;

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5L12 4L20 10.5V19C20 19.6 19.6 20 19 20H15V14H9V20H5C4.4 20 4 19.6 4 19V10.5Z"
        stroke={stroke}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QueueIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.highlight : colors.textMuted;

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1={7} y1={7} x2={19} y2={7} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={7} y1={12} x2={19} y2={12} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={7} y1={17} x2={19} y2={17} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M4 7h.01M4 12h.01M4 17h.01" stroke={stroke} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function AgendaIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.highlight : colors.textMuted;

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3V6M17 3V6M4 9H20M6 5H18C19.1 5 20 5.9 20 7V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V7C4 5.9 4.9 5 6 5Z"
        stroke={stroke}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function NotificationIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.highlight : colors.textMuted;

  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18H9M18 16V11C18 7.9 15.8 5.3 12.8 4.6V4C12.8 3.3 12.2 2.8 11.5 2.8C10.8 2.8 10.2 3.3 10.2 4V4.6C7.2 5.3 5 7.9 5 11V16L3.8 17.2C3.3 17.7 3.7 18.5 4.4 18.5H18.6C19.3 18.5 19.7 17.7 19.2 17.2L18 16Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.highlight : colors.textMuted;

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Line x1={5} y1={8} x2={19} y2={8} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={5} y1={16} x2={19} y2={16} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function RefreshIcon({ stroke = colors.white }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12C20 16.4 16.4 20 12 20C8.5 20 5.6 17.8 4.5 14.8M4 12C4 7.6 7.6 4 12 4C14.5 4 16.8 5.1 18.2 7"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M18 3.8V7.2H14.6" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 20.2V16.8H9.4" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SettingsIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8.5C10.1 8.5 8.5 10.1 8.5 12C8.5 13.9 10.1 15.5 12 15.5C13.9 15.5 15.5 13.9 15.5 12C15.5 10.1 13.9 8.5 12 8.5Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path
        d="M19.4 15C19.5 14.7 19.7 14.4 19.8 14.1L21.5 13.4V10.6L19.8 9.9C19.7 9.6 19.5 9.3 19.4 9L19.8 7.2L17.8 5.2L16 5.6C15.7 5.5 15.4 5.3 15.1 5.2L14.4 3.5H11.6L10.9 5.2C10.6 5.3 10.3 5.5 10 5.6L8.2 5.2L6.2 7.2L6.6 9C6.5 9.3 6.3 9.6 6.2 9.9L4.5 10.6V13.4L6.2 14.1C6.3 14.4 6.5 14.7 6.6 15L6.2 16.8L8.2 18.8L10 18.4C10.3 18.5 10.6 18.7 10.9 18.8L11.6 20.5H14.4L15.1 18.8C15.4 18.7 15.7 18.5 16 18.4L17.8 18.8L19.8 16.8L19.4 15Z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertCircleIcon({ stroke = colors.highlight }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        stroke={stroke}
        strokeWidth={2}
      />
      <Path d="M12 8V12" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16H12.01" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

function AgendaSpotlightIcon() {
  return (
    <Svg width={92} height={72} viewBox="0 0 92 72" fill="none">
      <Path d="M28 18C28 13.6 31.6 10 36 10H68C72.4 10 76 13.6 76 18V48C76 52.4 72.4 56 68 56H36C31.6 56 28 52.4 28 48V18Z" fill="#F4EEFF" />
      <Path d="M28 22H76V18C76 13.6 72.4 10 68 10H36C31.6 10 28 13.6 28 18V22Z" fill="#D8C6FF" />
      <Path d="M39 7V15" stroke="#8D74F2" strokeWidth={4} strokeLinecap="round" />
      <Path d="M65 7V15" stroke="#8D74F2" strokeWidth={4} strokeLinecap="round" />
      <Path d="M39 30H47" stroke="#C3B1FF" strokeWidth={4} strokeLinecap="round" />
      <Path d="M52 30H60" stroke="#C3B1FF" strokeWidth={4} strokeLinecap="round" />
      <Path d="M39 39H47" stroke="#C3B1FF" strokeWidth={4} strokeLinecap="round" />
      <Path d="M52 39H60" stroke="#C3B1FF" strokeWidth={4} strokeLinecap="round" />
      <Path d="M14 18L16 22" stroke="#FFB14A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M10 28L14 29" stroke="#6B4EEB" strokeWidth={3} strokeLinecap="round" />
      <Path d="M20 32L22 36" stroke="#7ED4F7" strokeWidth={3} strokeLinecap="round" />
      <Path d="M79 14L81 18" stroke="#6B4EEB" strokeWidth={3} strokeLinecap="round" />
      <Path d="M84 24L88 25" stroke="#FFB14A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M74 30L76 34" stroke="#7ED4F7" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

function ChecklistIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 11L11 13L15 9M7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4Z"
        stroke={colors.highlight}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 17H15" stroke={colors.highlight} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SummaryMetricIcon({ kind }: { kind: "earnings" | "rides" | "time" | "distance" }) {
  const stroke = colors.highlight;

  if (kind === "earnings") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3V21M16 7.5C16 6.1 14.2 5 12 5C9.8 5 8 6.1 8 7.5C8 8.9 9.8 10 12 10C14.2 10 16 11.1 16 12.5C16 13.9 14.2 15 12 15C9.8 15 8 13.9 8 12.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === "rides") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M5 15L7 9H17L19 15M6 18H7M17 18H18M5 15H19V18C19 18.6 18.6 19 18 19H6C5.4 19 5 18.6 5 18V15Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === "time") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M12 8V12L15 15" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 12C3 7 7 3 12 3C17 3 21 7 21 12C21 17 17 21 12 21C7 21 3 17 3 12Z" stroke={stroke} strokeWidth={2} />
      </Svg>
    );
  }

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M14 6L20 12L14 18" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 12H20" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function CountdownClockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 7V12L15 9" stroke="#2B2221" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21Z" stroke="#2B2221" strokeWidth={2} />
    </Svg>
  );
}

function CalendarMiniIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3V6M17 3V6M4 9H20M6 5H18C19.1 5 20 5.9 20 7V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V7C4 5.9 4.9 5 6 5Z"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ stroke = colors.textMuted }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6L15 12L9 18"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronLeftIcon({ stroke = colors.textMuted }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6L9 12L15 18"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDownIcon({ stroke = colors.textMuted }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronUpIcon({ stroke = colors.textMuted }: { stroke?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 15L12 9L18 15"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuListIcon({
  kind
}: {
  kind: "profile" | "vehicle" | "earnings" | "history" | "preferences" | "support" | "logout";
}) {
  const stroke = kind === "logout" ? "#BE2E2E" : colors.highlight;

  if (kind === "profile") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 12C14.8 12 17 9.8 17 7C17 4.2 14.8 2 12 2C9.2 2 7 4.2 7 7C7 9.8 9.2 12 12 12Z" stroke={stroke} strokeWidth={2} />
        <Path d="M4 21C4 17.7 7.6 15 12 15C16.4 15 20 17.7 20 21" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === "vehicle") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M5 15L7 9H17L19 15M6 18H7M17 18H18M5 15H19V18C19 18.6 18.6 19 18 19H6C5.4 19 5 18.6 5 18V15Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === "earnings") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3V21M16 7.5C16 6.1 14.2 5 12 5C9.8 5 8 6.1 8 7.5C8 8.9 9.8 10 12 10C14.2 10 16 11.1 16 12.5C16 13.9 14.2 15 12 15C9.8 15 8 13.9 8 12.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === "history") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 8V12L15 15" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 12C3 7 7 3 12 3C17 3 21 7 21 12C21 17 17 21 12 21C8.9 21 6.1 19.4 4.5 17" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === "support") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 18H12.01M9.1 9.5C9.3 8.1 10.5 7 12 7C13.7 7 15 8.3 15 10C15 11.7 13 12.2 13 14" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
        <Path d="M4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12 20C10.2 20 8.5 19.4 7.2 18.3L4 19L4.8 15.9C4.3 14.7 4 13.4 4 12Z" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === "preferences") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 8.5C10.1 8.5 8.5 10.1 8.5 12C8.5 13.9 10.1 15.5 12 15.5C13.9 15.5 15.5 13.9 15.5 12C15.5 10.1 13.9 8.5 12 8.5Z"
          stroke={stroke}
          strokeWidth={2}
        />
        <Path
          d="M19.4 15C19.5 14.7 19.7 14.4 19.8 14.1L21.5 13.4V10.6L19.8 9.9C19.7 9.6 19.5 9.3 19.4 9L19.8 7.2L17.8 5.2L16 5.6C15.7 5.5 15.4 5.3 15.1 5.2L14.4 3.5H11.6L10.9 5.2C10.6 5.3 10.3 5.5 10 5.6L8.2 5.2L6.2 7.2L6.6 9C6.5 9.3 6.3 9.6 6.2 9.9L4.5 10.6V13.4L6.2 14.1C6.3 14.4 6.5 14.7 6.6 15L6.2 16.8L8.2 18.8L10 18.4C10.3 18.5 10.6 18.7 10.9 18.8L11.6 20.5H14.4L15.1 18.8C15.4 18.7 15.7 18.5 16 18.4L17.8 18.8L19.8 16.8L19.4 15Z"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6L3 12L9 18" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12H4" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function getNextAssignedRide(rides: Ride[]): Ride | undefined {
  const now = Date.now();

  const upcomingRides = rides.filter(
    (ride) => ride.status !== "COMPLETED" && ride.driverStage !== "COMPLETED"
      && new Date(ride.scheduledAt).getTime() >= now
  );

  return [...upcomingRides].sort(
    (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
  )[0];
}

function isSameLocalDay(value: string, nowMs: number): boolean {
  const current = new Date(nowMs);
  const target = new Date(value);

  return (
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth() &&
    current.getDate() === target.getDate()
  );
}

function getTodayAgendaRides(rides: Ride[], nowMs: number): Ride[] {
  return rides.filter((ride) => isSameLocalDay(ride.scheduledAt, nowMs));
}

function formatDurationHours(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "0h";
  }

  const roundedHours = totalMinutes / 60;
  return roundedHours >= 1 ? `${roundedHours.toFixed(1).replace(".", ",")}h` : `${totalMinutes}min`;
}

function formatTimeUntil(value?: string, nowMs = Date.now()): string {
  if (!value) {
    return "-";
  }

  const diffMs = new Date(value).getTime() - nowMs;
  const diffMinutes = Math.round(diffMs / 60_000);

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

  if (hours < 24) {
    return minutes > 0 ? `Faltam ${hours}h ${minutes}min` : `Faltam ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `Faltam ${days}d ${remainingHours}h` : `Faltam ${days}d`;
}

function getDecisionWindowRemainingSeconds(ride: Ride, nowMs: number): number {
  if (!ride.decisionWindow?.expiresAt) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(ride.decisionWindow.expiresAt).getTime() - nowMs) / 1000));
}

function getDecisionWindowProgress(ride: Ride, nowMs: number): number {
  if (!ride.decisionWindow?.totalSeconds) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, getDecisionWindowRemainingSeconds(ride, nowMs) / ride.decisionWindow.totalSeconds)
  );
}

function getPriorityQueueRide(rides: Ride[], nowMs: number): Ride | undefined {
  return [...rides].sort((left, right) => {
    const leftRemaining = getDecisionWindowRemainingSeconds(left, nowMs);
    const rightRemaining = getDecisionWindowRemainingSeconds(right, nowMs);

    if (leftRemaining > 0 && rightRemaining > 0) {
      return leftRemaining - rightRemaining;
    }

    if (leftRemaining > 0) {
      return -1;
    }

    if (rightRemaining > 0) {
      return 1;
    }

    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
  })[0];
}

function formatDecisionCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function formatShortDate(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  })
    .format(new Date(value))
    .replace(".", "");
}

function toDateKey(value?: string | Date): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatMonthYear(value: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(value);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatAgendaDayLabel(dateKey: string): string {
  if (!dateKey) {
    return "Selecione um dia";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(parseDateKey(dateKey));
}

function formatAgendaDayWeekday(dateKey: string): string {
  if (!dateKey) {
    return "Dia";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long"
  }).format(parseDateKey(dateKey));
}

function getWeekStart(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function formatAgendaWeekday(value: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(value).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1, 3);
}

function addDays(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount);
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function formatAgendaWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(start);
    return `${String(start.getDate()).padStart(2, "0")} - ${String(end.getDate()).padStart(2, "0")} ${month}`;
  }

  const startLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(start)
    .replace(".", "");
  const endLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(end)
    .replace(".", "");
  return `${startLabel} - ${endLabel}`;
}

function formatRelativeDayLabel(value?: string, nowMs = Date.now()): string {
  if (!value) {
    return "-";
  }

  if (isSameLocalDay(value, nowMs)) {
    return "Hoje";
  }

  const tomorrow = new Date(nowMs);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalDay(value, tomorrow.getTime())) {
    return "Amanha";
  }

  return formatShortDate(value);
}

function formatTimeUntilCompactLabel(value?: string, nowMs = Date.now()): string {
  if (!value) {
    return "--";
  }

  const diffMs = new Date(value).getTime() - nowMs;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${String(diffMinutes).padStart(2, "0")} MIN`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}H ${String(minutes).padStart(2, "0")}` : `${hours}H`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}D ${remainingHours}H` : `${days}D`;
}

function formatTimeUntilVisualText(value?: string, nowMs = Date.now()): string {
  if (!value) {
    return "--";
  }

  const diffMs = new Date(value).getTime() - nowMs;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${String(diffMinutes).padStart(2, "0")}min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

function getUpcomingRideProgress(value?: string, nowMs = Date.now()): number {
  if (!value) {
    return 0;
  }

  const diffMs = new Date(value).getTime() - nowMs;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));
  const clamped = Math.min(diffMinutes, 24 * 60);
  return 1 - clamped / (24 * 60);
}

function formatCompactAddress(value?: string): string {
  if (!value) {
    return "-";
  }

  const sanitized = value
    .replace(/,\s*Brasil$/i, "")
    .replace(/,\s*\d{5}-?\d{3}(?=,|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = sanitized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return sanitized;
}

function formatCompactRoute(origin?: string, destination?: string): string {
  return `${formatCompactAddress(origin)} -> ${formatCompactAddress(destination)}`;
}

function getDecisionTone(remainingSeconds: number): "safe" | "warning" | "critical" {
  if (remainingSeconds <= 5 * 60) {
    return "critical";
  }

  if (remainingSeconds <= 10 * 60) {
    return "warning";
  }

  return "safe";
}

function getNextAgendaAction(ride: Ride): { label: string; endpoint: string } | null {
  if (ride.driverStage === "IN_PROGRESS") {
    return {
      label: "Finalizar corrida",
      endpoint: "complete"
    };
  }

  if (ride.driverStage === "ARRIVED") {
    return {
      label: "Iniciar corrida",
      endpoint: "start"
    };
  }

  if (ride.driverStage === "EN_ROUTE_PICKUP") {
    return {
      label: "Marcar chegada",
      endpoint: "arrived"
    };
  }

  if (!ride.driverStage || ride.driverStage === "SCHEDULED") {
    return {
      label: "Ir para embarque",
      endpoint: "go-to-pickup"
    };
  }

  return null;
}

function getAgendaRides(rides: Ride[]): Ride[] {
  return rides
    .filter((ride) => ride.status === "ACCEPTED" && ride.driverStage !== "COMPLETED")
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
}

function canDriverEmergencyCancelRide(ride: Ride): boolean {
  return (
    ride.status === "ACCEPTED" &&
    (!ride.driverStage || ["SCHEDULED", "EN_ROUTE_PICKUP", "ARRIVED"].includes(ride.driverStage))
  );
}

function getStageLabel(ride: Ride): string {
  if (ride.driverStage === "EN_ROUTE_PICKUP") {
    return "A caminho";
  }

  if (ride.driverStage === "ARRIVED") {
    return "Cheguei";
  }

  if (ride.driverStage === "IN_PROGRESS") {
    return "Em andamento";
  }

  return "Agendada";
}

function getStageTone(ride: Ride): "default" | "warning" | "success" {
  if (ride.driverStage === "ARRIVED") {
    return "warning";
  }

  if (ride.driverStage === "IN_PROGRESS") {
    return "success";
  }

  return "default";
}

export default function DriverHomeScreen() {
  const pathname = usePathname();
  const isScreenActive = pathname === "/home";
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<DriverLoginResult | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [queueReloadKey, setQueueReloadKey] = useState(0);
  const [queueRides, setQueueRides] = useState<Ride[]>([]);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [fleetVehicleChecklist, setFleetVehicleChecklist] = useState<DriverFleetVehicleDetails | null>(null);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [isAgendaLoading, setIsAgendaLoading] = useState(false);
  const [queueStatusMessage, setQueueStatusMessage] = useState("");
  const [homeStatusMessage, setHomeStatusMessage] = useState("");
  const [agendaStatusMessage, setAgendaStatusMessage] = useState("");
  const [menuStatusMessage, setMenuStatusMessage] = useState("");
  const [queueActionRideId, setQueueActionRideId] = useState<string | null>(null);
  const [agendaActionRideId, setAgendaActionRideId] = useState<string | null>(null);
  const [pendingQueueDecision, setPendingQueueDecision] = useState<{
    rideId: string;
    customerName: string;
    decision: "ACCEPT" | "REJECT";
  } | null>(null);
  const [isAgendaSettingsModalOpen, setIsAgendaSettingsModalOpen] = useState(false);
  const [isAgendaDayCancelModalOpen, setIsAgendaDayCancelModalOpen] = useState(false);
  const [selectedAgendaDayCancelReason, setSelectedAgendaDayCancelReason] =
    useState<DriverEmergencyCancellationReason>("DRIVER_ILLNESS");
  const [isAgendaDayCancelSubmitting, setIsAgendaDayCancelSubmitting] = useState(false);
  const [isMockRideLoading, setIsMockRideLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [agendaViewMode, setAgendaViewMode] = useState<"week" | "month">("week");
  const [selectedAgendaDateKey, setSelectedAgendaDateKey] = useState("");
  const tabTranslateX = useRef(new Animated.Value(0)).current;
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const isTabTransitioningRef = useRef(false);

  useEffect(() => {
    void loadStoredDriverSession().then((storedSession) => {
      if (!storedSession) {
        router.replace("/");
        return;
      }

      if (storedSession.driver.driverType === "FROTA" && !storedSession.driver.currentFleetVehicle) {
        router.replace("/vehicle");
        return;
      }

      setSession(storedSession);
    });
  }, []);

  const driverId = session?.driver.id;
  const nextRide = useMemo(() => getNextAssignedRide(myRides), [myRides]);
  const nextQueueRide = useMemo(() => getPriorityQueueRide(queueRides, nowMs), [queueRides, nowMs]);
  const additionalPendingQueueCount = useMemo(
    () => Math.max(0, queueRides.length - (nextQueueRide ? 1 : 0)),
    [queueRides.length, nextQueueRide]
  );
  const activeAssignedRides = useMemo(
    () => myRides.filter((ride) => ride.status !== "COMPLETED" && ride.driverStage !== "COMPLETED"),
    [myRides]
  );
  const agendaRides = useMemo(() => getAgendaRides(myRides), [myRides]);
  const todayAgendaRides = useMemo(() => getTodayAgendaRides(agendaRides, nowMs), [agendaRides, nowMs]);
  const todayDateKey = useMemo(() => toDateKey(new Date(nowMs)), [nowMs]);
  const todayVisibleAgendaRides = useMemo(() => todayAgendaRides.slice(0, 3), [todayAgendaRides]);
  const inProgressRidesCount = useMemo(
    () => agendaRides.filter((ride) => ride.driverStage === "IN_PROGRESS").length,
    [agendaRides]
  );
  const todaySummary = useMemo(() => {
    const totalAmount = todayAgendaRides.reduce((sum, ride) => sum + (ride.quote?.amount ?? 0), 0);
    const totalMinutes = todayAgendaRides.reduce((sum, ride) => sum + (ride.quote?.routeDurationMinutes ?? 0), 0);
    const totalDistanceKm = todayAgendaRides.reduce((sum, ride) => sum + (ride.quote?.routeDistanceKm ?? 0), 0);

    return {
      amount: totalAmount,
      rides: todayAgendaRides.length,
      durationMinutes: totalMinutes,
      distanceKm: totalDistanceKm
    };
  }, [todayAgendaRides]);
  const agendaReferenceDate = useMemo(
    () => (selectedAgendaDateKey ? parseDateKey(selectedAgendaDateKey) : new Date(nowMs)),
    [nowMs, selectedAgendaDateKey]
  );
  const agendaMonthStart = useMemo(
    () => new Date(agendaReferenceDate.getFullYear(), agendaReferenceDate.getMonth(), 1),
    [agendaReferenceDate]
  );
  const agendaMonthEnd = useMemo(
    () => new Date(agendaMonthStart.getFullYear(), agendaMonthStart.getMonth() + 1, 0),
    [agendaMonthStart]
  );
  const agendaDateStats = useMemo(() => {
    const stats = new Map<string, { count: number; amount: number }>();

    for (const ride of agendaRides) {
      const key = toDateKey(ride.scheduledAt);
      const current = stats.get(key) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += ride.quote?.amount ?? 0;
      stats.set(key, current);
    }

    return stats;
  }, [agendaRides]);
  const agendaCalendarCells = useMemo(() => {
    const cells: Array<
      | {
          key: string;
          dayNumber: number;
          rideCount: number;
          amount: number;
          isToday: boolean;
          isPast: boolean;
        }
      | null
    > = [];
    const firstWeekday = agendaMonthStart.getDay();
    const totalDays = agendaMonthEnd.getDate();
    const todayKey = toDateKey(new Date(nowMs));

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(agendaMonthStart.getFullYear(), agendaMonthStart.getMonth(), day);
      const key = toDateKey(date);
      const stats = agendaDateStats.get(key);

      cells.push({
        key,
        dayNumber: day,
        rideCount: stats?.count ?? 0,
        amount: stats?.amount ?? 0,
        isToday: key === todayKey,
        isPast: key < todayKey
      });
    }

    return cells;
  }, [agendaDateStats, agendaMonthEnd, agendaMonthStart, nowMs]);
  const agendaMonthLabel = useMemo(() => formatMonthYear(agendaMonthStart), [agendaMonthStart]);
  const agendaWeekCells = useMemo(() => {
    const start = getWeekStart(agendaReferenceDate);
    const todayKey = toDateKey(new Date(nowMs));

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = toDateKey(date);
      const stats = agendaDateStats.get(key);

      return {
        key,
        weekday: formatAgendaWeekday(date),
        dayNumber: date.getDate(),
        rideCount: stats?.count ?? 0,
        isToday: key === todayKey,
        isPast: key < todayKey
      };
    });
  }, [agendaDateStats, agendaReferenceDate, nowMs]);
  const agendaWeekRangeLabel = useMemo(() => {
    if (agendaWeekCells.length === 0) {
      return "";
    }

    return formatAgendaWeekRange(parseDateKey(agendaWeekCells[0].key), parseDateKey(agendaWeekCells[6].key));
  }, [agendaWeekCells]);
  const selectedAgendaRides = useMemo(
    () => agendaRides.filter((ride) => toDateKey(ride.scheduledAt) === selectedAgendaDateKey),
    [agendaRides, selectedAgendaDateKey]
  );
  const selectedAgendaSummary = useMemo(() => {
    const totalAmount = selectedAgendaRides.reduce((sum, ride) => sum + (ride.quote?.amount ?? 0), 0);
    const totalMinutes = selectedAgendaRides.reduce((sum, ride) => sum + (ride.quote?.routeDurationMinutes ?? 0), 0);
    const totalDistanceKm = selectedAgendaRides.reduce((sum, ride) => sum + (ride.quote?.routeDistanceKm ?? 0), 0);

    return {
      count: selectedAgendaRides.length,
      amount: totalAmount,
      durationMinutes: totalMinutes,
      distanceKm: totalDistanceKm
    };
  }, [selectedAgendaRides]);
  const selectedCancelableAgendaRides = useMemo(
    () => selectedAgendaRides.filter((ride) => canDriverEmergencyCancelRide(ride)),
    [selectedAgendaRides]
  );
  const fleetChecklistProgress = useMemo(() => {
    const requiredItems =
      fleetVehicleChecklist?.checklist.filter(
        (item) => item.routine === "START_OF_DAY" && item.isRequired
      ) ?? [];
    const total = requiredItems.length;
    const completed = requiredItems.filter((item) => item.isChecked).length;

    return {
      total,
      completed,
      pending: Math.max(0, total - completed)
    };
  }, [fleetVehicleChecklist]);
  const isQueueDecisionSubmitting = pendingQueueDecision ? queueActionRideId === pendingQueueDecision.rideId : false;
  const shiftAgendaSelection = useEffectEvent((direction: -1 | 1) => {
    const baseDate = selectedAgendaDateKey ? parseDateKey(selectedAgendaDateKey) : new Date(nowMs);
    const nextDate =
      agendaViewMode === "week" ? addDays(baseDate, direction * 7) : addMonths(baseDate, direction);
    setSelectedAgendaDateKey(toDateKey(nextDate));
  });

  useEffect(() => {
    const availableKeys = new Set(
      agendaCalendarCells.filter((cell): cell is Exclude<(typeof agendaCalendarCells)[number], null> => cell !== null).map((cell) => cell.key)
    );

    if (selectedAgendaDateKey && availableKeys.has(selectedAgendaDateKey)) {
      return;
    }

    const firstRideKey = agendaCalendarCells.find((cell) => cell && cell.rideCount > 0)?.key;
    const todayKey = toDateKey(new Date(nowMs));
    const fallbackKey = availableKeys.has(todayKey)
      ? todayKey
      : agendaCalendarCells.find((cell): cell is Exclude<(typeof agendaCalendarCells)[number], null> => cell !== null)?.key ?? "";

    setSelectedAgendaDateKey(firstRideKey ?? fallbackKey);
  }, [agendaCalendarCells, nowMs, selectedAgendaDateKey]);

  const loadHomeSummary = useEffectEvent(async (options?: { silent?: boolean }) => {
    if (!driverId || activeTab !== "home") {
      return;
    }

    if (!options?.silent) {
      setIsHomeLoading(true);
    }

    try {
      const freshProfile = await request<DriverProfile>(`/drivers/${driverId}`);
      setSession((current) => {
        if (!current) {
          return current;
        }

        const nextSession = { ...current, driver: freshProfile };
        void saveStoredDriverSession(nextSession);
        return nextSession;
      });

      if (freshProfile.driverType === "FROTA" && !freshProfile.currentFleetVehicle) {
        setFleetVehicleChecklist(null);
        setQueueRides([]);
        setMyRides([]);
        setHomeStatusMessage("Valide um carro da frota antes de iniciar a operacao.");
        router.replace("/vehicle");
        return;
      }

      const [availableRides, assignedRides] = await Promise.all([
        request<Ride[]>(`/drivers/${driverId}/available-rides?includeScheduleFit=false`),
        request<Ride[]>(`/drivers/${driverId}/my-rides?includeScheduleFit=false`)
      ]);

      setQueueRides(availableRides);
      setMyRides(assignedRides);

      if (freshProfile.driverType === "FROTA") {
        try {
          const activeFleetVehicle = await request<DriverFleetVehicleDetails>(`/drivers/${driverId}/fleet-vehicle`);
          setFleetVehicleChecklist(activeFleetVehicle);
        } catch {
          setFleetVehicleChecklist(null);
        }
      } else {
        setFleetVehicleChecklist(null);
      }

      setHomeStatusMessage(options?.silent ? "Resumo atualizado automaticamente." : "Resumo atualizado agora.");
    } catch (error) {
      setHomeStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o resumo.");
    } finally {
      if (!options?.silent) {
        setIsHomeLoading(false);
      }
    }
  });

  const loadQueue = useEffectEvent(async (options?: { silent?: boolean }) => {
    if (!driverId || activeTab !== "queue" || queueActionRideId) {
      return;
    }

    if (!options?.silent) {
      setIsQueueLoading(true);
    }

    try {
      const rides = await request<Ride[]>(`/drivers/${driverId}/available-rides?includeScheduleFit=false`);
      setQueueRides(rides);
      setQueueStatusMessage(
        rides.length === 0
          ? "Nenhuma corrida pendente no momento."
          : options?.silent
            ? `${rides.length} corrida(s) aguardando aceite. Atualizado automaticamente.`
            : `${rides.length} corrida(s) aguardando aceite.`
      );
    } catch (error) {
      setQueueStatusMessage(error instanceof Error ? error.message : "Falha ao carregar a fila.");
    } finally {
      if (!options?.silent) {
        setIsQueueLoading(false);
      }
    }
  });

  const loadAgenda = useEffectEvent(async (options?: { silent?: boolean }) => {
    if (!driverId || activeTab !== "agenda" || agendaActionRideId) {
      return;
    }

    if (!options?.silent) {
      setIsAgendaLoading(true);
    }

    try {
      const rides = await request<Ride[]>(`/drivers/${driverId}/my-rides?includeScheduleFit=false`);
      setMyRides(rides);
      const nextAgendaRides = getAgendaRides(rides);
      setAgendaStatusMessage(
        nextAgendaRides.length === 0
          ? "Nenhuma corrida aceita no momento."
          : options?.silent
            ? `${nextAgendaRides.length} corrida(s) ativa(s) na sua agenda. Atualizado automaticamente.`
            : `${nextAgendaRides.length} corrida(s) ativa(s) na sua agenda.`
      );
    } catch (error) {
      setAgendaStatusMessage(error instanceof Error ? error.message : "Falha ao carregar a agenda.");
    } finally {
      if (!options?.silent) {
        setIsAgendaLoading(false);
      }
    }
  });

  const refreshActiveTab = useEffectEvent(async (options?: { silent?: boolean }) => {
    if (activeTab === "home") {
      await loadHomeSummary(options);
      return;
    }

    if (activeTab === "queue") {
      await loadQueue(options);
      return;
    }

    if (activeTab === "agenda") {
      await loadAgenda(options);
    }
  });

  const animateToTab = useEffectEvent((nextTab: HomeTab) => {
    if (nextTab === activeTab || isTabTransitioningRef.current) {
      return;
    }

    const currentIndex = HOME_TAB_ORDER.indexOf(activeTab);
    const nextIndex = HOME_TAB_ORDER.indexOf(nextTab);
    const direction: -1 | 1 = nextIndex > currentIndex ? 1 : -1;
    const startOffset = direction * TAB_TRANSITION_OFFSET_PX;

    isTabTransitioningRef.current = true;

    Animated.parallel([
      Animated.timing(tabTranslateX, {
        toValue: -startOffset * 0.35,
        duration: TAB_TRANSITION_OUT_DURATION_MS,
        useNativeDriver: true
      }),
      Animated.timing(tabOpacity, {
        toValue: 0.9,
        duration: TAB_TRANSITION_OUT_DURATION_MS,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (!finished) {
        isTabTransitioningRef.current = false;
        tabTranslateX.setValue(0);
        tabOpacity.setValue(1);
        return;
      }

      setActiveTab(nextTab);
      tabTranslateX.setValue(startOffset);
      tabOpacity.setValue(0.82);

      Animated.parallel([
        Animated.timing(tabTranslateX, {
          toValue: 0,
          duration: TAB_TRANSITION_IN_DURATION_MS,
          useNativeDriver: true
        }),
        Animated.timing(tabOpacity, {
          toValue: 1,
          duration: TAB_TRANSITION_IN_DURATION_MS,
          useNativeDriver: true
        })
      ]).start(() => {
        isTabTransitioningRef.current = false;
      });
    });
  });

  const shiftActiveTab = useEffectEvent((direction: -1 | 1) => {
    const currentIndex = HOME_TAB_ORDER.indexOf(activeTab);
    if (currentIndex < 0) {
      return;
    }

    const nextTab = HOME_TAB_ORDER[currentIndex + direction];
    if (!nextTab) {
      return;
    }

    animateToTab(nextTab);
  });

  const tabSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (isSidebarOpen || isTabTransitioningRef.current) {
            return false;
          }

          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          return absDx > TAB_SWIPE_ACTIVATION_PX && absDx > absDy * 1.35;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx <= -TAB_SWIPE_TRIGGER_PX) {
            shiftActiveTab(1);
            return;
          }

          if (gestureState.dx >= TAB_SWIPE_TRIGGER_PX) {
            shiftActiveTab(-1);
          }
        }
      }),
    [isSidebarOpen, shiftActiveTab]
  );

  async function handleSignOut() {
    setIsSidebarOpen(false);

    if (session?.driver.id) {
      await unregisterDriverPushNotifications(session.driver.id);
    }

    await clearStoredDriverSession();
    setSession(null);
    router.replace("/");
  }

  async function handleQueueDecision(rideId: string, decision: "ACCEPT" | "REJECT") {
    if (!driverId || queueActionRideId) {
      return;
    }

    setQueueActionRideId(rideId);

    try {
      const updatedRide = await request<Ride>(`/drivers/${driverId}/rides/${rideId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision })
      });

      setQueueRides((current) => current.filter((ride) => ride.id !== rideId));
      setQueueStatusMessage(
        decision === "ACCEPT"
          ? "Corrida aceita e movida para a agenda."
          : "Corrida recusada e removida da fila."
      );

      if (decision === "ACCEPT") {
        setMyRides((current) => {
          const next = current.filter((ride) => ride.id !== updatedRide.id);
          return [updatedRide, ...next];
        });
        setAgendaStatusMessage("Nova corrida adicionada a sua agenda.");
        setHomeStatusMessage("Corrida aceita com sucesso.");
      }
    } catch (error) {
      setQueueStatusMessage(error instanceof Error ? error.message : "Falha ao responder a corrida.");
    } finally {
      setQueueActionRideId(null);
      setPendingQueueDecision((current) => (current?.rideId === rideId ? null : current));
    }
  }

  async function handleAgendaAction(ride: Ride) {
    if (!driverId || agendaActionRideId) {
      return;
    }

    const nextAction = getNextAgendaAction(ride);
    if (!nextAction) {
      return;
    }

    setAgendaActionRideId(ride.id);

    try {
      const updatedRide = await request<Ride>(`/drivers/${driverId}/rides/${ride.id}/${nextAction.endpoint}`, {
        method: "POST"
      });

      setMyRides((current) => current.map((entry) => (entry.id === updatedRide.id ? updatedRide : entry)));
      setAgendaStatusMessage(`${nextAction.label} executado com sucesso.`);
      setHomeStatusMessage(`${nextAction.label} executado com sucesso.`);
    } catch (error) {
      setAgendaStatusMessage(error instanceof Error ? error.message : "Falha ao atualizar a corrida.");
    } finally {
      setAgendaActionRideId(null);
    }
  }

  async function handleAgendaDayEmergencyCancellation() {
    if (!driverId || !selectedAgendaDateKey || isAgendaDayCancelSubmitting || selectedCancelableAgendaRides.length === 0) {
      return;
    }

    setIsAgendaDayCancelSubmitting(true);

    try {
      const releasedRides = await request<Ride[]>(`/drivers/${driverId}/rides/emergency-cancel-day`, {
        method: "POST",
        body: JSON.stringify({
          dateKey: selectedAgendaDateKey,
          reason: selectedAgendaDayCancelReason
        })
      });

      const releasedIds = new Set(releasedRides.map((ride) => ride.id));
      setMyRides((current) => current.filter((ride) => !releasedIds.has(ride.id)));
      setAgendaStatusMessage(
        `${releasedRides.length} ${releasedRides.length === 1 ? "corrida foi devolvida" : "corridas foram devolvidas"} para redistribuicao.`
      );
      setHomeStatusMessage("Cancelamento emergencial do dia registrado.");
      setIsAgendaDayCancelModalOpen(false);
    } catch (error) {
      setAgendaStatusMessage(error instanceof Error ? error.message : "Falha ao cancelar as corridas do dia.");
    } finally {
      setIsAgendaDayCancelSubmitting(false);
    }
  }

  async function handleMockIncomingRide() {
    if (!driverId || isMockRideLoading) {
      return;
    }

    setIsMockRideLoading(true);
    setMenuStatusMessage("Buscando corrida para teste...");

    try {
      const [availableRides, driverRides] = await Promise.all([
        request<Ride[]>(`/drivers/${driverId}/available-rides?includeScheduleFit=false`),
        request<Ride[]>(`/drivers/${driverId}/my-rides?includeScheduleFit=false`)
      ]);
      const firstRide =
        availableRides[0] ??
        driverRides.find((ride) => ride.status === "ACCEPTED" && ride.driverStage !== "COMPLETED") ??
        driverRides[0];

      if (!firstRide) {
        setMenuStatusMessage("Nao existe corrida disponivel para teste agora.");
        return;
      }

      setMenuStatusMessage(`Abrindo corrida ${firstRide.customerName} para teste.`);
      router.push({
        pathname: "/ride/[rideId]",
        params: { rideId: firstRide.id }
      });
    } catch (error) {
      setMenuStatusMessage(error instanceof Error ? error.message : "Falha ao simular nova corrida.");
    } finally {
      setIsMockRideLoading(false);
    }
  }

  useEffect(() => {
    if (!driverId) {
      return;
    }

    void registerDriverPushNotifications(driverId);
  }, [driverId]);

  useEffect(() => {
    if (!isScreenActive) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => clearInterval(intervalId);
  }, [isScreenActive]);

  useEffect(() => {
    if (!isScreenActive) {
      return;
    }

    void refreshActiveTab();
  }, [activeTab, driverId, isScreenActive, queueReloadKey]);

  useEffect(() => {
    if (!isScreenActive || !driverId || !["home", "queue", "agenda"].includes(activeTab)) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshActiveTab({ silent: true });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [activeTab, driverId, isScreenActive]);

  useEffect(() => {
    if (!isScreenActive || !driverId) {
      return;
    }

    let currentAppState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const isReturningToForeground =
        (currentAppState === "background" || currentAppState === "inactive") && nextAppState === "active";

      currentAppState = nextAppState;

      if (isReturningToForeground) {
        void refreshActiveTab({ silent: true });
      }
    });

    return () => subscription.remove();
  }, [driverId, isScreenActive]);

  if (!session) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.topSafeArea} edges={["top", "left", "right"]} />
        <View style={styles.screen} />
      </View>
    );
  }

  const menuContent = (
    <>
      <View style={styles.menuProfileCard}>
        <View style={styles.menuProfileAvatar}>
          <Text style={styles.menuProfileAvatarLabel}>{getInitial(session.driver.name)}</Text>
        </View>

        <View style={styles.menuProfileCopy}>
          <Text style={styles.menuProfileName}>{session.driver.name}</Text>
          <Text style={styles.menuProfileMeta}>{session.driver.cpf}</Text>
          <Text style={styles.menuProfileMeta}>
            {session.driver.vehicle || "Nenhum veiculo ativo"}
          </Text>
        </View>
      </View>

      <View style={styles.menuList}>
        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setIsSidebarOpen(false);
            router.push("/profile");
          }}
        >
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="profile" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Meu perfil</Text>
              <Text style={styles.menuItemBody}>Dados pessoais e informacoes cadastrais</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setIsSidebarOpen(false);
            router.push("/vehicle");
          }}
        >
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="vehicle" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Veiculo ativo</Text>
              <Text style={styles.menuItemBody}>Placa, modelo e configuracao atual</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="earnings" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Ganhos</Text>
              <Text style={styles.menuItemBody}>Resumo financeiro e repasses</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setIsSidebarOpen(false);
            router.push("/history");
          }}
        >
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="history" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Historico</Text>
              <Text style={styles.menuItemBody}>Corridas concluidas e operacao recente</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setIsSidebarOpen(false);
            router.push("/preferences");
          }}
        >
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="preferences" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Preferencias</Text>
              <Text style={styles.menuItemBody}>Aceites, GPS, alertas e comportamento do app</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable style={styles.mockMenuItem} onPress={() => void handleMockIncomingRide()}>
          <View style={styles.menuItemLeading}>
            <View style={[styles.menuItemIconWrap, styles.mockMenuItemIconWrap]}>
              <MenuListIcon kind="support" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.mockMenuItemTitle}>Teste de nova corrida</Text>
              <Text style={styles.menuItemBody}>Abre o detalhe da primeira corrida pendente para validacao</Text>
            </View>
          </View>
          {isMockRideLoading ? <ActivityIndicator color={colors.highlight} size="small" /> : <ChevronRightIcon />}
        </Pressable>

        {menuStatusMessage ? (
          <View style={styles.menuStatusCard}>
            <Text style={styles.menuStatusText}>{menuStatusMessage}</Text>
          </View>
        ) : null}

        <Pressable style={styles.menuItem}>
          <View style={styles.menuItemLeading}>
            <View style={styles.menuItemIconWrap}>
              <MenuListIcon kind="support" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>Suporte</Text>
              <Text style={styles.menuItemBody}>Ajuda, atendimento e contato com a operacao</Text>
            </View>
          </View>
          <ChevronRightIcon />
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => void handleSignOut()}>
        <View style={styles.menuItemLeading}>
          <View style={[styles.menuItemIconWrap, styles.logoutIconWrap]}>
            <MenuListIcon kind="logout" />
          </View>
          <View style={styles.menuItemCopy}>
            <Text style={styles.logoutTitle}>Sair</Text>
            <Text style={styles.logoutBody}>Encerrar sessao neste aparelho</Text>
          </View>
        </View>
      </Pressable>
    </>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.topSafeArea} edges={["top", "left", "right"]} />
      <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} {...tabSwipeResponder.panHandlers}>
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerBrandWrap}>
              <BrandLogo color={colors.highlight} width={108} height={26} />
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.headerActionButton}>
                <NotificationIcon active={false} />
              </Pressable>

              <Pressable style={styles.headerActionButton} onPress={() => setIsSidebarOpen(true)}>
                <MenuIcon active={false} />
              </Pressable>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.tabContent,
            {
              opacity: tabOpacity,
              transform: [{ translateX: tabTranslateX }]
            }
          ]}
        >
        {activeTab === "home" ? (
          <>
            {nextQueueRide ? (
              <Pressable
                style={styles.homeRequestCard}
                onPress={() => animateToTab("queue")}
              >
                <View style={styles.homeRequestHeader}>
                  <Text style={styles.homeRequestEyebrow}>Novas Solicitacoes</Text>

                  <Pressable
                    style={styles.homeRequestRefreshButton}
                    onPress={() => setQueueReloadKey((current) => current + 1)}
                    hitSlop={8}
                  >
                    <RefreshIcon stroke={colors.highlight} />
                  </Pressable>
                </View>

                <View style={styles.homeRequestMainRow}>
                  <View style={styles.homeRequestTimeBlock}>
                    <Text style={styles.homeRequestTimeHero}>{formatClockTime(nextQueueRide.scheduledAt)}</Text>
                  </View>

                  <View style={styles.homeRequestAmountBlock}>
                    <Text style={styles.homeRequestAmountValue}>{formatCurrency(nextQueueRide.quote?.amount)}</Text>
                  </View>
                </View>

                <View style={styles.homeRequestRouteCard}>
                  <Text style={styles.homeRequestTitle}>{nextQueueRide.customerName}</Text>
                  <Text style={styles.homeRequestRouteValue} numberOfLines={1}>
                    {formatCompactRoute(nextQueueRide.origin, nextQueueRide.destination)}
                  </Text>
                </View>

                {additionalPendingQueueCount > 0 ? (
                  <Text style={styles.homeRequestPendingText}>
                    +{additionalPendingQueueCount} solicitac{additionalPendingQueueCount === 1 ? "ao" : "oes"} pendentes de aceite
                  </Text>
                ) : null}

                <Text style={styles.homeRequestCountdownText}>
                  {nextQueueRide.decisionWindow
                    ? `${formatDecisionCountdown(getDecisionWindowRemainingSeconds(nextQueueRide, nowMs))} restantes`
                    : formatTimeUntil(nextQueueRide.scheduledAt, nowMs)}
                </Text>

                <View style={styles.homeRequestProgressTrack}>
                  <View
                    style={[
                      styles.homeRequestProgressFill,
                      {
                        width: `${Math.max(6, getDecisionWindowProgress(nextQueueRide, nowMs) * 100)}%`
                      }
                    ]}
                  />
                </View>
              </Pressable>
            ) : null}

            {nextRide ? (
              <Pressable
                style={styles.homePrimaryCard}
                onPress={() =>
                  router.push({
                    pathname: "/ride/[rideId]",
                    params: { rideId: nextRide.id }
                  })
                }
              >
                {isHomeLoading ? (
                  <View style={styles.queueLoading}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                ) : (
                  <View style={styles.homePrimaryCompactRow}>
                    <View style={styles.homePrimaryCompactLeft}>
                      <Text style={styles.homePrimaryEyebrow}>Proxima corrida</Text>
                      <View style={styles.homePrimaryCompactScheduleRow}>
                        <CalendarMiniIcon />
                        <View style={styles.homePrimaryCompactScheduleCopy}>
                          <Text style={styles.homePrimaryCompactDay}>{formatRelativeDayLabel(nextRide.scheduledAt, nowMs)}</Text>
                          <Text style={styles.homePrimaryCompactTime}>{formatClockTime(nextRide.scheduledAt)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.homePrimaryCompactRight}>
                      <View style={styles.homePrimaryCountdownWrap}>
                        <View style={styles.homePrimaryCountdownRingWrap}>
                          <Svg width={92} height={92} viewBox="0 0 92 92">
                            <Circle cx="46" cy="46" r="35" stroke="rgba(255,255,255,0.22)" strokeWidth="8" fill="none" />
                            <Circle
                              cx="46"
                              cy="46"
                              r="35"
                              stroke="rgba(255,255,255,0.92)"
                              strokeWidth="8"
                              strokeLinecap="round"
                              fill="none"
                              strokeDasharray={2 * Math.PI * 35}
                              strokeDashoffset={(1 - getUpcomingRideProgress(nextRide.scheduledAt, nowMs)) * (2 * Math.PI * 35)}
                              transform="rotate(-90 46 46)"
                            />
                          </Svg>
                          <View style={styles.homePrimaryCountdownRingLabelWrap}>
                            <Text style={styles.homePrimaryCountdownRingPrefix}>Faltam</Text>
                            <Text style={styles.homePrimaryCountdownRingLabel}>
                              {formatTimeUntilVisualText(nextRide.scheduledAt, nowMs)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRightIcon stroke={colors.white} />
                    </View>
                  </View>
                )}
              </Pressable>
            ) : null}

            <View style={styles.homeAgendaSpotlightCard}>
              <View style={styles.homeSectionHeader}>
                <View style={styles.homeInlineTitleRow}>
                  <Text style={styles.homeInlineTitle}>Agenda</Text>
                  <View style={styles.homeInlineDot} />
                  <Text style={styles.homeInlineToday}>Hoje</Text>
                </View>

                <Pressable style={styles.homeSectionLink} onPress={() => animateToTab("agenda")}>
                  <Text style={styles.homeSectionLinkLabel}>Ver agenda</Text>
                  <ChevronRightIcon stroke={colors.highlight} />
                </Pressable>
              </View>

              <View style={styles.homeAgendaSpotlightTopRow}>
                <View style={styles.homeAgendaSummaryBlock}>
                  {todayVisibleAgendaRides.length > 0 ? (
                    <Text style={styles.homeAgendaSummaryTitle}>
                      {todayVisibleAgendaRides.length} {todayVisibleAgendaRides.length === 1 ? "corrida agendada" : "corridas agendadas"} para hoje
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.homeAgendaSummaryTitle}>Livre hoje</Text>
                      <Text style={styles.homeAgendaSummaryBody}>Nenhuma corrida prevista na agenda</Text>
                    </>
                  )}
                </View>

                {todayVisibleAgendaRides.length === 0 ? (
                  <View style={styles.homeAgendaArtworkBlock}>
                    <View style={styles.homeAgendaArtworkInner}>
                      <AgendaSpotlightIcon />
                    </View>
                  </View>
                ) : null}
              </View>

              {todayVisibleAgendaRides.length > 0 ? (
                <View style={styles.dayAgendaList}>
                  {todayVisibleAgendaRides.map((ride) => (
                    <Pressable
                      key={ride.id}
                      style={styles.dayAgendaItem}
                      onPress={() =>
                        router.push({
                          pathname: "/ride/[rideId]",
                          params: { rideId: ride.id }
                        })
                      }
                    >
                      <View style={styles.dayAgendaTimeWrap}>
                        <Text style={styles.dayAgendaTime}>{formatClockTime(ride.scheduledAt)}</Text>
                      </View>

                      <View style={styles.dayAgendaDivider} />

                      <View style={styles.dayAgendaCopy}>
                        <Text style={styles.dayAgendaCustomer}>{ride.customerName}</Text>
                        <Text style={styles.dayAgendaRoute} numberOfLines={1}>
                          {formatCompactRoute(ride.origin, ride.destination)}
                        </Text>
                      </View>

                      <View style={styles.dayAgendaAmountWrap}>
                        <Text style={styles.dayAgendaAmount}>{formatCurrency(ride.quote?.amount)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {session?.driver.driverType === "FROTA" ? (
              <View style={styles.homeChecklistCard}>
                  <View style={styles.homeSectionHeader}>
                    <View style={styles.homeInlineTitleRow}>
                      <Text style={styles.homeInlineTitle}>Checklist</Text>
                      <View style={styles.homeInlineDot} />
                      <Text style={styles.homeInlineToday}>Hoje</Text>
                    </View>

                    <Pressable style={styles.homeSectionLink} onPress={() => router.push("/vehicle")}>
                      <Text style={styles.homeSectionLinkLabel}>Fazer checklist</Text>
                      <ChevronRightIcon stroke={colors.highlight} />
                    </Pressable>
                  </View>

                  <View style={styles.homeChecklistTopRow}>
                    <View style={styles.homeChecklistIconWrap}>
                      <ChecklistIcon />
                    </View>

                    <View style={styles.homeChecklistCopy}>
                      <Text style={styles.homeChecklistTitle}>
                        {fleetChecklistProgress.total > 0
                          ? `${fleetChecklistProgress.completed}/${fleetChecklistProgress.total} tarefa(s) preenchida(s)`
                          : "Checklist diario indisponivel"}
                      </Text>
                      <Text style={styles.homeChecklistBody}>
                        {fleetVehicleChecklist
                          ? fleetChecklistProgress.pending === 0
                            ? "Tudo pronto para sair com o carro."
                            : `${fleetChecklistProgress.pending} item(ns) ainda precisam ser revisados.`
                          : "Abra o carro ativo para completar a revisao diaria."}
                      </Text>
                    </View>
                  </View>

                  {fleetChecklistProgress.total > 0 ? (
                    <>
                      <View style={styles.homeChecklistProgressTrack}>
                        <View
                          style={[
                            styles.homeChecklistProgressFill,
                            {
                              width: `${(fleetChecklistProgress.completed / fleetChecklistProgress.total) * 100}%`
                            }
                          ]}
                        />
                      </View>

                      <View style={styles.homeChecklistStatsRow}>
                        <View style={styles.homeChecklistStatPill}>
                          <Text style={styles.homeChecklistStatValue}>{fleetChecklistProgress.completed}</Text>
                          <Text style={styles.homeChecklistStatLabel}>Feitas</Text>
                        </View>
                        <View style={styles.homeChecklistStatPill}>
                          <Text style={styles.homeChecklistStatValue}>{fleetChecklistProgress.pending}</Text>
                          <Text style={styles.homeChecklistStatLabel}>Pendentes</Text>
                        </View>
                      </View>
                    </>
                  ) : null}
              </View>
            ) : null}

            <View style={styles.homeSectionCard}>
              <View style={styles.homeSectionHeader}>
                <View style={styles.homeInlineTitleRow}>
                  <Text style={styles.homeInlineTitle}>Resumo</Text>
                  <View style={styles.homeInlineDot} />
                  <Text style={styles.homeInlineToday}>Hoje</Text>
                </View>

                <Pressable style={styles.homeSectionLink} onPress={() => router.push("/history")}>
                  <Text style={styles.homeSectionLinkLabel}>Ver historico</Text>
                  <ChevronRightIcon stroke={colors.highlight} />
                </Pressable>
              </View>

              <View style={styles.homeSummaryCardsGrid}>
                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="earnings" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{formatCurrency(todaySummary.amount)}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Ganho</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="rides" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{todaySummary.rides}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Corridas</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="time" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{formatDurationHours(todaySummary.durationMinutes)}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Tempo</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="distance" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{todaySummary.distanceKm.toFixed(1).replace(".", ",")} km</Text>
                    <Text style={styles.homeSummaryCardLabel}>Km</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.homeMiniSection}>
              <Text style={styles.sectionOverline}>Resumo</Text>
              <View style={styles.homeSummaryInline}>
                <Text style={styles.homeSummaryMetric}>💰 {formatCurrency(todaySummary.amount)}</Text>
                <Text style={styles.homeSummaryDot}>•</Text>
                <Text style={styles.homeSummaryMetric}>🚗 {todaySummary.rides} corridas</Text>
                <Text style={styles.homeSummaryDot}>•</Text>
                <Text style={styles.homeSummaryMetric}>⏱ {formatDurationHours(todaySummary.durationMinutes)}</Text>
              </View>
            </View>

            {homeStatusMessage ? <Text style={styles.homeStatusText}>{homeStatusMessage}</Text> : null}
          </>
        ) : null}

        {activeTab === "queue" ? (
          <View style={styles.queuePage}>
            <View style={styles.queueTopBar}>
              <View style={styles.queueHeaderCopy}>
                <Text style={styles.queueHeaderEyebrow}>Painel do dia</Text>
                <Text style={styles.queueTitle}>Solicitacoes</Text>
                <Text style={styles.queueCountLabel}>
                  {queueRides.length} {queueRides.length === 1 ? "solicitacao pendente" : "solicitacoes pendentes"}
                </Text>
              </View>

              <Pressable style={styles.queueRefreshIconButton} onPress={() => setQueueReloadKey((current) => current + 1)}>
                <RefreshIcon stroke={colors.highlight} />
              </Pressable>
            </View>

            {isQueueLoading ? (
              <View style={styles.queueLoading}>
                <ActivityIndicator color={colors.highlight} />
              </View>
            ) : null}

            {!isQueueLoading && queueRides.length > 0 ? (
              <View style={styles.queueList}>
                {queueRides.map((ride) => (
                  <Pressable
                    key={ride.id}
                    onPress={() =>
                      router.push({
                        pathname: "/ride/[rideId]",
                        params: { rideId: ride.id }
                      })
                    }
                    style={({ pressed }) => [styles.rideCard, pressed ? styles.rideCardPressed : null]}
                  >
                    <Text style={styles.rideEyebrow}>Nova solicitacao</Text>

                    <View style={styles.rideTopRow}>
                      <View style={styles.rideTimeBlock}>
                        <Text style={styles.rideTimeHero}>{formatClockTime(ride.scheduledAt)}</Text>
                        <Text style={styles.rideSchedule}>
                          {formatRelativeDayLabel(ride.scheduledAt, nowMs)} • {formatShortDate(ride.scheduledAt)}
                        </Text>
                      </View>
                      <View style={styles.ridePriceChip}>
                        <Text style={styles.ridePrice}>{formatCurrency(ride.quote?.amount)}</Text>
                      </View>
                    </View>

                    <View style={styles.rideRouteCard}>
                      <View style={styles.rideCustomerRow}>
                        <View style={styles.rideCustomerAvatar}>
                          <Text style={styles.rideCustomerAvatarLabel}>
                            {ride.customerName.trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.rideCustomerCopy}>
                          <Text style={styles.rideCustomer}>{ride.customerName}</Text>
                          <View style={styles.rideCustomerMetaRow}>
                            <Text style={styles.rideCustomerMetaText}>
                              {ride.customerProfile?.tierEmoji ?? "•"} {ride.customerProfile?.tierLabel ?? "Novo"}
                            </Text>
                            <Text style={styles.rideCustomerMetaDot}>•</Text>
                            <Text style={styles.rideCustomerMetaText}>
                              Score {ride.customerProfile?.score ?? 0}
                            </Text>
                            <Text style={styles.rideCustomerMetaDot}>•</Text>
                            <Text style={styles.rideCustomerMetaText}>
                              {ride.customerProfile?.completedRides ?? 0} corridas
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.rideRouteSplitRow}>
                        <View style={styles.rideRouteColumn}>
                          <Text style={styles.rideRouteLabel}>Origem</Text>
                          <Text style={styles.rideRouteValue} numberOfLines={2}>
                            {formatCompactAddress(ride.origin)}
                          </Text>
                        </View>

                        <Text style={styles.rideRouteArrow}>→</Text>

                        <View style={styles.rideRouteColumn}>
                          <Text style={styles.rideRouteLabel}>Destino</Text>
                          <Text style={styles.rideRouteValue} numberOfLines={2}>
                            {formatCompactAddress(ride.destination)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.rideMetaRow}>
                      <Text style={styles.rideMetaText}>
                        {ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km
                      </Text>
                      <Text style={styles.rideMetaDivider}>•</Text>
                      <Text style={styles.rideMetaText}>
                        {ride.quote?.routeDurationMinutes ?? 0} min
                      </Text>
                    </View>

                    <View style={styles.rideMetaPills}>
                      <View style={styles.rideMetaPill}>
                        <View style={styles.rideMetaIconWrap}>
                          <SummaryMetricIcon kind="distance" />
                        </View>
                        <View style={styles.rideMetaCopy}>
                          <Text style={styles.rideMetaValue}>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</Text>
                          <Text style={styles.rideMetaLabel}>Distancia</Text>
                        </View>
                      </View>
                      <View style={styles.rideMetaPill}>
                        <View style={styles.rideMetaIconWrap}>
                          <SummaryMetricIcon kind="time" />
                        </View>
                        <View style={styles.rideMetaCopy}>
                          <Text style={styles.rideMetaValue}>{ride.quote?.routeDurationMinutes ?? 0} min</Text>
                          <Text style={styles.rideMetaLabel}>Tempo</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.queueActionRow}>
                      <Pressable
                        style={[styles.acceptQueueButton, queueActionRideId !== null ? styles.secondaryButtonDisabled : null]}
                        onPress={() =>
                          setPendingQueueDecision({
                            rideId: ride.id,
                            customerName: ride.customerName,
                            decision: "ACCEPT"
                          })
                        }
                        disabled={queueActionRideId !== null}
                      >
                        <Text style={styles.acceptQueueButtonLabel}>Aceitar</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.rejectButton, queueActionRideId === ride.id ? styles.secondaryButtonDisabled : null]}
                        onPress={() =>
                          setPendingQueueDecision({
                            rideId: ride.id,
                            customerName: ride.customerName,
                            decision: "REJECT"
                          })
                        }
                        disabled={queueActionRideId !== null}
                      >
                        <Text style={styles.rejectButtonLabel}>Recusar</Text>
                      </Pressable>
                    </View>

                    {ride.decisionWindow?.expiresAt ? (() => {
                      const remainingSeconds = getDecisionWindowRemainingSeconds(ride, nowMs);
                      const progress = getDecisionWindowProgress(ride, nowMs);
                      const fillPercent = `${Math.max(0, Math.min(1, progress)) * 100}%` as DimensionValue;
                      const urgency =
                        progress <= 0.2 ? "critical" : progress <= 0.45 ? "warning" : "normal";

                      return (
                        <View style={styles.queueCountdownBlock}>
                          <View style={styles.queueCountdownRow}>
                            <Text style={styles.queueCountdownLabel}>
                              Aceitar ate {formatClockTime(ride.decisionWindow.expiresAt)}
                            </Text>
                            <Text
                              style={[
                                styles.queueCountdownValue,
                                urgency === "warning" ? styles.queueCountdownValueWarning : null,
                                urgency === "critical" ? styles.queueCountdownValueCritical : null
                              ]}
                            >
                              {formatDecisionCountdown(remainingSeconds)}
                            </Text>
                          </View>
                          <View style={styles.homeRequestProgressTrack}>
                            <View
                              style={[
                                styles.homeRequestProgressFill,
                                { width: fillPercent },
                                urgency === "warning" ? styles.acceptDeadlineFillWarning : null,
                                urgency === "critical" ? styles.acceptDeadlineFillCritical : null
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })() : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!isQueueLoading && queueRides.length === 0 ? (
              <View style={styles.queueEmptyState}>
                <View style={styles.queueEmptyIllustrationWrap}>
                  <AgendaSpotlightIcon />
                </View>
                <Text style={styles.queueEmptyTitle}>Tudo em dia</Text>
                <Text style={styles.queueEmptyBody}>Ainda nao tem solicitacoes pendentes para voce.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {activeTab === "agenda" ? (
          <View style={styles.queuePage}>
            <View style={styles.queueTopBar}>
              <View style={styles.queueHeaderCopy}>
                <Text style={styles.queueHeaderEyebrow}>Planejamento</Text>
                <Text style={styles.queueTitle}>Agenda</Text>
                <Text style={styles.queueCountLabel}>
                  {agendaRides.length} {agendaRides.length === 1 ? "corrida agendada" : "corridas agendadas"}
                  {inProgressRidesCount > 0 ? ` - ${inProgressRidesCount} em andamento` : ""}
                </Text>
              </View>

              <View style={styles.queueTopBarActions}>
                <Pressable style={styles.queueRefreshIconButton} onPress={() => setQueueReloadKey((current) => current + 1)}>
                  <RefreshIcon stroke={colors.highlight} />
                </Pressable>
              </View>
            </View>

            <View style={styles.agendaCalendarCard}>
              <View style={styles.agendaCalendarHeader}>
                <View style={styles.agendaCalendarNav}>
                  <Pressable style={styles.agendaCalendarNavButton} onPress={() => shiftAgendaSelection(-1)}>
                    <ChevronLeftIcon stroke={colors.highlight} />
                  </Pressable>

                  <Text style={styles.agendaCalendarTitle}>
                    {agendaViewMode === "week" ? agendaWeekRangeLabel : agendaMonthLabel}
                  </Text>

                  <Pressable style={styles.agendaCalendarNavButton} onPress={() => shiftAgendaSelection(1)}>
                    <ChevronRightIcon stroke={colors.highlight} />
                  </Pressable>
                </View>

                <View style={styles.agendaCalendarHeaderActions}>
                  {selectedAgendaDateKey !== todayDateKey ? (
                    <Pressable style={styles.agendaCalendarTodayButton} onPress={() => setSelectedAgendaDateKey(todayDateKey)}>
                      <Text style={styles.agendaCalendarTodayButtonLabel}>Hoje</Text>
                    </Pressable>
                  ) : null}

                  <Pressable style={styles.agendaCalendarNavButton} onPress={() => setIsAgendaSettingsModalOpen(true)}>
                    <SettingsIcon />
                  </Pressable>
                </View>
              </View>

              {agendaViewMode === "week" ? (
                <View style={styles.agendaWeekStrip}>
                  {agendaWeekCells.map((cell) => (
                    <Pressable
                      key={cell.key}
                      style={[
                        styles.agendaWeekCell,
                        cell.rideCount > 0 ? styles.agendaWeekCellMarked : null,
                        cell.key === selectedAgendaDateKey ? styles.agendaWeekCellSelected : null,
                        cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarCellPast : null,
                        cell.isToday && cell.key !== selectedAgendaDateKey ? styles.agendaDayCellToday : null
                      ]}
                      onPress={() => setSelectedAgendaDateKey(cell.key)}
                    >
                      <Text
                        style={[
                          styles.agendaWeekCellWeekday,
                          cell.key === selectedAgendaDateKey ? styles.agendaWeekCellWeekdaySelected : null,
                          cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarLabelPast : null
                        ]}
                      >
                        {cell.weekday}
                      </Text>
                      <Text
                        style={[
                          styles.agendaWeekCellDay,
                          cell.rideCount > 0 ? styles.agendaDayLabelMarked : null,
                          cell.key === selectedAgendaDateKey ? styles.agendaDayLabelSelected : null,
                          cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarLabelPast : null
                        ]}
                      >
                        {cell.dayNumber}
                      </Text>
                      {cell.rideCount > 0 ? (
                        <View
                          style={[
                            styles.agendaDayDot,
                            cell.key === selectedAgendaDateKey ? styles.agendaDayDotSelected : null,
                            cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarDotPast : null
                          ]}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.agendaWeekRow}>
                    {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => (
                      <Text key={`${label}-${index}`} style={styles.agendaWeekday}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.agendaCalendarGrid}>
                    {agendaCalendarCells.map((cell, index) =>
                      cell ? (
                        <Pressable
                          key={cell.key}
                          style={[
                            styles.agendaDayCell,
                            cell.rideCount > 0 ? styles.agendaDayCellMarked : null,
                            cell.key === selectedAgendaDateKey ? styles.agendaDayCellSelected : null,
                            cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarCellPast : null,
                            cell.isToday && cell.key !== selectedAgendaDateKey ? styles.agendaDayCellToday : null
                          ]}
                          onPress={() => setSelectedAgendaDateKey(cell.key)}
                        >
                          <Text
                            style={[
                              styles.agendaDayLabel,
                              cell.rideCount > 0 ? styles.agendaDayLabelMarked : null,
                              cell.key === selectedAgendaDateKey ? styles.agendaDayLabelSelected : null,
                              cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarLabelPast : null
                            ]}
                          >
                            {cell.dayNumber}
                          </Text>
                          {cell.rideCount > 0 ? (
                            <View
                              style={[
                                styles.agendaDayDot,
                                cell.key === selectedAgendaDateKey ? styles.agendaDayDotSelected : null,
                                cell.isPast && cell.key !== selectedAgendaDateKey ? styles.agendaCalendarDotPast : null
                              ]}
                            />
                          ) : null}
                        </Pressable>
                      ) : (
                        <View key={`blank-${index}`} style={styles.agendaDaySpacer} />
                      )
                    )}
                  </View>
                </>
              )}

              <Pressable
                style={styles.agendaCalendarChevronWrap}
                onPress={() => setAgendaViewMode((current) => (current === "month" ? "week" : "month"))}
              >
                {agendaViewMode === "month" ? (
                  <ChevronUpIcon stroke={colors.highlight} />
                ) : (
                  <ChevronDownIcon stroke={colors.highlight} />
                )}
              </Pressable>
            </View>

            <View style={styles.agendaSummaryCard}>
              <View style={styles.homeInlineTitleRow}>
                <Text style={styles.homeInlineTitle}>Resumo</Text>
                <View style={styles.homeInlineDot} />
                <Text style={styles.homeInlineToday}>{formatAgendaDayLabel(selectedAgendaDateKey)}</Text>
              </View>

              <Text style={styles.agendaSummarySubtitle}>
                {selectedAgendaSummary.count === 0
                  ? "Nenhuma corrida agendada para este dia"
                  : "Resumo das corridas agendadas para o dia selecionado"}
              </Text>

              <View style={styles.homeSummaryCardsGrid}>
                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="earnings" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{formatCurrency(selectedAgendaSummary.amount)}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Ganho</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="rides" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{selectedAgendaSummary.count}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Corridas</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="time" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{formatDurationHours(selectedAgendaSummary.durationMinutes)}</Text>
                    <Text style={styles.homeSummaryCardLabel}>Tempo</Text>
                  </View>
                </View>

                <View style={styles.homeSummaryCard}>
                  <View style={styles.homeSummaryCardIconWrap}>
                    <SummaryMetricIcon kind="distance" />
                  </View>
                  <View style={styles.homeSummaryCardCopy}>
                    <Text style={styles.homeSummaryCardValue}>{selectedAgendaSummary.distanceKm.toFixed(1).replace(".", ",")} km</Text>
                    <Text style={styles.homeSummaryCardLabel}>Km</Text>
                  </View>
                </View>
              </View>
            </View>

            {isAgendaLoading ? (
              <View style={styles.queueLoading}>
                <ActivityIndicator color={colors.highlight} />
              </View>
            ) : null}

            {!isAgendaLoading && selectedAgendaRides.length > 0 ? (
              <View style={styles.agendaList}>
                {selectedAgendaRides.map((ride) => {
                  const stageTone = getStageTone(ride);
                  const nextAction = getNextAgendaAction(ride);

                  return (
                    <Pressable
                      key={ride.id}
                      style={({ pressed }) => [styles.agendaRideCard, pressed ? styles.rideCardPressed : null]}
                      onPress={() =>
                        router.push({
                          pathname: "/ride/[rideId]",
                          params: { rideId: ride.id }
                        })
                      }
                    >
                      <View style={styles.agendaRideTopRow}>
                        <View style={styles.rideTimeBlock}>
                          <Text style={styles.agendaRideTimeHero}>{formatClockTime(ride.scheduledAt)}</Text>
                          <Text style={styles.rideSchedule}>
                            {formatRelativeDayLabel(ride.scheduledAt, nowMs)} • {formatShortDate(ride.scheduledAt)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.stageBadge,
                            stageTone === "warning" ? styles.stageBadgeWarning : null,
                            stageTone === "success" ? styles.stageBadgeSuccess : null
                          ]}
                        >
                          <Text
                            style={[
                              styles.stageBadgeLabel,
                              stageTone === "warning" ? styles.stageBadgeLabelWarning : null,
                              stageTone === "success" ? styles.stageBadgeLabelSuccess : null
                            ]}
                          >
                            {getStageLabel(ride)}
                          </Text>
                        </View>
                      </View>

                      {ride.executionAlert ? (
                        <View
                          style={[
                            styles.executionAlertPill,
                            ride.executionAlert.tone === "critical" ? styles.executionAlertPillCritical : null
                          ]}
                        >
                          <Text
                            style={[
                              styles.executionAlertPillLabel,
                              ride.executionAlert.tone === "critical" ? styles.executionAlertPillLabelCritical : null
                            ]}
                          >
                            {ride.executionAlert.label}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.rideRouteCard}>
                        <View style={styles.rideCustomerRow}>
                          <View style={styles.rideCustomerAvatar}>
                            <Text style={styles.rideCustomerAvatarLabel}>
                              {ride.customerName.trim().charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.rideCustomerCopy}>
                            <Text style={styles.rideCustomer}>{ride.customerName}</Text>
                            <Text style={styles.agendaEtaValue}>{formatTimeUntil(ride.scheduledAt, nowMs)}</Text>
                          </View>
                        </View>

                        <View style={styles.rideRouteSplitRow}>
                          <View style={styles.rideRouteColumn}>
                            <Text style={styles.rideRouteLabel}>Origem</Text>
                            <Text style={styles.rideRouteValue} numberOfLines={2}>
                              {formatCompactAddress(ride.origin)}
                            </Text>
                          </View>

                          <Text style={styles.rideRouteArrow}>→</Text>

                          <View style={styles.rideRouteColumn}>
                            <Text style={styles.rideRouteLabel}>Destino</Text>
                            <Text style={styles.rideRouteValue} numberOfLines={2}>
                              {formatCompactAddress(ride.destination)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.agendaMetaGrid}>
                        <View style={[styles.rideMetaPill, styles.agendaMetaItem]}>
                          <View style={styles.rideMetaIconWrap}>
                            <SummaryMetricIcon kind="earnings" />
                          </View>
                          <View style={styles.rideMetaCopy}>
                            <Text style={styles.rideMetaValue}>{formatCurrency(ride.quote?.amount)}</Text>
                            <Text style={styles.rideMetaLabel}>Valor</Text>
                          </View>
                        </View>
                        <View style={[styles.rideMetaPill, styles.agendaMetaItem]}>
                          <View style={styles.rideMetaIconWrap}>
                            <SummaryMetricIcon kind="distance" />
                          </View>
                          <View style={styles.rideMetaCopy}>
                            <Text style={styles.rideMetaValue}>{ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km</Text>
                            <Text style={styles.rideMetaLabel}>Distancia</Text>
                          </View>
                        </View>
                        <View style={[styles.rideMetaPill, styles.agendaMetaItem]}>
                          <View style={styles.rideMetaIconWrap}>
                            <SummaryMetricIcon kind="time" />
                          </View>
                          <View style={styles.rideMetaCopy}>
                            <Text style={styles.rideMetaValue}>{ride.quote?.routeDurationMinutes ?? 0} min</Text>
                            <Text style={styles.rideMetaLabel}>Tempo</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.agendaActionRow}>
                        <Pressable
                          style={styles.detailOutlineButton}
                          onPress={() =>
                            router.push({
                              pathname: "/ride/[rideId]",
                              params: { rideId: ride.id }
                            })
                          }
                        >
                          <Text style={styles.detailOutlineButtonLabel}>Detalhes</Text>
                        </Pressable>

                        {nextAction ? (
                          <Pressable
                            style={[
                              styles.primaryActionButton,
                              styles.agendaPrimaryActionButton,
                              agendaActionRideId === ride.id ? styles.primaryActionButtonDisabled : null
                            ]}
                            onPress={() => void handleAgendaAction(ride)}
                            disabled={agendaActionRideId !== null}
                          >
                            {agendaActionRideId === ride.id ? (
                              <ActivityIndicator color={colors.white} size="small" />
                            ) : (
                              <Text style={styles.primaryActionButtonLabel}>{nextAction.label}</Text>
                            )}
                          </Pressable>
                        ) : null}
                      </View>

                      <View style={styles.agendaLegacyHidden}>
                        <Text style={styles.ridePrice}>{formatCurrency(ride.quote?.amount)}</Text>
                        <Text style={styles.rideMetaDivider}>•</Text>
                        <Text style={styles.rideMetaText}>
                          {ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km
                        </Text>
                        <Text style={styles.rideMetaDivider}>•</Text>
                        <Text style={styles.rideMetaText}>
                          {ride.quote?.routeDurationMinutes ?? 0} min
                        </Text>
                      </View>

                      <Pressable
                        style={styles.agendaLegacyHidden}
                        onPress={() =>
                          router.push({
                            pathname: "/ride/[rideId]",
                            params: { rideId: ride.id }
                          })
                        }
                      >
                        <Text style={styles.detailOutlineButtonLabel}>Abrir detalhes e mapa</Text>
                      </Pressable>

                      {nextAction ? (
                        <Pressable
                          style={[
                            styles.agendaLegacyHidden,
                            agendaActionRideId === ride.id ? styles.primaryActionButtonDisabled : null
                          ]}
                          onPress={() => void handleAgendaAction(ride)}
                          disabled={agendaActionRideId !== null}
                        >
                          {agendaActionRideId === ride.id ? (
                            <ActivityIndicator color={colors.white} size="small" />
                          ) : (
                            <Text style={styles.primaryActionButtonLabel}>{nextAction.label}</Text>
                          )}
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {!isAgendaLoading && selectedAgendaRides.length === 0 ? (
              <View style={styles.queueEmptyState}>
                <View style={styles.queueEmptyIllustrationWrap}>
                  <AgendaSpotlightIcon />
                </View>
                <Text style={styles.queueEmptyTitle}>Agenda livre</Text>
                <Text style={styles.queueEmptyBody}>Nenhuma corrida agendada para o dia selecionado.</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        </Animated.View>

      </ScrollView>

      <Modal
        transparent
        visible={isAgendaSettingsModalOpen}
        animationType="fade"
        onRequestClose={() => setIsAgendaSettingsModalOpen(false)}
      >
        <View style={styles.agendaSettingsModalRoot}>
          <Pressable style={styles.agendaSettingsModalBackdrop} onPress={() => setIsAgendaSettingsModalOpen(false)} />

          <View style={styles.agendaSettingsModalCard}>
            <Text style={styles.agendaSettingsModalEyebrow}>Configuracoes da agenda</Text>
            <Text style={styles.agendaSettingsModalTitle}>Menu da agenda</Text>
            <Text style={styles.agendaSettingsModalBody}>
              Revise as configuracoes do dia selecionado antes de alterar a operacao.
            </Text>

            <View style={styles.homeSummaryCardsGrid}>
              <View style={styles.homeSummaryCard}>
                <View style={styles.homeSummaryCardIconWrap}>
                  <AgendaIcon active />
                </View>
                <View style={styles.homeSummaryCardCopy}>
                  <Text style={[styles.homeSummaryCardValue, styles.agendaSettingsDayValue]}>
                    {selectedAgendaDateKey ? parseDateKey(selectedAgendaDateKey).getDate() : "--"}
                  </Text>
                  <Text style={styles.homeSummaryCardLabel}>{formatAgendaDayWeekday(selectedAgendaDateKey)}</Text>
                </View>
              </View>

              <View style={styles.homeSummaryCard}>
                <View style={styles.homeSummaryCardIconWrap}>
                  <SummaryMetricIcon kind="rides" />
                </View>
                <View style={styles.homeSummaryCardCopy}>
                  <Text style={styles.homeSummaryCardValue}>{selectedAgendaSummary.count}</Text>
                  <Text style={styles.homeSummaryCardLabel}>
                    {selectedAgendaSummary.count === 1 ? "Corrida" : "Corridas"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.agendaSettingsMenu}>
              <Pressable
                style={[
                  styles.agendaSettingsMenuItem,
                  styles.agendaSettingsMenuItemDanger,
                  selectedCancelableAgendaRides.length === 0 ? styles.agendaSettingsMenuItemDisabled : null
                ]}
                onPress={() => {
                  if (selectedCancelableAgendaRides.length === 0) {
                    return;
                  }

                  setIsAgendaSettingsModalOpen(false);
                  setIsAgendaDayCancelModalOpen(true);
                }}
                disabled={selectedCancelableAgendaRides.length === 0}
              >
                <View style={[styles.agendaSettingsMenuItemIconWrap, styles.agendaSettingsMenuItemIconWrapDanger]}>
                  <AlertCircleIcon stroke={selectedCancelableAgendaRides.length === 0 ? "#B7B0CD" : "#D84F3F"} />
                </View>

                <View style={styles.agendaSettingsMenuItemCopy}>
                  <Text
                    style={[
                      styles.agendaSettingsMenuItemTitle,
                      selectedCancelableAgendaRides.length === 0 ? styles.agendaSettingsMenuItemTitleDisabled : null
                    ]}
                  >
                    Cancelamento emergencial do dia
                  </Text>
                  <Text style={styles.agendaSettingsMenuItemBody}>
                    {selectedCancelableAgendaRides.length > 0
                      ? `Ha ${selectedCancelableAgendaRides.length} ${selectedCancelableAgendaRides.length === 1 ? "corrida elegivel" : "corridas elegiveis"} para cancelamento nesse dia.`
                      : "Nenhuma corrida elegivel para cancelamento emergencial nesse dia."}
                  </Text>
                </View>

                <ChevronRightIcon
                  stroke={selectedCancelableAgendaRides.length === 0 ? "#B7B0CD" : colors.highlight}
                />
              </Pressable>

              <View
                style={[
                  styles.agendaSettingsMenuItem,
                  styles.agendaSettingsMenuItemDisabled,
                  styles.agendaSettingsMenuItemLast
                ]}
              >
                <View style={styles.agendaSettingsMenuItemIconWrap}>
                  <SettingsIcon stroke="#8B84A5" />
                </View>

                <View style={styles.agendaSettingsMenuItemCopy}>
                  <View style={styles.agendaSettingsOptionHeader}>
                    <Text style={[styles.agendaSettingsMenuItemTitle, styles.agendaSettingsMenuItemTitleDisabled]}>
                      Fechar dia da agenda
                    </Text>
                    <View style={styles.agendaSettingsOptionBadge}>
                      <Text style={styles.agendaSettingsOptionBadgeLabel}>Em definicao</Text>
                    </View>
                  </View>
                  <Text style={styles.agendaSettingsMenuItemBody}>
                    Bloqueia novos agendamentos para o dia selecionado. Essa acao depende da regra final entre motorista da frota e administrativo, entao ainda nao foi habilitada.
                  </Text>
                </View>

                <ChevronRightIcon stroke="#B7B0CD" />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isAgendaDayCancelModalOpen}
        animationType="fade"
        onRequestClose={() => {
          if (!isAgendaDayCancelSubmitting) {
            setIsAgendaDayCancelModalOpen(false);
          }
        }}
      >
        <View style={styles.emergencyModalRoot}>
          <Pressable
            style={styles.emergencyModalBackdrop}
            onPress={() => {
              if (!isAgendaDayCancelSubmitting) {
                setIsAgendaDayCancelModalOpen(false);
              }
            }}
          />

          <View style={styles.emergencyModalCard}>
            <Text style={styles.emergencyModalEyebrow}>Cancelamento emergencial</Text>
            <Text style={styles.emergencyModalTitle}>Cancelar corridas do dia selecionado?</Text>
            <Text style={styles.emergencyModalBody}>
              Essa acao deve ser usada apenas se o motorista ficou impossibilitado de atender a demanda por motivo grave.
            </Text>

            <View style={styles.emergencyReasonList}>
              {driverEmergencyCancellationReasonOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.emergencyReasonOption,
                    selectedAgendaDayCancelReason === option.value ? styles.emergencyReasonOptionSelected : null
                  ]}
                  onPress={() => setSelectedAgendaDayCancelReason(option.value)}
                  disabled={isAgendaDayCancelSubmitting}
                >
                  <Text
                    style={[
                      styles.emergencyReasonOptionTitle,
                      selectedAgendaDayCancelReason === option.value ? styles.emergencyReasonOptionTitleSelected : null
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
                style={[styles.emergencyModalSecondaryButton, isAgendaDayCancelSubmitting ? styles.secondaryButtonDisabled : null]}
                onPress={() => setIsAgendaDayCancelModalOpen(false)}
                disabled={isAgendaDayCancelSubmitting}
              >
                <Text style={styles.emergencyModalSecondaryButtonLabel}>Voltar</Text>
              </Pressable>

              <Pressable
                style={[styles.emergencyModalPrimaryButton, isAgendaDayCancelSubmitting ? styles.secondaryButtonDisabled : null]}
                onPress={() => void handleAgendaDayEmergencyCancellation()}
                disabled={isAgendaDayCancelSubmitting}
              >
                {isAgendaDayCancelSubmitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.emergencyModalPrimaryButtonLabel}>Cancelar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={pendingQueueDecision !== null}
        animationType="fade"
        onRequestClose={() => {
          if (!isQueueDecisionSubmitting) {
            setPendingQueueDecision(null);
          }
        }}
      >
        <View style={styles.confirmModalRoot}>
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => {
              if (!isQueueDecisionSubmitting) {
                setPendingQueueDecision(null);
              }
            }}
          />

          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalEyebrow}>Confirmar acao</Text>
            <Text style={styles.confirmModalTitle}>
              {pendingQueueDecision?.decision === "ACCEPT" ? "Aceitar corrida?" : "Recusar corrida?"}
            </Text>
            <Text style={styles.confirmModalBody}>
              {pendingQueueDecision?.decision === "ACCEPT"
                ? `A corrida de ${pendingQueueDecision?.customerName ?? "este cliente"} sera adicionada a sua agenda.`
                : `A corrida de ${pendingQueueDecision?.customerName ?? "este cliente"} sera removida da sua fila.`}
            </Text>

            <View style={styles.confirmModalActions}>
              <Pressable
                style={[styles.confirmModalSecondaryButton, isQueueDecisionSubmitting ? styles.secondaryButtonDisabled : null]}
                onPress={() => setPendingQueueDecision(null)}
                disabled={isQueueDecisionSubmitting}
              >
                <Text style={styles.confirmModalSecondaryButtonLabel}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  pendingQueueDecision?.decision === "ACCEPT" ? styles.acceptQueueButton : styles.rejectButton,
                  styles.confirmModalPrimaryButton,
                  isQueueDecisionSubmitting ? styles.secondaryButtonDisabled : null
                ]}
                onPress={() => {
                  if (!pendingQueueDecision) {
                    return;
                  }

                  void handleQueueDecision(pendingQueueDecision.rideId, pendingQueueDecision.decision);
                }}
                disabled={isQueueDecisionSubmitting}
              >
                {isQueueDecisionSubmitting ? (
                  <ActivityIndicator
                    color={pendingQueueDecision?.decision === "ACCEPT" ? colors.white : colors.highlight}
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      pendingQueueDecision?.decision === "ACCEPT"
                        ? styles.acceptQueueButtonLabel
                        : styles.rejectButtonLabel
                    }
                  >
                    {pendingQueueDecision?.decision === "ACCEPT" ? "Confirmar aceite" : "Confirmar recusa"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={isSidebarOpen}
        animationType="fade"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <View style={styles.sidebarModalRoot}>
          <Pressable style={styles.sidebarBackdrop} onPress={() => setIsSidebarOpen(false)} />

          <View style={styles.sidebarPanel}>
            <View style={[styles.sidebarHeader, { paddingTop: Math.max(insets.top, 14) }]}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <Pressable style={styles.sidebarCloseButton} onPress={() => setIsSidebarOpen(false)}>
                <Text style={styles.sidebarCloseLabel}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sidebarScroll}
              contentContainerStyle={[
                styles.sidebarContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {menuContent}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={[styles.bottomBarWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.bottomBar}>
          <Pressable style={styles.navItem} onPress={() => animateToTab("home")}>
            <HomeIcon active={activeTab === "home"} />
            <Text style={[styles.navLabel, activeTab === "home" ? styles.navLabelActive : null]}>Home</Text>
          </Pressable>

          <Pressable style={styles.navItem} onPress={() => animateToTab("queue")}>
            <View style={styles.navIconWrap}>
              <QueueIcon active={activeTab === "queue"} />
              {queueRides.length > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeLabel}>{queueRides.length > 9 ? "9+" : String(queueRides.length)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navLabel, activeTab === "queue" ? styles.navLabelActive : null]}>Fila</Text>
          </Pressable>

          <Pressable style={styles.navItem} onPress={() => animateToTab("agenda")}>
            <AgendaIcon active={activeTab === "agenda"} />
            <Text style={[styles.navLabel, activeTab === "agenda" ? styles.navLabelActive : null]}>Agenda</Text>
          </Pressable>
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white
  },
  topSafeArea: {
    backgroundColor: colors.white
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 120,
    gap: 22
  },
  headerCard: {
    gap: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 0,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E1FF"
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  headerBrandWrap: {
    minHeight: 42,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  tabContent: {
    width: "100%",
    gap: 16
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  headerActionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F4F0FF"
  },
  panel: {
    gap: 10,
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  sectionOverline: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  panelTitle: {
    color: colors.textStrong,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold"
  },
  panelBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular"
  },
  homeRequestCard: {
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.highlight,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  homeRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homeRequestEyebrow: {
    flex: 1,
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  homeRequestRefreshButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F0EAFF"
  },
  homeRequestMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homeRequestTimeBlock: {
    flex: 1
  },
  homeRequestTimeHero: {
    color: colors.textStrong,
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  homeRequestAmountBlock: {
    alignItems: "flex-end"
  },
  homeRequestAmountValue: {
    color: colors.highlight,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  homeRequestRouteCard: {
    gap: 6,
    paddingTop: 2
  },
  homeRequestTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  homeRequestRouteValue: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  homeRequestPendingText: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  homeRequestCountdownText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  homeRequestProgressTrack: {
    height: 7,
    marginHorizontal: -16,
    marginBottom: -16,
    marginTop: 2,
    backgroundColor: "#E8DDFF"
  },
  homeRequestProgressFill: {
    height: "100%",
    backgroundColor: colors.highlight
  },
  homePrimaryCard: {
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: colors.highlight
  },
  homePrimaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homePrimaryEyebrow: {
    flex: 1,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  refreshIconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  homePrimaryMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homePrimaryCompactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  homePrimaryCompactLeft: {
    flex: 1,
    gap: 4
  },
  homePrimaryCompactScheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  homePrimaryCompactScheduleCopy: {
    gap: 2
  },
  homePrimaryCompactDay: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  homePrimaryCompactTime: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryCompactRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  homePrimaryCountdownWrap: {
    alignItems: "center"
  },
  homePrimaryCountdownRingWrap: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center"
  },
  homePrimaryCountdownRingLabelWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  homePrimaryCountdownRingPrefix: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "Poppins_500Medium"
  },
  homePrimaryCountdownRingLabel: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryTimeBlock: {
    flex: 1,
    gap: 4
  },
  homePrimaryTimeHero: {
    color: colors.white,
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryTimeSupport: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  homePrimaryAmountBlock: {
    alignItems: "flex-end",
    gap: 2
  },
  homePrimaryAmountValue: {
    color: "#FFE48D",
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryAmountHint: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  homePrimaryTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryRouteCard: {
    gap: 6,
    paddingTop: 2
  },
  homeRouteValue: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  homePrimaryEmptyTitle: {
    color: colors.white,
    fontSize: 21,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold"
  },
  homePrimaryEmptyBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular"
  },
  homeSectionCard: {
    gap: 14,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  homeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homeInlineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  homeInlineTitle: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  homeInlineDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  homeInlineToday: {
    color: "#7D71A4",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_600SemiBold"
  },
  homeSectionHeaderCopy: {
    flex: 1,
    gap: 2
  },
  homeSectionTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  homeSectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4
  },
  homeSectionLinkLabel: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_700Bold"
  },
  homeAgendaSpotlightCard: {
    gap: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  homeAgendaSpotlightTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  homeAgendaSpotlightCopy: {
    flex: 1,
    justifyContent: "center"
  },
  homeAgendaSummaryBlock: {
    flex: 1,
    gap: 6,
    justifyContent: "center"
  },
  homeAgendaSummaryTitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  homeAgendaSummaryBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular"
  },
  homeAgendaArtworkBlock: {
    width: 118,
    alignItems: "center",
    justifyContent: "center"
  },
  homeAgendaArtworkInner: {
    transform: [{ translateY: 4 }]
  },
  homeChecklistCard: {
    gap: 14,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  homeChecklistTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  homeChecklistIconWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#F0EAFF"
  },
  homeChecklistCopy: {
    flex: 1,
    gap: 4
  },
  homeChecklistTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Poppins_700Bold"
  },
  homeChecklistBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  homeChecklistProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#EEE8FF"
  },
  homeChecklistProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  homeChecklistStatsRow: {
    flexDirection: "row",
    gap: 10
  },
  homeChecklistStatPill: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FBFAFF"
  },
  homeChecklistStatValue: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "Poppins_700Bold"
  },
  homeChecklistStatLabel: {
    color: "#6E6392",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins_500Medium"
  },
  homeSummaryCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  homeSummaryCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#FBFAFF"
  },
  homeSummaryCardIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F0EAFF"
  },
  homeSummaryCardCopy: {
    flex: 1,
    gap: 2
  },
  homeSummaryCardValue: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  homeSummaryCardLabel: {
    color: "#6E6392",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  dayAgendaList: {
    gap: 8
  },
  dayAgendaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FBFAFF"
  },
  dayAgendaTimeWrap: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center"
  },
  dayAgendaTime: {
    color: colors.highlight,
    fontSize: 15,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Poppins_700Bold"
  },
  dayAgendaDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E8E1FF"
  },
  dayAgendaCopy: {
    flex: 1,
    gap: 1
  },
  dayAgendaCustomer: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  dayAgendaRoute: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular"
  },
  dayAgendaAmount: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "Poppins_700Bold"
  },
  dayAgendaAmountWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F0EAFF"
  },
  homeSectionEmptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular"
  },
  homeMiniSection: {
    display: "none",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 2
  },
  homeSummaryInline: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  homeSummaryMetric: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  homeSummaryDot: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  homeStatusText: {
    marginHorizontal: 16,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  homePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  homePanelHeaderCopy: {
    flex: 1,
    gap: 4
  },
  nextRideCard: {
    gap: 8,
    marginTop: 4,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.highlight
  },
  nextRideEyebrow: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  nextRideTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  nextRideCustomer: {
    flex: 1,
    color: colors.white,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold"
  },
  nextRideCountdown: {
    color: "#FFE48D",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  nextRideSchedule: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  nextRideRoute: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium"
  },
  nextRideArrow: {
    color: "#D8CEFF",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  nextRideEmptyTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  nextRideEmptyBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular"
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12
  },
  agendaSummaryGrid: {
    flexDirection: "row",
    gap: 12
  },
  summaryCard: {
    flex: 1,
    gap: 4,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F7F3FF"
  },
  summaryValue: {
    color: colors.highlight,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold"
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  shortcutsSection: {
    gap: 10
  },
  shortcutsTitle: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  shortcutCard: {
    width: "48%",
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F9F7FF"
  },
  shortcutCardWide: {
    width: "100%",
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF8E5"
  },
  shortcutTitle: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  shortcutBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular"
  },
  menuProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#F7F3FF"
  },
  menuProfileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.highlight
  },
  menuProfileAvatarLabel: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold"
  },
  menuProfileCopy: {
    flex: 1,
    gap: 2
  },
  menuProfileName: {
    color: colors.textStrong,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  menuProfileMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  menuList: {
    gap: 12
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FBFAFF"
  },
  mockMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFF8E5"
  },
  menuItemLeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  menuItemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EAFF"
  },
  mockMenuItemIconWrap: {
    backgroundColor: "#FFE9AA"
  },
  menuItemCopy: {
    flex: 1,
    gap: 2
  },
  menuItemTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  mockMenuItemTitle: {
    color: "#8C5A00",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  menuStatusCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF8E5"
  },
  menuStatusText: {
    color: "#8C5A00",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  menuItemBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  logoutButton: {
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFF1F1"
  },
  logoutIconWrap: {
    backgroundColor: "#FFE1E1"
  },
  logoutTitle: {
    color: "#BE2E2E",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  logoutBody: {
    color: "#B15D5D",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  refreshButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3EEFF"
  },
  refreshButtonLabel: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  queuePage: {
    gap: 14,
    marginHorizontal: 16
  },
  queueTopBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 2,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE6FF"
  },
  queueHeaderCopy: {
    flex: 1,
    gap: 2
  },
  queueHeaderEyebrow: {
    color: colors.highlight,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  queueTopBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  queueTitle: {
    color: colors.textStrong,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold"
  },
  queueCountLabel: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  queueRefreshIconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F0EAFF"
  },
  queueStatus: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  queueEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  queueEmptyIllustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 116,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#FBF9FF"
  },
  queueEmptyTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  queueEmptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Poppins_500Medium"
  },
  queueLoading: {
    paddingVertical: 12
  },
  queueList: {
    gap: 14
  },
  queueActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2
  },
  acceptQueueButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.highlight
  },
  acceptQueueButtonLabel: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  detailGhostButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#EEE8FF"
  },
  detailGhostButtonLabel: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  rejectButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F0ECFF"
  },
  rejectButtonLabel: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  secondaryButtonDisabled: {
    opacity: 0.6
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
  queueCountdownBlock: {
    gap: 8
  },
  queueCountdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  queueCountdownLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  queueCountdownValue: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  queueCountdownValueWarning: {
    color: "#A46B00"
  },
  queueCountdownValueCritical: {
    color: "#C43636"
  },
  agendaCalendarCard: {
    gap: 12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  agendaCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  agendaCalendarNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  agendaCalendarHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  agendaCalendarNavButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2EEFF"
  },
  agendaCalendarTodayButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F2EEFF"
  },
  agendaCalendarTodayButtonLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_700Bold"
  },
  agendaCalendarTitle: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  agendaWeekStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8
  },
  agendaWeekCell: {
    flex: 1,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FBFAFF"
  },
  agendaWeekCellMarked: {
    backgroundColor: "#F1EDFF"
  },
  agendaWeekCellSelected: {
    backgroundColor: colors.highlight
  },
  agendaCalendarCellPast: {
    opacity: 0.48
  },
  agendaWeekCellWeekday: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  agendaWeekCellWeekdaySelected: {
    color: "rgba(255,255,255,0.82)"
  },
  agendaWeekCellDay: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  agendaWeekRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  agendaWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  agendaCalendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8
  },
  agendaCalendarChevronWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4
  },
  agendaDaySpacer: {
    width: "14.2857%",
    height: 44
  },
  agendaDayCell: {
    width: "14.2857%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 14
  },
  agendaDayCellMarked: {
    backgroundColor: "#F1EDFF"
  },
  agendaDayCellSelected: {
    backgroundColor: colors.highlight
  },
  agendaDayCellToday: {
    borderWidth: 1,
    borderColor: "#D9CEF9"
  },
  agendaDayLabel: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  agendaDayLabelMarked: {
    color: colors.highlight
  },
  agendaDayLabelSelected: {
    color: colors.white
  },
  agendaCalendarLabelPast: {
    color: "#A9A1C1"
  },
  agendaDayDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  agendaCalendarDotPast: {
    backgroundColor: "#CFC6EB"
  },
  agendaDayDotSelected: {
    backgroundColor: colors.white
  },
  agendaSummaryCard: {
    gap: 12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  agendaSummarySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  agendaSettingsModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  agendaSettingsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25,19,44,0.42)"
  },
  agendaSettingsModalCard: {
    gap: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  agendaSettingsModalEyebrow: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  agendaSettingsModalTitle: {
    color: colors.textStrong,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Poppins_700Bold"
  },
  agendaSettingsModalBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  agendaSettingsDayValue: {
    fontSize: 14,
    lineHeight: 20
  },
  agendaSettingsMenu: {
    gap: 12
  },
  agendaSettingsOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  agendaSettingsMenuItem: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE9FB",
    backgroundColor: "#FCFBFF"
  },
  agendaSettingsMenuItemDisabled: {
    borderColor: "#F0ECF8",
    backgroundColor: "#F7F5FB"
  },
  agendaSettingsMenuItemDanger: {
    borderColor: "#F5E1DD",
    backgroundColor: "#FFFBFA"
  },
  agendaSettingsMenuItemCopy: {
    flex: 1,
    gap: 3
  },
  agendaSettingsMenuItemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F1FF"
  },
  agendaSettingsMenuItemIconWrapDanger: {
    backgroundColor: "#FDEEEE"
  },
  agendaSettingsMenuItemTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  agendaSettingsMenuItemTitleDisabled: {
    color: "#8B84A5"
  },
  agendaSettingsMenuItemBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  agendaSettingsOptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EEE8FF"
  },
  agendaSettingsOptionBadgeLabel: {
    color: colors.highlight,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins_700Bold"
  },
  agendaSettingsMenuItemLast: {
    borderBottomWidth: 1
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
  agendaList: {
    gap: 14
  },
  agendaRideCard: {
    gap: 12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  agendaRideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  agendaRideTimeHero: {
    color: colors.textStrong,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  agendaRideTopCopy: {
    flex: 1,
    gap: 2
  },
  agendaRideCustomer: {
    color: colors.textStrong,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  agendaRideTime: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F1EDFF"
  },
  stageBadgeWarning: {
    backgroundColor: "#FFF4D6"
  },
  stageBadgeSuccess: {
    backgroundColor: "#EAFBF1"
  },
  stageBadgeLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  stageBadgeLabelWarning: {
    color: "#8C5A00"
  },
  stageBadgeLabelSuccess: {
    color: "#167A47"
  },
  executionAlertPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFF4D6"
  },
  executionAlertPillCritical: {
    backgroundColor: "#FDEAE8"
  },
  executionAlertPillLabel: {
    color: "#8C5A00",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  executionAlertPillLabelCritical: {
    color: "#B33A2B"
  },
  agendaEtaCard: {
    gap: 2,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#EEE8FF"
  },
  agendaEtaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  agendaEtaValue: {
    color: colors.highlight,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  agendaRideMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  agendaMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  agendaMetaItem: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "48%"
  },
  agendaActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  agendaPrimaryActionButton: {
    flex: 1
  },
  agendaLegacyHidden: {
    display: "none"
  },
  detailOutlineButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9CEF9",
    backgroundColor: colors.white
  },
  detailOutlineButtonLabel: {
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  primaryActionButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.highlight
  },
  primaryActionButtonDisabled: {
    opacity: 0.7
  },
  primaryActionButtonLabel: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  rideCard: {
    gap: 12,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  rideCardPressed: {
    opacity: 0.96
  },
  rideEyebrow: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  acceptDeadlineButton: {
    position: "relative",
    overflow: "hidden",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#ECE6FF"
  },
  acceptDeadlineButtonDisabled: {
    opacity: 0.7
  },
  acceptDeadlineButtonWarning: {
    backgroundColor: "#FFF1CC"
  },
  acceptDeadlineButtonCritical: {
    backgroundColor: "#FFE1E1"
  },
  acceptDeadlineFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.highlight
  },
  acceptDeadlineFillWarning: {
    backgroundColor: "#F0B429"
  },
  acceptDeadlineFillCritical: {
    backgroundColor: "#E5484D"
  },
  acceptDeadlineContent: {
    zIndex: 1,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  acceptDeadlineLabelBadge: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,34,33,0.18)"
  },
  acceptDeadlineLabel: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  acceptDeadlineCountdownBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,34,33,0.26)"
  },
  acceptDeadlineCountdownBadgeWarning: {
    backgroundColor: "rgba(122,74,0,0.22)"
  },
  acceptDeadlineCountdownBadgeCritical: {
    backgroundColor: "rgba(158,35,35,0.18)"
  },
  acceptDeadlineCountdown: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  rideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  rideTopCopy: {
    flex: 1,
    gap: 2
  },
  rideTimeBlock: {
    flex: 1,
    gap: 2
  },
  rideTimeHero: {
    color: colors.textStrong,
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  rideCustomer: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  rideCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rideCustomerCopy: {
    flex: 1,
    gap: 2
  },
  rideCustomerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE8FF"
  },
  rideCustomerAvatarLabel: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  rideCustomerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 2
  },
  rideCustomerMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  rideCustomerMetaDot: {
    color: "#C2B9E6",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  ridePriceChip: {
    alignItems: "flex-end",
    justifyContent: "center"
  },
  ridePrice: {
    color: colors.highlight,
    fontSize: 31,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  rideSchedule: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium"
  },
  rideRouteCard: {
    gap: 10,
    paddingTop: 2
  },
  rideRouteSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rideRouteColumn: {
    flex: 1,
    gap: 4
  },
  rideRouteBlock: {
    gap: 2
  },
  rideRouteRow: {
    gap: 4
  },
  rideRouteDivider: {
    height: 1,
    backgroundColor: "#E6DEFF"
  },
  rideRouteLabel: {
    color: colors.highlight,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  rideRouteValue: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_500Medium"
  },
  rideRouteArrow: {
    color: colors.highlight,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  rideMetaRow: {
    display: "none"
  },
  rideMetaPills: {
    flexDirection: "row",
    gap: 10
  },
  rideMetaPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#FBFAFF"
  },
  rideMetaIconWrap: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F0EAFF"
  },
  rideMetaCopy: {
    flex: 1,
    gap: 2
  },
  rideMetaLabel: {
    color: "#6E6392",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  rideMetaValue: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  rideMetaText: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  rideMetaDivider: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  sidebarModalRoot: {
    flex: 1,
    flexDirection: "row"
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(43,34,33,0.22)"
  },
  sidebarPanel: {
    width: "86%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: "#E8E1FF"
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E1FF"
  },
  sidebarTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  sidebarCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EEE8FF"
  },
  sidebarCloseLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  sidebarScroll: {
    flex: 1
  },
  sidebarContent: {
    gap: 18,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  bottomBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E8E1FF"
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 0,
    backgroundColor: colors.white
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 58
  },
  navIconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  navBadge: {
    position: "absolute",
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#E84D4D"
  },
  navBadgeLabel: {
    color: colors.white,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: "Poppins_700Bold"
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  navLabelActive: {
    color: colors.highlight
  }
});
