import { IsNotEmpty, IsString } from "class-validator";

export class UnregisterPushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  driverId!: string;

  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
