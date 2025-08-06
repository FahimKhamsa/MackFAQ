import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { IdentityService } from './identity/identity.service';

@Injectable()
export class AuthedWithBot implements NestInterceptor {
  constructor(private identityService: IdentityService) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>) {
    const req = context.switchToHttp().getRequest();

    await this.injectBotId(req);

    return next.handle();
  }

  private async injectBotId(req) {
    if (req.user) {
      // Since botsService is removed, get the default assistant for the user
      try {
        const defaultAssistant =
          await this.identityService.getDefaultAssistantForUser(req.user.id);
        const botId = defaultAssistant.id;

        if (req.params) {
          req.params.bot_id = botId;
          // req.params.project_id = null;
        }

        if (req.query) {
          req.query.bot_id = botId;
          // req.query.project_id = null;
        }

        if (req.body) {
          req.body.bot_id = botId;
          // req.body.project_id = null;
        }
      } catch (error) {
        console.warn('No default assistant found for user:', error.message);
        // Continue to fallback logic below
      }
    } else {
      // For RAG testing without authentication, use dynamic fallback
      try {
        // Try to get any active assistant as fallback
        const fallbackAssistant =
          await this.identityService.getDefaultAssistantForUser('1'); // Use system user ID 1
        const fallbackBotId = fallbackAssistant.id;

        if (req.params && !req.params.bot_id) {
          req.params.bot_id = fallbackBotId;
        }

        if (req.query && !req.query.bot_id) {
          req.query.bot_id = fallbackBotId;
        }

        if (req.body && !req.body.bot_id) {
          req.body.bot_id = fallbackBotId;
        }
      } catch (error) {
        console.warn('No fallback assistant available:', error.message);
        // If no assistant is available, the request will fail gracefully in the handler
      }
    }
  }
}
