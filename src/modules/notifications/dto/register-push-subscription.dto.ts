import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateIf, ValidateNested } from "class-validator";

class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;
}

class PushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

export class RegisterPushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  driverId!: string;

  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription!: PushSubscriptionDto;
}
