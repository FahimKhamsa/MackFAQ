import { Test, TestingModule } from '@nestjs/testing';
import { LargeFilesProcessingService } from './large-files-processing.service';

describe('LargeFilesProcessingService', () => {
  let service: LargeFilesProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LargeFilesProcessingService],
    }).compile();

    service = module.get<LargeFilesProcessingService>(
      LargeFilesProcessingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
