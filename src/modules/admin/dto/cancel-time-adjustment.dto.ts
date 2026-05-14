import { IsOptional, IsString, MaxLength } from "class-validator";

export class CancelTimeAdjustmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
