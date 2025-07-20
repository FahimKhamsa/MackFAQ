import { Test, TestingModule } from '@nestjs/testing';
import { RasaapiService } from './rasaapi.service';

describe('RasaapiService', () => {
  let service: RasaapiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RasaapiService],
    }).compile();

    service = module.get<RasaapiService>(RasaapiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
