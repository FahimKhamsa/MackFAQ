import { Test, TestingModule } from '@nestjs/testing';
import { GptapiService } from './gptapi.service';

describe('GptapiService', () => {
  let service: GptapiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GptapiService],
    }).compile();

    service = module.get<GptapiService>(GptapiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
