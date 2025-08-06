import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IdentityService } from '../identity.service';

/**
 * Decorator to inject project ID into route handler
 */
export const InjectProjectId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.projectId;
  },
);

/**
 * Decorator to inject assistant ID into route handler
 */
export const InjectAssistantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.assistantId;
  },
);

/**
 * Decorator to inject user ID into route handler
 */
export const InjectUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.userId;
  },
);

/**
 * Interceptor to automatically resolve and inject IDs based on available parameters
 */
@Injectable()
export class IdResolutionInterceptor implements NestInterceptor {
  constructor(private identityService: IdentityService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Extract IDs from various sources (params, query, body)
    const projectId =
      this.extractId(request, 'project_id') ||
      this.extractId(request, 'projectId');
    const assistantId =
      this.extractId(request, 'assistant_id') ||
      this.extractId(request, 'assistantId');
    const conversationId =
      this.extractId(request, 'conversation_id') ||
      this.extractId(request, 'conversationId');
    const userId =
      this.extractId(request, 'user_id') ||
      this.extractId(request, 'userId') ||
      request.user?.id;

    try {
      // Resolve missing IDs based on available ones
      if (projectId && !assistantId) {
        request.assistantId =
          await this.identityService.getAssistantIdByProjectId(
            String(projectId),
          );
      }

      if (assistantId && !projectId) {
        request.projectId =
          await this.identityService.getProjectIdByAssistantId(
            String(assistantId),
          );
      }

      if (conversationId && !projectId) {
        request.projectId =
          await this.identityService.getProjectIdByConversationId(
            String(conversationId),
          );
      }

      if (conversationId && !assistantId) {
        request.assistantId =
          await this.identityService.getAssistantIdByConversationId(
            String(conversationId),
          );
      }

      if (projectId && !userId) {
        request.userId = await this.identityService.getUserIdByProjectId(
          String(projectId),
        );
      }

      // Set resolved IDs
      if (projectId) request.projectId = Number(projectId);
      if (assistantId) request.assistantId = Number(assistantId);
      if (userId) request.userId = Number(userId);
    } catch (error) {
      // Log error but don't fail the request - let the handler deal with missing IDs
      console.warn('ID resolution failed:', error.message);
    }

    return next.handle();
  }

  private extractId(request: any, key: string): number | string | null {
    return (
      request.params?.[key] ||
      request.query?.[key] ||
      request.body?.[key] ||
      null
    );
  }
}
