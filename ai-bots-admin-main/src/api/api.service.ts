/* eslint-disable @typescript-eslint/ban-types */
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { GptapiService } from 'src/gptapi/gptapi.service';
import * as crypto from 'crypto';
import { MessagesService } from 'src/messages/messages.service';
import { ConversationsService } from 'src/conversations/conversations.service';
import { ProjectsService } from 'src/projects/projects.service';
import { LargeFilesProcessingService } from 'src/large-files-processing/large-files-processing.service';
import { ProjectModel } from 'src/projects/entities/projects.model';
import {
  ICreateConversationDTO,
  IMessage,
  IProjectIdentification,
  IChat,
} from './dto/get-complete.dto';
import { ProjectAssistantModel } from 'src/openai-knowledge/entities/project-assistant.model';
import { IdentityService } from 'src/identity/identity.service';
import { BotModel } from 'src/bots/entities/bot.model';

// class Chat {
//   public readonly project_id: any;
//   public readonly bot_id: any;
//   public name: string;
//   public readonly id: string;
//   public messages: IMessage[];

//   constructor(data: Chat) {
//     this;
//   }
// }

export enum MessageTypes {
  SYSTEM_MESSAGE = 'system_message',
  USER_MESSAGE = 'user_message',
  AI_MESSAGE = 'ai_message',
}
export const conversationIdPattern = /[A-Za-z0-9_-]{1,555}/; // /^[A-Za-z0-9_-]{10,30}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9_-]{10,30}$/;

const longToByteArray = (long: number) => {
  const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

  for (let index = 0; index < byteArray.length; index++) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long = (long - byte) / 256;
  }

  return byteArray;
};

@Injectable()
export class ApiService {
  private _assistantLabel: string;
  private _userLabel: string;
  private _stopString: string;
  private _promptPrefix: string;
  private _conversationsInProcess: {
    [conversationId: string]: boolean;
  } = {};

  private logger = new Logger(ApiService.name);
  private projectAssistantModel: typeof ProjectAssistantModel;
  private botModel: typeof BotModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
    private gptapiService: GptapiService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private projectsService: ProjectsService,
    private largeFilesProcessingService: LargeFilesProcessingService,
    private identityService: IdentityService,
  ) {
    this.projectAssistantModel = this.sequelize.models
      .ProjectAssistantModel as typeof ProjectAssistantModel;
    this.botModel = this.sequelize.models.BotModel as typeof BotModel;
    this._assistantLabel = this.configService.get<string>(
      '_assistantLabel',
      '_assistantLabel',
    );
    this._userLabel = this.configService.get<string>(
      '_userLabel',
      '_userLabel',
    );
    this._stopString = this.configService.get<string>(
      '_stopString',
      '<|im_end|>',
    );

    this._promptPrefix = '';
  }

  private newMessageId() {
    return (
      crypto.randomBytes(5).toString('base64url') +
      '-' +
      Buffer.concat([
        new Uint8Array(Buffer.from(longToByteArray(+new Date()))),
        new Uint8Array(crypto.randomBytes(5)),
      ]).toString('base64url')
    );
  }

  public validateConversationId(conversationId: string) {
    const base64regex = conversationIdPattern;
    if (!base64regex.test(conversationId)) {
      throw new Error('Conversation id is not correct');
    }
  }

  public async createProject() {
    return await this.projectsService;
  }

  private async GPTMatch(
    userPrompt: string,
    intents: {
      id: number;
      text: string;
    }[],
    maxMathches = 1,
    config: any,
  ) {
    intents = [...intents];
    const intentsById = Object.fromEntries(
      intents.map(({ id, ...v }) => [id, { ...v, id }]),
    );
    const result = [];
    // intents.sort(() => Math.random() - 0.5);
    let promptResult: {
      prompt: string;
      lastMessageIndex: number;
      promptBody: IMessage[];
    } = null;
    let searched = 0;
    config._stopString = '';
    const versionGPT4 = !!config?.GPT4;
    while (intents.length && (!promptResult || intents.length - searched > 0)) {
      try {
        promptResult = await this.formatPromptForIntentsMatcher(
          userPrompt,
          intents.slice(0, intents.length - searched),
          config,
        );
        let choosedId = null;

        if (versionGPT4) {
          // console.log(this.translateToGPT4(promptResult.promptBody));
          const answer = await this.gptapiService.getComplete4(
            this.translateToGPT4(promptResult.promptBody),
          );
          choosedId = answer.choices[0]?.message?.content?.replace?.(/\D/g, '');
          // console.log('Answer', choosedId);
        }
        if (!versionGPT4) {
          const prompt = promptResult.prompt;
          const answer = await this.gptapiService.getComplete(prompt);
          choosedId = answer.choices[0].text.replace(/\D/g, '');
        }

        // console.log(searched, searched + promptResult?.lastMessageIndex - 1)

        searched += promptResult?.lastMessageIndex; //- 1;

        if (!isNaN(+choosedId) && choosedId in intentsById) {
          result.push(intentsById[choosedId]);
        }

        if (result.length >= maxMathches) {
          break;
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (ex) {
        this.logger.error(ex);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    return result;
  }

  // private async processLocalWithGPT(userPrompt: string, config: any) {
  //   if (!config.bot_id) {
  //     return null;
  //   }

  //   if (!config.project_id) {
  //     config.project_id = null;
  //   }

  //   let result: any = null;

  //   const intents = await this.projectsService.getAllIntents({
  //     bot_id: config.bot_id,
  //     currentUserId: null,
  //     project_id: config.project_id,
  //   });

  //   if (intents.length === 0) {
  //     return null;
  //   }

  //   const matched1 = await this.GPTMatch(
  //     userPrompt,
  //     intents.map((v) => v.dataValues),
  //     10,
  //     { ...config, messageType: 1 },
  //   );
  //   const logForFirstStage = matched1
  //     .map((v) => '--------\n\n' + v.id + ': ' + v.text + '\n\n--------')
  //     .join('\n');

  //   this.logger.log('First stage ', userPrompt, logForFirstStage);

  //   if (matched1.length === 0) {
  //     return null;
  //   }

  //   const matched2 =
  //     matched1.length === 1
  //       ? matched1
  //       : await this.GPTMatch(userPrompt, matched1, 1, {
  //           ...config,
  //           messageType: 2,
  //         });
  //   const logForSecondStage = matched2
  //     .map((v) => v.id + ': ' + v.text)
  //     .join('\n');
  //   this.logger.log('Second stage', userPrompt, logForSecondStage, matched2);

  //   if (matched2.length === 0) {
  //     return null;
  //   }

  //   const response = await this.projectsService.getResponseByIntentId(
  //     matched2[0].id,
  //   );
  //   result = {
  //     textAnswer: response.text,
  //     question: matched2[0].text,
  //   };

  //   return result;
  // }

  private async processFaQWithGPT(
    userPrompt: string,
    chatHistory: IMessage[],
    config: any,
  ) {
    const _chatHistory = chatHistory.slice(0, -1);
    const result = await this.largeFilesProcessingService.getAnswerFromApi(
      userPrompt,
      _chatHistory,
      config.bot_id + '-' + config.project_id,
      config._promptPrefix,
    );

    if (result.text) {
      result.text = result.text.replace(/^\s{0,}Answer\:\s{0,}/, '');
    }

    return result.text;
  }

  private _conversationsInProcessData: {
    [conversationId: string]: {
      isProcessing: boolean;
      abortController: AbortController;
    };
  } = {};

  private isConversationInProcess(conversationId: string) {
    return (
      this._conversationsInProcessData[conversationId] &&
      this._conversationsInProcessData[conversationId].isProcessing
    );
  }

  private startProcessingConversation(
    conversationId: string,
    abortController: AbortController,
  ) {
    if (this.isConversationInProcess(conversationId)) {
      this.abortProcessingConversation(conversationId);
    }
    this._conversationsInProcessData[conversationId] = {
      isProcessing: true,
      abortController: abortController,
    };
  }

  private stopProcessingConversation(conversationId: string) {
    this._conversationsInProcessData[conversationId] = {
      isProcessing: false,
      abortController: null,
    };
  }

  private abortProcessingConversation(conversationId: string) {
    if (!this.isConversationInProcess(conversationId)) {
      return;
    }

    this._conversationsInProcessData[conversationId].abortController.abort();
    this.stopProcessingConversation(conversationId);
  }

  public async importedKnowledge(query: IProjectIdentification) {
    const savedLearning = await this.largeFilesProcessingService.getDocs(query);
    return savedLearning.map((sl) => sl.dataValues);
  }

  public async deleteImportedKnowledge(id: string) {
    return await this.largeFilesProcessingService.deleteDoc(id);
  }

  // public async deepFaq(
  //   inputPrompt: string,
  //   conversationId: string = null,
  //   config: IConfig,
  //   conversationName?: string,
  //   regenerateAnswerFrom: string = null,
  //   messageTs: string = null,
  //   forceDisableDocsData = false,
  //   filesToUse = null,
  // ) {
  //   if (!conversationId) {
  //     conversationId = crypto
  //       .createHash('md5')
  //       .update(crypto.randomBytes(100))
  //       .update(Date.now().toString())
  //       .digest('base64url');
  //     // conversationId = crypto.randomBytes(20).toString('base64url') + crypto.randomUUID() + '-' + Buffer.from((+new Date()).toString()).toString('base64url');
  //   }
  //   this.validateConversationId(conversationId);

  //   let aiPrefix = null;
  //   // let humanPrefix = null;
  //   let promptPrefix = null;

  //   const chatData = await this.getConversationHistory(conversationId);

  //   if (chatData) {
  //     if (!config.bot_id) {
  //       config.bot_id = chatData.assistant_id;
  //     }
  //     if (!config.project_id) {
  //       config.project_id = chatData.project_id;
  //     }
  //     if (!conversationName) {
  //       conversationName = chatData.name;
  //     }
  //   }

  //   if (config && config.project_id && config.bot_id) {
  //     const bot = await this.projectAssistantModel.findOne({
  //       where: {
  //         id: config.bot_id,
  //         project_id: config.project_id,
  //         is_active: true,
  //       },
  //     });
  //     if (bot) {
  //       aiPrefix = bot.name;
  //       // humanPrefix = bot.user_name_label;
  //       // promptPrefix = bot.prompt_prefix;
  //       if (!config.project_id) {
  //         const project = await this.defaultProject({
  //           bot_id: config.bot_id,
  //         });
  //         config.project_id = project.id;
  //       }
  //     }

  //     if (!bot) {
  //       delete config.bot_id;
  //     }
  //   }

  //   if (config && config.project_id) {
  //     const project = await this.projectsService.getProjectById(
  //       config.project_id,
  //     );
  //     if (project) {
  //       promptPrefix = project.prompt_prefix || promptPrefix;
  //     }

  //     if (!project) {
  //       delete config.project_id;
  //     }
  //   }

  //   if (config && config.forcePromptPrefix) {
  //     promptPrefix = config.forcePromptPrefix;
  //   }

  //   let promptBody = chatData.messages;

  //   if (regenerateAnswerFrom) {
  //     let messageId = promptBody.findIndex((r) => {
  //       return r.messageId === regenerateAnswerFrom;
  //     });

  //     if (messageId === -1) {
  //       messageId = promptBody.length;

  //       if (!inputPrompt) {
  //         throw new Error('Message is not found');
  //       }
  //     }

  //     if (!inputPrompt) {
  //       inputPrompt = promptBody[messageId].message;
  //     }

  //     if (!messageTs) {
  //       messageTs = promptBody[messageId].createdAt;
  //     }

  //     promptBody = promptBody.slice(0, messageId);
  //   }

  //   const docsInput = await this.projectsService.getRawData(config);
  //   const compiledDoc =
  //     await this.largeFilesProcessingService.createLearningInput(
  //       docsInput.map((v) => ({
  //         questions: v.questions.map((r) => r.text),
  //         answer: v.answer.text,
  //       })),
  //       config.bot_id + '-' + config.project_id,
  //     );

  //   // const docs = [compiledDoc];

  //   let docs = [];

  //   if (forceDisableDocsData === false) {
  //     docs = await this.largeFilesProcessingService.getDocsIds(
  //       config,
  //       filesToUse,
  //     );
  //   }

  //   return new Promise((resolve, reject) => {
  //     const abortController = new AbortController();
  //     abortController.signal.addEventListener('abort', () => reject());

  //     this.startProcessingConversation(conversationId, abortController);

  //     resolve(
  //       this.largeFilesProcessingService
  //         .processWithConversationChain(inputPrompt, promptBody, docs, {
  //           abortController: abortController,
  //           aiPrefix: aiPrefix,
  //           humanPrefix: humanPrefix,
  //           prompt: promptPrefix,
  //         })
  //         .then((controller) => controller.getAnswerFromChain())
  //         .then((textAnswer) => {
  //           promptBody.push({
  //             type: MessageTypes.USER_MESSAGE,
  //             message: inputPrompt,
  //             messageId: this.newMessageId(),
  //             createdAt: messageTs,
  //           });
  //           promptBody.push({
  //             type: MessageTypes.AI_MESSAGE,
  //             message: textAnswer,
  //             messageId: this.newMessageId(),
  //           });

  //           return this.savePrompt(promptBody, conversationId, {
  //             ...config,
  //             name: conversationName ?? null,
  //           }).then(() => {
  //             this.stopProcessingConversation(conversationId);
  //             return { answer: textAnswer, conversationId };
  //           });
  //         }),
  //     );
  //   });
  // }

  public async createConversation(
    conversationId: string = null,
    messagesToSave: IMessage[],
    append = false,
    config?: ICreateConversationDTO,
  ) {
    if (!conversationId) {
      // conversationId = crypto.randomBytes(20).toString('base64url') + crypto.randomUUID() + '-' + Buffer.from((+new Date()).toString()).toString('base64url');
      conversationId = crypto
        .createHash('md5')
        .update(new Uint8Array(crypto.randomBytes(100)))
        .update(Date.now().toString())
        .digest('base64url');
    }
    this.validateConversationId(conversationId);

    const getMessageList = async () => {
      if (append) {
        const history = (await this.getConversationHistory(conversationId))
          .messages;
        messagesToSave = history.concat(messagesToSave);
      }
      return messagesToSave;
    };

    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      abortController.signal.onabort = reject;

      this.startProcessingConversation(conversationId, abortController);

      resolve(
        getMessageList()
          .then((messages) =>
            this.savePrompt(messages, conversationId, {
              name: config?.name ?? null,
              project_id: config.project_id ?? null,
              bot_id: config.bot_id ?? null,
            }),
          )
          .then(() => {
            this.stopProcessingConversation(conversationId);
            return {
              conversationId,
            };
          }),
      );
    });
  }

  public async getAnswer(
    userPrompt: string,
    conversationId: string = null,
    params?: {
      bot_id: string;
      project_id?: string;
      translate_to_language?: string;
    },
  ) {
    if (conversationId) {
      this.validateConversationId(conversationId);
    }

    const resultData: any = {};
    let project: ProjectModel = null;

    const config = {
      _userLabel: this._userLabel,
      _assistantLabel: this._assistantLabel,
      _promptPrefix: this._promptPrefix,
      _answerPrePromptPrefix: null,
      _stopString: this._stopString,

      _useRassa: null,
      _useLocal: null,
      _useLocalWithGPT: null,

      GPT4: true,

      bot_id: params.bot_id,
      project_id: params.project_id,

      translate_to_language: null,
    };

    if (params && params.bot_id) {
      const bot = await this.botModel.findByPk(params.bot_id);

      if (bot) {
        // Only create default project if project_id is explicitly requested but not provided
        // For general chat, we allow project_id to remain null
        if (params.project_id) {
          project = await this.projectsService.getProjectById(
            params.project_id,
          );
        }

        // Get user info - for general chat, use bot's user_id
        let user;
        if (params.project_id) {
          user = await this.identityService.getUserByProjectId(
            params.project_id,
          );
        } else {
          // For general chat, get user directly from bot's user_id
          user = await this.sequelize.models.UserModel.findByPk(bot.user_id);
        }

        config._userLabel = user?.username || this._userLabel;
        config._assistantLabel = this._assistantLabel;
        config._promptPrefix =
          project?.prompt_prefix || bot.prompt_prefix || '';
        config._useLocal = false;
        config._useLocalWithGPT = false;
        config._answerPrePromptPrefix =
          project?.prompt_prefix || bot.prompt_prefix || '';
      }

      const langs = {
        EN: 'English',
        FR: 'French',
      };

      if (
        params.translate_to_language &&
        params.translate_to_language in langs
      ) {
        config.translate_to_language = langs[params.translate_to_language];
      }
    }

    config.project_id = params.project_id;

    if (conversationId) {
      if (this._conversationsInProcess[conversationId]) {
        throw new HttpException(
          'This conversation is in processing now!',
          HttpStatus.CONFLICT,
        );
      }
      this._conversationsInProcess[conversationId] = true;
    }
    let textAnswer: string = null;
    let processPromptData: {
      prompt: string;
      conversationId: string;
      promptBody: IMessage[];
    } = null;

    let allowReassignProcessPromptData = true;

    if (project && project.use_deep_faq) {
      try {
        processPromptData = await this.formatPrompt(
          userPrompt,
          conversationId,
          { ...config, GPT4: false },
        );
        this.logger.log({ promptBody: processPromptData.promptBody });
        textAnswer = await this.processFaQWithGPT(
          userPrompt,
          processPromptData.promptBody,
          config,
        );
        allowReassignProcessPromptData = false;
      } catch (ex) {
        this.logger.error(ex);
      }
    }

    if (!textAnswer) {
      try {
        processPromptData = await this.formatPrompt(
          userPrompt,
          conversationId,
          config,
        );
        const answer = await this.gptapiService.getComplete4(
          this.translateToGPT4(processPromptData.promptBody),
        );
        textAnswer = answer.choices[0]?.message?.content;
        console.log('GPT4 Answer:', textAnswer);
      } catch (ex) {
        this.logger.error(ex);
      }
    }

    if (conversationId && !this._conversationsInProcess[conversationId]) {
      throw new HttpException(
        'This conversation is not in processing more!',
        HttpStatus.CONFLICT,
      );
    }

    if (!textAnswer) {
      textAnswer = null;
    }

    if (textAnswer && processPromptData) {
      processPromptData.promptBody.push({
        type: MessageTypes.AI_MESSAGE,
        message: textAnswer,
        previousMessageId:
          processPromptData.promptBody.length > 0
            ? processPromptData.promptBody[
                processPromptData.promptBody.length - 1
              ].messageId
            : null,
        messageId: this.newMessageId(),
      });

      await this.savePrompt(
        processPromptData.promptBody,
        processPromptData.conversationId,
        config,
      );

      // Note: Individual message records are now handled by the ConversationsService
      // The savePrompt method creates both the conversation and individual message records
    }

    if (
      textAnswer &&
      (config._answerPrePromptPrefix || (config.translate_to_language && false))
    ) {
      config._promptPrefix = config._answerPrePromptPrefix || '';

      if (config.translate_to_language) {
        if (config._promptPrefix.length) {
          config._promptPrefix += `\nDO NOT PUT THIS TO THE FINAL ANSWER\n`;
        }
        config._promptPrefix += `\nAnswer to the user his message in ${config.translate_to_language} without adding any extra words or symbols.`;
      }

      try {
        const _processPromptData = await this.formatPrompt(
          textAnswer,
          null,
          config,
        );
        const answer = await this.gptapiService.getComplete4(
          this.translateToGPT4(_processPromptData.promptBody),
        );

        if (!processPromptData || allowReassignProcessPromptData) {
          processPromptData = _processPromptData;
        }

        textAnswer = answer.choices[0]?.message?.content;
      } catch (ex) {
        this.logger.error(ex);
      }
    }

    if (conversationId) {
      this._conversationsInProcess[conversationId] = false;
    }

    return {
      answer: textAnswer,
      conversationId: processPromptData?.conversationId,
      resultData,
    };
  }

  public async clearConversationHistory(conversationId: string) {
    this.validateConversationId(conversationId);

    this._conversationsInProcess[conversationId] = false;

    this.deleteHistory(conversationId);
  }

  // private formatRawLinesInput(input: string): ITrainingInput[] {
  //   return input
  //     .replace('\r', '')
  //     .split('\n\n')
  //     .map((lines) => {
  //       let splitted = lines.split('\n');
  //       if (splitted.length >= 1) {
  //         const delimiter = splitted[splitted.length - 1].lastIndexOf('? :');
  //         if (delimiter !== -1) {
  //           splitted = [
  //             ...splitted.slice(0, -1),
  //             splitted[splitted.length - 1].substring(0, delimiter) + '?',
  //             splitted[splitted.length - 1].substring(delimiter + '? :'.length),
  //           ];
  //         }
  //       }
  //       if (splitted.length < 2) {
  //         throw new Error('Input format is incorrect');
  //       }
  //       return {
  //         questions: splitted
  //           .slice(0, splitted.length - 1)
  //           .map((r) =>
  //             (r + ' ')
  //               .split('? ')
  //               .map((r) => r.replace(/^\s+/, '').replace(/\s+$/, '')),
  //           )
  //           .flat()
  //           .filter((r) => !!r)
  //           .map((r) => r + '?'),
  //         answer: splitted[splitted.length - 1],
  //       };
  //     });
  // }

  // private async parseCsv(trainCsv: Buffer | string) {
  //   let parsedRows = await new Promise<ITrainingInput[]>((resolve, reject) => {
  //     const result: ITrainingInput[] = [];
  //     parse(trainCsv, { delimiter: ',', from_line: 1 })
  //       .on('data', (row) => {
  //         row[1] = row[1].replace(/^\s+/, '').replace(/\s+$/, '');
  //         result.push({
  //           questions: (row[0] + ' ')
  //             .split('? ')
  //             .map((r) => r.replace(/^\s+/, '').replace(/\s+$/, ''))
  //             .filter((r) => !!r)
  //             .map((r) => r + '?'),
  //           answer: row[1],
  //         });
  //       })
  //       .on('end', () => {
  //         resolve(result);
  //       })
  //       .on('error', (error) => {
  //         reject(error);
  //       });
  //   });

  //   let lastEmptyAnswer = null;
  //   let lastWithQuetions = null;

  //   for (const i in parsedRows) {
  //     if (parsedRows[i].questions.length) {
  //       lastWithQuetions = i;
  //     }

  //     if (!parsedRows[i].answer) {
  //       lastEmptyAnswer = i;
  //       continue;
  //     }

  //     if (!parsedRows[i].questions.length) {
  //       parsedRows[lastWithQuetions].answer += '\n' + parsedRows[i].answer;
  //     }

  //     if (lastEmptyAnswer === null || parsedRows[i].questions.length) {
  //       lastEmptyAnswer = null;
  //       continue;
  //     }

  //     parsedRows[lastEmptyAnswer].answer = parsedRows[i].answer;
  //     lastEmptyAnswer = null;
  //   }

  //   parsedRows = parsedRows
  //     .map((r) => ({
  //       questions: r.questions.map((v) => v.trim()).filter((v) => !!v),
  //       answer: r.answer.trim(),
  //     }))
  //     .filter((r) => r.questions.length && r.answer);

  //   return parsedRows;
  // }

  public async defaultProject(params: { bot_id: string; user_id: string }) {
    const project = await this.projectsService.defaultProject(
      params.bot_id,
      params.user_id,
    );
    return project;
  }

  // public async deleteAllIntents(bot_id: string, project_id: string = null) {
  //   return await this.projectsService.clearProjectIntents(
  //     bot_id,
  //     project_id ?? (await this.defaultProject(bot_id)).id,
  //   );
  // }

  public async uploadFileOnly(
    file: { name: string; content: Buffer; mimetype: string },
    params: { bot_id: string; project_id?: string },
  ) {
    console.log('Upload file only', params);
    let userId: string;

    if (params.project_id) {
      const project = await this.projectsService.getProjectById(
        params.project_id,
      );
      if (!project) {
        throw new BadRequestException('Project is not found');
      }
      userId = await this.identityService.getUserIdByProjectId(
        params.project_id,
      );
    } else {
      // For general uploads, get user ID from bot
      const bot = await this.botModel.findByPk(params.bot_id);
      if (!bot) {
        throw new BadRequestException('Bot is not found');
      }
      userId = bot.user_id;
    }

    return await this.largeFilesProcessingService.uploadFileOnly(file, {
      ...params,
      project_id: params.project_id ?? null,
      user_id: userId,
    });
  }

  public async trainPendingFiles(params: {
    bot_id: string;
    project_id?: string;
  }) {
    console.log('Train pending files', params);
    if (!params.project_id) {
      throw new BadRequestException('Project ID is required');
    }

    const project = await this.projectsService.getProjectById(
      params.project_id,
    );
    if (!project) {
      throw new BadRequestException('Project is not found');
    }

    return await this.largeFilesProcessingService.trainPendingFiles({
      bot_id: params.bot_id,
      project_id: params.project_id,
    });
  }

  public async getPendingFiles(params: {
    bot_id: string;
    project_id?: string;
  }) {
    console.log('Get pending files', params);
    if (!params.project_id) {
      return [];
    }

    return await this.largeFilesProcessingService.getPendingFiles({
      bot_id: params.bot_id,
      project_id: params.project_id,
    });
  }

  public async trainWithFile(
    file: { name: string; content: Buffer; mimetype: string },
    params: { bot_id: string; project_id?: string },
  ) {
    console.log('Train with file', params);
    if (params.project_id) {
      const project = await this.projectsService.getProjectById(
        params.project_id,
      );
      console.log('Project', project);
      console.log('Project Assistant id', project.assistant_id);
      console.log('Params Bot id', params.bot_id);
      if (!project) {
        throw new BadRequestException('Project is not found');
      }
    }
    const userId = await this.identityService.getUserIdByProjectId(
      params.project_id,
    );
    await this.largeFilesProcessingService.learnProviderWithFile(
      'private-api',
      file,
      { ...params, project_id: params.project_id ?? null, user_id: userId },
    );
  }

  public async connectLearnedFileToProject(
    payload: {
      project_id: string;
      learning_session_id: string;
      bot_id?: string;
    },
    is_connected: boolean,
  ) {
    const project = await this.projectsService.getProjectById(
      payload.project_id,
    );
    const file = await this.largeFilesProcessingService.getLearningSessionById(
      payload.learning_session_id,
    );
    if (
      !project ||
      !file ||
      project.assistant_id !== file.bot_id ||
      (payload.bot_id && payload.bot_id !== project.assistant_id)
    ) {
      throw new BadRequestException('Project and/or file are not found');
    }
    if (is_connected) {
      return await this.largeFilesProcessingService.connectLearningSeesionToProject(
        payload,
      );
    }
    return await this.largeFilesProcessingService.disconnectLearningSeesionToProject(
      payload,
    );
  }

  public async getAllFiles(bot_id: string) {
    return this.largeFilesProcessingService.getAllDocs(bot_id);
  }

  // public async trainModel(
  //   trainCsv: Buffer | string,
  //   params: {
  //     bot_id: number;
  //     project_id?: number;
  //     mode: 'csv' | 'raw-lines' | 'xlsx';
  //   },
  // ) {
  //   const bot = await this.botsService.getBot(params.bot_id);

  //   if (!+params.project_id) {
  //     params.project_id = (await this.defaultProject(params.bot_id)).id;
  //   }

  //   const dataInput: ITrainingInput | {} = await new Promise(
  //     (resolve, reject) => {
  //       const result: ITrainingInput[] = [];
  //       if (params.mode === 'csv') {
  //         resolve(this.parseCsv(trainCsv));
  //       }

  //       if (params.mode === 'xlsx' && Buffer.isBuffer(trainCsv)) {
  //         // resolve(readXlsxFile(trainCsv, { })
  //         //     .then(rows => {
  //         //         return rows.map(row => {
  //         //             return {
  //         //                 questions: (row[0] + ' ').split('? ').filter(r => !!r).map(r => r.replace(/\s+$/, '') + '?'),
  //         //                 answer: row[1],
  //         //             }
  //         //         })
  //         //     })
  //         //     .catch(error => reject(error))
  //         // )
  //       }

  //       if (params.mode === 'raw-lines') {
  //         try {
  //           return resolve(
  //             this.formatRawLinesInput(trainCsv.toString('utf-8')),
  //           );
  //         } catch (error) {
  //           reject(error);
  //         }
  //       }

  //       reject('Type is unsupported!');
  //     },
  //   ).catch((error) => {
  //     console.log(error);
  //     throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
  //   });

  //   if (!('length' in dataInput) || dataInput.length === 0) {
  //     throw new HttpException('Empty data', HttpStatus.BAD_REQUEST);
  //   }

  //   const _dataInput = dataInput as unknown as any;

  //   this.logger.warn(JSON.stringify(_dataInput, undefined, 4));

  //   // const trainResult = await this.projectsService.addIntentsWithResponses(_dataInput, { bot_id: bot.id, currentUserId: null });

  //   const trainResult = await this.projectsService.addRawData(_dataInput, {
  //     bot_id: bot.id,
  //     currentUserId: null,
  //     project_id: params.project_id,
  //   });
  //   // const trainingData = await this.projectsService.getAllIntents({ bot_id: bot.id, currentUserId: null });

  //   // const { modelName } = await this.rasaapiService.trainAndChangeModel(trainingData, {
  //   //     rasa_host_url: bot.exists_responses_provider_url,
  //   //     model_name: null,
  //   // });

  //   // await bot.update({ model_name: modelName });

  //   const project = await this.projectsService.getProjectById(
  //     params.project_id,
  //   );

  //   if (!project.use_deep_faq) {
  //     project.use_deep_faq = true;
  //     await project.save();
  //   }

  //   return {
  //     rows: _dataInput,
  //     processed: trainResult,
  //   };
  // }

  private translateToGPT4(prompt: IMessage[]) {
    const result: {
      role: 'assistant' | 'user' | 'system';
      content: string;
    }[] = [];

    const types: {
      [key: string]: 'assistant' | 'user' | 'system';
    } = {
      [MessageTypes.AI_MESSAGE]: 'assistant',
      [MessageTypes.USER_MESSAGE]: 'user',
      [MessageTypes.SYSTEM_MESSAGE]: 'system',
    };

    for (const message of prompt) {
      result.push({
        role: types[message.type],
        content: message.message,
      });
    }

    return result;
  }

  private compilePrompt(prompt: IMessage[], prefix: string, config: any) {
    let result = '';
    const fullPrefix = prefix + '\n';
    if (!config?.maxPromptLen) {
      config.maxPromptLen = 3000;
    }

    const versionGPT4 = !!config?.GPT4;

    let c = 0;
    let i = -1;
    const promptReversed = [...prompt].reverse();

    const promptAdded = [];

    for (const chunk of promptReversed) {
      i++;
      const newPart =
        '' +
        config._stopString +
        '\n\n' +
        (chunk.type === MessageTypes.AI_MESSAGE
          ? config._assistantLabel + ':'
          : chunk.type === MessageTypes.USER_MESSAGE
          ? config._userLabel + ':'
          : '') +
        '\n' +
        chunk.message;
      if (
        (newPart + result).length + fullPrefix.length >=
        config.maxPromptLen
      ) {
        break;
      }

      if (
        chunk.type === MessageTypes.AI_MESSAGE ||
        chunk.type === MessageTypes.SYSTEM_MESSAGE
      ) {
        if (i < promptReversed.length - 1) {
          const nextChunk = promptReversed[i + 1];
          const nextNewPart =
            '' +
            config._stopString +
            '\n\n' +
            (nextChunk.type === MessageTypes.AI_MESSAGE
              ? config._assistantLabel + ':'
              : nextChunk.type === MessageTypes.USER_MESSAGE
              ? config._userLabel + ':'
              : '') +
            '\n' +
            nextChunk.message;
          if (
            (newPart + nextNewPart + result).length + fullPrefix.length >=
            config.maxPromptLen
          ) {
            break;
          }
        }
      }

      result = newPart + result;
      promptAdded.unshift(chunk);
      if (chunk.type === MessageTypes.AI_MESSAGE) {
        c++;
      }

      if (chunk.type === MessageTypes.USER_MESSAGE) {
        if (i < promptReversed.length - 1) {
          const nextChunk = promptReversed[i + 1];
          if (
            nextChunk.type === MessageTypes.AI_MESSAGE ||
            nextChunk.type === MessageTypes.SYSTEM_MESSAGE
          ) {
            const nextNewPart =
              '' +
              config._stopString +
              '\n\n' +
              (nextChunk.type === MessageTypes.AI_MESSAGE ||
              nextChunk.type === MessageTypes.SYSTEM_MESSAGE
                ? config._assistantLabel + ':'
                : nextChunk.type === MessageTypes.USER_MESSAGE
                ? config._userLabel + ':'
                : '') +
              '\n' +
              nextChunk.message;
            if (
              (nextNewPart + result).length + fullPrefix.length >=
              config.maxPromptLen
            ) {
              break;
            }
          }
        }
      }
    }

    if (versionGPT4 && prefix) {
      promptAdded.unshift({
        type: MessageTypes.SYSTEM_MESSAGE,
        message: prefix,
        previousMessageId: null,
        messageId: this.newMessageId(),
      });
    }

    const stopSeq = '' + config._stopString + '\n\n';
    const compiled = result.slice(result.indexOf(stopSeq) + stopSeq.length);
    if (config?.prefix_as_postfix) {
      return {
        prompt: compiled + '\n' + prefix,
        lastMessageIndex: c,
        promptBody: promptAdded,
      };
    }
    const fin = fullPrefix + compiled;
    return {
      prompt: fin,
      lastMessageIndex: c,
      promptBody: promptAdded,
    };
  }

  private async formatPromptForIntentsMatcher(
    userPrompt: string,
    inputs: { id: number; text: string }[],
    config: any,
  ) {
    const promptBody = [] as IMessage[];

    const versionGPT4 = !!config?.GPT4;

    for (const input of inputs) {
      promptBody.push({
        type: MessageTypes.USER_MESSAGE,
        message: input.text,
        messageId: this.newMessageId(),
        previousMessageId:
          promptBody.length > 0
            ? promptBody[promptBody.length - 1].messageId
            : null,
      });
      promptBody.push({
        type: MessageTypes.AI_MESSAGE,
        message: input.id.toString(),
        messageId: this.newMessageId(),
        previousMessageId:
          promptBody.length > 0
            ? promptBody[promptBody.length - 1].messageId
            : null,
      });
    }

    let promptPrefix = '';

    if (versionGPT4) {
      const messages = {
        1: `You must match question from the existed list above which sounds very similar with the following user's question. 
                If your confidence about your answer is 0% then answer 0. Your answer must be only the number like in chat above`,
        2: `You must match question from the existed list above which sounds very similar with the following user's question. 
                Your answer must be only the number like in chat above`,
        // 1: 'Which question from this list below looks very similar to the last question in the list? You must use the number after ' + config._botLabel + ' as your answer. If the confidence of your answer is smaller than 50% then answer 0. Every question to match in the list below prepended with ' + config._userLabel,
        // 2: 'Which question from this list below better matches the last question in the list? You must use the number after ' + config._botLabel + ' as your answer. Every question to match in the list below prepended with ' + config._userLabel,
      };
      promptBody.push({
        type: MessageTypes.SYSTEM_MESSAGE,
        message: messages[config.messageType || 1],
        messageId: this.newMessageId(),
        previousMessageId:
          promptBody.length > 0
            ? promptBody[promptBody.length - 1].messageId
            : null,
      });

      promptBody.push({
        type: MessageTypes.USER_MESSAGE,
        message: userPrompt,
        messageId: this.newMessageId(),
        previousMessageId:
          promptBody.length > 0
            ? promptBody[promptBody.length - 1].messageId
            : null,
      });
    }

    if (!versionGPT4) {
      const messages = {
        1: `You must match question from the existed list below which sounds very similar with the following question: "${userPrompt}". 
                If your confidence about your answer is 0% then answer 0. Your answer must be only the number`,
        2: `You must match question from the existed list below which sounds very similar with the following question: "${userPrompt}". 
                Your answer must be only the number of the question without any other words.`,
        // 1: 'Which question from this list below looks very similar to the last question in the list? You must use the number after ' + config._botLabel + ' as your answer. If the confidence of your answer is smaller than 50% then answer 0. Every question to match in the list below prepended with ' + config._userLabel,
        // 2: 'Which question from this list below better matches the last question in the list? You must use the number after ' + config._botLabel + ' as your answer. Every question to match in the list below prepended with ' + config._userLabel,
      };

      promptBody.push({
        type: MessageTypes.USER_MESSAGE,
        message: userPrompt,
        messageId: this.newMessageId(),
        previousMessageId:
          promptBody.length > 0
            ? promptBody[promptBody.length - 1].messageId
            : null,
      });

      promptBody.push({
        type: MessageTypes.AI_MESSAGE,
        message: '',
        previousMessageId: promptBody[promptBody.length - 1].messageId,
        messageId: this.newMessageId(),
      });

      promptPrefix = messages[config.messageType || 1];
    }

    return this.compilePrompt(promptBody, promptPrefix, config);
    // return this.compilePrompt(promptBody, 'Which question from the list above matches to the question from ' + config._userLabel + ' (the last message in the list)\n' + `You can choose only numbers from above which is marked with ` + config._assistantLabel + '\nIf there is no correct match, return 0', config);
  }

  private formatMessage(message: IMessage) {
    if (!message.createdAt) {
      message.createdAt = new Date().toISOString();
    }
    return message;
  }

  public async getConversationsHistory(
    conversationIds: string[],
  ): Promise<IChat[]>;
  public async getConversationsHistory(
    projectIdentification: IProjectIdentification,
  ): Promise<IChat[]>;
  public async getConversationsHistory(
    projectIdentification: string[] | IProjectIdentification,
  ): Promise<IChat[]> {
    let conversationIds: string[] = [];
    if (Array.isArray(projectIdentification)) {
      conversationIds = projectIdentification;
    } else {
      conversationIds = Object.keys(
        await this.getListOfConversationIds(projectIdentification),
      );
    }

    return await Promise.all(
      conversationIds.map((c) => this.getConversationHistory(c)),
    );
  }

  public async getConversationHistory(conversationId: string): Promise<IChat> {
    const conversation = await this.conversationsService.getConversation(
      conversationId,
    );

    return {
      project_id: conversation.project_id,
      assistant_id: conversation.assistant_id,
      name: conversation.name,
      id: conversation.id,
      messages: conversation.messages.map((m) =>
        this.formatMessage({
          ...m,
          type: m.type as MessageTypes,
        }),
      ),
      messages_slug: conversation.messages_slug,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private async formatPrompt(
    userInput: string,
    conversationId: string = null,
    config: any,
  ) {
    const versionGPT4 = !!config?.GPT4;

    if (!conversationId) {
      conversationId = crypto
        .createHash('md5')
        .update(new Uint8Array(crypto.randomBytes(100)))
        .update(Date.now().toString())
        .digest('base64url');
      // conversationId = crypto.randomBytes(20).toString('base64url') + crypto.randomUUID() + '-' + Buffer.from((+new Date()).toString()).toString('base64url');
    }

    const promptPrefix =
      'Your name is ' +
      config._assistantLabel +
      '.\n' +
      config._promptPrefix +
      '\n';

    let promptBody = (await this.getConversationHistory(conversationId))
      .messages;

    if (
      promptBody.length &&
      promptBody[0].type === MessageTypes.SYSTEM_MESSAGE
    ) {
      promptBody = promptBody.slice(1);
    }

    promptBody.push({
      type: MessageTypes.USER_MESSAGE,
      message: userInput,
      messageId: this.newMessageId(),
      previousMessageId:
        promptBody.length > 0
          ? promptBody[promptBody.length - 1].messageId
          : null,
    });

    let compiled: {
      prompt: string;
      lastMessageIndex: number;
      promptBody: IMessage[];
    } = null;

    if (!versionGPT4) {
      promptBody.push({
        type: MessageTypes.AI_MESSAGE,
        message: '',
        previousMessageId: promptBody[promptBody.length - 1].messageId,
        messageId: this.newMessageId(),
      });

      compiled = this.compilePrompt(promptBody, promptPrefix, config);
      promptBody.pop();
    }

    if (versionGPT4) {
      compiled = this.compilePrompt(promptBody, promptPrefix, config);
      promptBody = compiled.promptBody;
    }

    return { prompt: compiled?.prompt, conversationId, promptBody };
  }

  private async generateConversationMessagesSlug(messages: IMessage[]) {
    if (!messages.length) {
      return '';
    }

    const firstMessage = messages[0];

    return (
      new Date(firstMessage.createdAt).toLocaleString() +
      ' - ' +
      firstMessage.message.slice(0, 100) +
      '...'
    );
  }

  private async fixLegacyConversationsMeta(conversation: {
    id: string;
    messages_slug?: string;
  }) {
    // let isUpdated = false;

    if (!conversation.messages_slug) {
      const fullConversationData = await this.getConversationHistory(
        conversation.id,
      );
      conversation.messages_slug = await this.generateConversationMessagesSlug(
        fullConversationData.messages,
      );
      // if (conversation.messages_slug) {
      //   isUpdated = true;
      // }
    }

    // Note: saveConversationMetadata is no longer needed with database storage

    return conversation;
  }

  public async getListOfConversationIds(config: {
    project_id?: string;
    bot_id?: string;
  }) {
    return await this.conversationsService.getConversationsList(
      config.project_id,
    );
  }

  private async savePrompt(
    promptBody: IMessage[],
    conversationId: string,
    config: { project_id?: string; bot_id?: string; name?: string },
  ) {
    const messagesList = promptBody.map((m) => this.formatMessage(m));
    const messages_slug = await this.generateConversationMessagesSlug(
      messagesList,
    );

    // Check if conversation exists
    try {
      await this.conversationsService.getConversation(conversationId);
      // If exists, append messages
      await this.conversationsService.appendToConversation(
        conversationId,
        messagesList,
        {
          project_id: config.project_id,
          assistant_id: config.bot_id,
          name: config.name,
          messages_slug,
        },
      );
    } catch (error) {
      // If doesn't exist, create new conversation
      await this.conversationsService.createConversation(
        conversationId,
        messagesList,
        {
          project_id: config.project_id,
          assistant_id: config.bot_id,
          name: config.name || conversationId,
          messages_slug,
        },
      );
    }
  }

  private async deleteHistory(conversationId: string) {
    await this.conversationsService.clearConversation(conversationId);
  }
}
