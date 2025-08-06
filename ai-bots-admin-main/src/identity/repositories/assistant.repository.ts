import { Injectable, Inject } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ProjectAssistantModel } from '../../openai-knowledge/entities/project-assistant.model';
import { ProjectModel } from '../../projects/entities/projects.model';

@Injectable()
export class AssistantRepository {
  private projectAssistantModel: typeof ProjectAssistantModel;
  private projectModel: typeof ProjectModel;

  constructor(
    @Inject('SEQUELIZE')
    private sequelize: Sequelize,
  ) {
    this.projectAssistantModel = this.sequelize.models
      .ProjectAssistantModel as typeof ProjectAssistantModel;
    this.projectModel = this.sequelize.models
      .ProjectModel as typeof ProjectModel;
  }

  /**
   * Find assistant by ID
   */
  async findById(assistantId: string): Promise<ProjectAssistantModel> {
    return await this.projectAssistantModel.findByPk(assistantId);
  }

  /**
   * Find active assistant by project ID
   */
  async findByProjectId(projectId: string): Promise<ProjectAssistantModel> {
    return await this.projectAssistantModel.findOne({
      where: { project_id: projectId, is_active: true },
    });
  }

  /**
   * Find all assistants for a project
   */
  async findAllByProjectId(
    projectId: string,
  ): Promise<ProjectAssistantModel[]> {
    return await this.projectAssistantModel.findAll({
      where: { project_id: projectId },
      order: [
        ['is_active', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });
  }

  /**
   * Find assistant by OpenAI assistant ID
   */
  async findByOpenAiId(
    openaiAssistantId: string,
  ): Promise<ProjectAssistantModel> {
    return await this.projectAssistantModel.findOne({
      where: { openai_assistant_id: openaiAssistantId },
    });
  }

  /**
   * Get all active assistants
   */
  async findAllActive(): Promise<ProjectAssistantModel[]> {
    return await this.projectAssistantModel.findAll({
      where: { is_active: true },
      order: [['updatedAt', 'DESC']],
    });
  }

  /**
   * Create a new assistant
   */
  async create(assistantData: {
    project_id: string;
    openai_assistant_id: string;
    vector_store_id?: string;
    name?: string;
    instructions?: string;
    model?: string;
    is_active?: boolean;
  }): Promise<ProjectAssistantModel> {
    return await this.projectAssistantModel.create(assistantData);
  }

  /**
   * Update assistant
   */
  async update(
    assistantId: string,
    updateData: Partial<ProjectAssistantModel>,
  ): Promise<ProjectAssistantModel> {
    const assistant = await this.projectAssistantModel.findByPk(assistantId);
    if (!assistant) {
      return null;
    }
    return await assistant.update(updateData);
  }

  /**
   * Deactivate assistant
   */
  async deactivate(assistantId: string): Promise<boolean> {
    const result = await this.projectAssistantModel.update(
      { is_active: false },
      { where: { id: assistantId } },
    );
    return result[0] > 0;
  }

  /**
   * Activate assistant (and deactivate others for the same project)
   */
  async activate(assistantId: string): Promise<boolean> {
    const assistant = await this.projectAssistantModel.findByPk(assistantId);
    if (!assistant) {
      return false;
    }

    // Deactivate all other assistants for this project
    await this.projectAssistantModel.update(
      { is_active: false },
      { where: { project_id: assistant.project_id } },
    );

    // Activate the specified assistant
    const result = await this.projectAssistantModel.update(
      { is_active: true },
      { where: { id: assistantId } },
    );

    return result[0] > 0;
  }

  /**
   * Delete assistant
   */
  async delete(assistantId: string): Promise<boolean> {
    const result = await this.projectAssistantModel.destroy({
      where: { id: assistantId },
    });
    return result > 0;
  }

  /**
   * Get assistant with project details
   */
  async getWithProject(assistantId: string): Promise<{
    assistant: ProjectAssistantModel;
    project: ProjectModel;
  }> {
    const assistant = await this.projectAssistantModel.findByPk(assistantId);
    if (!assistant) {
      return null;
    }

    const project = await this.projectModel.findByPk(assistant.project_id);
    return { assistant, project };
  }

  /**
   * Find assistants with pagination
   */
  async findWithPagination(
    projectId?: string,
    isActive?: boolean,
    limit = 10,
    offset = 0,
  ): Promise<{ assistants: ProjectAssistantModel[]; total: number }> {
    const whereClause: any = {};
    if (projectId) whereClause.project_id = projectId;
    if (isActive !== undefined) whereClause.is_active = isActive;

    const { rows: assistants, count: total } =
      await this.projectAssistantModel.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [
          ['is_active', 'DESC'],
          ['updatedAt', 'DESC'],
        ],
      });

    return { assistants, total };
  }
}
