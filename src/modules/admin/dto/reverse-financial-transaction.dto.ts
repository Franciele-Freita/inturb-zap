import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReverseFinancialTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
