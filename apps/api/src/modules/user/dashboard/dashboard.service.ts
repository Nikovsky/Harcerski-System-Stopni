// @file: apps/api/src/modules/user/dashboard/dashboard.service.ts
import { ConflictException, Injectable, InternalServerErrorException, } from "@nestjs/common";
import type { Prisma, User } from "@hss/database";
import { PrismaService } from "@/database/prisma/prisma.service";
import { UserRole, Status } from "@hss/database";
import type { DashboardAuthUser, UpdateUserDashboardProfileDto, UserDashboardDto, } from "./dashboard.dto";
import { splitPersonName, iso, isoOrNull } from "@/helpers";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Find by keycloakUuid; if missing -> link by email (optional migration); else create new.
   */
  async getOrCreateFromKeycloak(user: DashboardAuthUser): Promise<UserDashboardDto> {
    const keycloakUuid = user.sub;
    const email = user.email?.toLowerCase() ?? null;

    // 1) Fast path: by keycloakUuid
    const byKc = await this.prisma.user.findUnique({
      where: { keycloakUuid },
    });
    if (byKc) return this.toDashboardDto(byKc);

    // 2) Optional safe migration: link by unique email
    if (email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (byEmail) {
        if (byEmail.keycloakUuid && byEmail.keycloakUuid !== keycloakUuid) {
          throw new ConflictException({
            code: "KEYCLOAK_LINK_CONFLICT",
            message: "Account linking conflict.",
          });
        }

        const parsedName = splitPersonName(user.name);

        const linked = await this.prisma.user.update({
          where: { uuid: byEmail.uuid },
          data: {
            keycloakUuid,
            firstName: byEmail.firstName ?? parsedName.firstName ?? user.preferredUsername ?? null,
            secondName: byEmail.secondName ?? parsedName.secondName,
            surname: byEmail.surname ?? parsedName.surname,
          },
        });

        return this.toDashboardDto(linked);
      }
    }

    // 3) Create new user (safe defaults)
    const parsedName = splitPersonName(user.name);

    const created = await this.prisma.user.create({
      data: {
        keycloakUuid,
        email,
        firstName: parsedName.firstName ?? user.preferredUsername ?? null,
        secondName: parsedName.secondName,
        surname: parsedName.surname,

        role: UserRole.USER,
        status: Status.ACTIVE,
      } satisfies Prisma.UserCreateInput,
    });

    return this.toDashboardDto(created);
  }

  async updateMyProfile(
    user: DashboardAuthUser,
    dto: UpdateUserDashboardProfileDto,
  ): Promise<UserDashboardDto> {
    // Ensure user exists (auto-create if missing)
    await this.getOrCreateFromKeycloak(user);

    const updated = await this.prisma.user.update({
      where: { keycloakUuid: user.sub },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.secondName !== undefined ? { secondName: dto.secondName } : {}),
        ...(dto.surname !== undefined ? { surname: dto.surname } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate } : {}),
        ...(dto.hufiecCode !== undefined ? { hufiecCode: dto.hufiecCode } : {}),
        ...(dto.druzynaCode !== undefined ? { druzynaCode: dto.druzynaCode } : {}),
      },
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