import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { MessageModel } from './entities/message.model';
import { MessagesService } from './messages.service';

@Module({
  providers: [
    MessagesService,
    { provide: getModelToken(MessageModel), useValue: MessageModel },
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
