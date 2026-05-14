import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class CreateTimeEntryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  driverId!: string;

  @IsIn(["IN", "OUT", "BREAK_START", "BREAK_END"])
  kind!: "IN" | "OUT" | "BREAK_START" | "BREAK_END";

  @IsOptional()
  @IsIn(["APP", "WEB", "ADMIN", "IMPORT"])
  source?: "APP" | "WEB" | "ADMIN" | "IMPORT";

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsObject()
  deviceMeta?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  geo?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
