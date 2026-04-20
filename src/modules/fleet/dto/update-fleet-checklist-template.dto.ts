import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateFleetChecklistTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(["START_OF_DAY", "END_OF_DAY"])
  routine?: "START_OF_DAY" | "END_OF_DAY";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
