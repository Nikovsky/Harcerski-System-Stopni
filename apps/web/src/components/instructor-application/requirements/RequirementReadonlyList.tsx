// @file: apps/web/src/components/instructor-application/requirements/RequirementReadonlyList.tsx
"use client";

import { useTranslations } from "next-intl";
import { AttachmentReadonlyList } from "@/components/instructor-application/attachments/AttachmentReadonlyList";
import { buildRequirementFormLayout } from "@/components/instructor-application/requirements/requirement-form-layout";
import type { GroupDefinition } from "@/components/instructor-application/requirements/requirement-form.types";
import type { RequirementRowResponse } from "@hss/schemas";

type Props = {
  applicationId: string;
  requirements: RequirementRowResponse[];
  groupDefinitions?: GroupDefinition[];
};

function normalizeReadonlyLabel(value: string): string {
  return value.replace(/\.\.\.$/, "").replace(/\s*\*$/, "").trim();
}

function displayValueOrDash(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "—";
}

function RequirementReadonlyCard({
  applicationId,
  requirement,
}: {
  applicationId: string;
  requirement: RequirementRowResponse;
}) {
  const t = useTranslations("applications");
  const statusLabel =
    requirement.state === "DONE"
      ? t("requirementState.DONE")
      : t("requirementState.PLANNED");
  const actionLabel = normalizeReadonlyLabel(
    t("requirements.actionPlaceholder"),
  );
  const verificationLabel = normalizeReadonlyLabel(
    requirement.state === "PLANNED"
      ? t("requirements.futureProofLabel")
      : t("requirements.verificationPlaceholder"),
  );
  const attachments = requirement.attachments ?? [];

  return (
    <div className="rounded border border-border/50 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{requirement.definition.code}.</span>{" "}
          {requirement.definition.description}
        </p>
        <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
          {statusLabel}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/60">
            {actionLabel}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
            {displayValueOrDash(requirement.actionDescription)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/60">
            {verificationLabel}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
            {displayValueOrDash(requirement.verificationText)}
          </p>
        </div>

        {attachments.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-foreground/60">
              {t("steps.attachments")}
            </p>
            <AttachmentReadonlyList
              applicationId={applicationId}
              attachments={attachments}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RequirementReadonlyList({
  applicationId,
  requirements,
  groupDefinitions = [],
}: Props) {
  const { childrenByParent, entries } = buildRequirementFormLayout(
    requirements,
    groupDefinitions,
  );

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        if (entry.kind === "group") {
          const children = (childrenByParent[entry.def.uuid] ?? []).sort(
            (left, right) =>
              left.definition.sortOrder - right.definition.sortOrder,
          );

          return (
            <div
              key={entry.def.uuid}
              className="rounded-lg border border-border p-3"
            >
              <h4 className="mb-3 text-sm font-semibold">
                {entry.def.code}. {entry.def.description}
              </h4>
              <div className="space-y-3 pl-4">
                {children.map((requirement) => (
                  <RequirementReadonlyCard
                    key={requirement.uuid}
                    applicationId={applicationId}
                    requirement={requirement}
                  />
                ))}
              </div>
            </div>
          );
        }

        return (
          <RequirementReadonlyCard
            key={entry.req.uuid}
            applicationId={applicationId}
            requirement={entry.req}
          />
        );
      })}
    </div>
  );
}
