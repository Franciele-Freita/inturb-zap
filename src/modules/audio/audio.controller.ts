import { Body, Controller, Post } from "@nestjs/common";
import { TranscribeAudioDto } from "./dto/transcribe-audio.dto";
import { AudioService } from "./audio.service";

@Controller("audio")
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post("transcribe")
  transcribe(@Body() dto: TranscribeAudioDto) {
    return this.audioService.transcribe(dto.mediaUrl);
  }
}
