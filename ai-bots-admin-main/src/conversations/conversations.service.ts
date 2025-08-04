import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConversationModel } from './entities/conversation.model';
import { MessageModel } from 'src/messages/entities/message.model';
import { MessageTypes } from 'src/api/api.service';
import { IMessage, IChat } from 'src/api/dto/get-complete.dto';
import { Op } from 'sequelize';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(ConversationModel)
    private conversationModel: typeof ConversationModel,
    @InjectModel(MessageModel)
    private messageModel: typeof MessageModel,
  ) {}

  async createConversation(
    conversationId: string,
    messagesToSave: IMessage[],
    config: {
      project_id?: number;
      assistant_id?: number;
      name?: string;
      messages_slug?: string;
    },
  ): Promise<{ conversationId: string }> {
    // Create conversation
    const conversation = await this.conversationModel.create({
      id: conversationId,
      name: config.name || conversationId,
      project_id: config.project_id || null,
      assistant_id: config.assistant_id || null,
      messages_slug: config.messages_slug || null,
      messages: [],
    });

    // Create messages and collect their IDs
    const messageIds: string[] = [];
    let previousMessageId: string = null;

    for (const messageData of messagesToSave) {
      const message = await this.messageModel.create({
        conversation_id: conversationId,
        assistant_id: config.assistant_id || null,
        type: messageData.type as MessageTypes,
        text: messageData.message,
        previous_message_id: previousMessageId,
        next_message_id: null,
        created_at: messageData.createdAt
          ? new Date(messageData.createdAt)
          : new Date(),
        updated_at: new Date(),
      });

      // Update previous message's next_message_id
      if (previousMessageId) {
        await this.messageModel.update(
          { next_message_id: message.id },
          { where: { id: previousMessageId } },
        );
      }

      messageIds.push(message.id);
      previousMessageId = message.id;
    }

    // Update conversation with message IDs array
    await conversation.update({ messages: messageIds });

    return { conversationId };
  }

  async getConversation(conversationId: string): Promise<IChat> {
    const conversation = await this.conversationModel.findByPk(conversationId, {
      include: [
        {
          model: MessageModel,
          as: 'messageModels',
          order: [['created_at', 'ASC']],
        },
      ],
    });

    if (!conversation) {
      return {
        project_id: null,
        assistant_id: null,
        name: conversationId,
        id: conversationId,
        messages: [],
        messages_slug: '',
      };
    }

    const messages: IMessage[] = conversation.messageModels.map((msg) => ({
      type: msg.type,
      message: msg.text,
      messageId: msg.id,
      previousMessageId: msg.previous_message_id,
      createdAt: msg.created_at.toISOString(),
    }));

    return {
      project_id: conversation.project_id,
      assistant_id: conversation.assistant_id,
      name: conversation.name,
      id: conversation.id,
      messages,
      messages_slug: conversation.messages_slug || '',
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    };
  }

  async getConversationsList(projectId: number): Promise<{
    [conversationId: string]: {
      id: string;
      name: string;
      createdAt: string;
      messages_slug: string;
    };
  }> {
    const conversations = await this.conversationModel.findAll({
      where: { project_id: projectId },
      order: [['createdAt', 'DESC']],
    });

    const result = {};
    for (const conv of conversations) {
      result[conv.id] = {
        id: conv.id,
        name: conv.name,
        createdAt: conv.createdAt.getTime().toString(),
        messages_slug: conv.messages_slug || '',
      };
    }

    return result;
  }

  async appendToConversation(
    conversationId: string,
    messagesToSave: IMessage[],
    config: {
      project_id?: number;
      assistant_id?: number;
      name?: string;
      messages_slug?: string;
    },
  ): Promise<{ conversationId: string }> {
    const conversation = await this.conversationModel.findByPk(conversationId);

    if (!conversation) {
      // If conversation doesn't exist, create it
      return this.createConversation(conversationId, messagesToSave, config);
    }

    // Get the last message to link new messages
    const lastMessage = await this.messageModel.findOne({
      where: { conversation_id: conversationId },
      order: [['created_at', 'DESC']],
    });

    let previousMessageId = lastMessage?.id || null;
    const newMessageIds: string[] = [...(conversation.messages || [])];

    for (const messageData of messagesToSave) {
      const message = await this.messageModel.create({
        conversation_id: conversationId,
        assistant_id: config.assistant_id || null,
        type: messageData.type as MessageTypes,
        text: messageData.message,
        previous_message_id: previousMessageId,
        next_message_id: null,
        created_at: messageData.createdAt
          ? new Date(messageData.createdAt)
          : new Date(),
        updated_at: new Date(),
      });

      // Update previous message's next_message_id
      if (previousMessageId) {
        await this.messageModel.update(
          { next_message_id: message.id },
          { where: { id: previousMessageId } },
        );
      }

      newMessageIds.push(message.id);
      previousMessageId = message.id;
    }

    // Update conversation with updated message IDs array
    await conversation.update({
      messages: newMessageIds,
      messages_slug: config.messages_slug || conversation.messages_slug,
      name: config.name || conversation.name,
    });

    return { conversationId };
  }

  async clearConversation(conversationId: string): Promise<void> {
    // Delete all messages for this conversation
    await this.messageModel.destroy({
      where: { conversation_id: conversationId },
    });

    // Delete the conversation
    await this.conversationModel.destroy({
      where: { id: conversationId },
    });
  }

  async generateConversationMessagesSlug(
    messages: IMessage[],
  ): Promise<string> {
    if (!messages.length) return '';

    const firstMessage = messages[0];
    const date = new Date(firstMessage.createdAt).toLocaleString();
    const preview = firstMessage.message.substring(0, 50);

    return `${date} - ${preview}...`;
  }
}
