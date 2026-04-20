import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateRemunerationTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsIn(["DRIVER"])
  workerType?: "DRIVER";

  @IsOptional()
  @IsIn(["CLT", "INTERMITENTE", "MEI"])
  contractProfile?: "CLT" | "INTERMITENTE" | "MEI";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
