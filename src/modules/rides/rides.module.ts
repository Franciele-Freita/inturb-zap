import { Module } from "@nestjs/common";
import { MapsModule } from "../maps/maps.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";

@Module({
  imports: [MapsModule, PricingModule, NotificationsModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService]
})
export class RidesModule {}
