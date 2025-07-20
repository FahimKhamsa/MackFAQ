import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { GptapiModule } from 'src/gptapi/gptapi.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotsModule } from 'src/bots/bots.module';
import { MessagesModule } from 'src/messages/messages.module';
import { RasaapiModule } from 'src/rasaapi/rasaapi.module';
import { LocalIntentsResponsesStorageModule } from 'src/local-intents-responses-storage/local-intents-responses-storage.module';
import { LargeFilesProcessingModule } from 'src/large-files-processing/large-files-processing.module';
import { HttpModule } from '@nestjs/axios';

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
          PINECONE_INDEX_NAME: configService.get('LARGE_FILES_PROCESSING_SERVICE_PINECONE_INDEX_NAME'),
          PINECONE_API_KEY: configService.get('LARGE_FILES_PROCESSING_SERVICE_PINECONE_API_KEY'),
          PINECONE_ENVIRONMENT: configService.get('LARGE_FILES_PROCESSING_SERVICE_PINECONE_ENVIRONMENT'),
          OPEN_AI_KEY: configService.get('LARGE_FILES_PROCESSING_SERVICE_OPEN_AI_KEY'),
        };
      },
      imports: [ConfigModule, HttpModule],
      inject: [ConfigService],
    }),
    BotsModule, MessagesModule, RasaapiModule, LocalIntentsResponsesStorageModule]
})
export class ApiModule { }
