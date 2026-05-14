import { RegisterExpoPushTokenDto } from "./dto/register-expo-push-token.dto";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { RegisterPushSubscriptionDto } from "./dto/register-push-subscription.dto";
import { UnregisterExpoPushTokenDto } from "./dto/unregister-expo-push-token.dto";
import { UnregisterPushSubscriptionDto } from "./dto/unregister-push-subscription.dto";
import {
  NotificationItem,
  NotificationsService,
  TimekeepingAlertQueueStatus
} from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query("driverId") driverId?: string): NotificationItem[] {
    return this.notificationsService.list(driverId);
  }

  @Get("push/public-key")
  getPushPublicKey(): { publicKey: string } {
    return {
      publicKey: this.notificationsService.getPushPublicKey()
    };
  }

  @Get("timekeeping/alerts/queue-status")
  getTimekeepingAlertQueueStatus(): TimekeepingAlertQueueStatus {
    return this.notificationsService.getTimekeepingAlertQueueStatus();
  }

  @Post("push/subscribe")
  async registerPushSubscription(@Body() dto: RegisterPushSubscriptionDto): Promise<{ success: true }> {
    await this.notificationsService.registerPushSubscription(dto);
    return { success: true };
  }

  @Post("push/expo/register")
  async registerExpoPushToken(@Body() dto: RegisterExpoPushTokenDto): Promise<{ success: true }> {
    await this.notificationsService.registerExpoPushToken(dto);
    return { success: true };
  }

  @Post("push/unsubscribe")
  async unregisterPushSubscription(@Body() dto: UnregisterPushSubscriptionDto): Promise<{ success: true }> {
    await this.notificationsService.unregisterPushSubscription(dto);
    return { success: true };
  }

  @Post("push/expo/unregister")
  async unregisterExpoPushToken(@Body() dto: UnregisterExpoPushTokenDto): Promise<{ success: true }> {
    await this.notificationsService.unregisterExpoPushToken(dto);
    return { success: true };
  }

  @Post(":notificationId/read")
  markAsRead(@Param("notificationId") notificationId: string): NotificationItem {
    return this.notificationsService.markAsRead(notificationId);
  }
}
