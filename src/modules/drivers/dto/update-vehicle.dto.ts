import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  plate?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1990)
  year?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
