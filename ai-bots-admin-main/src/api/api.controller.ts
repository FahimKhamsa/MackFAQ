import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { UserModel } from 'src/users/entities/user.model';
import { ApiService, MessageTypes } from './api.service';
import { IClearMemoryDTO } from './dto/clear-memory.dto';
import {
  IConversationId,
  IConversationIds,
  ICreateConversationDTO,
  IGetCompleteDTO,
  IProjectIdentification,
  IRecompleteDTO,
} from './dto/get-complete.dto';
import { AuthedWithBot } from 'src/authed-with-bot.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ProjecLink } from 'src/project-link.decorator';
import { OpenaiKnowledgeService } from 'src/openai-knowledge/openai-knowledge.service';
import { BotsService } from 'src/bots/bots.service';
import { ConversationsService } from 'src/conversations/conversations.service';

@Controller('api')
@UseInterceptors(AuthedWithBot)
export class ApiController {
  constructor(
    private apiService: ApiService,
    private openaiKnowledgeService: OpenaiKnowledgeService,
    private botsService: BotsService,
    private conversationsService: ConversationsService,
  ) {}

  @UseInterceptors(ProjecLink)
  @Get('complete')
  public async getComplete(@Query() query: IGetCompleteDTO) {
    console.log('Query', query);

    // Feature flag for OpenAI Knowledge Retrieval
    const useOpenAIKnowledge = process.env.USE_OPENAI_KNOWLEDGE === 'true';

    // Try OpenAI Knowledge Retrieval first if enabled and project_id is provided
    if (useOpenAIKnowledge && query.project_id) {
      try {
        console.log(
          '[OpenAI Knowledge] Attempting to use knowledge retrieval for project:',
          query.project_id,
        );

        const knowledgeResult = await this.openaiKnowledgeService.askQuestion(
          query.project_id,
          query.prompt,
          query.conversationId, // Use as threadId
          query.userId, // Pass the actual userId from the query
          undefined, // sessionId - can be added later
        );

        console.log(
          '[OpenAI Knowledge] Success! Got response from knowledge base',
        );

        // Store conversation and messages in the traditional system
        try {
          const isNewConversation = !query.conversationId;
          const conversationId = knowledgeResult.threadId;

          // Get assistant info for the project
          const assistant =
            await this.openaiKnowledgeService.getProjectAssistant(
              query.project_id,
            );
          const assistantId = assistant?.id || null;

          // Prepare messages to store
          const messagesToStore = [
            {
              type: MessageTypes.USER_MESSAGE,
              message: query.prompt,
              messageId: `user-${Date.now()}`,
              createdAt: query.createdAt || new Date().toISOString(),
            },
            {
              type: MessageTypes.AI_MESSAGE,
              message: knowledgeResult.answer,
              messageId: knowledgeResult.messageId || `ai-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ];

          if (isNewConversation) {
            // Create new conversation
            await this.conversationsService.createConversation(
              conversationId,
              messagesToStore,
              {
                project_id: query.project_id,
                user_id: query.userId,
                assistant_id: assistantId,
                name:
                  query.conversationName ||
                  `Chat ${new Date().toLocaleDateString()}`,
                messages_slug:
                  await this.conversationsService.generateConversationMessagesSlug(
                    messagesToStore,
                  ),
              },
            );
            console.log(
              '[OpenAI Knowledge] Created new conversation:',
              conversationId,
            );
          } else {
            // Append to existing conversation
            await this.conversationsService.appendToConversation(
              conversationId,
              messagesToStore,
              {
                project_id: query.project_id,
                assistant_id: assistantId,
              },
            );
            console.log(
              '[OpenAI Knowledge] Appended to existing conversation:',
              conversationId,
            );
          }
        } catch (storageError) {
          console.error(
            '[OpenAI Knowledge] Failed to store conversation:',
            storageError,
          );
          // Don't fail the request if storage fails, just log the error
        }

        return {
          data: {
            answer: knowledgeResult.answer,
            conversationId: knowledgeResult.threadId, // Return threadId as conversationId for frontend compatibility
            sources: [], // Can be enhanced later with file source tracking
            sopReferences: [], // Keep existing SOP logic if needed
            usedKnowledgeBase: true, // Flag to indicate source
          },
        };
      } catch (error) {
        console.log(
          '[OpenAI Knowledge] Failed, falling back to existing system:',
          error.message,
        );
        // Continue to fallback system below
      }
    }

    // Fallback to existing system
    // console.log('[Fallback] Using existing RAG system');
    // return {
    //   data: await this.apiService.getAnswer(
    //     query.prompt,
    //     query.conversationId,
    //     { ...query, translate_to_language: query.lang || null },
    //   ),
    // };
  }

  // @Get('recomplete-for-message')
  // public async recomplete(@Query() query: IRecompleteDTO) {
  //   return {
  //     data: await this.apiService.deepFaq(
  //       null,
  //       query.conversationId,
  //       { project_id: null, bot_id: null, user_id: null },
  //       null,
  //       query.messageId,
  //     ),
  //     // data: await this.apiService.getAnswer(query.prompt, query.conversationId, { ...query, translate_to_language: query.lang || null }),
  //   };
  // }

  // @Get('deep-faq/complete')
  // public async getDeepFaqComplete(@Query() query: IGetCompleteDTO) {
  //   return {
  //     data: await this.apiService.deepFaq(query.prompt, query.conversationId, {
  //       project_id: query.project_id,
  //       bot_id: query.bot_id,
  //       user_id: query.userId,
  //     }),
  //   };
  // }

  @UseInterceptors(ProjecLink)
  @Get('saved-knowledge')
  public async importedKnowledge(@Query() query) {
    return {
      data: await this.apiService.importedKnowledge(query),
      project_id: query.project_id,
      project_link: query.project_link,
    };
  }

  @Delete('saved-knowledge-qoidoqe2koakjfoqwe')
  public async deleteKnowledge(@Query('id') id: string) {
    return {
      data: await this.apiService.deleteImportedKnowledge(id),
    };
  }

  @Get('list-of-conversations')
  @UseGuards(JwtAuthGuard)
  public async listConversations(@Query() query: IProjectIdentification) {
    return {
      data: await this.apiService.getListOfConversationIds(query),
    };
  }

  @Get('conversation-history')
  public async conversationHistory(@Query() query: IConversationId) {
    return {
      data: await this.apiService.getConversationHistory(query.conversationId),
    };
  }

  @Get('conversations-history')
  public async conversationsHistory(@Query() query: IConversationIds) {
    return {
      data: await this.apiService.getConversationsHistory(
        query.conversationIds,
      ),
    };
  }

  @Get('project-history-compiled')
  @UseGuards(JwtAuthGuard)
  public async projectHistoryCompiled(
    @Query() query: IProjectIdentification,
    @Res() res: Response,
  ) {
    if (!query.bot_id || !query.project_id) {
      res
        .setHeader('Content-Type', 'text/plain')
        .send('Please, set project_id and bot_id get parameters')
        .status(400);
      return;
    }

    const conversationsList = Object.values(
      await this.apiService.getConversationsHistory(query),
    ).sort((a, b) => {
      if (!a.messages.length) {
        return 1;
      }
      if (!b.messages.length) {
        return -1;
      }

      return (
        Number(new Date(b.messages[b.messages.length - 1].createdAt)) -
        Number(new Date(a.messages[a.messages.length - 1].createdAt))
      );
    });

    let text = '';

    for (const chat of conversationsList) {
      text += '\n\n\n-----------------------------------\n';
      text += chat.name + '\n\n';
      for (const message of chat.messages) {
        let dateStr = '';
        if (message.createdAt) {
          const date = new Date(message.createdAt);

          const year = date.getUTCFullYear();
          const month = date.getUTCMonth() + 1;
          const day = date.getUTCDate();
          const hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();

          dateStr = `${year}-${month.toString().padStart(2, '0')}-${day
            .toString()
            .padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}`;
        }

        text += `[${
          message.type === MessageTypes.AI_MESSAGE ? 'ROBOT' : 'CLIENT'
        } | ${dateStr}]\n${message.message}\n\n`;
      }

      text += '-----------------------------------';
    }

    res.setHeader('Content-Type', 'text/plain').send(text.trim()).status(200);
  }

  @Post('create-conversation')
  public async createConversation(@Body() body: ICreateConversationDTO) {
    return {
      data: await this.apiService.createConversation(
        body.conversationId,
        body.messages,
        false,
        body,
      ),
    };
  }

  @Post('append-conversation')
  public async appendConversation(@Body() body: ICreateConversationDTO) {
    return {
      data: await this.apiService.createConversation(
        body.conversationId,
        body.messages,
        true,
        body,
      ),
    };
  }

  @Post('clear-memory')
  public async clearMemory(@Body() body: IClearMemoryDTO) {
    await this.apiService.clearConversationHistory(body.conversationId);
    return {
      status: true,
    };
  }

  @Post('default-project')
  @UseGuards(JwtAuthGuard)
  public async getDefaultProject(@Req() req: Request) {
    console.log('Request user:', req.user); // Debug log
    const user = req.user as any;

    if (!user || !user.id) {
      throw new HttpException(
        'User not authenticated or missing ID',
        HttpStatus.UNAUTHORIZED,
      );
    }

    console.log('User ID:', user.id); // Debug log
    const defaultBot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });
    return await this.apiService.defaultProject({
      bot_id: defaultBot.id,
      user_id: user.id,
    });
  }

  @Put('file-connection')
  @UseGuards(JwtAuthGuard)
  public async connectFile(
    @Req() req: Request,
    @Body()
    body: { project_id: string; learning_session_id: string; status: boolean },
  ) {
    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    await this.apiService.connectLearnedFileToProject(
      {
        project_id: body.project_id,
        learning_session_id: body.learning_session_id,
        bot_id: bot.id.toString(),
      },
      body.status,
    );
    return {
      status: true,
    };
  }

  @Get('my-docs')
  @UseGuards(JwtAuthGuard)
  public async myConnections(
    @Req() req: Request,
    @Query('project_id') project_id?: string,
  ) {
    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    return {
      status: true,
      data: await this.apiService.getAllFiles(bot.id.toString()),
    };
  }

  @Post('upload-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  public async uploadFile(
    @UploadedFiles() files,
    @Req() req: Request,
    @Query('project_id') project_id: string = null,
  ) {
    const file = files?.file?.[0];

    if (!file || !file.buffer) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    // Feature flag for OpenAI Knowledge Retrieval
    const useOpenAIKnowledge = process.env.USE_OPENAI_KNOWLEDGE === 'true';

    // Try OpenAI Knowledge Retrieval first if enabled and project_id is provided
    if (useOpenAIKnowledge && project_id) {
      try {
        console.log(
          '[OpenAI Knowledge] Uploading file to knowledge base for project:',
          project_id,
        );

        const openaiResult =
          await this.openaiKnowledgeService.uploadFileForRetrieval(
            project_id,
            file.buffer,
            file.originalname,
            user.id,
          );

        console.log(
          '[OpenAI Knowledge] File uploaded successfully to knowledge base',
        );

        return {
          status: true,
          data: {
            id: openaiResult.dbFileId,
            file_name: file.originalname,
            openai_file_id: openaiResult.fileId,
            createdAt: new Date().toISOString(),
          },
          message:
            'File uploaded to OpenAI Knowledge Base successfully. Ready for queries!',
        };
      } catch (error) {
        console.log(
          '[OpenAI Knowledge] File upload failed, falling back to existing system:',
          error.message,
        );
        // Continue to fallback system below
      }
    }

    // Fallback to existing system
    console.log('[Fallback] Using existing file upload system');
    const uploadedFile = await this.apiService.uploadFileOnly(
      {
        content: file.buffer,
        name: file.originalname,
        mimetype: file.mimetype,
      },
      { bot_id: bot.id.toString(), project_id },
    );

    return {
      status: true,
      data: uploadedFile,
      message:
        'File uploaded successfully. Use /api/train-files to train the AI.',
    };
  }

  @Post('train-files')
  @UseGuards(JwtAuthGuard)
  public async trainFiles(
    @Req() req: Request,
    @Query('project_id') project_id: string,
  ) {
    if (!project_id) {
      throw new HttpException('Project ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    // Feature flag for OpenAI Knowledge Retrieval
    const useOpenAIKnowledge = process.env.USE_OPENAI_KNOWLEDGE === 'true';

    // Try OpenAI Knowledge Retrieval first if enabled
    if (useOpenAIKnowledge) {
      try {
        console.log(
          '[OpenAI Knowledge] Initializing assistant for project:',
          project_id,
        );

        // Initialize or get existing assistant for the project
        const assistant =
          await this.openaiKnowledgeService.createOrGetAssistant(
            project_id,
            'You are a helpful AI assistant for this project. Use the uploaded documents to provide accurate, contextual answers to user questions. If you cannot find relevant information in the uploaded files, clearly state that the information is not available in the knowledge base.',
          );

        console.log(
          '[OpenAI Knowledge] Assistant ready for project:',
          project_id,
        );

        return {
          status: true,
          data: {
            message:
              'OpenAI Knowledge Base is ready! Files are automatically processed when uploaded.',
            assistantId: assistant.assistantId,
            trainedCount: 0, // OpenAI handles training automatically
            failedCount: 0,
          },
        };
      } catch (error) {
        console.log(
          '[OpenAI Knowledge] Assistant initialization failed, falling back to existing system:',
          error.message,
        );
        // Continue to fallback system below
      }
    }

    // Fallback to existing system
    console.log('[Fallback] Using existing training system');
    const result = await this.apiService.trainPendingFiles({
      bot_id: bot.id.toString(),
      project_id,
    });

    return {
      status: true,
      data: result,
    };
  }

  @Get('pending-files')
  @UseGuards(JwtAuthGuard)
  public async getPendingFiles(
    @Req() req: Request,
    @Query('project_id') project_id: string,
  ) {
    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    const pendingFiles = await this.apiService.getPendingFiles({
      bot_id: bot.id.toString(),
      project_id,
    });

    return {
      status: true,
      data: pendingFiles,
    };
  }

  @Post('train')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  public async trainModel(
    @UploadedFiles() files,
    @Req() req: Request,
    @Body() body: { raw?: string },
    @Query('project_id') project_id: string = null,
  ) {
    const file = files?.file?.[0];

    if (!file || !file.buffer) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    await this.apiService.trainWithFile(
      {
        content: file.buffer,
        name: file.originalname,
        mimetype: file.mimetype,
      },
      { bot_id: bot.id.toString(), project_id },
    );

    return {
      status: true,
      data: [],
    };
  }

  // @Delete('train')
  // @UseGuards(JwtAuthGuard)
  // async deleteTrain(
  //   @Query('bot_id') bot_id: string,
  //   @Query('project_id') project_id: string = null,
  // ) {
  //   return {
  //     status: true,
  //     data: await this.apiService.deleteAllIntents(bot_id, project_id),
  //   };
  // }

  // @Post('/update-bot-prompt')
  // // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  // async updateBotPrompt(
  //   @Body()
  //   body: {
  //     prompt_answer_pre_prefix: string;
  //     id: string;
  //     prompt_prefix: string;
  //   },
  // ) {
  //   return {
  //     status: true,
  //     data: await this.botService.updateBot(body.id, {
  //       prompt_answer_pre_prefix: body.prompt_answer_pre_prefix,
  //       prompt_prefix: body.prompt_prefix,
  //     }),
  //   };
  // }
  @Get('bot-prompt')
  @UseGuards(JwtAuthGuard)
  async getBotPrompt(@Req() req: Request, @Query('bot_id') bot_id?: string) {
    const user = req.user as any;

    // If bot_id is provided, use it; otherwise get user's default bot
    let bot;
    if (bot_id) {
      bot = await this.botsService.getBot(+bot_id);
    } else {
      bot = await this.botsService.getDefaultBotForUser({ user_id: user.id });
    }

    return {
      status: true,
      data: bot ? bot.dataValues : null,
    };
  }

  // @Get('/bot')
  // async getBot(@Query('id') id: string) {
  //   return {
  //     status: true,
  //     data: (await this.botService.getBot(id)).config_for_front,
  //   };
  // }
}
