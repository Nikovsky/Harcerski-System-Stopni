// @file: apps/web/src/hooks/instructor-application/useTemplates.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { RequirementTemplateListItem } from "@hss/schemas";

export function useTemplates() {
  return useQuery<RequirementTemplateListItem[]>({
    queryKey: ["instructor-application-templates"],
    queryFn: () => apiFetch("instructor-applications/templates"),
  });
}
