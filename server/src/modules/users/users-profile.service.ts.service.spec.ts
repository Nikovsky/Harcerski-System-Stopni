import { Test, TestingModule } from '@nestjs/testing';
import { UsersProfileServiceTsService } from './users-profile.service.ts/users-profile.service.ts.service';

describe('UsersProfileServiceTsService', () => {
  let service: UsersProfileServiceTsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersProfileServiceTsService],
    }).compile();

    service = module.get<UsersProfileServiceTsService>(UsersProfileServiceTsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
