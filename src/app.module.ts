import { Module } from "@nestjs/common";
import { AdminModule } from "./modules/admin/admin.module";
import { AudioModule } from "./modules/audio/audio.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { DriversModule } from "./modules/drivers/drivers.module";
import { FleetModule } from "./modules/fleet/fleet.module";
import { HealthModule } from "./modules/health/health.module";
import { MapsModule } from "./modules/maps/maps.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { RidesModule } from "./modules/rides/rides.module";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    MapsModule,
    PricingModule,
    NotificationsModule,
    RidesModule,
    DriversModule,
    FleetModule,
    WhatsappModule,
    AudioModule,
    AuthModule,
    AdminModule,
    ConversationModule
  ]
})
export class AppModule {}
