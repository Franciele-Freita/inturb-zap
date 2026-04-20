import { IsNotEmpty, IsString } from "class-validator";

export class UnregisterExpoPushTokenDto {
  @IsString()
  @IsNotEmpty()
  driverId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;
}
