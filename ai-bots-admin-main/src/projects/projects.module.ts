import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { ProjectModel } from './entities/projects.model';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectManagementController } from './management/project-management.controller';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [DatabaseModule, IdentityModule, BotsModule],
  providers: [
    ProjectsService,
    {
      provide: getModelToken(ProjectModel),
      useValue: ProjectModel,
    },
  ],
  exports: [ProjectsService],
  controllers: [ProjectsController, ProjectManagementController],
})
export class ProjectsModule {}
