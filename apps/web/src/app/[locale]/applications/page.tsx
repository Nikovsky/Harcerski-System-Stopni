// @file: apps/web/src/app/[locale]/applications/page.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMyApplications } from "@/hooks/instructor-application/useMyApplications";
import { useProfileCheck } from "@/hooks/instructor-application/useProfileCheck";
import { ApplicationCard } from "@/components/instructor-application/ApplicationCard";

const FIELD_LABELS: Record<string, string> = {
  profile: "Profil użytkownika",
  firstName: "Imię",
  surname: "Nazwisko",
  email: "Email",
  phone: "Telefon",
  birthDate: "Data urodzenia",
  hufiecCode: "Hufiec",
  druzynaCode: "Drużyna",
  scoutRank: "Stopień harcerski",
  inScoutingSince: "W harcerstwie od",
  inZhrSince: "W ZHR od",
  oathDate: "Data przyrzeczenia",
};

export default function ApplicationsPage() {
  const t = useTranslations("applications");
  const { data: applications, isLoading: appsLoading } = useMyApplications();
  const { data: profile, isLoading: profileLoading } = useProfileCheck();

  const isLoading = appsLoading || profileLoading;
  const profileComplete = profile?.complete ?? false;
  const missingFields = profile?.missingFields ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {profileComplete ? (
          <Link
            href="/applications/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t("newApplication")}
          </Link>
        ) : (
          <span
            className="cursor-not-allowed rounded-md bg-primary/40 px-4 py-2 text-sm font-medium text-primary-foreground/60"
            title="Uzupełnij profil w Dashboard"
          >
            {t("newApplication")}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-foreground/50">...</div>
      )}

      {!isLoading && !profileComplete && (
        <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30">
          <p className="mb-2 font-medium text-orange-800 dark:text-orange-300">
            Aby utworzyć wniosek, uzupełnij brakujące pola w{" "}
            <Link href="/dashboard" className="underline hover:no-underline">
              Dashboard
            </Link>
            :
          </p>
          <ul className="ml-4 list-disc text-sm text-orange-700 dark:text-orange-400">
            {missingFields.map((field) => (
              <li key={field}>{FIELD_LABELS[field] ?? field}</li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && (!applications || applications.length === 0) && profileComplete && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-foreground/50">
          {t("noApplications")}
        </div>
      )}

      {applications && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app.uuid} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
