// @file: apps/web/src/app/[locale]/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  myMeetingRegistrationsResponseSchema,
  type MyMeetingRegistrationListItem,
} from "@hss/schemas";

import {
  BffServerFetchError,
  bffServerFetchValidated,
} from "@/server/bff-fetch";
import { UpcomingMeetingCard } from "@/components/meetings/UpcomingMeetingCard";

type Props = {
  params: Promise<{ locale: string }>;
};

function clearInvalidSessionHref(locale: string): string {
  const returnTo = `/${locale}/dashboard`;
  return `/api/auth/clear-invalid-session?returnTo=${encodeURIComponent(returnTo)}`;
}

function isBffAuthFailure(error: unknown): error is BffServerFetchError {
  return error instanceof BffServerFetchError && error.status === 401;
}

function isBffTransientFailure(error: unknown): error is BffServerFetchError {
  return (
    error instanceof BffServerFetchError &&
    (error.status === 502 || error.status === 503)
  );
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("common.dashboardPage");
  let nextRegistration: MyMeetingRegistrationListItem | null = null;
  let registrationLoadFailed = false;

  try {
    const response = await bffServerFetchValidated(
      myMeetingRegistrationsResponseSchema,
      "meetings/my-registrations",
    );
    nextRegistration = response.registrations[0] ?? null;
  } catch (error) {
    if (isBffAuthFailure(error)) {
      redirect(clearInvalidSessionHref(locale));
    }

    if (isBffTransientFailure(error)) {
      registrationLoadFailed = true;
    } else {
      throw error;
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm text-foreground/70">
          {t("description")}
        </p>
      </div>

      <div className="mt-6 max-w-3xl">
        <UpcomingMeetingCard
          registration={nextRegistration}
          loadFailed={registrationLoadFailed}
          mineHref={`/${locale}/meetings?view=mine`}
          listHref={`/${locale}/meetings?view=list`}
        />
      </div>
    </main>
  );
}
