// @file: apps/web/src/app/[locale]/applications/new/page.tsx
import { apiServerFetch } from "@/lib/api-server";
import { NewApplicationClient } from "@/components/instructor-application/clients/NewApplicationClient";
import type { RequirementTemplateListItem } from "@hss/schemas";

export default async function NewApplicationPage() {
  const templates = await apiServerFetch<RequirementTemplateListItem[]>(
    "instructor-applications/templates",
  );

  return <NewApplicationClient templates={templates} />;
}
