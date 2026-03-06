// @file: apps/api/src/modules/meetings/meetings.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@hss/database';
import {
  createMeetingBodySchema,
  createMeetingSlotsBodySchema,
  meetingListQuerySchema,
  meetingRegistrationCreateBodySchema,
  meetingRegistrationReassignBodySchema,
  type AuthPrincipal,
  type CreateMeetingBody,
  type CreateMeetingSlotsBody,
  type MeetingListQuery,
  type MeetingRegistrationCreateBody,
  type MeetingRegistrationReassignBody,
} from '@hss/schemas';

import { CurrentUser } from '@/decorators/current-user.decorator';
import { Roles } from '@/decorators/roles.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { extractRequestId } from '@/helpers/request-id.helper';
import { AuthPrincipalPipe } from '@/pipelines/auth-principal.pipe';
import { ZodValidationPipe } from '@/pipelines/zod-validation.pipe';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MeetingsController {
  constructor(private readonly service: MeetingsService) {}

  @Get()
  @Roles(UserRole.USER)
  async listForScout(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Query(new ZodValidationPipe(meetingListQuerySchema))
    query: MeetingListQuery,
  ) {
    return this.service.listForScout(principal, query);
  }

  @Get(':meetingUuid')
  @Roles(UserRole.USER)
  async getDetailForScout(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
  ) {
    return this.service.getDetailForScout(principal, meetingUuid);
  }

  @Post(':meetingUuid/registrations')
  @Roles(UserRole.USER)
  async createRegistration(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
    @Body(new ZodValidationPipe(meetingRegistrationCreateBodySchema))
    dto: MeetingRegistrationCreateBody,
    @Req() req: Request,
  ) {
    return this.service.createRegistration(
      principal,
      meetingUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Patch(':meetingUuid/my-registration/cancel')
  @Roles(UserRole.USER)
  async cancelMyRegistration(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
    @Req() req: Request,
  ) {
    return this.service.cancelMyRegistration(
      principal,
      meetingUuid,
      extractRequestId(req),
    );
  }

  @Post()
  @Roles(UserRole.COMMISSION_MEMBER)
  async createMeeting(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createMeetingBodySchema))
    dto: CreateMeetingBody,
    @Req() req: Request,
  ) {
    return this.service.createMeeting(principal, dto, extractRequestId(req));
  }

  @Post(':meetingUuid/slots')
  @Roles(UserRole.COMMISSION_MEMBER)
  async createSlots(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
    @Body(new ZodValidationPipe(createMeetingSlotsBodySchema))
    dto: CreateMeetingSlotsBody,
    @Req() req: Request,
  ) {
    return this.service.createSlots(
      principal,
      meetingUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Get(':meetingUuid/registrations')
  @Roles(UserRole.COMMISSION_MEMBER)
  async listRegistrations(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
  ) {
    return this.service.listMeetingRegistrations(principal, meetingUuid);
  }

  @Patch(':meetingUuid/registrations/:registrationUuid/cancel')
  @Roles(UserRole.COMMISSION_MEMBER)
  async cancelRegistration(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
    @Param('registrationUuid', ParseUUIDPipe) registrationUuid: string,
    @Req() req: Request,
  ) {
    return this.service.cancelRegistration(
      principal,
      meetingUuid,
      registrationUuid,
      extractRequestId(req),
    );
  }

  @Patch(':meetingUuid/registrations/:registrationUuid/reassign')
  @Roles(UserRole.COMMISSION_MEMBER)
  async reassignRegistration(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('meetingUuid', ParseUUIDPipe) meetingUuid: string,
    @Param('registrationUuid', ParseUUIDPipe) registrationUuid: string,
    @Body(new ZodValidationPipe(meetingRegistrationReassignBodySchema))
    dto: MeetingRegistrationReassignBody,
    @Req() req: Request,
  ) {
    return this.service.reassignRegistration(
      principal,
      meetingUuid,
      registrationUuid,
      dto,
      extractRequestId(req),
    );
  }
}
