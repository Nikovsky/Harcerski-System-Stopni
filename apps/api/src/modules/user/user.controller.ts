// @file: apps/api/src/modules/user/user.controller.ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { RolesGuard } from "@/guards/roles.guard";
import { Roles } from "@/decorators/roles.decorator";

@Controller("user")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly users: UserService) { }

  @Roles("USER")
  @Get()
  async getAllUsers() {
    const users = await this.users.findAllPersonalData();
    return { ok: true, count: users.length, users };
  }
}