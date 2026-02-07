// @file: apps/api/src/modules/user/user.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/database/prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllPersonalData() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        // identifiers
        uuid: true,
        keycloakUuid: true,

        // === Personal data ===
        firstName: true,
        secondName: true,
        surname: true,
        email: true,
        phone: true,
        birthDate: true,

        role: true,

        // optional org codes (często przydaje się widzieć)
        hufiecCode: true,
        druzynaCode: true,

        // timestamps
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}