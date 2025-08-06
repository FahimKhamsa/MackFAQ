import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Render,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NamedModuleInterceptor } from 'src/module.interceptor';
import { BotsService } from './bots.service';
import { CreateBotDTO } from './dto/create.dto';
import { UpdateBotDTO } from './dto/update.dto';

@UseInterceptors(NamedModuleInterceptor)
@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private botService: BotsService) {}

  @Get('/create')
  @Render('pages/bots/create')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async createView() {}

  @Get('/update')
  @Render('pages/bots/update')
  async updateView(@Query('id') id: number) {
    const bot = await this.botService.getBot(id);

    if (!bot) {
      throw new HttpException('Not foubd', HttpStatus.BAD_REQUEST);
    }

    return { bot: bot.dataValues };
  }

  @Get('list')
  async list() {
    return {
      status: true,
      data: await this.botService
        .getAllBots()
        .then((r) => r.map((v) => v.dataValues)),
    };
  }

  @Post('/create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'background_image_file', maxCount: 1 },
      { name: 'favicon_file', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles() files,
    @Body() body: CreateBotDTO,
    @Req() req: Request,
  ) {
    const user = req?.user as any;
    return {
      status: true,
      data: await this.botService.createBot({
        ...body,
        user_id: user.id,
        favicon_image_file: files?.favicon_file?.[0] && {
          fileName: files?.favicon_file?.[0]?.originalname,
          data: files?.favicon_file?.[0]?.buffer,
        },
        background_image_file: files?.background_image_file?.[0] && {
          fileName: files?.background_image_file?.[0]?.originalname,
          data: files?.background_image_file?.[0]?.buffer,
        },
      }),
    };
  }

  @Post('/update')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'background_image_file', maxCount: 1 },
      { name: 'favicon_file', maxCount: 1 },
    ]),
  )
  async update(
    @UploadedFiles() files,
    @Body() body: UpdateBotDTO,
    @Req() req: Request,
  ) {
    const user = req?.user as any;
    return {
      status: true,
      data: await this.botService.updateBot(+body.id, {
        ...body,
        user_id: user.id,
        favicon_image_file: files?.favicon_file?.[0] && {
          fileName: files?.favicon_file?.[0]?.originalname,
          data: files?.favicon_file?.[0]?.buffer,
        },
        background_image_file: files?.background_image_file?.[0] && {
          fileName: files?.background_image_file?.[0]?.originalname,
          data: files?.background_image_file?.[0]?.buffer,
        },
      }),
    };
  }

  @Post('/delete')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'background_image_file', maxCount: 1 },
      { name: 'favicon_file', maxCount: 1 },
    ]),
  )
  async delete(@Query('id') id: number) {
    return {
      status: true,
      data: await this.botService.deleteBot(+id),
    };
  }
}
