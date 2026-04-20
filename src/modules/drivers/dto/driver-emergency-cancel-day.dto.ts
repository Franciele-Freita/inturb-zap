import { IsIn, Matches } from "class-validator";
import { DriverEmergencyCancellationReason } from "../../rides/types";

export class DriverEmergencyCancelDayDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateKey!: string;

  @IsIn(["DRIVER_ILLNESS", "DRIVER_ACCIDENT", "VEHICLE_INCIDENT"])
  reason!: DriverEmergencyCancellationReason;
}
