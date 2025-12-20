import { Test, TestingModule } from '@nestjs/testing';
import { AudiService } from './audi.service';

describe('AudiService', () => {
  let service: AudiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudiService],
    }).compile();

    service = module.get<AudiService>(AudiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
