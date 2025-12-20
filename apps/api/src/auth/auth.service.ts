import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthPrincipal } from './types';
import { AuditEntityType } from '@prisma/client';
import { AuditService } from 'src/audit/audi.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upsertUserFromToken(p: AuthPrincipal) {
    return this.prisma.user.upsert({
      where: { keycloakId: p.sub },
      create: {
        keycloakId: p.sub,
        email: p.email,
        displayName: p.displayName,
      },
      update: {
        email: p.email ?? undefined,
        displayName: p.displayName ?? undefined,
      },
      select: {
        id: true,
        keycloakId: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async auditMeAccess(
    userId: string,
    ctx?: { requestId?: string; ip?: string; userAgent?: string },
  ) {
    await this.audit.log({
      action: 'AUTH_ME_ACCESSED',
      entityType: AuditEntityType.USER,
      entityId: userId,
      actorUserId: userId,
      requestId: ctx?.requestId,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });
  }
}
