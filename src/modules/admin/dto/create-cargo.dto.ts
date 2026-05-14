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

export class CreateCargoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  department!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  level!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  levels!: string[];

  @IsObject()
  cbo!: Record<string, unknown>;

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
