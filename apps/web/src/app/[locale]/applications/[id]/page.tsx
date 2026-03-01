// @file: apps/web/src/app/[locale]/applications/[id]/page.tsx
import { notFound } from "next/navigation";
import { apiServerFetch, ApiServerError } from "@/lib/api-server";
import { ApplicationDetailClient } from "@/components/instructor-application/clients/ApplicationDetailClient";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ id: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;

  let app: InstructorApplicationDetail;
  try {
    app = await apiServerFetch<InstructorApplicationDetail>(`instructor-applications/${id}`);
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 404) notFound();
    throw err;
  }

  return <ApplicationDetailClient app={app} id={id} />;
}
