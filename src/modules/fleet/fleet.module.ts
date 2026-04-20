import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DriversModule } from "../drivers/drivers.module";
import { FleetController } from "./fleet.controller";
import { FleetService } from "./fleet.service";

@Module({
  imports: [AuthModule, DriversModule],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService]
})
export class FleetModule {}
