import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class UpdateCargoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  level?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  levels?: string[];

  @IsOptional()
  @IsObject()
  cbo?: Record<string, unknown>;

  @IsOptional()
  @IsIn(["NONE", "10", "20", "40"])
  unhealthyAllowance?: "NONE" | "10" | "20" | "40";

  @IsOptional()
  @IsIn(["NONE", "30"])
  hazardousAllowance?: "NONE" | "30";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
