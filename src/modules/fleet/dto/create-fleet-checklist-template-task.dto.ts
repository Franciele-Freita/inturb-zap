import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateFleetChecklistTemplateTaskDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["BOOLEAN", "ODOMETER", "TEXT", "SELECT", "NUMBER", "PHOTO"])
  inputType!: "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";

  @IsOptional()
  @IsIn(["NONE", "REQUIRE_PHOTO", "OPEN_MAINTENANCE", "OPEN_SUPPORT_TICKET", "REQUIRE_NOTE", "REQUIRE_NUMBER"])
  actionType?: "NONE" | "REQUIRE_PHOTO" | "OPEN_MAINTENANCE" | "OPEN_SUPPORT_TICKET" | "REQUIRE_NOTE" | "REQUIRE_NUMBER";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectOptions?: string[];

  @IsOptional()
  builderConfig?: unknown;

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
