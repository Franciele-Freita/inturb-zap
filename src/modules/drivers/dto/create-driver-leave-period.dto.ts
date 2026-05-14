import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDriverLeavePeriodDto {
  @IsIn(["VACATION", "LEAVE", "SUSPENSION"])
  type!: "VACATION" | "LEAVE" | "SUSPENSION";

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  startDate!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  notes?: string;
}
