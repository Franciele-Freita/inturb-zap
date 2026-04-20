import { Body, Controller, ForbiddenException, Get, Post, Query } from "@nestjs/common";
import { SimulateMessageDto } from "./dto/simulate-message.dto";
import { WebhookProcessResult, WhatsappService } from "./whatsapp.service";

@Controller("whatsapp")
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get("webhook")
  verifyWebhook(
    @Query("hub.mode") mode?: string,
    @Query("hub.verify_token") token?: string,
    @Query("hub.challenge") challenge?: string
  ): string {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "dev-token";
    if (mode === "subscribe" && token === expectedToken && challenge) {
      return challenge;
    }

    throw new ForbiddenException("Webhook verification failed.");
  }

  @Post("webhook")
  async receiveWebhook(@Body() payload: unknown): Promise<WebhookProcessResult> {
    return this.whatsappService.processWebhook(payload);
  }

  @Post("simulate")
  async simulate(@Body() dto: SimulateMessageDto): Promise<WebhookProcessResult> {
    return this.whatsappService.simulateInboundMessage({
      from: dto.from,
      type: dto.type,
      text: dto.text
    });
  }
}