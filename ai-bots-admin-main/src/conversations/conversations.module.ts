import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ConversationModel } from './entities/conversation.model';
import { MessageModel } from 'src/messages/entities/message.model';

@Module({
  providers: [
    ConversationsService,
    {
      provide: getModelToken(ConversationModel),
      useValue: ConversationModel,
    },
    {
      provide: getModelToken(MessageModel),
      useValue: MessageModel,
    },
  ],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
