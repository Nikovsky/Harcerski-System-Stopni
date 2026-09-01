// @file: apps/api/src/modules/user/profile/profile.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { hasAnyDefined } from '@/helpers/object.helper';
import {
  isHigherThanUser,
  resolveHighestUserRole,
} from '@/helpers/role.helper';
import { dateOnlyToUtcOrNull, iso, isoOrNull } from '@/helpers';
import { Prisma, Status, type User } from '@hss/database';
import {
  userDashboardPrivilegedKeys,
  type AuthPrincipal,
  type UserDashboardResponse,
  type UserDashboardUpdatePrivilegedBody,
} from '@hss/schemas';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private rethrowPrismaError(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof ForbiddenException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException({
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'Unique constraint violation.',
        });
      }
      if (error.code === 'P2003') {
        throw new ConflictException({
          code: 'RELATION_CONSTRAINT_VIOLATION',
          message: 'Invalid relation reference.',
        });
      }
      if (error.code === 'P2025') {
        throw new ConflictException({
          code: 'RECORD_NOT_FOUND',
          message: 'Record not found.',
        });
      }
    }

    throw new InternalServerErrorException({
      code: 'DATABASE_OPERATION_FAILED',
      message: 'Database operation failed.',
    });
  }

  /**
   * Get-or-create the HSS profile keyed by the immutable Keycloak subject.
   */
  private async ensureUserEntity(principal: AuthPrincipal): Promise<User> {
    const keycloakUuid = principal.sub;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const byKc = await tx.user.findUnique({ where: { keycloakUuid } });
          if (byKc) return byKc;

          return tx.user.create({
            data: {
              keycloakUuid,
              status: Status.ACTIVE,
            } satisfies Prisma.UserCreateInput,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowPrismaError(error);
    }
  }

  async getOrCreateFromKeycloak(
    user: AuthPrincipal,
  ): Promise<UserDashboardResponse> {
    const entity = await this.ensureUserEntity(user);
    return this.toProfileDto(entity, user);
  }

  async updateProfile(
    principal: AuthPrincipal,
    body: UserDashboardUpdatePrivilegedBody,
  ): Promise<UserDashboardResponse> {
    const me = await this.ensureUserEntity(principal);
    const privileged = isHigherThanUser(principal);

    if (!privileged && hasAnyDefined(body, userDashboardPrivilegedKeys)) {
      throw new ForbiddenException({
        code: 'PROFILE_EDIT_FORBIDDEN',
        message: 'You cannot edit these fields.',
      });
    }

    const data: Prisma.UserUpdateInput = {
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.birthDate !== undefined
        ? { birthDate: dateOnlyToUtcOrNull(body.birthDate) }
        : {}),
    };

    if (privileged) {
      Object.assign(data, {
        ...(body.hufiecCode !== undefined
          ? { hufiecCode: body.hufiecCode }
          : {}),
        ...(body.druzynaCode !== undefined
          ? { druzynaCode: body.druzynaCode }
          : {}),
        ...(body.scoutRank !== undefined ? { scoutRank: body.scoutRank } : {}),
        ...(body.scoutRankAwardedAt !== undefined
          ? { scoutRankAwardedAt: dateOnlyToUtcOrNull(body.scoutRankAwardedAt) }
          : {}),
        ...(body.instructorRank !== undefined
          ? { instructorRank: body.instructorRank }
          : {}),
        ...(body.instructorRankAwardedAt !== undefined
          ? {
              instructorRankAwardedAt: dateOnlyToUtcOrNull(
                body.instructorRankAwardedAt,
              ),
            }
          : {}),
        ...(body.inScoutingSince !== undefined
          ? { inScoutingSince: dateOnlyToUtcOrNull(body.inScoutingSince) }
          : {}),
        ...(body.inZhrSince !== undefined
          ? { inZhrSince: dateOnlyToUtcOrNull(body.inZhrSince) }
          : {}),
        ...(body.oathDate !== undefined
          ? { oathDate: dateOnlyToUtcOrNull(body.oathDate) }
          : {}),
      });
    }

    try {
      const updated = await this.prisma.$transaction(
        async (tx) =>
          tx.user.update({
            where: { keycloakUuid: me.keycloakUuid },
            data,
          }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.toProfileDto(updated, principal);
    } catch (error) {
      this.rethrowPrismaError(error);
    }
  }

  private toProfileDto(
    user: User,
    principal: AuthPrincipal,
  ): UserDashboardResponse {
    const nameParts = principal.name?.trim().split(/\s+/) ?? [];
    return {
      uuid: user.keycloakUuid,
      keycloakUuid: user.keycloakUuid,
      firstName: nameParts.at(0) ?? null,
      secondName:
        nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null,
      surname: nameParts.length > 1 ? (nameParts.at(-1) ?? null) : null,
      email: principal.email?.toLowerCase() ?? null,
      phone: user.phone,
      birthDate: isoOrNull(user.birthDate),
      role: resolveHighestUserRole(principal),
      hufiecCode: user.hufiecCode,
      druzynaCode: user.druzynaCode,
      scoutRank: user.scoutRank,
      scoutRankAwardedAt: isoOrNull(user.scoutRankAwardedAt),
      instructorRank: user.instructorRank,
      instructorRankAwardedAt: isoOrNull(user.instructorRankAwardedAt),
      inScoutingSince: isoOrNull(user.inScoutingSince),
      inZhrSince: isoOrNull(user.inZhrSince),
      oathDate: isoOrNull(user.oathDate),
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
      status: user.status,
    };
  }
}
