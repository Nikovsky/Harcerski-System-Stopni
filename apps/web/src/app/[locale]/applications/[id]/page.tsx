// @file: apps/web/src/app/[locale]/applications/[id]/page.tsx
import { notFound } from "next/navigation";
import { apiServerFetch, ApiServerError } from "@/lib/api-server";
import { ApplicationDetailClient } from "@/components/instructor-application/clients/ApplicationDetailClient";
import Link from "next/link";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  const { locale, id } = await params;

  let app: InstructorApplicationDetail | null = null;
  let authRequired = false;
  try {
    app = await apiServerFetch<InstructorApplicationDetail>(`instructor-applications/${id}`);
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 404) notFound();
    if (
      err instanceof ApiServerError &&
      (err.status === 401 || err.status === 403)
    ) {
      authRequired = true;
    } else {
      throw err;
    }
  }

  if (authRequired) {
    const callbackUrl = encodeURIComponent(`/${locale}/applications/${id}`);
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-neutral-200/70 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <p className="text-sm text-neutral-800 dark:text-neutral-200">
            Authentication required to view this application.
          </p>
          <Link
            href={`/api/auth/login?callbackUrl=${callbackUrl}`}
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  if (!app) notFound();
  return <ApplicationDetailClient app={app} id={id} />;
}
