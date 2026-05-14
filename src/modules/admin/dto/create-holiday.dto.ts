import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateHolidayDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  date!: string;

  @IsOptional()
  @IsIn(["NATIONAL", "STATE", "CITY"])
  scopeType?: "NATIONAL" | "STATE" | "CITY";

  @IsOptional()
  @IsString()
  @MaxLength(2)
  stateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cityCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
