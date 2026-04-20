import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdateFleetMaintenanceTaskDto {
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
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dueKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  recurrenceMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  recurrenceKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentOdometerKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
  status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}
