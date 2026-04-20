import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { request } from "./api";

const EXPO_PUSH_TOKEN_STORAGE_KEY = "inturb-driver-mobile-expo-push-token";
let notificationsHandlerConfigured = false;

type NotificationsModule = {
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
  addNotificationResponseReceivedListener?: (listener: (response: any) => void) => { remove: () => void };
  addNotificationReceivedListener?: (listener: (notification: any) => void) => { remove: () => void };
  setNotificationChannelAsync?: (channelId: string, channel: any) => Promise<unknown>;
  getPermissionsAsync?: () => Promise<{ status: string }>;
  requestPermissionsAsync?: () => Promise<{ status: string }>;
  getExpoPushTokenAsync?: (input: { projectId: string }) => Promise<{ data: string }>;
  AndroidImportance?: {
    MAX: number;
  };
};

async function loadNotificationsModule() {
  const loadedModule = (await import("expo-notifications")) as unknown as NotificationsModule & {
    default?: NotificationsModule;
  };
  const Notifications = loadedModule.default ?? loadedModule;

  if (!notificationsHandlerConfigured && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });

    notificationsHandlerConfigured = true;
  }

  return Notifications;
}

export async function addDriverNotificationResponseListener(
  onRideOpen: (rideId: string) => void
): Promise<() => void> {
  const Notifications = await loadNotificationsModule();
  if (typeof Notifications.addNotificationResponseReceivedListener !== "function") {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const rideId = extractRideIdFromNotificationData(response.notification.request.content.data);
    if (rideId) {
      onRideOpen(rideId);
    }
  });

  return () => subscription.remove();
}

export async function addDriverNotificationReceivedListener(
  onRideNotification: (rideId: string) => void
): Promise<() => void> {
  const Notifications = await loadNotificationsModule();
  if (typeof Notifications.addNotificationReceivedListener !== "function") {
    return () => undefined;
  }

  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const rideId = extractRideIdFromNotificationData(notification.request.content.data);
    if (rideId) {
      onRideNotification(rideId);
    }
  });

  return () => subscription.remove();
}

function extractRideIdFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const rideId = "rideId" in data ? data.rideId : undefined;
  if (typeof rideId === "string" && rideId.trim()) {
    return rideId;
  }

  const url = "url" in data ? data.url : undefined;
  if (typeof url === "string") {
    const match = url.match(/\/ride\/([^/?#]+)/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

async function isPhysicalDevice(): Promise<boolean> {
  const Device = await import("expo-device");
  return Device.isDevice;
}

function resolveExpoProjectId(): string | null {
  const projectIdFromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (projectIdFromEnv) {
    return projectIdFromEnv;
  }

  const projectIdFromEasConfig = Constants.easConfig?.projectId;
  if (projectIdFromEasConfig) {
    return projectIdFromEasConfig;
  }

  return null;
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  const Notifications = await loadNotificationsModule();
  if (
    typeof Notifications.setNotificationChannelAsync !== "function" ||
    !Notifications.AndroidImportance
  ) {
    return;
  }

  await Notifications.setNotificationChannelAsync("driver-rides", {
    name: "Corridas do motorista",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6B4EEB",
    sound: "default"
  });
}

export async function registerDriverPushNotifications(driverId: string): Promise<{
  token?: string;
  status: "registered" | "unavailable" | "denied" | "missing_project_id" | "failed";
  message?: string;
}> {
  try {
    await ensureAndroidNotificationChannel();

    if (Constants.appOwnership === "expo" && Platform.OS === "android") {
      return {
        status: "unavailable",
        message: "Push remoto no Android exige development build; no Expo Go ficam so notificacoes locais."
      };
    }

    if (!(await isPhysicalDevice())) {
      return {
        status: "unavailable",
        message: "Push remoto so funciona em aparelho fisico."
      };
    }

    const Notifications = await loadNotificationsModule();
    if (
      typeof Notifications.getPermissionsAsync !== "function" ||
      typeof Notifications.requestPermissionsAsync !== "function" ||
      typeof Notifications.getExpoPushTokenAsync !== "function"
    ) {
      return {
        status: "unavailable",
        message: "expo-notifications nao esta totalmente disponivel neste ambiente."
      };
    }

    const projectId = resolveExpoProjectId();
    if (!projectId) {
      return {
        status: "missing_project_id",
        message: "Defina EXPO_PUBLIC_EAS_PROJECT_ID para gerar o Expo Push Token."
      };
    }

    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      return {
        status: "denied",
        message: "Permissao de notificacao negada no aparelho."
      };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    await request("/notifications/push/expo/register", {
      method: "POST",
      body: JSON.stringify({
        driverId,
        token
      })
    });

    await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, token);

    return {
      status: "registered",
      token
    };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Falha ao registrar notificacoes push."
    };
  }
}

export async function unregisterDriverPushNotifications(driverId: string): Promise<void> {
  const token = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  if (!token) {
    return;
  }

  await request("/notifications/push/expo/unregister", {
    method: "POST",
    body: JSON.stringify({
      driverId,
      token
    })
  }).catch(() => undefined);

  await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_STORAGE_KEY).catch(() => undefined);
}
