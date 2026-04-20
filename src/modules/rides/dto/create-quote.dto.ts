import { IsBoolean, IsISO8601, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateQuoteDto {
  @IsString()
  @MinLength(5)
  customerName!: string;

  @IsString()
  @MinLength(3)
  origin!: string;

  @IsString()
  @MinLength(3)
  destination!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  tripTypeSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  baggageCount?: number;

  @IsOptional()
  @IsString()
  baggageSize?: string;

  @IsOptional()
  @IsString()
  petType?: string;

  @IsOptional()
  @IsString()
  petSize?: string;

  @IsOptional()
  @IsBoolean()
  customerHasReducedMobility?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  passengerCount?: number;

  @IsOptional()
  @IsBoolean()
  companionNeedsSpecialAttention?: boolean;

  @IsOptional()
  @IsString()
  companionSpecialAttentionDetails?: string;

  @IsOptional()
  @IsBoolean()
  hasIntermediateStops?: boolean;

  @IsOptional()
  @IsString()
  intermediateStopsSummary?: string;
}
