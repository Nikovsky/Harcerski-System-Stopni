// @file: apps/api/src/modules/user/dashboard/dashboard.controller.ts
import { Body, Controller, Get, InternalServerErrorException, Patch, UseGuards, } from "@nestjs/common";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { RolesGuard } from "@/guards/roles.guard";
import { Roles } from "@/decorators/roles.decorator";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { AuthPrincipalPipe } from "@/pipelines/auth-principal.pipe";
import { ZodValidationPipe } from "@/pipelines/zod-validation.pipe";
import { DashboardService } from "./dashboard.service";
import { UserRole } from "@hss/database";
import { dateOnlyToUtcOrNull } from "@/helpers";
import { userDashboardResponseSchema, userDashboardUpdateProfileBodySchema, type UserDashboardUpdateProfileBody, type AuthPrincipal, } from "@hss/schemas";
import type { UpdateUserDashboardProfileDto } from "./dashboard.dto";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get()
  async getMyDashboard(@CurrentUser(AuthPrincipalPipe) user: AuthPrincipal) {
    const dto = await this.dashboardService.getOrCreateFromKeycloak(user);

    const parsed = userDashboardResponseSchema.safeParse(dto);
    if (!parsed.success) {
      throw new InternalServerErrorException({
        code: "RESPONSE_CONTRACT_MISMATCH",
        message: "Response contract mismatch.",
      });
    }
    return parsed.data;
  }

  @Patch("profile")
  async updateMyProfile(
    @CurrentUser(AuthPrincipalPipe) user: AuthPrincipal,
    @Body(new ZodValidationPipe(userDashboardUpdateProfileBodySchema))
    body: UserDashboardUpdateProfileBody,
  ) {
    const dto: UpdateUserDashboardProfileDto = {
      firstName: body.firstName,
      secondName: body.secondName,
      surname: body.surname,
      phone: body.phone,
      hufiecCode: body.hufiecCode,
      druzynaCode: body.druzynaCode,
      birthDate: dateOnlyToUtcOrNull(body.birthDate),
    };

    const out = await this.dashboardService.updateMyProfile(user, dto);

    const parsed = userDashboardResponseSchema.safeParse(out);
    if (!parsed.success) {
      throw new InternalServerErrorException({
        code: "RESPONSE_CONTRACT_MISMATCH",
        message: "Response contract mismatch.",
      });
    }
    return parsed.data;
  }
}