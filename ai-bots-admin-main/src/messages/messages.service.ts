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
    id?: string;
    conversation_id: string;
    assistant_id?: number;
    previous_message_id?: string;
    next_message_id?: string;
    text: string;
    type: MessageTypes;
  }) {
    return await this.messageModel.create(payload);
  }

  public async getMessagesByConversationId(conversationId: string) {
    return await this.messageModel.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
    });
  }

  public async getMessageById(messageId: string) {
    return await this.messageModel.findByPk(messageId);
  }

  public async updateMessage(
    messageId: string,
    updates: Partial<{
      text: string;
      next_message_id: string;
      previous_message_id: string;
    }>,
  ) {
    return await this.messageModel.update(updates, {
      where: { id: messageId },
    });
  }

  public async deleteMessage(messageId: string) {
    return await this.messageModel.destroy({
      where: { id: messageId },
    });
  }

  public async deleteMessagesByConversationId(conversationId: string) {
    return await this.messageModel.destroy({
      where: { conversation_id: conversationId },
    });
  }
}
