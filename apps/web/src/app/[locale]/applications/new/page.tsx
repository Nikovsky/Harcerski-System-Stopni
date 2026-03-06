// @file: apps/web/src/app/[locale]/applications/new/page.tsx
import { z } from "zod";
import { bffServerFetchValidated } from "@/app/[locale]/applications/_server/bff-fetch";
import { NewApplicationClient } from "@/components/instructor-application/clients/NewApplicationClient";
import { requirementTemplateListItemSchema } from "@hss/schemas";

export default async function NewApplicationPage() {
  const templates = await bffServerFetchValidated(
    z.array(requirementTemplateListItemSchema),
    "instructor-applications/templates",
  );

  return <NewApplicationClient templates={templates} />;
}
