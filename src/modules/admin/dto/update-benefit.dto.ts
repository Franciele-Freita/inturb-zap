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

export class UpdateBenefitDto {
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
  @IsIn(["FIXED", "PERCENTAGE", "VARIABLE", "INFORMATIVE"])
  type?: "FIXED" | "PERCENTAGE" | "VARIABLE" | "INFORMATIVE";

  @IsOptional()
  @IsObject()
  valueConfig?: Record<string, unknown>;

  @IsOptional()
  @IsIn(["MONTHLY", "DAILY", "PER_USE", "PER_TRIP", "ONE_TIME"])
  frequency?: "MONTHLY" | "DAILY" | "PER_USE" | "PER_TRIP" | "ONE_TIME";

  @IsOptional()
  @IsIn(["PER_EMPLOYEE", "PER_DAY_WORKED", "PER_TRIP"])
  applicationMode?: "PER_EMPLOYEE" | "PER_DAY_WORKED" | "PER_TRIP";

  @IsOptional()
  @IsBoolean()
  deductFromSalary?: boolean;

  @IsOptional()
  @IsBoolean()
  incursCharges?: boolean;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  editableInContract?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  workProfiles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsIn(["CLT", "CLT_INTERMITENTE", "MEI", "PJ", "AUTONOMO"], { each: true })
  @MaxLength(80, { each: true })
  contractProfiles?: string[];
}
