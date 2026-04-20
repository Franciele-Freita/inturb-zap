import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class CreateFleetChecklistTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsIn(["START_OF_DAY", "END_OF_DAY"])
  routine!: "START_OF_DAY" | "END_OF_DAY";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
