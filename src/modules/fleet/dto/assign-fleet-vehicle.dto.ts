import { IsOptional, IsString, MinLength } from "class-validator";

export class AssignFleetVehicleDto {
  @IsString()
  @MinLength(5)
  driverId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
