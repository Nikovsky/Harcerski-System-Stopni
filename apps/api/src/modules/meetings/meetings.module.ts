// @file: apps/api/src/modules/meetings/meetings.module.ts
import { Module } from '@nestjs/common';

import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingsAuditService } from './meetings-audit.service';

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsAuditService],
})
export class MeetingsModule {}
