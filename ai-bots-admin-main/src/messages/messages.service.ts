import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MessageTypes } from 'src/api/api.service';
import { MessageModel } from './entities/message.model';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(MessageModel) private messageModel: typeof MessageModel,
  ) {}

  public async createNewMessage(payload: {
    unique_id: string;
    conversation_unique_id: string;
    bot_id?: number;
    previous_message_id?: number;
    text: string;
    type: MessageTypes;
  }) {
    return await this.messageModel.create(payload);
  }
}
