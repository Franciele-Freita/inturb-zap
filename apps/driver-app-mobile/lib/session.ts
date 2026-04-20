import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DriverLoginResult } from "./api";

const DRIVER_SESSION_STORAGE_KEY = "inturb-driver-mobile-session";

export async function loadStoredDriverSession(): Promise<DriverLoginResult | null> {
  try {
    const stored = await AsyncStorage.getItem(DRIVER_SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as DriverLoginResult;
  } catch {
    await AsyncStorage.removeItem(DRIVER_SESSION_STORAGE_KEY).catch(() => undefined);
    return null;
  }
}

export async function saveStoredDriverSession(session: DriverLoginResult): Promise<void> {
  await AsyncStorage.setItem(DRIVER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredDriverSession(): Promise<void> {
  await AsyncStorage.removeItem(DRIVER_SESSION_STORAGE_KEY);
}
