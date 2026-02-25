// @file: apps/web/src/hooks/instructor-application/useUpdateApplication.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { UpdateInstructorApplication } from "@hss/schemas";

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateInstructorApplication) =>
      apiFetch(`instructor-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-application", id] });
    },
  });
}
