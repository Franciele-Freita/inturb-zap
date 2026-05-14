import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewTimeAdjustmentDto {
  @IsIn(["APPROVE", "REJECT"])
  decision!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}
