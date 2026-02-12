# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HSS (Harcerski System Stopni)** is a system for managing scout degree commissions in ZHR (Polish Scouting Association). It digitalizes documentation, enables asynchronous review of trials, and streamlines commission meeting organization.

- **Status**: In development
- **License**: AGPL-3.0-only
- **Monorepo**: Turborepo + pnpm workspaces
- **Primary language**: Polish (PL) with i18n support

## Context and State Management

**IMPORTANT:** To maintain efficient context usage and enable long-term work continuity:

### After Completing Work Sessions

When finishing any task, sprint, stage, or work session:

1. **Update `.claude/current-state.md`** with:
   - Current branch name and status
   - Summary of completed work
   - List of uncommitted changes with brief descriptions
   - List of committed changes (recent commits)
   - Important technical notes or lessons learned
   - Next steps or pending tasks
   - User decisions and preferences
   - Key file paths for the current work area

2. **On session end** (`/koniec` command or "Kończymy na dziś"):
   - Update `.claude/current-state.md` with complete session summary
   - User will execute `/clear` to reset context
   - Next session starts by reading `.claude/current-state.md` to restore context

### Resuming Work

When starting a new conversation or after context clear:
- Read `.claude/current-state.md` first to understand current project state
- Read relevant files mentioned in current-state.md
- Continue from where the previous session ended

**File location:** `.claude/current-state.md` (always in Polish, matching project language)

## Architecture

### Monorepo Structure

```
apps/
  web/          Next.js 16 frontend (App Router)
  api/          NestJS backend (REST API)
packages/
  database/     Prisma 7 schema + client (@hss/database)
  schemas/      Shared Zod validation schemas (@hss/schemas)
```

### Infrastructure Stack (Docker)

All services run via `docker/docker-compose.yml`:

- **NGINX** - Reverse proxy at https://hss.local (TLS), routes to web/api/auth/s3
- **Next.js** - Frontend at https://hss.local (via nginx proxy to host.docker.internal:3000)
- **NestJS** - API at https://api.hss.local (via nginx proxy to host.docker.internal:3001)
- **Keycloak** - Auth/RBAC at https://auth.hss.local, admin at https://authconsole.hss.local
- **PostgreSQL 18** - Two databases: `hss` (app) + `keycloak` (auth)
- **MinIO** - S3-compatible storage at https://s3.hss.local, console at http://localhost:9001

### Database Architecture

**Key design patterns:**

1. **Split Instructor/Scout Models**: `InstructorApplication` vs `ScoutApplication` (different degrees, different requirements)
2. **Versioned Templates**: `RequirementTemplate` with version tracking, only one active per degree/code
3. **JSONB Snapshots**: Immutable historical records in `*ApplicationSnapshot` tables capture full state at submission
4. **Polymorphic Relations**: `Attachment` and `ApplicationComment` relate to both instructor/scout applications via nullable foreign keys
5. **Hierarchical Requirements**: `RequirementDefinition` supports parent/child relationships for grouped requirements
6. **Commission Meeting Slots**: Two modes - `SLOTS` (time-based) or `DAY_ONLY` (date-based)

**Critical enums:**
- `UserRole`: ROOT, SYSTEM, ADMIN, COMMISSION_CHAIR, COMMISSION_SECRETARY, COMMISSION_MEMBER, SCOUT, USER, NONE
- `ApplicationStatus`: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED_POSITIVE
- `DegreeType`: INSTRUCTOR, SCOUT (determines which application type)

See `packages/database/prisma/schema.prisma` for full schema.

## Development Commands

### Stack Management (PowerShell scripts)

Infrastructure is controlled via PowerShell scripts in `scripts/`:

```bash
# Start full stack (Docker + dev servers)
pnpm dev                    # clears terminal, ensures stack running, starts turbo dev

# Cold start (fresh install + stack)
pnpm start:cold             # install deps → stack up → dev

# Restart development (clean rebuild)
pnpm restart:dev            # clean → install → dev

# Complete project reset
pnpm restart:project        # stack down → clean → install → stack up → dev

# Stack operations (via scripts/infra.ps1)
pnpm stack:up               # start Docker services
pnpm stack:down             # stop and remove containers
pnpm stack:start            # start stopped containers
pnpm stack:stop             # stop containers (keep them)
pnpm stack:status           # show container status
pnpm stack:is-running       # exit 0 if running (used in scripts)

# Clean operations (via scripts/clean.ps1)
pnpm clean                  # clean:build + clean:deps
pnpm clean:build            # remove dist/build/.next artifacts
pnpm clean:deps             # remove node_modules
```

### Database (Prisma 7)

Database operations target `packages/database`:

```bash
# Generate Prisma client (after schema changes)
pnpm db:generate            # prisma generate

# Create new migration (development)
pnpm prisma:new:migration   # ensures stack running → interactive migration creation

# Apply migrations (development)
pnpm db:migrate             # prisma migrate dev

# Deploy migrations (production)
pnpm db:deploy              # prisma migrate deploy

# Reset database (destructive)
pnpm db:reset               # interactive reset with seed
pnpm db:reset:force         # force reset without prompts

# Prisma Studio (GUI)
pnpm db:studio              # browse data at http://localhost:5555

# Seed database
pnpm prisma:seed            # run packages/database/prisma/seed.ts

# Delete all migrations (nuclear option)
pnpm prisma:del:migration   # reset DB + delete migration folder
```

**Important:** After modifying `schema.prisma`:
1. Run `pnpm db:generate` to regenerate client
2. Create migration with `pnpm prisma:new:migration`
3. Generated client outputs to `packages/database/src/generated/`

### Application Development

```bash
# Run all apps in dev mode (Next.js + NestJS)
pnpm dev                    # turbo dev (with dependencies)

# Build all packages/apps
pnpm build                  # turbo build

# Lint
pnpm lint                   # turbo lint

# Type check
pnpm typecheck              # turbo typecheck

# Test
pnpm test                   # turbo test
```

**Individual app scripts:**
- Web: `pnpm --filter web dev|build|start`
- API: `pnpm --filter api dev|build|start`

### Schemas Package

The `@hss/schemas` package contains shared Zod schemas:

```bash
pnpm schemas:build          # build schemas package
```

## Tech Stack Details

### Frontend (apps/web)

- **Next.js 16** with App Router
- **React 19**
- **TailwindCSS 4** (with @tailwindcss/postcss)
- **next-intl** for i18n (Polish/English, locale-based routing)
- **next-auth v4** for authentication (Keycloak OIDC)
- **react-bootstrap-icons** for icons

**I18n structure:**
- Supported locales: `pl`, `en` (default: `pl`)
- Messages in `apps/web/messages/{locale}/*.json`
- Namespace-based messages (e.g., `common.json`, `home.json`)
- Configuration: `apps/web/src/i18n/request.ts`

**Routing:**
- All routes prefixed with `[locale]`: `/pl/*`, `/en/*`
- Layout: `apps/web/src/app/[locale]/layout.tsx`

### Backend (apps/api)

- **NestJS 11** with Express
- **Prisma Client** from `@hss/database`
- **Zod schemas** from `@hss/schemas`
- **Jest** for testing

**Structure:**
- Entry point: `apps/api/src/main.ts`
- Module: `apps/api/src/app.module.ts`

### Shared Packages

**@hss/database:**
- Prisma 7 schema + generated client
- PostgreSQL 18 adapter (`@prisma/adapter-pg`)
- Client exported from `packages/database/src/index.ts`
- Generated types at `packages/database/src/generated/`

**@hss/schemas:**
- Zod 4 validation schemas
- Shared between frontend/backend
- TypeScript types exported

## Turborepo Pipeline

Key task dependencies (see `turbo.json`):

- `build` depends on `^build` (all workspace deps must build first)
- `@hss/database#build` depends on `db:generate`
- `@hss/database#dev` depends on `db:migrate`
- `web#dev` and `api#dev` depend on `@hss/database#db:migrate` + `^build`
- Database tasks have `cache: false` (always run fresh)

## Important Notes

### Working with Migrations

1. Always ensure Docker stack is running before Prisma operations
2. Migrations are stored in `packages/database/prisma/migrations/`
3. Never manually edit generated client in `packages/database/src/generated/`
4. To delete migrations entirely: `pnpm prisma:del:migration` (resets DB!)

### Application State Flow

**Instructor/Scout Applications:**
1. Created as `DRAFT` by candidate
2. Submitted → `SUBMITTED` (creates snapshot)
3. Commission reviews → `UNDER_REVIEW`
4. Approved → `APPROVED` (sets `approvedAt`)
5. Candidate works on requirements → `IN_PROGRESS`
6. Final report submitted → `REPORT_SUBMITTED`
7. Commission decides → `COMPLETED_POSITIVE` or `REJECTED`
8. Archived → `ARCHIVED` (sets `archivedAt`)

**Snapshots:**
- Created on each submission (revision increments)
- Captures candidate data, requirements, attachments, application fields
- Immutable - used for historical reference and auditing
- Denormalized fields enable fast searching without JSON queries

### Commission Meetings

- Two slot modes: `SLOTS` (scheduled time slots) or `DAY_ONLY` (flexible day-based)
- Registrations link applications to meetings
- Statuses: `DRAFT` → `OPEN_FOR_REGISTRATION` → `CLOSED` → `COMPLETED` or `CANCELLED`
- Documents can be attached post-meeting (protocols, decisions)

### File Attachments

- Stored in MinIO (S3-compatible)
- Polymorphic relations: can attach to applications or specific requirements
- Metadata: `objectKey` (S3 path), `originalFilename`, `contentType`, `sizeBytes`, `checksum`
- SHA256 checksums for integrity verification

### User Model Design

- Unified `User` model for both candidates and commission members
- Role-based: `UserRole` enum determines permissions
- Can have both scout rank (`scoutRank`) and instructor rank (`instructorRank`)
- Organizational hierarchy: `hufiec` (district) → `druzyna` (troop)

## Common Development Tasks

### Adding a New Migration

```bash
pnpm prisma:new:migration
# Interactive prompt for migration name
# Review generated SQL in packages/database/prisma/migrations/
```

### Rebuilding After Schema Change

```bash
pnpm db:generate          # regenerate client
pnpm db:build            # rebuild database package
pnpm build               # rebuild dependent packages
```

### Resetting Development Environment

```bash
pnpm restart:dev         # soft reset (preserves Docker data)
pnpm restart:project     # hard reset (removes containers/volumes)
```

### Running Single Tests

NestJS (apps/api):
```bash
cd apps/api
pnpm test -- <test-file-pattern>
```

### Accessing Services

- Web: https://hss.local (HTTPS via NGINX)
- API: https://api.hss.local
- Keycloak Admin: https://authconsole.hss.local
- MinIO Console: http://localhost:9001 (direct, not proxied)
- Prisma Studio: http://localhost:5555 (when running)
- PostgreSQL: localhost:5432 (direct connection)
