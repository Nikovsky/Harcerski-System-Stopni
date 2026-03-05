// @file: apps/web/src/components/instructor-application/requirements/RequirementForm.tsx
"use client";

import { useEffect, useRef } from "react";
import { RequirementRow } from "@/components/instructor-application/requirements/RequirementRow";
import { buildRequirementFormLayout } from "@/components/instructor-application/requirements/requirement-form-layout";
import type { FlushRegistry, RequirementFormProps } from "@/components/instructor-application/requirements/requirement-form.types";

export function RequirementForm({
  applicationId,
  degreeCode,
  requirements,
  groupDefinitions = [],
  readOnly,
  flushRef,
}: RequirementFormProps) {
  const registry: FlushRegistry = useRef(new Map());
  const { childrenByParent, entries } = buildRequirementFormLayout(requirements, groupDefinitions);

  useEffect(() => {
    if (!flushRef) return;
    const registryMap = registry.current;
    flushRef.current = async (options) => {
      const mode = options?.mode ?? "strict";
      const results = await Promise.allSettled(
        [...registryMap.values()].map((fn) => fn({ mode })),
      );
      if (mode !== "strict") {
        return;
      }
      const firstRejected = results.find((result) => result.status === "rejected");
      if (firstRejected?.status === "rejected") {
        throw firstRejected.reason;
      }
    };
    return () => {
      flushRef.current = null;
    };
  }, [flushRef]);

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        if (entry.kind === "group") {
          const children = (childrenByParent[entry.def.uuid] ?? []).sort(
            (a, b) => a.definition.sortOrder - b.definition.sortOrder,
          );
          return (
            <div key={entry.def.uuid} className="rounded-lg border border-border p-3">
              <h4 className="mb-3 text-sm font-semibold">
                {entry.def.code}. {entry.def.description}
              </h4>
              <div className="space-y-3 pl-4">
                {children.map((req) => (
                  <RequirementRow
                    key={req.uuid}
                    applicationId={applicationId}
                    degreeCode={degreeCode}
                    req={req}
                    readOnly={readOnly}
                    flushRegistry={registry}
                  />
                ))}
              </div>
            </div>
          );
        }

        return (
          <RequirementRow
            key={entry.req.uuid}
            applicationId={applicationId}
            degreeCode={degreeCode}
            req={entry.req}
            readOnly={readOnly}
            flushRegistry={registry}
          />
        );
      })}
    </div>
  );
}

