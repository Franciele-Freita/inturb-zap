import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";
import { Transform } from "class-transformer";

export class UpdateWorkProfileDto {
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
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  cargoName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value
  )
  @IsString()
  @MaxLength(120)
  cargoLevel?: string;

  @IsOptional()
  @IsIn(["CLT", "CLT_INTERMITENTE", "MEI", "PJ", "AUTONOMO"])
  contractType?: "CLT" | "CLT_INTERMITENTE" | "MEI" | "PJ" | "AUTONOMO";

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

  @IsOptional()
  @IsObject()
  remuneration?: Record<string, unknown>;

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
}
