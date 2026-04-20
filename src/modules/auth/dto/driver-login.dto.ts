import { IsString, MinLength } from "class-validator";

export class DriverLoginDto {
  @IsString()
  @MinLength(11)
  cpf!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
