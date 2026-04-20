import { IsString, MinLength } from "class-validator";

export class SaveCustomerFavoriteAddressDto {
  @IsString()
  @MinLength(3)
  customerName!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsString()
  @MinLength(5)
  address!: string;
}
