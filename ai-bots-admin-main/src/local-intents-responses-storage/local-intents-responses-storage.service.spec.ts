import { Test, TestingModule } from '@nestjs/testing';
import { LocalIntentsResponsesStorageService } from './local-intents-responses-storage.service';

describe('LocalIntentsResponsesStorageService', () => {
  let service: LocalIntentsResponsesStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalIntentsResponsesStorageService],
    }).compile();

    service = module.get<LocalIntentsResponsesStorageService>(
      LocalIntentsResponsesStorageService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
