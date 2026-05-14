import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateFinancialTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
