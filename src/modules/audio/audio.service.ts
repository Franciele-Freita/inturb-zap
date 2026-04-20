import { Injectable } from "@nestjs/common";

@Injectable()
export class AudioService {
  transcribe(mediaUrl: string): { mediaUrl: string; transcript: string; confidence: number } {
    return {
      mediaUrl,
      transcript: "Origem centro, destino aeroporto, para hoje as 18:30.",
      confidence: 0.74
    };
  }
}
