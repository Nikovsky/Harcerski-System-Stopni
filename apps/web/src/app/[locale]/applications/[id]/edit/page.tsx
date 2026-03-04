// @file: apps/web/src/app/[locale]/applications/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import {
  bffServerFetch,
  BffServerFetchError,
} from "@/app/[locale]/applications/_server/bff-fetch";
import { EditApplicationClient } from "@/components/instructor-application/clients/EditApplicationClient";
import { isInstructorApplicationEditable } from "@hss/schemas";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditApplicationPage({ params }: Props) {
  const { id, locale } = await params;

  let app: InstructorApplicationDetail;
  try {
    app = await bffServerFetch<InstructorApplicationDetail>(`instructor-applications/${id}`);
  } catch (err) {
    if (err instanceof BffServerFetchError && err.status === 404) notFound();
    throw err;
  }

  if (!isInstructorApplicationEditable(app.status)) {
    redirect(`/${locale}/applications/${id}`);
  }

  return <EditApplicationClient initialApp={app} id={id} />;
}
