import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateDriverLeavePeriodDto {
  @IsOptional()
  @IsIn(["VACATION", "LEAVE", "SUSPENSION"])
  type?: "VACATION" | "LEAVE" | "SUSPENSION";

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  startDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  notes?: string;
}
