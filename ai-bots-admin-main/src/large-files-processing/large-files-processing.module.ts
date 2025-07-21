import { DynamicModule, Module, ModuleMetadata } from '@nestjs/common';
import { LargeFilesProcessingService } from './large-files-processing.service';
import { ILargeFilesProcessingApiConfig } from './large-files-processing.constants';
import { TrainingLoaderService } from './training-loader/training-loader.service';
import { getModelToken } from '@nestjs/sequelize';
import { LearningSession } from './learnings-sessions.model';
import { LearningSessionProjectConnection } from './learnings-sessions-project-connection.model';

interface LargeFilesProcessingModuleConfig
  extends Pick<ModuleMetadata, 'imports'> {
  paramsFactory: (...args: any[]) => Promise<ILargeFilesProcessingApiConfig>;
  inject?: any[];
}

@Module({
  providers: [LargeFilesProcessingService, TrainingLoaderService],
  exports: [LargeFilesProcessingService, TrainingLoaderService],
})
export class LargeFilesProcessingModule {
  static config(config: LargeFilesProcessingModuleConfig): DynamicModule {
    return {
      module: LargeFilesProcessingModule,
      imports: config.imports,
      exports: [LargeFilesProcessingService, TrainingLoaderService],
      providers: [
        {
          provide: 'LARGE_FILES_PROCESSING_API_CONFIG',
          useFactory: config.paramsFactory,
          inject: config.inject || [],
        },
        {
          provide: getModelToken(LearningSession),
          useValue: LearningSession,
        },
        {
          provide: getModelToken(LearningSessionProjectConnection),
          useValue: LearningSessionProjectConnection,
        },
        LargeFilesProcessingService,
        TrainingLoaderService,
      ],
    };
  }
}
