import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsInt,
  MaxLength,
  Max,
  Min,
  MinLength
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateWorkProfileDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  cargoId!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value
  )
  @IsString()
  @MaxLength(120)
  cargoLevel?: string;

  @IsIn(["CLT", "CLT_INTERMITENTE", "MEI", "PJ", "AUTONOMO"])
  contractType!: "CLT" | "CLT_INTERMITENTE" | "MEI" | "PJ" | "AUTONOMO";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  journeyTemplateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  journeyTemplateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  journeySummary?: string;

  @IsObject()
  remuneration!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  usesOvertime?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  overtimeTemplateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  overtimeTemplateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  overtimeSummary?: string;

  @IsOptional()
  @IsBoolean()
  usesNightPolicy?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nightTemplateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nightTemplateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nightSummary?: string;

  @IsOptional()
  @IsIn(["NATIONAL", "STATE", "CITY"])
  holidayScopeType?: "NATIONAL" | "STATE" | "CITY";

  @IsOptional()
  @IsString()
  @MaxLength(2)
  holidayStateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  holidayCityCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  holidaySummary?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  benefits?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsBoolean()
  allowContractEditing?: boolean;

  @IsOptional()
  @IsBoolean()
  allowJourneyCustomization?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBenefitsCustomization?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  toleranceMarkingMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  toleranceDailyMaxMinutes?: number;
}
