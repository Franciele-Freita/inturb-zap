import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateTripTypeDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  surchargeAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
