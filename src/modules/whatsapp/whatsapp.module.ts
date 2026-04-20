import { Module } from "@nestjs/common";
import { RidesModule } from "../rides/rides.module";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";

@Module({
  imports: [RidesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService]
})
export class WhatsappModule {}