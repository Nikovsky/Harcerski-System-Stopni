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
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { RolesGuard } from "@/guards/roles.guard";
import { Roles } from "@/decorators/roles.decorator";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { AuthPrincipalPipe } from "@/pipelines/auth-principal.pipe";
import { ZodValidationPipe } from "@/pipelines/zod-validation.pipe";
import { UserRole } from "@hss/database";
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
} from "@hss/schemas";
import { InstructorApplicationService } from "./instructor-application.service";

@Controller("instructor-applications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
export class InstructorApplicationController {
  constructor(private readonly service: InstructorApplicationService) {}

  @Get("profile-check")
  async checkProfile(@CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal) {
    return this.service.checkProfile(principal);
  }

  @Get("templates")
  async getTemplates() {
    return this.service.getActiveTemplates();
  }

  @Post()
  async create(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createInstructorApplicationSchema))
    dto: CreateInstructorApplication,
  ) {
    return this.service.create(principal, dto);
  }

  @Get()
  async listMy(@CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal) {
    return this.service.listMy(principal);
  }

  @Get(":id")
  async getDetail(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetail(principal, id);
  }

  @Patch(":id")
  async update(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateInstructorApplicationSchema))
    dto: UpdateInstructorApplication,
  ) {
    return this.service.update(principal, id, dto);
  }

  @Post(":id/submit")
  async submit(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.submit(principal, id);
  }

  @Delete(":id")
  async deleteDraft(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteDraft(principal, id);
  }

  @Patch(":id/requirements/:reqId")
  async updateRequirement(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("reqId", ParseUUIDPipe) reqId: string,
    @Body(new ZodValidationPipe(updateInstructorRequirementSchema))
    dto: UpdateInstructorRequirement,
  ) {
    return this.service.updateRequirement(principal, id, reqId, dto);
  }

  @Post(":id/attachments/presign")
  async presignAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(presignUploadRequestSchema))
    dto: PresignUploadRequest,
  ) {
    return this.service.presignAttachment(principal, id, dto);
  }

  @Post(":id/attachments/confirm")
  async confirmAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(confirmUploadRequestSchema))
    dto: ConfirmUploadRequest,
  ) {
    return this.service.confirmAttachment(principal, id, dto);
  }

  @Delete(":id/attachments/:attachmentId")
  async deleteAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
  ) {
    return this.service.deleteAttachment(principal, id, attachmentId);
  }

  @Get(":id/attachments/:attachmentId/download")
  async downloadAttachment(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @Query("inline") inline?: string,
  ) {
    return this.service.getAttachmentDownloadUrl(principal, id, attachmentId, inline === "true");
  }
}
