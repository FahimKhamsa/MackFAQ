import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BotsService } from './bots/bots.service';

@Injectable()
export class AuthedWithBot implements NestInterceptor {
    constructor(private botsService: BotsService) { }
    async intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
    ) {
        const req = context.switchToHttp().getRequest();

        await this.injectBotId(req);

        return next.handle();
    }

    private async injectBotId(req) {
        if (req.user) {
            const bot = await this.botsService.getDefaultBotForUser({ user_id: req.user.id });

            if (req.params) {
                req.params.bot_id = bot.id;
                // req.params.project_id = null;    
            }

            if (req.query) {
                req.query.bot_id = bot.id;
                // req.query.project_id = null;    
            }
            
            if (req.body) {
                req.body.bot_id = bot.id;
                // req.body.project_id = null;    
            }
        } else {
            // For RAG testing without authentication, use default bot_id from environment
            const defaultBotId = 28; // Use existing bot_id from database

            if (req.params && !req.params.bot_id) {
                req.params.bot_id = defaultBotId;
            }

            if (req.query && !req.query.bot_id) {
                req.query.bot_id = defaultBotId;
            }
            
            if (req.body && !req.body.bot_id) {
                req.body.bot_id = defaultBotId;
            }
        }
    }
}
