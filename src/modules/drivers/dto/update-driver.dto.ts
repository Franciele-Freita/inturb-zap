import { IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, MinLength, Min } from "class-validator";

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(11)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"])
  gender?: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(["FIXED", "FLEX"])
  fleetAssignmentMode?: "FIXED" | "FLEX";

  @IsOptional()
  @IsString()
  defaultFleetVehicleId?: string;

  @IsOptional()
  @IsIn(["PERCENT", "FLAT", "DAILY", "SHIFT", "SALARY", "INTERMITTENT", "CUSTOM"])
  compensationModel?: "PERCENT" | "FLAT" | "DAILY" | "SHIFT" | "SALARY" | "INTERMITTENT" | "CUSTOM";

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationValue?: number;

  @IsOptional()
  @IsString()
  compensationNotes?: string;

  @IsOptional()
  @IsIn(["AGREGADO", "FROTA"])
  driverType?: "AGREGADO" | "FROTA";

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "LEAVE", "SUSPENDED"])
  operationalStatus?: "ACTIVE" | "INACTIVE" | "LEAVE" | "SUSPENDED";

  @IsOptional()
  @IsString()
  operationalNotes?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  emergencyContacts?: unknown;

  @IsOptional()
  address?: unknown;

  @IsOptional()
  driverLicense?: unknown;

  @IsOptional()
  toxicology?: unknown;

  @IsOptional()
  complianceHistory?: unknown;

  @IsOptional()
  @IsIn(["CLT", "INTERMITENTE", "MEI"])
  contractProfile?: "CLT" | "INTERMITENTE" | "MEI";

  @IsOptional()
  journey?: unknown;

  @IsOptional()
  contract?: unknown;
}
