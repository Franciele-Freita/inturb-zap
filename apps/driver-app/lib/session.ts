import type { DriverLoginResult } from "./api";

export const DRIVER_SESSION_STORAGE_KEY = "inturb-driver-session";

export function loadStoredDriverSession(): DriverLoginResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(DRIVER_SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as DriverLoginResult;
  } catch {
    window.localStorage.removeItem(DRIVER_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveStoredDriverSession(session: DriverLoginResult): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRIVER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredDriverSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DRIVER_SESSION_STORAGE_KEY);
}
