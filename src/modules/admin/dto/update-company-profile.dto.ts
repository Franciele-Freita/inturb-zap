import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";

export class UpdateCompanyEmploymentLinkageDto {
  @IsIn(["CLT", "CLT_INTERMITENTE", "MEI", "PJ", "AUTONOMO"])
  key!: "CLT" | "CLT_INTERMITENTE" | "MEI" | "PJ" | "AUTONOMO";

  @IsString()
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  sortOrder?: number;
}

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalRepresentativeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  legalRepresentativeCpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalRepresentativeRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contractSignatureCity?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyEmploymentLinkageDto)
  employmentLinkages?: UpdateCompanyEmploymentLinkageDto[];

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

  @IsOptional()
  @IsBoolean()
  geofenceEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  geofenceBaseLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  geofenceBaseLongitude?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(5000)
  geofenceRadiusMeters?: number;
}
