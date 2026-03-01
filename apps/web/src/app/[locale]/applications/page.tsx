// @file: apps/web/src/app/[locale]/applications/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ApiServerError, apiServerFetch } from "@/lib/api-server";
import { ApplicationCard } from "@/components/instructor-application/ui/ApplicationCard";
import { IA_BUTTON_PRIMARY_MD } from "@/components/instructor-application/ui/button-classnames";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import type { InstructorApplicationListItem } from "@hss/schemas";

type ProfileCheck = {
  complete: boolean;
  missingFields: string[];
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ApplicationsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("applications");

  let applications: InstructorApplicationListItem[];
  let profile: ProfileCheck;
  let authRequired = false;
  try {
    [applications, profile] = await Promise.all([
      apiServerFetch<InstructorApplicationListItem[]>("instructor-applications"),
      apiServerFetch<ProfileCheck>("instructor-applications/profile-check"),
    ]);
  } catch (err) {
    if (
      err instanceof ApiServerError &&
      (err.status === 401 || err.status === 403)
    ) {
      authRequired = true;
      applications = [];
      profile = { complete: false, missingFields: [] };
    } else {
      throw err;
    }
  }

  if (authRequired) {
    const callbackUrl = encodeURIComponent(`/${locale}/applications`);
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            Authentication required to access applications.
          </p>
          <Link
            href={`/api/auth/login?callbackUrl=${callbackUrl}`}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const profileComplete = profile.complete;
  const missingFields = profile.missingFields;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {profileComplete ? (
          <Link
            href="/applications/new"
            className={`${IA_BUTTON_PRIMARY_MD} font-medium`}
          >
            {t("newApplication")}
          </Link>
        ) : (
          <span
            className="cursor-not-allowed rounded-md bg-primary/40 px-4 py-2 text-sm font-medium text-primary-foreground/60"
            title={t("profileIncomplete.completeProfileInDashboard")}
          >
            {t("newApplication")}
          </span>
        )}
      </div>

      {!profileComplete && (
        <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30">
          <p className="mb-2 font-medium text-orange-800 dark:text-orange-300">
            {t("profileIncomplete.prefix")} {" "}
            <Link href="/dashboard" className="underline hover:no-underline">
              {t("profileIncomplete.dashboard")}
            </Link>
            :
          </p>
          <ul className="ml-4 list-disc text-sm text-orange-700 dark:text-orange-400">
            {missingFields.map((field) => (
              <li key={field}>{getFieldLabel(field, t)}</li>
            ))}
          </ul>
        </div>
      )}

      {applications.length === 0 && profileComplete && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-foreground/50">
          {t("noApplications")}
        </div>
      )}

      {applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app.uuid} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
