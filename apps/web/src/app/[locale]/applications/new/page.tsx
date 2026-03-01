// @file: apps/web/src/app/[locale]/applications/new/page.tsx
import { ApiServerError, apiServerFetch } from "@/lib/api-server";
import { NewApplicationClient } from "@/components/instructor-application/clients/NewApplicationClient";
import Link from "next/link";
import type { RequirementTemplateListItem } from "@hss/schemas";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewApplicationPage({ params }: Props) {
  const { locale } = await params;

  let templates: RequirementTemplateListItem[];
  let authRequired = false;
  try {
    templates = await apiServerFetch<RequirementTemplateListItem[]>(
      "instructor-applications/templates",
    );
  } catch (err) {
    if (
      err instanceof ApiServerError &&
      (err.status === 401 || err.status === 403)
    ) {
      authRequired = true;
      templates = [];
    } else {
      throw err;
    }
  }

  if (authRequired) {
    const callbackUrl = encodeURIComponent(`/${locale}/applications/new`);
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            Authentication required to create a new application.
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

  return <NewApplicationClient templates={templates} />;
}
