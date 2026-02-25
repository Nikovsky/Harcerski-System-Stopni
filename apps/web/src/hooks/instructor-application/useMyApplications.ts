// @file: apps/web/src/hooks/instructor-application/useMyApplications.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { InstructorApplicationListItem } from "@hss/schemas";

export function useMyApplications() {
  return useQuery<InstructorApplicationListItem[]>({
    queryKey: ["my-instructor-applications"],
    queryFn: () => apiFetch("instructor-applications"),
  });
}
