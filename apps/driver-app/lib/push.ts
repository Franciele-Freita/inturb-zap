import { request } from "./api";

export type PushPermissionState = NotificationPermission | "unsupported";
export type PushReadiness = {
  permission: PushPermissionState;
  canPrompt: boolean;
  message: string;
};

type PushPublicKeyResponse = {
  publicKey: string;
};

type PushSubscriptionKeysJson = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionJsonPayload = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: PushSubscriptionKeysJson;
};

function hasPushSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermissionState(): PushPermissionState {
  if (!hasPushSupport()) {
    return "unsupported";
  }

  return Notification.permission;
}

export function getPushReadiness(): PushReadiness {
  if (typeof window === "undefined") {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: "Aguardando inicializacao do navegador."
    };
  }

  if (!window.isSecureContext) {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: "Abra este app por HTTPS para ativar notificacoes no celular."
    };
  }

  if (!("Notification" in window)) {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: "Este navegador nao suporta a API de notificacoes."
    };
  }

  if (!("serviceWorker" in navigator)) {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: "Este navegador nao suporta service worker para Web Push."
    };
  }

  if (!("PushManager" in window)) {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: "Este navegador nao suporta Web Push neste modo."
    };
  }

  if (isIosDevice() && !isStandaloneDisplayMode()) {
    return {
      permission: "unsupported",
      canPrompt: false,
      message: 'No iPhone, abra no Safari e use "Adicionar a Tela de Inicio" antes de ativar notificacoes.'
    };
  }

  if (Notification.permission === "granted") {
    return {
      permission: "granted",
      canPrompt: false,
      message: "Notificacoes ativas neste aparelho."
    };
  }

  if (Notification.permission === "denied") {
    return {
      permission: "denied",
      canPrompt: false,
      message: "As notificacoes foram bloqueadas. Libere o site nas configuracoes do navegador."
    };
  }

  return {
    permission: "default",
    canPrompt: true,
    message: "Toque em Ativar para o navegador pedir permissao de notificacao."
  };
}

export async function syncDriverPushSubscription(driverId: string): Promise<void> {
  if (getPushPermissionState() !== "granted") {
    return;
  }

  await subscribeDriverToPush(driverId);
}

export async function subscribeDriverToPush(driverId: string): Promise<PushPermissionState> {
  const permissionState = getPushPermissionState();
  if (permissionState === "unsupported") {
    return permissionState;
  }

  const nextPermission =
    permissionState === "granted" ? permissionState : await Notification.requestPermission();

  if (nextPermission !== "granted") {
    return nextPermission;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { publicKey } = await request<PushPublicKeyResponse>("/notifications/push/public-key");
  const applicationServerKey = base64UrlToUint8Array(publicKey) as BufferSource;

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !hasExpectedApplicationServerKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe().catch(() => undefined);
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  const serializedSubscription = subscription.toJSON() as PushSubscriptionJsonPayload;
  if (
    !serializedSubscription.endpoint ||
    !serializedSubscription.keys?.p256dh ||
    !serializedSubscription.keys?.auth
  ) {
    throw new Error("Nao foi possivel serializar a inscricao de notificacoes deste aparelho.");
  }

  await request<{ success: true }>("/notifications/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      driverId,
      subscription: {
        endpoint: serializedSubscription.endpoint,
        expirationTime: serializedSubscription.expirationTime ?? null,
        keys: {
          p256dh: serializedSubscription.keys.p256dh,
          auth: serializedSubscription.keys.auth
        }
      }
    })
  });

  return nextPermission;
}

export async function unregisterDriverPush(driverId: string): Promise<void> {
  if (!hasPushSupport()) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  await request<{ success: true }>("/notifications/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify({
      driverId,
      endpoint: subscription.endpoint
    })
  }).catch(() => undefined);

  await subscription.unsubscribe().catch(() => undefined);
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const normalized = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = window.atob(normalized);

  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function hasExpectedApplicationServerKey(
  subscription: PushSubscription,
  expectedKey: BufferSource
): boolean {
  const currentKey = subscription.options.applicationServerKey;
  if (!(currentKey instanceof ArrayBuffer)) {
    return false;
  }

  const currentBytes = new Uint8Array(currentKey);
  const expectedBytes = expectedKey instanceof ArrayBuffer ? new Uint8Array(expectedKey) : new Uint8Array(expectedKey.buffer);

  if (currentBytes.length !== expectedBytes.length) {
    return false;
  }

  return currentBytes.every((value, index) => value === expectedBytes[index]);
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
