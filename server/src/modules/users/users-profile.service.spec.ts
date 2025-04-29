import { Test, TestingModule } from '@nestjs/testing';
import { UsersProfileService } from './users-profile.service';

describe('UsersProfileService', () => {
  let service: UsersProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersProfileService],
    }).compile();

    service = module.get<UsersProfileService>(UsersProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
