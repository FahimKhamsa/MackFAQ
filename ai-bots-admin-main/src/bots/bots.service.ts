import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { openSync, writeFileSync } from 'fs';
import { CreateBotDTO } from './dto/create.dto';
import { BotModel } from './entities/bot.model';
import * as crypto from 'crypto';

interface IBotCreatePayload extends CreateBotDTO {
  favicon_image_file: { data: Buffer; fileName: string };
  background_image_file: { data: Buffer; fileName: string };
  user_id: string;
}

@Injectable()
export class BotsService {
  private botModel: typeof BotModel;

  constructor(
    private configService: ConfigService,
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
  ) {
    this.botModel = this.sequelize.models.BotModel as typeof BotModel;
  }

  public saveFile(fileData: Buffer, fileExtensionOrName: string) {
    const fileExtension = fileExtensionOrName.includes('.')
      ? /(?:\.([^.]+))?$/.exec(fileExtensionOrName)[1]
      : fileExtensionOrName;
    const dir = this.configService.get<string>(
      'PUBLIC_FILES_STORAGE',
      'storage/',
    );

    const fileName =
      crypto.randomBytes(10).toString('base64url') +
      '-' +
      crypto
        .createHash('sha1')
        .update(new Date().getTime().toString())
        .digest('base64url') +
      '.' +
      fileExtension;

    writeFileSync(openSync(dir + fileName, 'w'), fileData);

    return {
      fileName,
    };
  }

  public async getAllBots() {
    return await this.botModel.findAll();
  }

  public async deleteBot(id: number) {
    return await this.botModel.destroy({ where: { id } });
  }

  public async getDefaultBotForUser(payload: { user_id: string }) {
    if (!payload.user_id || payload.user_id === 'NaN') {
      throw new Error('Invalid user ID provided');
    }

    let bot = await this.botModel.findOne({
      where: {
        user_id: payload.user_id,
      },
    });

    if (bot) {
      return bot;
    }

    bot = new this.botModel();
    bot.user_id = payload.user_id;
    await bot.save();

    return bot;
  }

  public async createBot(payload: IBotCreatePayload) {
    if (payload.background_image_file) {
      payload.background_image_path = this.saveFile(
        payload.background_image_file.data,
        payload.background_image_file.fileName,
      ).fileName;
      delete payload.background_image_file;
    }

    if (payload.favicon_image_file) {
      payload.favicon_path = this.saveFile(
        payload.favicon_image_file.data,
        payload.favicon_image_file.fileName,
      ).fileName;
      delete payload.favicon_image_file;
    }

    return await this.botModel
      .create(payload)
      .then((bot: BotModel) => bot.dataValues);
  }

  public async updateBot(id: number, payload: Partial<IBotCreatePayload>) {
    const bot = await this.botModel.findByPk(id);

    if (!bot) {
      throw new HttpException('Not foubd', HttpStatus.BAD_REQUEST);
    }

    if (payload.background_image_file) {
      payload.background_image_path = this.saveFile(
        payload.background_image_file.data,
        payload.background_image_file.fileName,
      ).fileName;
      delete payload.background_image_file;
    }

    if (payload.favicon_image_file) {
      payload.favicon_path = this.saveFile(
        payload.favicon_image_file.data,
        payload.favicon_image_file.fileName,
      ).fileName;
      delete payload.favicon_image_file;
    }

    return await bot.update(payload);
  }

  public async getBot(bot_id: number) {
    return await this.botModel.findByPk(bot_id);
  }
}
