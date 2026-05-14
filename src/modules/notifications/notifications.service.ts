import { DriverExpoPushToken, DriverPushSubscription } from "@prisma/client";
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import webpush = require("web-push");
import { PrismaService } from "../prisma/prisma.service";
import { RegisterExpoPushTokenDto } from "./dto/register-expo-push-token.dto";
import { RegisterPushSubscriptionDto } from "./dto/register-push-subscription.dto";
import { UnregisterExpoPushTokenDto } from "./dto/unregister-expo-push-token.dto";
import { UnregisterPushSubscriptionDto } from "./dto/unregister-push-subscription.dto";

export interface NotificationItem {
  id: string;
  type: "NEW_PREBOOKED_RIDE" | "RIDE_ACCEPTED" | "RIDE_REJECTED" | "TIMEKEEPING_MISSING_PUNCH";
  rideId?: string;
  eventKey?: string;
  driverId?: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

type WebPushPayload = {
  title: string;
  body: string;
  rideId: string;
  tag: string;
  url: string;
  mobilePath?: string;
  requireInteraction?: boolean;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: string;
  data: {
    rideId: string;
    url: string;
    tag: string;
  };
};

type VapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
  generated: boolean;
};

type TimekeepingMissingPunchAlertInput = {
  date: string;
  drivers: Array<{
    driverId: string;
    driverName: string;
    delayed: boolean;
    state: "NOT_STARTED" | "IN_JOURNEY" | "ON_BREAK" | "FINISHED";
    expectedMinutes: number;
    firstEntryAt?: string;
  }>;
};

type TimekeepingWhatsappQueueItem = {
  eventKey: string;
  phone: string;
  text: string;
  enqueuedAt: number;
};

export interface TimekeepingAlertQueueStatus {
  processing: boolean;
  pendingItems: number;
  pendingEventKeys: string[];
  dedupTrackedKeys: number;
  latestEnqueuedAt?: string;
}

@Injectable()
export class NotificationsService {
  private static generatedVapidDetails: VapidDetails | null = null;
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notifications: NotificationItem[] = [];
  private readonly vapidDetails = NotificationsService.resolveVapidDetails();
  private readonly timekeepingWhatsappQueue: TimekeepingWhatsappQueueItem[] = [];
  private readonly sentTimekeepingEventKeys = new Map<string, number>();
  private timekeepingQueueProcessing = false;

  constructor(private readonly prisma: PrismaService) {
    webpush.setVapidDetails(
      this.vapidDetails.subject,
      this.vapidDetails.publicKey,
      this.vapidDetails.privateKey
    );

    if (this.vapidDetails.generated) {
      this.logger.warn(
        "WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY nao foram configuradas. Usando chaves efemeras apenas para desenvolvimento."
      );
    }
  }

  list(driverId?: string): NotificationItem[] {
    return this.notifications
      .filter((notification) => !driverId || !notification.driverId || notification.driverId === driverId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getPushPublicKey(): string {
    return this.vapidDetails.publicKey;
  }

  getTimekeepingAlertQueueStatus(): TimekeepingAlertQueueStatus {
    const pendingEventKeys = [...new Set(this.timekeepingWhatsappQueue.map((item) => item.eventKey))].slice(0, 20);
    const latestEnqueuedAtMs = this.timekeepingWhatsappQueue.reduce<number | undefined>((latest, item) => {
      if (latest === undefined) return item.enqueuedAt;
      return item.enqueuedAt > latest ? item.enqueuedAt : latest;
    }, undefined);

    return {
      processing: this.timekeepingQueueProcessing,
      pendingItems: this.timekeepingWhatsappQueue.length,
      pendingEventKeys,
      dedupTrackedKeys: this.sentTimekeepingEventKeys.size,
      latestEnqueuedAt: latestEnqueuedAtMs ? new Date(latestEnqueuedAtMs).toISOString() : undefined
    };
  }

  async registerPushSubscription(dto: RegisterPushSubscriptionDto): Promise<void> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
      select: { id: true, isActive: true }
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${dto.driverId} not found.`);
    }

    if (!driver.isActive) {
      throw new ForbiddenException("Esse motorista esta inativo e nao pode receber notificacoes.");
    }

    await this.prisma.driverPushSubscription.upsert({
      where: { endpoint: dto.subscription.endpoint },
      update: {
        driverId: dto.driverId,
        p256dh: dto.subscription.keys.p256dh,
        auth: dto.subscription.keys.auth
      },
      create: {
        driverId: dto.driverId,
        endpoint: dto.subscription.endpoint,
        p256dh: dto.subscription.keys.p256dh,
        auth: dto.subscription.keys.auth
      }
    });
  }

  async unregisterPushSubscription(dto: UnregisterPushSubscriptionDto): Promise<void> {
    await this.prisma.driverPushSubscription.deleteMany({
      where: {
        driverId: dto.driverId,
        endpoint: dto.endpoint
      }
    });
  }

  async registerExpoPushToken(dto: RegisterExpoPushTokenDto): Promise<void> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: dto.driverId },
      select: { id: true, isActive: true }
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${dto.driverId} not found.`);
    }

    if (!driver.isActive) {
      throw new ForbiddenException("Esse motorista esta inativo e nao pode receber notificacoes.");
    }

    await this.prisma.driverExpoPushToken.upsert({
      where: { token: dto.token },
      update: {
        driverId: dto.driverId
      },
      create: {
        driverId: dto.driverId,
        token: dto.token
      }
    });
  }

  async unregisterExpoPushToken(dto: UnregisterExpoPushTokenDto): Promise<void> {
    await this.prisma.driverExpoPushToken.deleteMany({
      where: {
        driverId: dto.driverId,
        token: dto.token
      }
    });
  }

  markAsRead(notificationId: string): NotificationItem {
    const notification = this.notifications.find((entry) => entry.id === notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found.`);
    }

    notification.readAt = notification.readAt ?? new Date().toISOString();
    return notification;
  }

  notifyNewPrebookedRide(rideId: string): void {
    void this.notifyNewPrebookedRideAsync(rideId);
  }

  notifyRideDecision(rideId: string, decision: "ACCEPT" | "REJECT", driverId: string): void {
    this.notifications.unshift({
      id: `notification_${this.notifications.length + 1}`,
      type: decision === "ACCEPT" ? "RIDE_ACCEPTED" : "RIDE_REJECTED",
      rideId,
      driverId,
      title: decision === "ACCEPT" ? "Corrida aceita" : "Corrida recusada",
      body:
        decision === "ACCEPT"
          ? `O motorista ${driverId} aceitou a corrida ${rideId}.`
          : `O motorista ${driverId} recusou a corrida ${rideId}.`,
      createdAt: new Date().toISOString()
    });

    this.logger.log(`Ride ${rideId} received decision ${decision} from driver ${driverId}.`);
    void this.sendToDriver(driverId, {
      title: decision === "ACCEPT" ? "Corrida aceita" : "Corrida recusada",
      body:
        decision === "ACCEPT"
          ? `Voce aceitou a corrida ${rideId}.`
          : `Voce recusou a corrida ${rideId}.`,
      rideId,
      tag: `ride-decision-${rideId}`,
      url: decision === "ACCEPT" ? `/?tab=mine&rideId=${encodeURIComponent(rideId)}` : "/",
      requireInteraction: false
    });
  }

  queueTimekeepingMissingPunchAlerts(input: TimekeepingMissingPunchAlertInput): void {
    const candidates = input.drivers.filter(
      (driver) =>
        driver.delayed &&
        driver.state === "NOT_STARTED" &&
        driver.expectedMinutes > 0 &&
        !driver.firstEntryAt
    );
    if (candidates.length === 0) {
      return;
    }

    void this.queueTimekeepingMissingPunchAlertsAsync(input.date, candidates);
  }

  private async broadcastToActiveDrivers(payload: WebPushPayload): Promise<void> {
    const [webSubscriptions, expoPushTokens] = await Promise.all([
      this.prisma.driverPushSubscription.findMany({
        where: {
          driver: {
            isActive: true
          }
        }
      }),
      this.prisma.driverExpoPushToken.findMany({
        where: {
          driver: {
            isActive: true
          }
        }
      })
    ]);

    await Promise.all([
      this.deliverPushNotifications(webSubscriptions, payload),
      this.deliverExpoPushNotifications(expoPushTokens, payload)
    ]);
  }

  private async sendToDriver(driverId: string, payload: WebPushPayload): Promise<void> {
    const [webSubscriptions, expoPushTokens] = await Promise.all([
      this.prisma.driverPushSubscription.findMany({
        where: {
          driverId
        }
      }),
      this.prisma.driverExpoPushToken.findMany({
        where: { driverId }
      })
    ]);

    await Promise.all([
      this.deliverPushNotifications(webSubscriptions, payload),
      this.deliverExpoPushNotifications(expoPushTokens, payload)
    ]);
  }

  private async deliverPushNotifications(
    subscriptions: DriverPushSubscription[],
    payload: WebPushPayload
  ): Promise<void> {
    if (subscriptions.length === 0) {
      return;
    }

    await Promise.allSettled(
      subscriptions.map((subscription) => this.sendNotificationToSubscription(subscription, payload))
    );
  }

  private async sendNotificationToSubscription(
    subscription: DriverPushSubscription,
    payload: WebPushPayload
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : null;

      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.driverPushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint }
        });
      }

      const message = error instanceof Error ? error.message : "Unknown push delivery failure.";
      this.logger.warn(`Falha ao enviar push para ${subscription.endpoint}: ${message}`);
    }
  }

  private async deliverExpoPushNotifications(
    tokens: DriverExpoPushToken[],
    payload: WebPushPayload
  ): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token.token,
      title: payload.title,
      body: payload.body,
      sound: "default",
      channelId: "driver-rides",
      data: {
        rideId: payload.rideId,
        url: payload.mobilePath ?? payload.url,
        tag: payload.tag
      }
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-encoding": "gzip, deflate",
          "content-type": "application/json"
        },
        body: JSON.stringify(messages)
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Falha ao enviar Expo Push: HTTP ${response.status} - ${text}`);
        return;
      }

      const body = (await response.json()) as {
        data?: Array<{ status?: string; details?: { error?: string } }>;
        errors?: Array<{ message?: string }>;
      };

      if (body.errors?.length) {
        this.logger.warn(`Expo Push retornou erros: ${body.errors.map((entry) => entry.message).join(" | ")}`);
      }

      const invalidTokens = tokens.filter((token, index) => {
        const ticket = body.data?.[index];
        return ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered";
      });

      if (invalidTokens.length > 0) {
        await this.prisma.driverExpoPushToken.deleteMany({
          where: {
            token: {
              in: invalidTokens.map((token) => token.token)
            }
          }
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Expo push delivery failure.";
      this.logger.warn(`Falha ao enviar Expo Push: ${message}`);
    }
  }

  private async notifyNewPrebookedRideAsync(rideId: string): Promise<void> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const amount = ride?.quotes[0] ? Number(ride.quotes[0].amount) : null;
    const title = "Nova corrida aguardando aceite";
    const body = ride
      ? `${this.toShortAddress(ride.origin)} → ${this.toShortAddress(ride.destination)}${
          amount !== null ? ` • ${this.formatCurrency(amount)}` : ""
        }`
      : `A corrida ${rideId} entrou na fila de pre-agendamento.`;

    this.notifications.unshift({
      id: `notification_${this.notifications.length + 1}`,
      type: "NEW_PREBOOKED_RIDE",
      rideId,
      title,
      body,
      createdAt: new Date().toISOString()
    });

    this.logger.log(`Ride ${rideId} is prebooked and ready for driver notification.`);
    await this.broadcastToActiveDrivers({
      title,
      body,
      rideId,
      tag: `new-prebooked-ride-${rideId}`,
      url: `/?tab=available&rideId=${encodeURIComponent(rideId)}`,
      mobilePath: `/ride/${encodeURIComponent(rideId)}`,
      requireInteraction: true
    });
  }

  private async queueTimekeepingMissingPunchAlertsAsync(
    date: string,
    candidates: Array<{
      driverId: string;
      driverName: string;
      expectedMinutes: number;
    }>
  ): Promise<void> {
    const managerPhones = await this.listTimekeepingManagerPhones();
    if (managerPhones.length === 0) {
      return;
    }

    const nowIso = new Date().toISOString();
    this.evictOldTimekeepingEventKeys();

    for (const driver of candidates) {
      const eventKey = `timekeeping:missing-in:${date}:${driver.driverId}`;
      if (this.sentTimekeepingEventKeys.has(eventKey)) {
        continue;
      }
      this.sentTimekeepingEventKeys.set(eventKey, Date.now());

      const title = "Batida faltante detectada";
      const body = `Motorista ${driver.driverName} ainda nao iniciou a jornada prevista em ${date}.`;
      this.notifications.unshift({
        id: `notification_${this.notifications.length + 1}`,
        type: "TIMEKEEPING_MISSING_PUNCH",
        eventKey,
        driverId: driver.driverId,
        title,
        body,
        createdAt: nowIso
      });

      const text = [
        "Alerta de ponto (batida faltante).",
        `Data: ${date}`,
        `Motorista: ${driver.driverName}`,
        `Status: nao iniciou jornada prevista.`
      ].join("\n");

      for (const phone of managerPhones) {
        this.timekeepingWhatsappQueue.push({
          eventKey,
          phone,
          text,
          enqueuedAt: Date.now()
        });
      }
    }

    if (this.timekeepingWhatsappQueue.length > 0) {
      void this.processTimekeepingWhatsappQueue();
    }
  }

  private async processTimekeepingWhatsappQueue(): Promise<void> {
    if (this.timekeepingQueueProcessing) {
      return;
    }
    this.timekeepingQueueProcessing = true;
    try {
      while (this.timekeepingWhatsappQueue.length > 0) {
        const item = this.timekeepingWhatsappQueue.shift();
        if (!item) {
          continue;
        }
        await this.sendWhatsappText(item.phone, item.text);
      }
    } finally {
      this.timekeepingQueueProcessing = false;
    }
  }

  private async listTimekeepingManagerPhones(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ["ADMIN", "OPERATOR"]
        },
        phone: {
          not: null
        }
      },
      select: {
        phone: true
      }
    });
    return users
      .map((user) => this.normalizeWhatsappPhone(user.phone ?? undefined))
      .filter((phone): phone is string => Boolean(phone));
  }

  private async sendWhatsappText(phone: string, text: string): Promise<void> {
    if ((process.env.WHATSAPP_SEND_ENABLED ?? "false").toLowerCase() !== "true") {
      return;
    }
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v21.0";
    if (!accessToken || !phoneNumberId) {
      return;
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: {
            body: text
          }
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        const errorMessage = payload.error?.message ?? `Erro HTTP ${response.status}`;
        this.logger.warn(`Falha no alerta de ponto via WhatsApp para ${phone}: ${errorMessage}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado no envio WhatsApp.";
      this.logger.warn(`Falha de rede no alerta de ponto para ${phone}: ${message}`);
    }
  }

  private normalizeWhatsappPhone(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length < 10) {
      return undefined;
    }
    return digits;
  }

  private evictOldTimekeepingEventKeys(): void {
    const maxAgeMs = 12 * 60 * 60 * 1000;
    const now = Date.now();
    for (const [key, timestamp] of this.sentTimekeepingEventKeys.entries()) {
      if (now - timestamp > maxAgeMs) {
        this.sentTimekeepingEventKeys.delete(key);
      }
    }
  }

  private toShortAddress(value: string): string {
    return value.split(",")[0]?.trim() || value;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  }

  private static resolveVapidDetails(): VapidDetails {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
    const subject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:dev@inturb.local";

    if (publicKey && privateKey) {
      return {
        publicKey,
        privateKey,
        subject,
        generated: false
      };
    }

    if (!this.generatedVapidDetails) {
      const generatedKeys = webpush.generateVAPIDKeys();
      this.generatedVapidDetails = {
        publicKey: generatedKeys.publicKey,
        privateKey: generatedKeys.privateKey,
        subject,
        generated: true
      };
    }

    return this.generatedVapidDetails;
  }
}
