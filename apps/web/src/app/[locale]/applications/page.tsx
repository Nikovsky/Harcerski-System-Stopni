// @file: apps/web/src/app/[locale]/applications/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BffServerFetchError,
  bffServerFetchValidatedWithContext,
  resolveBffServerContext,
} from "@/server/bff-fetch";
import { ApplicationCard } from "@/components/instructor-application/ui/ApplicationCard";
import { IA_BUTTON_PRIMARY_MD } from "@/components/instructor-application/ui/button-classnames";
import { getFieldLabel } from "@/lib/instructor-application-fields";
import {
  instructorApplicationListItemSchema,
  instructorApplicationProfileCheckResponseSchema,
} from "@hss/schemas";

type Props = { params: Promise<{ locale: string }> };
type ApplicationsPageData = {
  applications: z.infer<typeof instructorApplicationListItemSchema>[];
  profile: z.infer<typeof instructorApplicationProfileCheckResponseSchema>;
};

type ServiceUnavailableCopy = {
  description: string;
  title: string;
};

function clearInvalidSessionHref(locale: string): string {
  const returnTo = `/${locale}/applications`;
  return `/api/auth/clear-invalid-session?returnTo=${encodeURIComponent(returnTo)}`;
}

function isBffAuthFailure(error: unknown): error is BffServerFetchError {
  return error instanceof BffServerFetchError && error.status === 401;
}

function isBffTransientFailure(error: unknown): error is BffServerFetchError {
  return error instanceof BffServerFetchError && (error.status === 502 || error.status === 503);
}

function getServiceUnavailableCopy(locale: string): ServiceUnavailableCopy {
  if (locale === "pl") {
    return {
      title: "Usługa jest chwilowo niedostępna.",
      description: "Nie udało się pobrać listy wniosków. Odśwież stronę za chwilę.",
    };
  }

  return {
    title: "The service is temporarily unavailable.",
    description: "We could not load the application list. Refresh the page in a moment.",
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchApplicationsPageData(): Promise<ApplicationsPageData> {
  const context = await resolveBffServerContext();
  const [applications, profile] = await Promise.all([
    bffServerFetchValidatedWithContext(
      z.array(instructorApplicationListItemSchema),
      context,
      "instructor-applications",
    ),
    bffServerFetchValidatedWithContext(
      instructorApplicationProfileCheckResponseSchema,
      context,
      "instructor-applications/profile-check",
    ),
  ]);

  return { applications, profile };
}

async function loadApplicationsPageData(
  locale: string,
): Promise<ApplicationsPageData & { serviceUnavailableCopy: ServiceUnavailableCopy | null }> {
  try {
    const result = await fetchApplicationsPageData();
    return { ...result, serviceUnavailableCopy: null };
  } catch (error) {
    if (!isBffTransientFailure(error)) {
      throw error;
    }

    await wait(350);

    try {
      const result = await fetchApplicationsPageData();
      return { ...result, serviceUnavailableCopy: null };
    } catch (retryError) {
      if (!isBffTransientFailure(retryError)) {
        throw retryError;
      }

      return {
        applications: [],
        profile: {
          complete: false,
          missingFields: [],
        },
        serviceUnavailableCopy: getServiceUnavailableCopy(locale),
      };
    }
  }
}

export default async function ApplicationsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("applications");

  let applications: z.infer<typeof instructorApplicationListItemSchema>[];
  let profile: z.infer<typeof instructorApplicationProfileCheckResponseSchema>;
  let serviceUnavailableCopy: ServiceUnavailableCopy | null = null;
  try {
    ({ applications, profile, serviceUnavailableCopy } =
      await loadApplicationsPageData(locale));
  } catch (error) {
    if (isBffAuthFailure(error)) {
      redirect(clearInvalidSessionHref(locale));
    }
    throw error;
  }

  const profileComplete = serviceUnavailableCopy ? false : profile.complete;
  const missingFields = serviceUnavailableCopy ? [] : profile.missingFields;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {profileComplete ? (
          <Link
            href={`/${locale}/applications/new`}
            className={`${IA_BUTTON_PRIMARY_MD} font-medium`}
          >
            {t("newApplication")}
          </Link>
        ) : (
          <span
            className="cursor-not-allowed rounded-md bg-primary/40 px-4 py-2 text-sm font-medium text-primary-foreground/60"
            title={
              serviceUnavailableCopy?.description ??
              t("profileIncomplete.completeProfileInProfile")
            }
          >
            {t("newApplication")}
          </span>
        )}
      </div>

      {serviceUnavailableCopy && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            {serviceUnavailableCopy.title}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {serviceUnavailableCopy.description}
          </p>
        </div>
      )}

      {!serviceUnavailableCopy && !profileComplete && (
        <div className="mb-6 rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30">
          <p className="mb-2 font-medium text-orange-800 dark:text-orange-300">
            {t("profileIncomplete.prefix")} {" "}
            <Link href={`/${locale}/profile/edit`} className="underline hover:no-underline">
              {t("profileIncomplete.profile")}
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

      {applications.length === 0 && profileComplete && !serviceUnavailableCopy && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-foreground/70">
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
