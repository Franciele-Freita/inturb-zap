import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdatePricingConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFare?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceRatePerKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeRatePerMinute?: number;
}
