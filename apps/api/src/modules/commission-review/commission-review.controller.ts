// @file: apps/api/src/modules/commission-review/commission-review.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@hss/database';
import {
  commissionReviewApplicationListQuerySchema,
  commissionReviewCandidateAnnotationCreateBodySchema,
  commissionReviewCandidateAnnotationUpdateBodySchema,
  commissionReviewInternalNoteCreateBodySchema,
  commissionReviewInternalNoteUpdateBodySchema,
  commissionReviewResolvedRevisionRequestListQuerySchema,
  commissionReviewRevisionRequestCancelBodySchema,
  commissionReviewRevisionRequestDraftBodySchema,
  commissionReviewRevisionRequestPublishBodySchema,
  commissionReviewStatusTransitionBodySchema,
  type AuthPrincipal,
  type CommissionReviewApplicationListQuery,
  type CommissionReviewCandidateAnnotationCreateBody,
  type CommissionReviewCandidateAnnotationUpdateBody,
  type CommissionReviewInternalNoteCreateBody,
  type CommissionReviewInternalNoteUpdateBody,
  type CommissionReviewResolvedRevisionRequestListQuery,
  type CommissionReviewRevisionRequestCancelBody,
  type CommissionReviewRevisionRequestDraftBody,
  type CommissionReviewRevisionRequestPublishBody,
  type CommissionReviewStatusTransitionBody,
} from '@hss/schemas';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { Roles } from '@/decorators/roles.decorator';
import { extractRequestId } from '@/helpers/request-id.helper';
import { AuthPrincipalPipe } from '@/pipelines/auth-principal.pipe';
import { ZodValidationPipe } from '@/pipelines/zod-validation.pipe';
import { CommissionReviewService } from './commission-review.service';

@Controller('commission-review')
@Roles(UserRole.COMMISSION_MEMBER)
export class CommissionReviewController {
  constructor(private readonly service: CommissionReviewService) {}

  @Get('memberships')
  async listMemberships(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
  ) {
    return this.service.listMemberships(principal);
  }

  @Get('commissions/:commissionUuid/instructor-applications')
  async listInstructorApplications(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Query(new ZodValidationPipe(commissionReviewApplicationListQuerySchema))
    query: CommissionReviewApplicationListQuery,
  ) {
    return this.service.listInstructorApplications(
      principal,
      commissionUuid,
      query,
    );
  }

  @Get('commissions/:commissionUuid/instructor-applications/:applicationUuid')
  async getInstructorApplicationDetail(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
  ) {
    return this.service.getInstructorApplicationDetail(
      principal,
      commissionUuid,
      applicationUuid,
    );
  }

  @Get(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/revision-request-audits',
  )
  async listResolvedRevisionRequestAudits(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Query(
      new ZodValidationPipe(
        commissionReviewResolvedRevisionRequestListQuerySchema,
      ),
    )
    query: CommissionReviewResolvedRevisionRequestListQuery,
  ) {
    return this.service.listResolvedRevisionRequestAudits(
      principal,
      commissionUuid,
      applicationUuid,
      query,
    );
  }

  @Get(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/revision-request-audits/:revisionRequestUuid',
  )
  async getResolvedRevisionRequestAudit(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Param('revisionRequestUuid', ParseUUIDPipe) revisionRequestUuid: string,
  ) {
    return this.service.getResolvedRevisionRequestAudit(
      principal,
      commissionUuid,
      applicationUuid,
      revisionRequestUuid,
    );
  }

  @Post(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/internal-notes',
  )
  async createInternalNote(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(new ZodValidationPipe(commissionReviewInternalNoteCreateBodySchema))
    dto: CommissionReviewInternalNoteCreateBody,
    @Req() req: Request,
  ) {
    return this.service.createInternalNote(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Patch(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/internal-notes/:noteUuid',
  )
  async updateInternalNote(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Param('noteUuid', ParseUUIDPipe) noteUuid: string,
    @Body(new ZodValidationPipe(commissionReviewInternalNoteUpdateBodySchema))
    dto: CommissionReviewInternalNoteUpdateBody,
    @Req() req: Request,
  ) {
    return this.service.updateInternalNote(
      principal,
      commissionUuid,
      applicationUuid,
      noteUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Delete(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/internal-notes/:noteUuid',
  )
  async deleteInternalNote(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Param('noteUuid', ParseUUIDPipe) noteUuid: string,
    @Req() req: Request,
  ) {
    return this.service.deleteInternalNote(
      principal,
      commissionUuid,
      applicationUuid,
      noteUuid,
      extractRequestId(req),
    );
  }

  @Post(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/candidate-annotations',
  )
  async createCandidateAnnotation(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(
      new ZodValidationPipe(
        commissionReviewCandidateAnnotationCreateBodySchema,
      ),
    )
    dto: CommissionReviewCandidateAnnotationCreateBody,
    @Req() req: Request,
  ) {
    return this.service.createCandidateAnnotation(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Patch(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/candidate-annotations/:annotationUuid',
  )
  async updateCandidateAnnotation(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Param('annotationUuid', ParseUUIDPipe) annotationUuid: string,
    @Body(
      new ZodValidationPipe(
        commissionReviewCandidateAnnotationUpdateBodySchema,
      ),
    )
    dto: CommissionReviewCandidateAnnotationUpdateBody,
    @Req() req: Request,
  ) {
    return this.service.updateCandidateAnnotation(
      principal,
      commissionUuid,
      applicationUuid,
      annotationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Put(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/revision-request/draft',
  )
  async saveRevisionRequestDraft(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(new ZodValidationPipe(commissionReviewRevisionRequestDraftBodySchema))
    dto: CommissionReviewRevisionRequestDraftBody,
    @Req() req: Request,
  ) {
    return this.service.saveRevisionRequestDraft(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Post(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/revision-request/publish',
  )
  async publishRevisionRequest(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(
      new ZodValidationPipe(commissionReviewRevisionRequestPublishBodySchema),
    )
    dto: CommissionReviewRevisionRequestPublishBody,
    @Req() req: Request,
  ) {
    return this.service.publishRevisionRequest(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Post(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/revision-request/cancel',
  )
  async cancelRevisionRequest(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(
      new ZodValidationPipe(commissionReviewRevisionRequestCancelBodySchema),
    )
    dto: CommissionReviewRevisionRequestCancelBody,
    @Req() req: Request,
  ) {
    return this.service.cancelRevisionRequest(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Patch(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/status',
  )
  async changeStatus(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Body(new ZodValidationPipe(commissionReviewStatusTransitionBodySchema))
    dto: CommissionReviewStatusTransitionBody,
    @Req() req: Request,
  ) {
    return this.service.changeStatus(
      principal,
      commissionUuid,
      applicationUuid,
      dto,
      extractRequestId(req),
    );
  }

  @Get(
    'commissions/:commissionUuid/instructor-applications/:applicationUuid/attachments/:attachmentUuid/download',
  )
  async getAttachmentDownloadUrl(
    @CurrentUser(AuthPrincipalPipe) principal: AuthPrincipal,
    @Param('commissionUuid', ParseUUIDPipe) commissionUuid: string,
    @Param('applicationUuid', ParseUUIDPipe) applicationUuid: string,
    @Param('attachmentUuid', ParseUUIDPipe) attachmentUuid: string,
    @Query('inline') inline: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.getAttachmentDownloadUrl(
      principal,
      commissionUuid,
      applicationUuid,
      attachmentUuid,
      inline === 'true',
      extractRequestId(req),
    );
  }
}
