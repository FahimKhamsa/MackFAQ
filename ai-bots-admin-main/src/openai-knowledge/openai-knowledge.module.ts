import { Module } from '@nestjs/common';
import { OpenaiKnowledgeService } from './openai-knowledge.service';
import { OpenaiKnowledgeController } from './openai-knowledge.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProjectAssistantModel } from './entities/project-assistant.model';
import { ProjectFileModel } from './entities/project-file.model';
import { ProjectThreadModel } from './entities/project-thread.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      ProjectAssistantModel,
      ProjectFileModel,
      ProjectThreadModel,
    ]),
  ],
  controllers: [OpenaiKnowledgeController],
  providers: [OpenaiKnowledgeService],
  exports: [OpenaiKnowledgeService],
})
export class OpenaiKnowledgeModule {}
