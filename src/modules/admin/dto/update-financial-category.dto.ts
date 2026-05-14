import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateFinancialCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(["REVENUE", "EXPENSE", "BOTH"])
  type?: "REVENUE" | "EXPENSE" | "BOTH";

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
