import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class UpdateFleetVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(8)
  plate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1990)
  year?: number;

  @IsOptional()
  @IsIn(["AVAILABLE", "ALLOCATED", "MAINTENANCE", "INACTIVE"])
  status?: "AVAILABLE" | "ALLOCATED" | "MAINTENANCE" | "INACTIVE";

  @IsOptional()
  @IsString()
  notes?: string;
}
