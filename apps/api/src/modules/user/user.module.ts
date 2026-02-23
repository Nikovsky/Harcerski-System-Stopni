// @file: apps/api/src/modules/user/user.module.ts
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { ProfileModule } from "./profile/profile.module";

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [ProfileModule],
})
export class UserModule { }
