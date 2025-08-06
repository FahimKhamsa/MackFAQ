import { Injectable, Inject } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ProjectModel } from 'src/projects/entities/projects.model';
import { ProjectAssistantModel } from '../../openai-knowledge/entities/project-assistant.model';

@Injectable()
export class ProjectRepository {
  private projectModel: typeof ProjectModel;
  private projectAssistantModel: typeof ProjectAssistantModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
  ) {
    this.projectModel = this.sequelize.models
      .ProjectModel as typeof ProjectModel;
    this.projectAssistantModel = this.sequelize.models
      .ProjectAssistantModel as typeof ProjectAssistantModel;
  }

  /**
   * Find project by ID with optional assistant data
   */
  async findById(
    projectId: string,
    includeAssistant = false,
  ): Promise<ProjectModel> {
    const options: any = {
      where: { id: projectId },
    };

    if (includeAssistant) {
      options.include = [
        {
          model: this.projectAssistantModel,
          where: { is_active: true },
          required: false,
        },
      ];
    }

    return await this.projectModel.findOne(options);
  }

  /**
   * Find projects by user ID
   */
  async findByUserId(userId: string): Promise<ProjectModel[]> {
    return await this.projectModel.findAll({
      where: { user_id: userId },
      order: [['updatedAt', 'DESC']],
    });
  }

  /**
   * Find projects by assistant ID
   */
  async findByAssistantId(assistantId: string): Promise<ProjectModel[]> {
    return await this.projectModel.findAll({
      where: { assistant_id: assistantId },
      order: [['updatedAt', 'DESC']],
    });
  }

  /**
   * Get project with full details (user, assistant, etc.)
   */
  async getProjectDetails(projectId: string): Promise<{
    project: ProjectModel;
    assistant: ProjectAssistantModel;
  }> {
    const project = await this.projectModel.findByPk(projectId);
    if (!project) {
      return null;
    }

    const assistant = await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });

    return { project, assistant };
  }

  /**
   * Create a new project
   */
  async create(projectData: {
    name: string;
    user_id: string;
    assistant_id?: string;
    prompt_prefix?: string;
    use_deep_faq?: boolean;
  }): Promise<ProjectModel> {
    return await this.projectModel.create(projectData);
  }

  /**
   * Update project
   */
  async update(
    projectId: string,
    updateData: Partial<ProjectModel>,
  ): Promise<ProjectModel> {
    const project = await this.projectModel.findByPk(projectId);
    if (!project) {
      return null;
    }
    return await project.update(updateData);
  }

  /**
   * Delete project
   */
  async delete(projectId: string): Promise<boolean> {
    const result = await this.projectModel.destroy({
      where: { id: projectId },
    });
    return result > 0;
  }

  /**
   * Get projects with pagination
   */
  async findWithPagination(
    userId?: string,
    assistantId?: string,
    limit = 10,
    offset = 0,
  ): Promise<{ projects: ProjectModel[]; total: number }> {
    const whereClause: any = {};
    if (userId) whereClause.user_id = userId;
    if (assistantId) whereClause.assistant_id = assistantId;

    const { rows: projects, count: total } =
      await this.projectModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['updatedAt', 'DESC']],
      });

    return { projects, total };
  }
}
