import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { OpenaiKnowledgeService } from './openai-knowledge.service';
import { OpenaiKnowledgeController } from './openai-knowledge.controller';
import { ProjectAssistantModel } from './entities/project-assistant.model';
import { ProjectFileModel } from './entities/project-file.model';
import { ProjectThreadModel } from './entities/project-thread.model';

@Module({
  providers: [
    OpenaiKnowledgeService,
    {
      provide: getModelToken(ProjectAssistantModel),
      useValue: ProjectAssistantModel,
    },
    { provide: getModelToken(ProjectFileModel), useValue: ProjectFileModel },
    {
      provide: getModelToken(ProjectThreadModel),
      useValue: ProjectThreadModel,
    },
  ],
  controllers: [OpenaiKnowledgeController],
  exports: [OpenaiKnowledgeService],
})
export class OpenaiKnowledgeModule {}
