// @file: apps/web/src/app/[locale]/about/page.tsx
import Image from "next/image";

type TeamMember = {
  name: string;
  role: string;
  imageSrc: string;
  imageAlt: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Kacper Bos",
    role: "Co-founder",
    imageSrc: "/team/kacper-bos-placeholder.svg",
    imageAlt: "Placeholder portrait for Kacper Bos",
  },
  {
    name: "Nikolas Feduniewicz",
    role: "Co-founder",
    imageSrc: "/team/nikolas-feduniewicz-placeholder.svg",
    imageAlt: "Placeholder portrait for Nikolas Feduniewicz",
  },
];

export default function AboutPage() {
  return (
    <section className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-border bg-card px-5 py-6 md:px-7 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            About HSS
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Platform built for secure, scalable project growth
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            HSS (Harcerski System Stopni) is designed as a production-grade
            monorepo. The goal is clear contracts, strict validation and an
            architecture that stays maintainable as the product evolves.
          </p>
        </header>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Panel 01
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              What this project is
            </h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              This project provides a secure foundation for managing scouting
              progression and operational workflows. It emphasizes consistency
              between frontend and backend, reusable shared schemas and clear
              engineering boundaries that support long-term development.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Panel 02
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              How architecture looks
            </h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              HSS uses Turborepo with Next.js for web, NestJS for API, Prisma
              for database access and shared Zod contracts in a dedicated package.
              Infrastructure services (Keycloak, PostgreSQL, MinIO, nginx/TLS)
              are containerized to keep local development close to production.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Panel 03
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Team</h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {TEAM_MEMBERS.map((member) => (
                <article
                  key={member.name}
                  className="rounded-xl border border-border bg-muted/40 p-4"
                >
                  <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={member.imageSrc}
                      alt={member.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-4 text-base font-semibold text-foreground">
                    {member.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
                </article>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
