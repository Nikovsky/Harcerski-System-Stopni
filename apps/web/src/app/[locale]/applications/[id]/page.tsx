// @file: apps/web/src/app/[locale]/applications/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  bffServerFetchValidated,
  BffServerFetchError,
} from "@/app/[locale]/applications/_server/bff-fetch";
import { ApplicationDetailClient } from "@/components/instructor-application/clients/ApplicationDetailClient";
import { instructorApplicationDetailSchema } from "@hss/schemas";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ id: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;

  let app: InstructorApplicationDetail;
  try {
    app = await bffServerFetchValidated(
      instructorApplicationDetailSchema,
      `instructor-applications/${id}`,
    );
  } catch (err) {
    if (err instanceof BffServerFetchError && err.status === 404) notFound();
    throw err;
  }

  return <ApplicationDetailClient app={app} id={id} />;
}
