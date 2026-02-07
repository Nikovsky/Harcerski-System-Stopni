// @file: apps/api/src/modules/user/user.controller.ts
import { Controller, Get } from "@nestjs/common";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly users: UserService) { }

  @Get()
  async getAllUsers() {
    const users = await this.users.findAllPersonalData();
    return { ok: true, count: users.length, users };
  }
}