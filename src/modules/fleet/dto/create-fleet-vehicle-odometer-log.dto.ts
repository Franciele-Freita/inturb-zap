import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateFleetVehicleOdometerLogDto {
  @IsInt()
  @Min(0)
  odometerKm!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
