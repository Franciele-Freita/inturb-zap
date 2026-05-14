"use client";

import type { TimeEntry, TimeEntryKind, TimekeepingDashboard } from "../lib/api";

export const ENTRY_KIND_OPTIONS: Array<{ value: TimeEntryKind; label: string }> = [
  { value: "IN", label: "Entrada" },
  { value: "BREAK_START", label: "Inicio de intervalo" },
  { value: "BREAK_END", label: "Fim de intervalo" },
  { value: "OUT", label: "Saida" }
];

export const ENTRY_SOURCE_OPTIONS: Array<{ value: "ADMIN" | "APP" | "WEB" | "IMPORT"; label: string }> = [
  { value: "ADMIN", label: "Manual" },
  { value: "APP", label: "App" },
  { value: "WEB", label: "Sistema web" },
  { value: "IMPORT", label: "Sistema (integracao)" }
];

export function formatMinutes(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatCurrency(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(safe);
}

export function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentPeriodKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function defaultDateTimeLocalValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toDashboardStateLabel(state: TimekeepingDashboard["drivers"][number]["state"]): string {
  switch (state) {
    case "IN_JOURNEY":
      return "Em jornada";
    case "ON_BREAK":
      return "Em intervalo";
    case "FINISHED":
      return "Finalizado";
    default:
      return "Nao iniciado";
  }
}

export function resolveGeofenceStatusLabel(entry: TimeEntry): string {
  const geofence = entry.geo?.geofence as
    | {
        enabled?: boolean;
        inside?: boolean;
        confidenceScore?: number;
      }
    | undefined;
  if (!geofence || geofence.enabled === false) {
    return "-";
  }
  const score =
    typeof geofence.confidenceScore === "number" && Number.isFinite(geofence.confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(geofence.confidenceScore)))
      : undefined;
  const status = geofence.inside ? "Dentro da base" : "Fora da base";
  return score === undefined ? status : `${status} (${score}%)`;
}
