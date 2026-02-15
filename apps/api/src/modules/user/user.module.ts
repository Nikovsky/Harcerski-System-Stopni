// @file: apps/api/src/modules/user/user.module.ts
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [DashboardModule],
})
export class UserModule { }