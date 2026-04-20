import { IsOptional, IsString } from "class-validator";

export class CreateConversationSessionDto {
  @IsOptional()
  @IsString()
  phone?: string;
}
