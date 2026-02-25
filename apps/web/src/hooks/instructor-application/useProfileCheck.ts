// @file: apps/web/src/hooks/instructor-application/useProfileCheck.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type ProfileCheck = {
  complete: boolean;
  missingFields: string[];
};

export function useProfileCheck() {
  return useQuery<ProfileCheck>({
    queryKey: ["instructor-application-profile-check"],
    queryFn: () => apiFetch("instructor-applications/profile-check"),
  });
}
