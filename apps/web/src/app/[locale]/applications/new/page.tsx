// @file: apps/web/src/app/[locale]/applications/new/page.tsx
import { bffServerFetch } from "@/app/[locale]/applications/_server/bff-fetch";
import { NewApplicationClient } from "@/components/instructor-application/clients/NewApplicationClient";
import type { RequirementTemplateListItem } from "@hss/schemas";

export default async function NewApplicationPage() {
  const templates = await bffServerFetch<RequirementTemplateListItem[]>(
    "instructor-applications/templates",
  );

  return <NewApplicationClient templates={templates} />;
}
