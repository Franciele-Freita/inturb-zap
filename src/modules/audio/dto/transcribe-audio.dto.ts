import { IsString, IsUrl } from "class-validator";

export class TranscribeAudioDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  mediaUrl!: string;
}
