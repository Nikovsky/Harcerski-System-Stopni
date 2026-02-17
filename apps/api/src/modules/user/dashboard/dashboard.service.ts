// @file: apps/api/src/modules/user/dashboard/dashboard.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { Prisma, User } from "@hss/database";
import { PrismaService } from "@/database/prisma/prisma.service";
import { UserRole, Status } from "@hss/database";
import type { AuthPrincipal, UserDashboardUpdatePrivilegedBody } from "@hss/schemas";
import { splitPersonName, iso, isoOrNull, dateOnlyToUtcOrNull } from "@/helpers";
import { hasAnyDefined } from "@/helpers/object.helper";
import { isHigherThanUser } from "@/helpers/role.helper";
import type { DashboardAuthUser, UserDashboardDto } from "./dashboard.dto";

const PRIVILEGED_KEYS = [
  "hufiecCode",
  "druzynaCode",
  "scoutRank",
  "scoutRankAwardedAt",
  "instructorRank",
  "instructorRankAwardedAt",
  "inScoutingSince",
  "inZhrSince",
  "oathDate",
] as const satisfies readonly (keyof UserDashboardUpdatePrivilegedBody)[];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get-or-create (Keycloak sub) and RETURN DB entity.
   * - If user doesn't exist in DB: create MINIMAL row (email only + system fields).
   */
  private async ensureUserEntity(principal: DashboardAuthUser): Promise<User> {
    const keycloakUuid = principal.sub;
    const email = principal.email?.toLowerCase() ?? null;

    const byKc = await this.prisma.user.findUnique({ where: { keycloakUuid } });
    if (byKc) return byKc;

    // If you REQUIRE email for creating local user row, enforce it here:
    if (!email) {
      throw new ConflictException({
        code: "EMAIL_REQUIRED",
        message: "Email is required to create a local user record.",
      });
    }

    // Optional safe migration: link by unique email (NO name autofill)
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.keycloakUuid && byEmail.keycloakUuid !== keycloakUuid) {
        throw new ConflictException({
          code: "KEYCLOAK_LINK_CONFLICT",
          message: "Account linking conflict.",
        });
      }

      return this.prisma.user.update({
        where: { uuid: byEmail.uuid },
        data: { keycloakUuid },
      });
    }

    // Create new user: ONLY email (plus required system fields) + keycloakUuid
    return this.prisma.user.create({
      data: {
        keycloakUuid,
        email,

        // system defaults (keep if required by schema)
        role: UserRole.USER,
        status: Status.ACTIVE,

        // DO NOT set any personal fields here:
        // firstName: null,
        // secondName: null,
        // surname: null,
      } satisfies Prisma.UserCreateInput,
    });
  }

  async getOrCreateFromKeycloak(user: DashboardAuthUser): Promise<UserDashboardDto> {
    const entity = await this.ensureUserEntity(user);
    return this.toDashboardDto(entity);
  }

  async updateDashboard(
    principal: AuthPrincipal,
    body: UserDashboardUpdatePrivilegedBody,
  ): Promise<UserDashboardDto> {
    const me = await this.ensureUserEntity(principal);

    const privileged = isHigherThanUser(me.role);

    if (!privileged && hasAnyDefined(body, PRIVILEGED_KEYS)) {
      throw new ForbiddenException({
        code: "DASHBOARD_EDIT_FORBIDDEN",
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

    const updated = await this.prisma.user.update({
      where: { uuid: me.uuid },
      data,
    });

    return this.toDashboardDto(updated);
  }

  private toDashboardDto(user: User): UserDashboardDto {
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