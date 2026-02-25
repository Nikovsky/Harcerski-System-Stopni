// @file: apps/web/src/hooks/instructor-application/useSubmitApplication.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useSubmitApplication(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch(`instructor-applications/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-application", id] });
      qc.invalidateQueries({ queryKey: ["my-instructor-applications"] });
    },
  });
}
