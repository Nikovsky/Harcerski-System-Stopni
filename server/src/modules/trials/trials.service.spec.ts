import { Test, TestingModule } from '@nestjs/testing';
import { TrialsService } from './trials.service';

describe('TrialsService', () => {
  let service: TrialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrialsService],
    }).compile();

    service = module.get<TrialsService>(TrialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
