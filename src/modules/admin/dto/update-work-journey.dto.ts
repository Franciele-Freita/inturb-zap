import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class UpdateWorkJourneyDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(["FIXED", "FLEXIBLE", "INTERMITTENT"])
  type?: "FIXED" | "FLEXIBLE" | "INTERMITTENT";

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], { each: true })
  allowedDays?: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;

  @IsOptional()
  @IsIn(["NONE", "FIXED", "FLEXIBLE"])
  breakType?: "NONE" | "FIXED" | "FLEXIBLE";

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  breakDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(24)
  maxHoursPerDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  dsrEnabled?: boolean;

  @IsOptional()
  @IsIn(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])
  dsrWeeklyRestDay?: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

  @IsOptional()
  @IsBoolean()
  dsrReflectOvertime?: boolean;

  @IsOptional()
  @IsBoolean()
  dsrReflectNight?: boolean;

  @IsOptional()
  @IsBoolean()
  dsrLoseOnUnjustifiedAbsence?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  dsrDescription?: string;

  @IsOptional()
  @IsObject()
  fixedConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  flexibleConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  intermittentConfig?: Record<string, unknown>;
}
