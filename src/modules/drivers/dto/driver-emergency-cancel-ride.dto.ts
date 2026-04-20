import { IsIn } from "class-validator";
import { DriverEmergencyCancellationReason } from "../../rides/types";

export class DriverEmergencyCancelRideDto {
  @IsIn(["DRIVER_ILLNESS", "DRIVER_ACCIDENT", "VEHICLE_INCIDENT"])
  reason!: DriverEmergencyCancellationReason;
}
