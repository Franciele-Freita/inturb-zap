import { Module } from "@nestjs/common";
import { MapsModule } from "../maps/maps.module";
import { PricingModule } from "../pricing/pricing.module";
import { RidesModule } from "../rides/rides.module";
import { ContractsSignatureController } from "./contracts-signature.controller";
import { DriverAuthGuard } from "./driver-auth.guard";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  imports: [RidesModule, PricingModule, MapsModule],
  controllers: [DriversController, ContractsSignatureController],
  providers: [DriversService, DriverAuthGuard],
  exports: [DriversService]
})
export class DriversModule {}
