// @file: apps/api/src/modules/commission-review/commission-review-audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@hss/database';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '@hss/schemas';
import { PrismaService } from '@/database/prisma/prisma.service';
import { sanitizeRequestId } from '@/helpers/request-id.helper';

type CommissionReviewAuditTargetType =
  | 'INSTRUCTOR_APPLICATION'
  | 'INSTRUCTOR_REQUIREMENT'
  | 'INSTRUCTOR_ATTACHMENT'
  | 'INSTRUCTOR_FIX_REQUEST'
  | 'INSTRUCTOR_REVIEW_INTERNAL_NOTE'
  | 'INSTRUCTOR_REVIEW_CANDIDATE_ANNOTATION'
  | 'INSTRUCTOR_REVIEW_REVISION_REQUEST';

type CommissionReviewAuditAction =
  | 'COMMISSION_REVIEW_COMMENT_CREATED'
  | 'COMMISSION_REVIEW_FIX_REQUEST_DRAFT_SAVED'
  | 'COMMISSION_REVIEW_FIX_REQUEST_PUBLISHED'
  | 'COMMISSION_REVIEW_FIX_REQUEST_RESOLVED'
  | 'COMMISSION_REVIEW_FIX_REQUEST_CANCELLED'
  | 'COMMISSION_REVIEW_REVISION_REQUEST_DRAFT_SAVED'
  | 'COMMISSION_REVIEW_INTERNAL_NOTE_CREATED'
  | 'COMMISSION_REVIEW_INTERNAL_NOTE_UPDATED'
  | 'COMMISSION_REVIEW_INTERNAL_NOTE_DELETED'
  | 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_CREATED'
  | 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_UPDATED'
  | 'COMMISSION_REVIEW_CANDIDATE_ANNOTATION_CANCELLED'
  | 'COMMISSION_REVIEW_REVISION_REQUEST_PUBLISHED'
  | 'COMMISSION_REVIEW_REVISION_REQUEST_CANCELLED'
  | 'COMMISSION_REVIEW_STATUS_CHANGED'
  | 'COMMISSION_REVIEW_ATTACHMENT_DOWNLOAD_URL_ISSUED';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type CommissionReviewAuditMetadata = Record<string, JsonValue>;

const AUDIT_METADATA_SCHEMA_VERSION = 1;

type LogCommissionReviewAuditParams = {
  principal: AuthPrincipal;
  action: CommissionReviewAuditAction;
  targetType: CommissionReviewAuditTargetType;
  targetUuid?: string | null;
  metadata?: CommissionReviewAuditMetadata;
  requestId?: string | null;
};

@Injectable()
export class CommissionReviewAuditService {
  private readonly logger = new Logger(CommissionReviewAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogCommissionReviewAuditParams): Promise<void> {
    const requestId = sanitizeRequestId(params.requestId);
    const metadataJson = JSON.stringify({
      ...(params.metadata ?? {}),
      schemaVersion: AUDIT_METADATA_SCHEMA_VERSION,
      ...(requestId ? { requestId } : {}),
    } satisfies CommissionReviewAuditMetadata);
    const targetUuid = params.targetUuid ?? null;

    try {
      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "AuditEvent" (
            "uuid",
            "actorKeycloakUuid",
            "action",
            "targetType",
            "targetUuid",
            "metadata",
            "createdAt"
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${params.principal.sub}::uuid,
            ${params.action},
            ${params.targetType},
            ${targetUuid}::uuid,
            ${metadataJson}::jsonb,
            NOW()
          )
        `,
      );
    } catch (error) {
      this.logger.warn(
        `Commission review audit log write failed for action=${params.action}, targetType=${params.targetType}, targetUuid=${targetUuid ?? 'null'}: ${String(
          error,
        )}`,
      );
    }
  }
}
