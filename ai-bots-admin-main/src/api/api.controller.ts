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
import { BotsService } from 'src/bots/bots.service';
import { UpdateBotDTO } from 'src/bots/dto/update.dto';
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

@Controller('api')
@UseInterceptors(AuthedWithBot)
export class ApiController {
  constructor(
    private apiService: ApiService,
    private botService: BotsService,
  ) {}

  @UseInterceptors(ProjecLink)
  @Get('complete')
  public async getComplete(@Query() query: IGetCompleteDTO) {
    console.log(query);
    return {
      // data: await this.apiService.deepFaq(
      //   query.prompt,
      //   query.conversationId,
      //   {
      //     project_id: query.project_id,
      //     bot_id: query.bot_id,
      //     currentUserId: 0,
      //     forcePromptPrefix: query.promptPrefix || null,
      //   },
      //   query.conversationName,
      //   null,
      //   query.createdAt,
      //   query.forceDisableDocsData,
      //   query.filesToUse,
      // ),
      data: await this.apiService.getAnswer(
        query.prompt,
        query.conversationId,
        { ...query, translate_to_language: query.lang || null },
      ),
    };
  }

  @Get('recomplete-for-message')
  public async recomplete(@Query() query: IRecompleteDTO) {
    return {
      data: await this.apiService.deepFaq(
        null,
        query.conversationId,
        { project_id: null, bot_id: null, currentUserId: 0 },
        null,
        query.messageId,
      ),
      // data: await this.apiService.getAnswer(query.prompt, query.conversationId, { ...query, translate_to_language: query.lang || null }),
    };
  }

  @Get('deep-faq/complete')
  public async getDeepFaqComplete(@Query() query: IGetCompleteDTO) {
    return {
      data: await this.apiService.deepFaq(query.prompt, query.conversationId, {
        project_id: query.project_id,
        bot_id: query.bot_id,
        currentUserId: 0,
      }),
    };
  }

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
  public async deleteKnowledge(@Query('id') id: number) {
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
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  public async getDefaultProject(@Query('bot_id') bot_id: number) {
    return await this.apiService.defaultProject(+bot_id);
  }

  @Put('file-connection')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  public async connectFile(
    @Query('bot_id') bot_id: number,
    @Body()
    body: { project_id: number; learning_session_id: number; status: boolean },
  ) {
    await this.apiService.connectLearnedFileToProject(
      {
        project_id: body.project_id,
        learning_session_id: body.learning_session_id,
        bot_id,
      },
      body.status,
    );
    return {
      status: true,
    };
  }

  @Get('my-docs')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  public async myConnections(
    @Query('bot_id') bot_id: number,
    @Query('project_id') project_id: number,
  ) {
    return {
      status: true,
      data: await this.apiService.getAllFiles(bot_id),
    };
  }

  @Post('upload-file')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  public async uploadFile(
    @UploadedFiles() files,
    @Query('bot_id') bot_id: number,
    @Query('project_id') project_id: number = null,
  ) {
    const file = files?.file?.[0];

    if (!file || !file.buffer) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    const uploadedFile = await this.apiService.uploadFileOnly(
      {
        content: file.buffer,
        name: file.originalname,
        mimetype: file.mimetype,
      },
      { bot_id, project_id },
    );

    return {
      status: true,
      data: uploadedFile,
      message:
        'File uploaded successfully. Use /api/train-files to train the AI.',
    };
  }

  @Post('train-files')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  public async trainFiles(
    @Query('bot_id') bot_id: number,
    @Query('project_id') project_id: number,
  ) {
    if (!project_id) {
      throw new HttpException('Project ID is required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.apiService.trainPendingFiles({
      bot_id,
      project_id,
    });

    return {
      status: true,
      data: result,
    };
  }

  @Get('pending-files')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  public async getPendingFiles(
    @Query('bot_id') bot_id: number,
    @Query('project_id') project_id: number,
  ) {
    const pendingFiles = await this.apiService.getPendingFiles({
      bot_id,
      project_id,
    });

    return {
      status: true,
      data: pendingFiles,
    };
  }

  @Post('train')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  public async trainModel(
    @UploadedFiles() files,
    @Req() req: Request,
    @Query('bot_id') bot_id: number,
    @Body() body: { raw?: string },
    @Query('project_id') project_id: number = null,
  ) {
    const file = files?.file?.[0];

    if (!file || !file.buffer) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    await this.apiService.trainWithFile(
      {
        content: file.buffer,
        name: file.originalname,
        mimetype: file.mimetype,
      },
      { bot_id, project_id },
    );

    return {
      status: true,
      data: [],
    };

    const user = req?.user as UserModel;
    const inputText = body.raw || null;
    if (!files?.file?.[0]?.buffer && !inputText) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    return {
      status: true,
      data: await this.apiService.trainModel(
        files?.file?.[0]?.buffer || inputText,
        {
          bot_id: +bot_id,
          project_id: project_id && project_id,
          mode: files?.file?.[0]?.buffer
            ? files?.file?.[0]?.originalname?.split('.').slice(-1)[0]
            : 'raw-lines',
        },
      ),
    };
  }

  @Delete('train')
  @UseGuards(JwtAuthGuard)
  async deleteTrain(
    @Query('bot_id') bot_id: number,
    @Query('project_id') project_id: number = null,
  ) {
    return {
      status: true,
      data: await this.apiService.deleteAllIntents(bot_id, project_id),
    };
  }

  @Post('/update-bot-prompt')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  async updateBotPrompt(
    @Body()
    body: {
      prompt_answer_pre_prefix: string;
      id: number;
      prompt_prefix: string;
    },
  ) {
    return {
      status: true,
      data: await this.botService.updateBot(+body.id, {
        prompt_answer_pre_prefix: body.prompt_answer_pre_prefix,
        prompt_prefix: body.prompt_prefix,
      }),
    };
  }
  @Get('/bot-prompt')
  // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
  async getBotPrompt(@Query('bot_id') bot_id: number) {
    const bot = await this.botService.getBot(+bot_id);
    return {
      status: true,
      data: bot ? bot.dataValues : null,
    };
  }

  @Get('/bot')
  async getBot(@Query('id') id: number) {
    return {
      status: true,
      data: (await this.botService.getBot(+id)).config_for_front,
    };
  }
}
