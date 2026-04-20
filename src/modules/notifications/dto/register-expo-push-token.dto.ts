import { IsNotEmpty, IsString } from "class-validator";

export class RegisterExpoPushTokenDto {
  @IsString()
  @IsNotEmpty()
  driverId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;
}
