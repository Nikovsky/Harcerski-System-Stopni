// @file: apps/web/src/app/[locale]/applications/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { apiServerFetch, ApiServerError } from "@/lib/api-server";
import { EditApplicationClient } from "@/components/instructor-application/clients/EditApplicationClient";
import { isInstructorApplicationEditable } from "@hss/schemas";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ id: string }> };

export default async function EditApplicationPage({ params }: Props) {
  const { id } = await params;

  let app: InstructorApplicationDetail;
  try {
    app = await apiServerFetch<InstructorApplicationDetail>(`instructor-applications/${id}`);
  } catch (err) {
    if (err instanceof ApiServerError && err.status === 404) notFound();
    throw err;
  }

  if (!isInstructorApplicationEditable(app.status)) {
    redirect(`/applications/${id}`);
  }

  return <EditApplicationClient initialApp={app} id={id} />;
}
