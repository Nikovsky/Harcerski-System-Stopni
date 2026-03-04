// @file: apps/api/src/modules/instructor-application/instructor-application.controller.ts
import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';
import { Roles } from '@/decorators/roles.decorator';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { AuthPrincipalPipe } from '@/pipelines/auth-principal.pipe';
import { ZodValidationPipe } from '@/pipelines/zod-validation.pipe';
import { UserRole } from '@hss/database';
import {
  createInstructorApplicationSchema,
  updateInstructorApplicationSchema,
  updateInstructorRequirementSchema,
  presignUploadRequestSchema,
  confirmUploadRequestSchema,
  type AuthPrincipal,
  type CreateInstructorApplication,
  type UpdateInstructorApplication,
  type UpdateInstructorRequirement,
  type PresignUploadRequest,
  type ConfirmUploadRequest,
} from '@hss/schemas';
import { InstructorApplicationService } from './instructor-application.service';

function extractRequestId(req: Request): string | null {
  const headerValue = req.headers['x-request-id'];
  const requestId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof requestId === 'string' ? requestId : null;
}

@Controller('instructor-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class InstructorApplicationController {
  constructor(private readonly service: InstructorApplicationService) {}

  @Get('profile-check')
  async checkProfile(@CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal) {
    return this.service.checkProfile(principal);
  }

  @Get('templates')
  async getTemplates() {
    return this.service.getActiveTemplates();
  }

  @Post()
  async create(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createInstructorApplicationSchema))
    dto: CreateInstructorApplication,
    @Req() req: Request,
  ) {
    return this.service.create(principal, dto, extractRequestId(req));
  }

  @Get()
  async listMy(@CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal) {
    return this.service.listMy(principal);
  }

  @Get(':id')
  async getDetail(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetail(principal, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateInstructorApplicationSchema))
    dto: UpdateInstructorApplication,
    @Req() req: Request,
  ) {
    return this.service.update(principal, id, dto, extractRequestId(req));
  }

  @Post(':id/submit')
  async submit(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.submit(principal, id, extractRequestId(req));
  }

  @Delete(':id')
  async deleteDraft(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.service.deleteDraft(principal, id, extractRequestId(req));
  }

  @Patch(':id/requirements/:reqId')
  async updateRequirement(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
    @Body(new ZodValidationPipe(updateInstructorRequirementSchema))
    dto: UpdateInstructorRequirement,
    @Req() req: Request,
  ) {
    return this.service.updateRequirement(
      principal,
      id,
      reqId,
      dto,
      extractRequestId(req),
    );
  }

  @Post(':id/attachments/presign')
  async presignAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(presignUploadRequestSchema))
    dto: PresignUploadRequest,
    @Req() req: Request,
  ) {
    return this.service.presignAttachment(
      principal,
      id,
      dto,
      extractRequestId(req),
    );
  }

  @Post(':id/attachments/confirm')
  async confirmAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmUploadRequestSchema))
    dto: ConfirmUploadRequest,
    @Req() req: Request,
  ) {
    return this.service.confirmAttachment(
      principal,
      id,
      dto,
      extractRequestId(req),
    );
  }

  @Delete(':id/attachments/:attachmentId')
  async deleteAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Req() req: Request,
  ) {
    return this.service.deleteAttachment(
      principal,
      id,
      attachmentId,
      extractRequestId(req),
    );
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Req() req: Request,
    @Query('inline') inline?: string,
  ) {
    return this.service.getAttachmentDownloadUrl(
      principal,
      id,
      attachmentId,
      inline === 'true',
      extractRequestId(req),
    );
  }
}
