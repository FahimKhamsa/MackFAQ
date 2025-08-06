import { DynamicModule, Module, ModuleMetadata } from '@nestjs/common';
import { LargeFilesProcessingService } from './large-files-processing.service';
import { ILargeFilesProcessingApiConfig } from './large-files-processing.constants';
import { TrainingLoaderService } from './training-loader/training-loader.service';
import { DatabaseModule } from '../database/database.module';

interface LargeFilesProcessingModuleConfig
  extends Pick<ModuleMetadata, 'imports'> {
  paramsFactory: (...args: any[]) => Promise<ILargeFilesProcessingApiConfig>;
  inject?: any[];
}

@Module({
  imports: [DatabaseModule],
  providers: [LargeFilesProcessingService, TrainingLoaderService],
  exports: [LargeFilesProcessingService, TrainingLoaderService],
})
export class LargeFilesProcessingModule {
  static config(config: LargeFilesProcessingModuleConfig): DynamicModule {
    return {
      module: LargeFilesProcessingModule,
      imports: [...(config.imports || []), DatabaseModule],
      exports: [LargeFilesProcessingService, TrainingLoaderService],
      providers: [
        {
          provide: 'LARGE_FILES_PROCESSING_API_CONFIG',
          useFactory: config.paramsFactory,
          inject: config.inject || [],
        },
        LargeFilesProcessingService,
        TrainingLoaderService,
      ],
    };
  }
}
