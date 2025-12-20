import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntityType } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    entityType: AuditEntityType;
    entityId: string;
    actorUserId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorUserId: params.actorUserId,
        requestId: params.requestId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata,
      },
    });
  }
}
