// @file: apps/api/src/modules/user/profile/profile.controller.ts
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  userDashboardResponseSchema,
  userDashboardUpdatePrivilegedBodySchema,
  type AuthPrincipal,
  type UserDashboardUpdatePrivilegedBody,
} from '@hss/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AuthPrincipalPipe } from '@/pipelines/auth-principal.pipe';
import { ZodValidationPipe } from '@/pipelines/zod-validation.pipe';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getMyProfile(@CurrentUser(AuthPrincipalPipe) user: AuthPrincipal) {
    const dto = await this.profileService.getOrCreateFromKeycloak(user);

    const parsed = userDashboardResponseSchema.safeParse(dto);
    if (!parsed.success) {
      throw new InternalServerErrorException({
        code: 'RESPONSE_CONTRACT_MISMATCH',
        message: 'Response contract mismatch.',
      });
    }
    return parsed.data;
  }

  @Patch()
  async updateProfile(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Body(new ZodValidationPipe(userDashboardUpdatePrivilegedBodySchema))
    body: UserDashboardUpdatePrivilegedBody,
  ) {
    const out = await this.profileService.updateProfile(principal, body);

    const parsed = userDashboardResponseSchema.safeParse(out);
    if (!parsed.success) {
      throw new InternalServerErrorException({
        code: 'RESPONSE_CONTRACT_MISMATCH',
        message: 'Response contract mismatch.',
      });
    }

    return parsed.data;
  }
}
