import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateDriverFleetChecklistItemDto {
  @IsString()
  itemKey!: string;

  @IsOptional()
  @IsBoolean()
  isChecked?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  numericValue?: number;
}
