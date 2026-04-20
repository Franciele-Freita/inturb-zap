import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MinLength(8)
  phone!: string;

  @IsString()
  @MinLength(4)
  pin!: string;
}
