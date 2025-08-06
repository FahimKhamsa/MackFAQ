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
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NamedModuleInterceptor } from 'src/module.interceptor';
import {
  ICreateProjectDTO,
  IDeleteProjectDTO,
  IUpdateProjectDTO,
} from '../dto/project.dto';
import { ProjectsService } from '../projects.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UserModel } from 'src/users/entities/user.model';
import { AuthedWithBot } from 'src/authed-with-bot.decorator';
import { BotsService } from 'src/bots/bots.service';

@Controller('projects/management')
@UseInterceptors(NamedModuleInterceptor)
@UseInterceptors(AuthedWithBot)
export class ProjectManagementController {
  constructor(
    private projectsService: ProjectsService,
    private botsService: BotsService,
  ) {}

  // @Get('/create')
  // @Render('pages/projects/management/create')
  // async createView() {

  // }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getList(@Req() req: Request) {
    const user = req.user as any;
    return {
      list: await this.projectsService.getListOfProjects({
        user_id: user.id,
      }),
    };
  }

  // @Get('/update')
  // @Render('pages/projects/management/update')
  // async updateView(@Query('id') id: number) {
  //     const bot = await this.projectsService.getProjectById(id);

  //     if (!bot) {
  //         throw new HttpException('Not foubd', HttpStatus.BAD_REQUEST);
  //     }

  //     return { bot: bot.dataValues };
  // }

  @Post('/create')
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: ICreateProjectDTO, @Req() req: Request) {
    // const user = req?.user as any;
    return {
      status: true,
      data: await this.projectsService.createProject(body),
    };
  }

  @Post('train')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  public async trainModel(
    @UploadedFiles() files,
    @Req() req: Request,
    @Query('bot_id') bot_id: string,
    @Body() body: { raw?: string },
    @Query('project_id') project_id: string,
  ) {
    const user = req?.user as UserModel;
    const inputText = body.raw || null;
    if (!files?.file?.[0]?.buffer && !inputText) {
      throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
    }

    // Since the train method doesn't exist in the simplified ProjectsService,
    // we'll return a placeholder response
    return {
      status: true,
      data: {
        message: 'Training functionality has been moved to the API controller',
      },
    };
  }

  @Get('knowledge-base')
  @UseGuards(JwtAuthGuard)
  public async getAllKnowledgeRaw(
    @Req() req: Request,
    @Query('project_id') project_id: string,
  ) {
    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    // Since the getCompiledTrainData method doesn't exist in the simplified ProjectsService,
    // we'll return a placeholder response
    return {
      status: true,
      data: {
        message:
          'Knowledge base functionality has been moved to the API controller',
        bot_id: bot.id.toString(),
        project_id,
      },
    };
  }

  @Post('/update')
  @UseGuards(JwtAuthGuard)
  async update(@Body() body: IUpdateProjectDTO, @Req() req: Request) {
    const user = req.user as any;
    const bot = await this.botsService.getDefaultBotForUser({
      user_id: user.id,
    });

    return {
      status: true,
      data: await this.projectsService.updateProject(body.id, body),
    };
  }

  @Post('/delete')
  @UseGuards(JwtAuthGuard)
  async delete(@Body() body: IDeleteProjectDTO, @Req() req: Request) {
    const user = req.user as any;
    return {
      status: true,
      data: await this.projectsService.deleteProject({
        project_id: body.id,
        user_id: user.id,
      }),
    };
  }
}
