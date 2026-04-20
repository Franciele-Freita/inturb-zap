import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdateFleetMaintenancePlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn([
    "GENERAL",
    "PREVENTIVE",
    "CORRECTIVE",
    "ALIGNMENT",
    "BALANCING",
    "OIL_CHANGE",
    "TIRE",
    "INSPECTION",
    "CLEANING",
    "BODYWORK"
  ])
  serviceType?:
    | "GENERAL"
    | "PREVENTIVE"
    | "CORRECTIVE"
    | "ALIGNMENT"
    | "BALANCING"
    | "OIL_CHANGE"
    | "TIRE"
    | "INSPECTION"
    | "CLEANING"
    | "BODYWORK";

  @IsOptional()
  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  @IsOptional()
  @IsString()
  workshop?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  intervalMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  intervalKm?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  firstDueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  firstDueKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultEstimatedCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
