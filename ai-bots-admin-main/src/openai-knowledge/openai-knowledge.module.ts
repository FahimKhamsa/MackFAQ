import { Module } from '@nestjs/common';
import { OpenaiKnowledgeService } from './openai-knowledge.service';
import { OpenaiKnowledgeController } from './openai-knowledge.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [OpenaiKnowledgeService],
  controllers: [OpenaiKnowledgeController],
  exports: [OpenaiKnowledgeService],
})
export class OpenaiKnowledgeModule {}
