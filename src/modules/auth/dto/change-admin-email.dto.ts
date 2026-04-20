import { IsEmail, IsString, MinLength } from "class-validator";

export class ChangeAdminEmailDto {
  @IsEmail()
  newEmail!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
