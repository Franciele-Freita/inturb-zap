import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpsertFleetVehicleChecklistItemDto {
  @IsString()
  itemKey!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsString()
  label!: string;

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
  @IsIn(["BOOLEAN", "ODOMETER", "TEXT", "SELECT", "NUMBER", "PHOTO"])
  inputType?: "BOOLEAN" | "ODOMETER" | "TEXT" | "SELECT" | "NUMBER" | "PHOTO";

  @IsOptional()
  @IsIn(["NONE", "REQUIRE_PHOTO", "OPEN_MAINTENANCE", "OPEN_SUPPORT_TICKET", "REQUIRE_NOTE", "REQUIRE_NUMBER"])
  actionType?: "NONE" | "REQUIRE_PHOTO" | "OPEN_MAINTENANCE" | "OPEN_SUPPORT_TICKET" | "REQUIRE_NOTE" | "REQUIRE_NUMBER";

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateKey!: string;

  @IsBoolean()
  isChecked!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  numericValue?: number;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsString()
  selectedOption?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
