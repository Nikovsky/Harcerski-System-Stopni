// @file: apps/web/src/components/instructor-application/requirements/RequirementForm.tsx
"use client";

import { useEffect, useRef } from "react";
import { RequirementRow } from "@/components/instructor-application/requirements/RequirementRow";
import { buildRequirementFormLayout } from "@/components/instructor-application/requirements/requirement-form-layout";
import { type ChangeSummary } from "@/components/instructor-application/ui/ChangeSummary";
import type {
  FlushRegistry,
  RequirementFormProps,
} from "@/components/instructor-application/requirements/requirement-form.types";

type Props = RequirementFormProps & {
  onRequirementDraftChange?: (
    requirementUuid: string,
    requirementDraft: {
      state: string;
      actionDescription: string;
      verificationText: string;
    },
  ) => void;
  changeSummaryByRequirementUuid?: Record<string, ChangeSummary>;
  attachmentChangeSummaryByRequirementUuid?: Record<string, ChangeSummary>;
  onRequirementAttachmentsChange?: (
    requirementUuid: string,
    attachments: NonNullable<RequirementFormProps["requirements"][number]["attachments"]>,
  ) => void;
  isRequirementAttachmentsReadOnly?: (requirementUuid: string) => boolean;
};

export function RequirementForm({
  applicationId,
  degreeCode,
  requirements,
  groupDefinitions = [],
  readOnly,
  isRequirementReadOnly,
  flushRef,
  onRequirementDraftChange,
  changeSummaryByRequirementUuid,
  attachmentChangeSummaryByRequirementUuid,
  onRequirementAttachmentsChange,
  isRequirementAttachmentsReadOnly,
}: Props) {
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
                    readOnly={readOnly || isRequirementReadOnly?.(req.uuid)}
                    attachmentsReadOnly={
                      readOnly || isRequirementAttachmentsReadOnly?.(req.uuid)
                    }
                    flushRegistry={registry}
                    onDraftChange={onRequirementDraftChange}
                    changeSummary={changeSummaryByRequirementUuid?.[req.uuid]}
                    attachmentChangeSummary={
                      attachmentChangeSummaryByRequirementUuid?.[req.uuid]
                    }
                    onAttachmentsChange={onRequirementAttachmentsChange}
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
            readOnly={readOnly || isRequirementReadOnly?.(entry.req.uuid)}
            attachmentsReadOnly={
              readOnly || isRequirementAttachmentsReadOnly?.(entry.req.uuid)
            }
            flushRegistry={registry}
            onDraftChange={onRequirementDraftChange}
            changeSummary={changeSummaryByRequirementUuid?.[entry.req.uuid]}
            attachmentChangeSummary={
              attachmentChangeSummaryByRequirementUuid?.[entry.req.uuid]
            }
            onAttachmentsChange={onRequirementAttachmentsChange}
          />
        );
      })}
    </div>
  );
}

