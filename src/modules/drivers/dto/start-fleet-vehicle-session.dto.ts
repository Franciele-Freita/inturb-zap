import { IsOptional, IsString } from "class-validator";

export class StartFleetVehicleSessionDto {
  @IsOptional()
  @IsString()
  qrCodeToken?: string;

  @IsOptional()
  @IsString()
  plate?: string;
}
