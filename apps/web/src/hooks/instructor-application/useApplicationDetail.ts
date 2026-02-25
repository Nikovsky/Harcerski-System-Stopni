// @file: apps/web/src/hooks/instructor-application/useApplicationDetail.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { InstructorApplicationDetail } from "@hss/schemas";

export function useApplicationDetail(id: string) {
  return useQuery<InstructorApplicationDetail>({
    queryKey: ["instructor-application", id],
    queryFn: () => apiFetch(`instructor-applications/${id}`),
    enabled: !!id,
  });
}
