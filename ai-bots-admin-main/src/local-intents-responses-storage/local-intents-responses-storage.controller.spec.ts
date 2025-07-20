import { Test, TestingModule } from '@nestjs/testing';
import { LocalIntentsResponsesStorageController } from './local-intents-responses-storage.controller';

describe('LocalIntentsResponsesStorageController', () => {
  let controller: LocalIntentsResponsesStorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocalIntentsResponsesStorageController],
    }).compile();

    controller = module.get<LocalIntentsResponsesStorageController>(LocalIntentsResponsesStorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
