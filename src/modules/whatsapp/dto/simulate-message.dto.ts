import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class SimulateMessageDto {
  @IsString()
  @MinLength(6)
  from!: string;

  @IsIn(["text", "audio"])
  type!: "text" | "audio";

  @IsOptional()
  @IsString()
  text?: string;
}
