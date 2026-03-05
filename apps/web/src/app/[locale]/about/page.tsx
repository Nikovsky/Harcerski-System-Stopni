// @file: apps/web/src/app/[locale]/about/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import type { AboutMessages } from "@/components/props/pages";

const SUPPORTED = ["pl", "en"] as const;
type Locale = (typeof SUPPORTED)[number];

type Props = {
  params: Promise<{ locale: string }>;
};

function isLocale(value: string): value is Locale {
  return (SUPPORTED as readonly string[]).includes(value);
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = (await import(`../../../../messages/${locale}/about.json`).then(
    (m) => m.default,
  )) as AboutMessages;

  return (
    <section className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-border bg-card px-5 py-6 md:px-7 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {messages.hero.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {messages.hero.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {messages.hero.description}
          </p>
        </header>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {messages.panel.first}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {messages.project.title}
            </h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              {messages.project.body}
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {messages.panel.second}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {messages.architecture.title}
            </h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <p className="text-sm leading-7 text-muted-foreground md:text-base">
              {messages.architecture.body}
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="border-b border-border bg-muted px-5 py-4 md:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {messages.panel.third}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {messages.team.title}
            </h2>
          </div>
          <div className="bg-card px-5 py-5 md:px-7 md:py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src="/team/kacper-bos-placeholder.svg"
                    alt={messages.team.imageAltKacper}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  Kacper Bos
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.team.role}
                </p>
              </article>

              <article className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src="/team/nikolas-feduniewicz-placeholder.svg"
                    alt={messages.team.imageAltNikolas}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  Nikolas Feduniewicz
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.team.role}
                </p>
              </article>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
