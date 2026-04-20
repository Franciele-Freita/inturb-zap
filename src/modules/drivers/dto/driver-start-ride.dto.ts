import { IsString, Length } from "class-validator";

export class DriverStartRideDto {
  @IsString()
  @Length(4, 6)
  pickupCode!: string;
}
