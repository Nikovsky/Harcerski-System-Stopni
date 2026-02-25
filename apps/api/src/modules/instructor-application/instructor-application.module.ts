// @file: apps/api/src/modules/instructor-application/instructor-application.module.ts
import { Module } from "@nestjs/common";
import { InstructorApplicationController } from "./instructor-application.controller";
import { InstructorApplicationService } from "./instructor-application.service";

@Module({
  controllers: [InstructorApplicationController],
  providers: [InstructorApplicationService],
})
export class InstructorApplicationModule {}
