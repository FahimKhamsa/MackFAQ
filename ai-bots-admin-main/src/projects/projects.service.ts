/* eslint-disable @typescript-eslint/ban-types */
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ICreateProjectDTO, IUpdateProjectDTO } from './dto/project.dto';
import { ProjectModel } from './entities/projects.model';
import * as crypto from 'crypto';

export type IConfig = {
  user_id: string;
  // bot_id: string;
  project_id?: string;
  forcePromptPrefix?: string;
};

interface IProjectCreatePayload extends ICreateProjectDTO {
  user_id: string;
  assistant_id?: string;
  name?: string;
}

@Injectable()
export class ProjectsService {
  private logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(ProjectModel)
    private projectModel: typeof ProjectModel,
  ) {}

  public async createProject(payload: IProjectCreatePayload) {
    const project = await this.projectModel.create({ ...payload });
    await this.setProjectLink(project);
    await project.save();
    return project;
  }

  public async updateProject(id: string, payload: IUpdateProjectDTO) {
    const project = await this.projectModel.findByPk(id);

    if (!project) {
      throw new HttpException('Project not found', HttpStatus.BAD_REQUEST);
    }

    const dataToUpd = { ...payload };
    delete dataToUpd.id;
    delete dataToUpd.assistant_id;

    return await project.update(dataToUpd);
  }

  public async getProjectById(id: string) {
    return await this.projectModel.findByPk(id);
  }

  public async getProjectByLink(public_link: string) {
    return await this.projectModel.findOne({
      where: {
        public_link,
      },
    });
  }

  public async getListOfProjects(config: Partial<IConfig>) {
    return await this.projectModel.findAll({
      where: {
        user_id: config.user_id,
      },
      order: [['updatedAt', 'DESC']],
    });
  }

  public async deleteProject(id: string, config: Partial<IConfig>) {
    return await this.projectModel.destroy({
      where: {
        id: id,
        user_id: config.user_id,
      },
    });
  }

  public async generateLinkForProject() {
    return crypto
      .createHash('md5')
      .update(Date.now().toString())
      .digest('base64url');
  }

  public async setProjectLink(project: ProjectModel) {
    if (!project.public_link) {
      project.public_link = await this.generateLinkForProject();
    }

    return project.public_link;
  }

  public async defaultProject(bot_id: string, user_id: string) {
    const projects = await this.getListOfProjects({
      user_id: user_id,
    });
    if (projects.length) {
      return projects[0];
    }
    return await this.createProject({
      assistant_id: bot_id,
      name: 'Project 1',
      user_id: user_id,
    });
  }

  public async getProjectsByUserId(userId: string) {
    return await this.projectModel.findAll({
      where: {
        user_id: userId,
      },
      order: [['updatedAt', 'DESC']],
    });
  }

  public async getProjectsByAssistantId(assistantId: string) {
    return await this.projectModel.findAll({
      where: {
        assistant_id: assistantId,
      },
      order: [['updatedAt', 'DESC']],
    });
  }

  public async updateProjectFiles(projectId: string, fileCount: number) {
    const project = await this.projectModel.findByPk(projectId);
    if (project) {
      await project.update({ files: fileCount });
    }
    return project;
  }
}
