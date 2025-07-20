import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { LocalIntentsResponsesStorageService } from './local-intents-responses-storage/local-intents-responses-storage.service';

@Injectable()
export class ProjecLink implements NestInterceptor {
    constructor(private projectService: LocalIntentsResponsesStorageService) { }
    async intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
    ) {
        const req = context.switchToHttp().getRequest();

        await this.injectProjectIdAndBotId(req);

        return next.handle();
    }

    private async injectProjectIdAndBotId(req) {
        if (!req.query.project_link) {
            return;
        }

        const project = await this.projectService.getProjectByLink(req.query.project_link);

        if (!project) {
            throw new BadRequestException("Project is not supported");
        }

        req.query.project_id = project.id;
        req.query.bot_id = project.bot_id;
    }
}
