import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdatePricingRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsIn(["WEEKLY_WINDOW", "DATE_RANGE"])
  scheduleType?: "WEEKLY_WINDOW" | "DATE_RANGE";

  @IsOptional()
  @IsIn(["FLAT", "PERCENT"])
  adjustmentType?: "FLAT" | "PERCENT";

  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustmentValue?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  daysOfWeek?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  startMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  endMinutes?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
