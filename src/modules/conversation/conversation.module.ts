import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { RidesModule } from "../rides/rides.module";
import { ConversationController } from "./conversation.controller";
import { ConversationService } from "./conversation.service";

@Module({
  imports: [RidesModule, AdminModule],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService]
})
export class ConversationModule {}
