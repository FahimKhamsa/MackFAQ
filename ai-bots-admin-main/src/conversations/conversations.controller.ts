import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Put,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { IMessage } from 'src/api/dto/get-complete.dto';

export interface IConversationId {
  conversationId: string;
}

export interface IConversationIds {
  conversationIds: string[];
}

export interface ICreateConversationDTO {
  conversationId?: string;
  messages: IMessage[];
  project_id?: string;
  assistant_id?: string;
  name?: string;
}

export interface IClearMemoryDTO {
  conversationId: string;
}

export interface IRenameConversationDTO {
  conversationId: string;
  name: string;
}

export interface IDeleteConversationDTO {
  conversationId: string;
}

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('conversation-history')
  async getConversationHistory(@Query() query: IConversationId) {
    return {
      data: await this.conversationsService.getConversation(
        query.conversationId,
      ),
    };
  }

  @Get('conversations-history')
  async getConversationsHistory(@Query() query: IConversationIds) {
    const conversations = await Promise.all(
      query.conversationIds.map((id) =>
        this.conversationsService.getConversation(id),
      ),
    );
    return {
      data: conversations,
    };
  }

  @Get('list-of-conversations')
  async getListOfConversations(@Query() query: { project_id?: string }) {
    return {
      data: await this.conversationsService.getConversationsList(
        query.project_id,
      ),
    };
  }

  @Post('create-conversation')
  async createConversation(@Body() body: ICreateConversationDTO) {
    return {
      data: await this.conversationsService.createConversation(
        body.conversationId,
        body.messages,
        {
          project_id: body.project_id,
          assistant_id: body.assistant_id,
          name: body.name,
        },
      ),
    };
  }

  @Post('append-conversation')
  async appendConversation(@Body() body: ICreateConversationDTO) {
    return {
      data: await this.conversationsService.appendToConversation(
        body.conversationId,
        body.messages,
        {
          project_id: body.project_id,
          assistant_id: body.assistant_id,
          name: body.name,
        },
      ),
    };
  }

  @Delete('clear-memory')
  async clearMemory(@Body() body: IClearMemoryDTO) {
    await this.conversationsService.clearConversation(body.conversationId);
    return {
      success: true,
    };
  }

  @Put('rename-conversation')
  async renameConversation(@Body() body: IRenameConversationDTO) {
    const result = await this.conversationsService.renameConversation(
      body.conversationId,
      body.name,
    );
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Delete('delete-conversation')
  async deleteConversation(@Body() body: IDeleteConversationDTO) {
    const result = await this.conversationsService.deleteConversation(
      body.conversationId,
    );
    return {
      success: result.success,
      message: result.message,
    };
  }
}
