// @file: apps/api/src/modules/meetings/meetings-audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@hss/database';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '@hss/schemas';

import { PrismaService } from '@/database/prisma/prisma.service';
import { sanitizeRequestId } from '@/helpers/request-id.helper';

type MeetingAuditTargetType =
  | 'MEETING'
  | 'MEETING_SLOT'
  | 'MEETING_REGISTRATION';

type MeetingAuditAction =
  | 'MEETING_CREATED'
  | 'SLOTS_CREATED'
  | 'SLOT_BOOKED'
  | 'SLOT_CANCELED'
  | 'SLOT_REASSIGNED';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type MeetingAuditMetadata = Record<string, JsonValue>;

const AUDIT_METADATA_SCHEMA_VERSION = 1;

export type LogMeetingAuditParams = {
  principal: AuthPrincipal;
  action: MeetingAuditAction;
  targetType: MeetingAuditTargetType;
  targetUuid?: string | null;
  metadata?: MeetingAuditMetadata;
  requestId?: string | null;
};

@Injectable()
export class MeetingsAuditService {
  private readonly logger = new Logger(MeetingsAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogMeetingAuditParams): Promise<void> {
    const requestId = sanitizeRequestId(params.requestId);
    const metadataJson = JSON.stringify({
      ...(params.metadata ?? {}),
      schemaVersion: AUDIT_METADATA_SCHEMA_VERSION,
      ...(requestId ? { requestId } : {}),
    } satisfies MeetingAuditMetadata);
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
        `Meetings audit log write failed for action=${params.action}, targetType=${params.targetType}, targetUuid=${targetUuid ?? 'null'}: ${String(
          error,
        )}`,
      );
    }
  }
}
