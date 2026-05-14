import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

export class UpdateTimeAdjustmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  timeEntryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsIn(["IN", "OUT", "BREAK_START", "BREAK_END"])
  requestedKind?: "IN" | "OUT" | "BREAK_START" | "BREAK_END";

  @IsOptional()
  @IsDateString()
  requestedOccurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestedTimezone?: string;

  @IsOptional()
  @IsObject()
  requestedGeo?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestedNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
