import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateFleetChecklistTemplateItemDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(["START_OF_DAY", "END_OF_DAY"])
  routine?: "START_OF_DAY" | "END_OF_DAY";

  @IsOptional()
  @IsIn(["BOOLEAN", "ODOMETER"])
  inputType?: "BOOLEAN" | "ODOMETER";

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
