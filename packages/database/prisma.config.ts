// @file: packages/database/prisma.config.ts
import path from "node:path";
import { config as dotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Option A one root .env for everything TODO: test this setup
// dotenv({ path: path.resolve(process.cwd(), "../../.env") });

// Option B: env local to the package
dotenv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
// EOF