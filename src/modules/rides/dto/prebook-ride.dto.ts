import { IsBoolean } from "class-validator";

export class PrebookRideDto {
  @IsBoolean()
  customerConfirmed!: boolean;
}
