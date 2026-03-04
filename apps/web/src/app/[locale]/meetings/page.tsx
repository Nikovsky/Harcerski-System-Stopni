// @file: apps/web/src/app/[locale]/meetings/page.tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { MeetingListItem } from "@hss/schemas";

import {
  BffServerFetchError,
  bffServerFetch,
} from "@/app/[locale]/meetings/_server/bff-fetch";
import { MeetingCalendarView } from "@/components/meetings/MeetingCalendarView";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MeetingsPage({ params }: Props) {
  const { locale } = await params;

  const t = await getTranslations("meetings");

  let meetings: MeetingListItem[] = [];
  let fetchError: string | null = null;

  try {
    meetings = await bffServerFetch<MeetingListItem[]>("meetings?limit=60");
  } catch (error) {
    if (error instanceof BffServerFetchError) {
      fetchError = t("errors.loadFailed");
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("subtitle")}</p>
      </header>

      {fetchError ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{fetchError}</p>
          <Link
            href={`/${locale}/meetings`}
            className="mt-3 inline-flex rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium hover:bg-rose-100"
          >
            {t("actions.retry")}
          </Link>
        </div>
      ) : (
        <MeetingCalendarView meetings={meetings} />
      )}
    </div>
  );
}
