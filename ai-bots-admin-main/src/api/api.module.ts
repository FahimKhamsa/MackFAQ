import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { GptapiModule } from 'src/gptapi/gptapi.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessagesModule } from 'src/messages/messages.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { LargeFilesProcessingModule } from 'src/large-files-processing/large-files-processing.module';
import { HttpModule } from '@nestjs/axios';
import { OpenaiKnowledgeModule } from 'src/openai-knowledge/openai-knowledge.module';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { DatabaseModule } from 'src/database/database.module';
import { IdentityModule } from 'src/identity/identity.module';

@Module({
  providers: [ApiService],
  controllers: [ApiController],
  imports: [
    GptapiModule.config({
      paramsFactory: async (configService: ConfigService) => {
        return {
          api_key: configService.get('OPEN_AI_API_KEY'),
        };
      },
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    LargeFilesProcessingModule.config({
      paramsFactory: async (configService: ConfigService) => {
        return {
          PINECONE_INDEX_NAME: configService.get(
            'LARGE_FILES_PROCESSING_SERVICE_PINECONE_INDEX_NAME',
          ),
          PINECONE_API_KEY: configService.get(
            'LARGE_FILES_PROCESSING_SERVICE_PINECONE_API_KEY',
          ),
          PINECONE_ENVIRONMENT: configService.get(
            'LARGE_FILES_PROCESSING_SERVICE_PINECONE_ENVIRONMENT',
          ),
          OPEN_AI_KEY: configService.get('OPEN_AI_API_KEY'),
        };
      },
      imports: [ConfigModule, HttpModule],
      inject: [ConfigService],
    }),
    MessagesModule,
    ProjectsModule,
    OpenaiKnowledgeModule,
    ConversationsModule,
    DatabaseModule,
    IdentityModule,
  ],
})
export class ApiModule {}
