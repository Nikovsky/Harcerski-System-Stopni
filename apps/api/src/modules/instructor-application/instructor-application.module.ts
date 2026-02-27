// @file: apps/api/src/modules/instructor-application/instructor-application.module.ts
import { Module } from '@nestjs/common';
import { InstructorApplicationController } from './instructor-application.controller';
import { InstructorApplicationService } from './instructor-application.service';
import { InstructorAttachmentService } from './instructor-attachment.service';
import { InstructorApplicationValidationService } from './instructor-application-validation.service';

@Module({
  controllers: [InstructorApplicationController],
  providers: [
    InstructorApplicationService,
    InstructorAttachmentService,
    InstructorApplicationValidationService,
  ],
})
export class InstructorApplicationModule {}
