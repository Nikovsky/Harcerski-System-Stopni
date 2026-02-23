// @file: apps/api/src/modules/user/profile/profile.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "@/database/prisma/prisma.service";
import { hasAnyDefined } from "@/helpers/object.helper";
import { isHigherThanUser } from "@/helpers/role.helper";
import { dateOnlyToUtcOrNull, iso, isoOrNull } from "@/helpers";
import {
  Prisma,
  Status,
  UserRole,
  type User,
} from "@hss/database";
import {
  userDashboardPrivilegedKeys,
  type AuthPrincipal,
  type UserDashboardResponse,
  type UserDashboardUpdatePrivilegedBody,
} from "@hss/schemas";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) { }

  private rethrowPrismaError(error: unknown): never {
    if (
      error instanceof ConflictException
      || error instanceof ForbiddenException
      || error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException({
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          message: "Unique constraint violation.",
        });
      }
      if (error.code === "P2003") {
        throw new ConflictException({
          code: "RELATION_CONSTRAINT_VIOLATION",
          message: "Invalid relation reference.",
        });
      }
      if (error.code === "P2025") {
        throw new ConflictException({
          code: "RECORD_NOT_FOUND",
          message: "Record not found.",
        });
      }
    }

    throw new InternalServerErrorException({
      code: "DATABASE_OPERATION_FAILED",
      message: "Database operation failed.",
    });
  }

  /**
   * Get-or-create (Keycloak sub) and RETURN DB entity.
   * - If user doesn't exist in DB: create MINIMAL row (email only + system fields).
   */
  private async ensureUserEntity(principal: AuthPrincipal): Promise<User> {
    const keycloakUuid = principal.sub;
    const email = principal.email?.toLowerCase() ?? null;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const byKc = await tx.user.findUnique({ where: { keycloakUuid } });
          if (byKc) return byKc;

          if (!email) {
            throw new ConflictException({
              code: "EMAIL_REQUIRED",
              message: "Email is required to create a local user record.",
            });
          }

          const byEmail = await tx.user.findUnique({ where: { email } });
          if (byEmail) {
            if (byEmail.keycloakUuid && byEmail.keycloakUuid !== keycloakUuid) {
              throw new ConflictException({
                code: "KEYCLOAK_LINK_CONFLICT",
                message: "Account linking conflict.",
              });
            }

            return tx.user.update({
              where: { uuid: byEmail.uuid },
              data: { keycloakUuid },
            });
          }

          return tx.user.create({
            data: {
              keycloakUuid,
              email,
              role: UserRole.USER,
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

  async getOrCreateFromKeycloak(user: AuthPrincipal): Promise<UserDashboardResponse> {
    const entity = await this.ensureUserEntity(user);
    return this.toProfileDto(entity);
  }

  async updateProfile(
    principal: AuthPrincipal,
    body: UserDashboardUpdatePrivilegedBody,
  ): Promise<UserDashboardResponse> {
    const me = await this.ensureUserEntity(principal);
    const privileged = isHigherThanUser(me.role);

    if (!privileged && hasAnyDefined(body, userDashboardPrivilegedKeys)) {
      throw new ForbiddenException({
        code: "PROFILE_EDIT_FORBIDDEN",
        message: "You cannot edit these fields.",
      });
    }

    const data: Prisma.UserUpdateInput = {
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.secondName !== undefined ? { secondName: body.secondName } : {}),
      ...(body.surname !== undefined ? { surname: body.surname } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.birthDate !== undefined
        ? { birthDate: dateOnlyToUtcOrNull(body.birthDate) }
        : {}),
    };

    if (privileged) {
      Object.assign(data, {
        ...(body.hufiecCode !== undefined ? { hufiecCode: body.hufiecCode } : {}),
        ...(body.druzynaCode !== undefined ? { druzynaCode: body.druzynaCode } : {}),
        ...(body.scoutRank !== undefined ? { scoutRank: body.scoutRank } : {}),
        ...(body.scoutRankAwardedAt !== undefined
          ? { scoutRankAwardedAt: dateOnlyToUtcOrNull(body.scoutRankAwardedAt) }
          : {}),
        ...(body.instructorRank !== undefined ? { instructorRank: body.instructorRank } : {}),
        ...(body.instructorRankAwardedAt !== undefined
          ? { instructorRankAwardedAt: dateOnlyToUtcOrNull(body.instructorRankAwardedAt) }
          : {}),
        ...(body.inScoutingSince !== undefined
          ? { inScoutingSince: dateOnlyToUtcOrNull(body.inScoutingSince) }
          : {}),
        ...(body.inZhrSince !== undefined
          ? { inZhrSince: dateOnlyToUtcOrNull(body.inZhrSince) }
          : {}),
        ...(body.oathDate !== undefined ? { oathDate: dateOnlyToUtcOrNull(body.oathDate) } : {}),
      });
    }

    try {
      const updated = await this.prisma.$transaction(
        async (tx) => tx.user.update({
          where: { uuid: me.uuid },
          data,
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.toProfileDto(updated);
    } catch (error) {
      this.rethrowPrismaError(error);
    }
  }

  private toProfileDto(user: User): UserDashboardResponse {
    if (!user.keycloakUuid) {
      throw new InternalServerErrorException({
        code: "KEYCLOAK_UUID_MISSING",
        message: "User is not linked to Keycloak.",
      });
    }

    return {
      uuid: user.uuid,
      keycloakUuid: user.keycloakUuid,
      firstName: user.firstName,
      secondName: user.secondName,
      surname: user.surname,
      email: user.email,
      phone: user.phone,
      birthDate: isoOrNull(user.birthDate),
      role: user.role,
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
