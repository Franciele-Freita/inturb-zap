import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateFleetChecklistTemplateItemDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category!: string;

  @IsIn(["START_OF_DAY", "END_OF_DAY"])
  routine!: "START_OF_DAY" | "END_OF_DAY";

  @IsIn(["BOOLEAN", "ODOMETER"])
  inputType!: "BOOLEAN" | "ODOMETER";

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
