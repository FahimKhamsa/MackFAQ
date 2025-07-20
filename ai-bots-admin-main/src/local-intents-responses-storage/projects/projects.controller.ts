import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Render, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NamedModuleInterceptor } from 'src/module.interceptor';
import { ICreateLocalStorageDTO, IUpdateLocalStorageDTO } from '../dto/localStorage.dto';
import { LocalIntentsResponsesStorageService } from '../local-intents-responses-storage.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UserModel } from 'src/users/entities/user.model';
import { AuthedWithBot } from 'src/authed-with-bot.decorator';

@Controller('local-intents-responses-storage/projects')
@UseInterceptors(NamedModuleInterceptor)
@UseInterceptors(AuthedWithBot)
// @UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private localIntentsResponsesStorageService: LocalIntentsResponsesStorageService) {

    }

    // @Get('/create')
    // @Render('pages/local-intents-responses-storage/projects/create')
    // async createView() {

    // }

    @Get('/')
    // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
    async getList(@Query('bot_id') bot_id: number) {
        return {
            list: await this.localIntentsResponsesStorageService.getListOfProjects({bot_id}),
        }
    }

    // @Get('/update')
    // @Render('pages/local-intents-responses-storage/projects/update')
    // async updateView(@Query('id') id: number) {
    //     const bot = await this.localIntentsResponsesStorageService.getProjectById(id);

    //     if (!bot) {
    //         throw new HttpException('Not foubd', HttpStatus.BAD_REQUEST);
    //     }

    //     return { bot: bot.dataValues };
    // }

    @Post('/create')
    @UseGuards(JwtAuthGuard)
    async create(@Body() body: ICreateLocalStorageDTO, @Req() req: Request) {
        // const user = req?.user as any;
        return {
            status: true,
            data: await this.localIntentsResponsesStorageService.createProject({
                ...body,
                creator_id: null,
            }),
        }
    }

    @Post('train')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
    public async trainModel(@UploadedFiles() files, @Req() req: Request, @Query('bot_id') bot_id: number, @Body() body: { raw?: string }, @Query('project_id') project_id: number) {
        const user = req?.user as UserModel;
        const inputText = body.raw || null;
        if (!files?.file?.[0]?.buffer && !inputText) {
            throw new HttpException('Input file is required', HttpStatus.BAD_REQUEST);
        }

        return {
            status: true,
            data: await this.localIntentsResponsesStorageService.train(files?.file?.[0]?.buffer || inputText, { bot_id: +bot_id, project_id: project_id, mode: files?.file?.[0]?.buffer ? ( files?.file?.[0]?.originalname?.split('.').slice(-1)[0] ) : 'raw-lines' })
        };
    }

    @Get('knowledge-base')
    // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
    public async getAllKnowledgeRaw(@Query('bot_id') bot_id: number, @Query('project_id') project_id: number) {
        return {
            status: true,
            data: await this.localIntentsResponsesStorageService.getCompiledTrainData(bot_id, project_id),
        }
    }

    @Post('/update')
    // @UseGuards(JwtAuthGuard) // Temporarily disabled for RAG testing
    async update( @Body() body: IUpdateLocalStorageDTO, @Req() req: Request) {
        // const user = req?.user as any;
        return {
            status: true,
            data: await this.localIntentsResponsesStorageService.updateProject(+body.id, {
                ...body,
            }),
        }
    }

    @Post('/delete')
    @UseGuards(JwtAuthGuard)
    async delete(@Body() body, @Req() req: Request) {
        // const user = req?.user as any;
        return {
            status: true,
            data: await this.localIntentsResponsesStorageService.deleteProject(+body.id, {
                ...body,
            }),
        }
    }
}
