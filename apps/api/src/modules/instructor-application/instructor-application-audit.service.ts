// @file: apps/api/src/modules/instructor-application/instructor-application-audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@hss/database';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '@hss/schemas';
import { PrismaService } from '@/database/prisma/prisma.service';
import { sanitizeRequestId } from '@/helpers/request-id.helper';

type InstructorAuditTargetType =
  | 'INSTRUCTOR_APPLICATION'
  | 'INSTRUCTOR_REQUIREMENT'
  | 'INSTRUCTOR_ATTACHMENT';

type InstructorAuditAction =
  | 'INSTRUCTOR_APPLICATION_CREATED'
  | 'INSTRUCTOR_APPLICATION_UPDATED'
  | 'INSTRUCTOR_APPLICATION_SUBMITTED'
  | 'INSTRUCTOR_APPLICATION_DELETED'
  | 'INSTRUCTOR_REQUIREMENT_UPDATED'
  | 'INSTRUCTOR_ATTACHMENT_PRESIGNED'
  | 'INSTRUCTOR_ATTACHMENT_CONFIRMED'
  | 'INSTRUCTOR_ATTACHMENT_DELETED'
  | 'INSTRUCTOR_ATTACHMENT_DOWNLOAD_URL_ISSUED';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type InstructorAuditMetadata = Record<string, JsonValue>;
const AUDIT_METADATA_SCHEMA_VERSION = 2;

type LogInstructorAuditParams = {
  principal: AuthPrincipal;
  action: InstructorAuditAction;
  targetType: InstructorAuditTargetType;
  targetUuid?: string | null;
  metadata?: InstructorAuditMetadata;
  requestId?: string | null;
};

@Injectable()
export class InstructorApplicationAuditService {
  private readonly logger = new Logger(InstructorApplicationAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogInstructorAuditParams): Promise<void> {
    const requestId = sanitizeRequestId(params.requestId);
    const metadataJson = JSON.stringify({
      ...(params.metadata ?? {}),
      schemaVersion: AUDIT_METADATA_SCHEMA_VERSION,
      ...(requestId ? { requestId } : {}),
    } satisfies InstructorAuditMetadata);
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
        `Instructor audit log write failed for action=${params.action}, targetType=${params.targetType}, targetUuid=${targetUuid ?? 'null'}: ${String(
          error,
        )}`,
      );
    }
  }
}
