import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateConversationSessionDto } from "./dto/create-conversation-session.dto";
import { SendConversationMessageDto } from "./dto/send-conversation-message.dto";
import { ConversationService } from "./conversation.service";
import { ConversationSessionView } from "./types";

@Controller("conversation")
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post("sessions")
  async createSession(@Body() dto: CreateConversationSessionDto): Promise<ConversationSessionView> {
    return this.conversationService.createSession(dto.phone);
  }

  @Get("sessions/:sessionId")
  async getSession(@Param("sessionId") sessionId: string): Promise<ConversationSessionView> {
    return this.conversationService.getSession(sessionId);
  }

  @Post("sessions/:sessionId/start")
  async startSession(@Param("sessionId") sessionId: string): Promise<ConversationSessionView> {
    return this.conversationService.startSession(sessionId);
  }

  @Post("sessions/:sessionId/reset")
  async resetSession(@Param("sessionId") sessionId: string): Promise<ConversationSessionView> {
    return this.conversationService.resetSession(sessionId);
  }

  @Post("sessions/:sessionId/messages")
  async sendMessage(
    @Param("sessionId") sessionId: string,
    @Body() body: SendConversationMessageDto
  ): Promise<ConversationSessionView> {
    return this.conversationService.sendMessage(sessionId, body.text);
  }
}
