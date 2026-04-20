import AsyncStorage from "@react-native-async-storage/async-storage";

export type DriverAppPreferences = {
  allowForegroundLocation: boolean;
  allowBackgroundLocation: boolean;
  notifyNewRides: boolean;
  playRideSound: boolean;
  vibrateOnRide: boolean;
  autoOpenQueue: boolean;
  keepScreenAwakeOnShift: boolean;
};

const DRIVER_PREFERENCES_STORAGE_KEY = "inturb-driver-mobile-preferences";

export const defaultDriverPreferences: DriverAppPreferences = {
  allowForegroundLocation: true,
  allowBackgroundLocation: false,
  notifyNewRides: true,
  playRideSound: true,
  vibrateOnRide: true,
  autoOpenQueue: true,
  keepScreenAwakeOnShift: false
};

export async function loadDriverPreferences(): Promise<DriverAppPreferences> {
  try {
    const stored = await AsyncStorage.getItem(DRIVER_PREFERENCES_STORAGE_KEY);
    if (!stored) {
      return defaultDriverPreferences;
    }

    return {
      ...defaultDriverPreferences,
      ...(JSON.parse(stored) as Partial<DriverAppPreferences>)
    };
  } catch {
    await AsyncStorage.removeItem(DRIVER_PREFERENCES_STORAGE_KEY).catch(() => undefined);
    return defaultDriverPreferences;
  }
}

export async function saveDriverPreferences(preferences: DriverAppPreferences): Promise<void> {
  await AsyncStorage.setItem(DRIVER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
