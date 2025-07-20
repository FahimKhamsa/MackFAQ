import { Module } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { IntentExampleModel } from './entities/intent-example.model';
import { IntentModel } from './entities/intent.model';
import { LocalStorageModel } from './entities/local-storage-project.model';
import { ResponseModel } from './entities/response.model';
import { LocalIntentsResponsesStorageService } from './local-intents-responses-storage.service';
import { LocalIntentsResponsesStorageController } from './local-intents-responses-storage.controller';
import { ProjectsController } from './projects/projects.controller';

@Module({
  providers: [
    LocalIntentsResponsesStorageService,
    {
      provide: getModelToken(IntentModel),
      useValue: IntentModel,
    },
    {
      provide: getModelToken(ResponseModel),
      useValue: ResponseModel,
    },
    {
      provide: getModelToken(IntentExampleModel),
      useValue: IntentExampleModel,
    },
    {
      provide: getModelToken(LocalStorageModel),
      useValue: LocalStorageModel,
    },
  ],
  exports: [LocalIntentsResponsesStorageService],
  controllers: [LocalIntentsResponsesStorageController, ProjectsController],
})
export class LocalIntentsResponsesStorageModule {}
