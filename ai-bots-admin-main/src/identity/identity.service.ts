import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { UserModel } from '../users/entities/user.model';
import { ProjectAssistantModel } from '../openai-knowledge/entities/project-assistant.model';
import { ProjectModel } from '../projects/entities/projects.model';
import { ConversationModel } from '../conversations/entities/conversation.model';
import { MessageModel } from '../messages/entities/message.model';
import { ProjectRepository } from './repositories/project.repository';
import { AssistantRepository } from './repositories/assistant.repository';
import { UserRepository } from './repositories/user.repository';
import { CacheService } from './cache/cache.service';

@Injectable()
export class IdentityService {
  private userModel: typeof UserModel;
  private projectAssistantModel: typeof ProjectAssistantModel;
  private projectModel: typeof ProjectModel;
  private conversationModel: typeof ConversationModel;
  private messageModel: typeof MessageModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
    private projectRepository: ProjectRepository,
    private assistantRepository: AssistantRepository,
    private userRepository: UserRepository,
    private cacheService: CacheService,
  ) {
    this.userModel = this.sequelize.models.UserModel as typeof UserModel;
    this.projectAssistantModel = this.sequelize.models
      .ProjectAssistantModel as typeof ProjectAssistantModel;
    this.projectModel = this.sequelize.models
      .ProjectModel as typeof ProjectModel;
    this.conversationModel = this.sequelize.models
      .ConversationModel as typeof ConversationModel;
    this.messageModel = this.sequelize.models
      .MessageModel as typeof MessageModel;
  }

  /**
   * Clear cache for specific pattern or all cache
   */
  public clearCache(pattern?: string): void {
    this.cacheService.clear(pattern);
  }

  /**
   * Get project ID by assistant ID
   */
  async getProjectIdByAssistantId(assistantId: string): Promise<string> {
    const assistant = await this.projectAssistantModel.findByPk(assistantId);
    if (!assistant) {
      throw new NotFoundException(`Assistant with ID ${assistantId} not found`);
    }
    return assistant.project_id;
  }

  /**
   * Get assistant ID by project ID
   */
  async getAssistantIdByProjectId(projectId: string): Promise<string> {
    const assistant = await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });
    if (!assistant) {
      throw new NotFoundException(
        `No active assistant found for project ${projectId}`,
      );
    }
    return assistant.id;
  }

  /**
   * Get user ID by project ID
   */
  async getUserIdByProjectId(projectId: string): Promise<string> {
    const project = await this.projectModel.findByPk(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project.user_id;
  }

  /**
   * Get user by project ID
   */
  async getUserByProjectId(projectId: string): Promise<UserModel> {
    const project = await this.projectModel.findByPk(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    const user = await this.userModel.findByPk(project.user_id);
    return user;
  }

  /**
   * Get project ID by conversation ID
   */
  async getProjectIdByConversationId(conversationId: string): Promise<string> {
    const conversation = await this.conversationModel.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }
    return conversation.project_id;
  }

  /**
   * Get assistant ID by conversation ID
   */
  async getAssistantIdByConversationId(
    conversationId: string,
  ): Promise<string> {
    const conversation = await this.conversationModel.findByPk(conversationId);
    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }
    return conversation.assistant_id;
  }

  /**
   * Get all IDs for a user (projects, assistants)
   */
  async getAllUserIds(userId: string): Promise<{
    userId: string;
    projects: Array<{ projectId: string; assistantId: string }>;
  }> {
    const projects = await this.projectModel.findAll({
      where: { user_id: userId },
    });

    const projectData = await Promise.all(
      projects.map(async (project) => {
        const assistant = await this.projectAssistantModel.findOne({
          where: { project_id: project.id, is_active: true },
        });
        return {
          projectId: project.id,
          assistantId: assistant?.id || null,
        };
      }),
    );

    return {
      userId,
      projects: projectData,
    };
  }

  /**
   * Get default assistant for user (fallback mechanism)
   */
  async getDefaultAssistantForUser(
    userId: string,
  ): Promise<ProjectAssistantModel> {
    // First try to get user's first active assistant
    const userProject = await this.projectModel.findOne({
      where: { user_id: userId },
    });

    if (userProject) {
      const assistant = await this.projectAssistantModel.findOne({
        where: { project_id: userProject.id, is_active: true },
      });
      if (assistant) {
        return assistant;
      }
    }

    // Fallback: get any active assistant
    const fallbackAssistant = await this.projectAssistantModel.findOne({
      where: { is_active: true },
    });

    if (!fallbackAssistant) {
      throw new NotFoundException('No active assistant found in the system');
    }

    return fallbackAssistant;
  }

  /**
   * Get project details with all related IDs
   */
  async getProjectDetails(projectId: string): Promise<{
    projectId: string;
    userId: string;
    assistantId: string;
    assistantOpenAiId: string;
  }> {
    const project = await this.projectModel.findByPk(projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const assistant = await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });

    if (!assistant) {
      throw new NotFoundException(
        `No active assistant found for project ${projectId}`,
      );
    }

    return {
      projectId: project.id,
      userId: project.user_id,
      assistantId: assistant.id,
      assistantOpenAiId: assistant.openai_assistant_id,
    };
  }
}
