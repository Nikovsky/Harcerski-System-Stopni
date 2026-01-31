// @file: packages/database/prisma/seed.ts
// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient, ExampleStatus } from "../src/generated/client";

// async function main() {
//   const adapter = new PrismaPg({
//     connectionString: process.env.DATABASE_URL!,
//   });

//   const prisma = new PrismaClient({ adapter });

//   // CREATE
//   const created = await prisma.exampleItem.create({
//     data: {
//       name: "Hello Prisma 7",
//       status: ExampleStatus.ACTIVE,
//     },
//   });

//   // READ
//   const all = await prisma.exampleItem.findMany({
//     orderBy: { createdAt: "desc" },
//   });

//   console.log("Created:", created);
//   console.log("All:", all);

//   await prisma.$disconnect();
// }

// main().catch(async (e) => {
//   console.error(e);
//   process.exit(1);
// });
// EOF