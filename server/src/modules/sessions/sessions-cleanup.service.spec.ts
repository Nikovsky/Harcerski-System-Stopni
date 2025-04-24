import { Test, TestingModule } from '@nestjs/testing';
import { SessionsCleanupService } from './sessions-cleanup.service';

describe('SessionsCleanupServiceTsService', () => {
  let service: SessionsCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionsCleanupService],
    }).compile();

    service = module.get<SessionsCleanupService>(SessionsCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
