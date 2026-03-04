// @file: apps/api/src/modules/meetings/meetings-audit.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@hss/database';
import { randomUUID } from 'node:crypto';
import type { AuthPrincipal } from '@hss/schemas';

import { PrismaService } from '@/database/prisma/prisma.service';

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

function sanitizeRequestId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(trimmed)) return null;
  return trimmed;
}

@Injectable()
export class MeetingsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    params: LogMeetingAuditParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const requestId = sanitizeRequestId(params.requestId);
    const metadataJson = JSON.stringify({
      ...(params.metadata ?? {}),
      schemaVersion: AUDIT_METADATA_SCHEMA_VERSION,
      ...(requestId ? { requestId } : {}),
    } satisfies MeetingAuditMetadata);

    const targetUuid = params.targetUuid ?? null;
    const db = tx ?? this.prisma;

    await db.$executeRaw(
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
  }
}
