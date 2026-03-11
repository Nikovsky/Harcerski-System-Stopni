// @file: apps/web/src/components/instructor-application/steps/StepServiceHistory.tsx
"use client";

import { useTranslations } from "next-intl";
import { Field, StepNav } from "@/components/instructor-application/steps/shared";
import {
  ChangeStatusBadge,
  InlineChangeSummary,
  type ChangeSummary,
} from "@/components/instructor-application/ui/ChangeSummary";
import type {
  EditableInstructorApplicationField,
  InstructorApplicationDetail,
  UpdateInstructorApplication,
} from "@hss/schemas";

const LOCKED_CONTROL_CLASSNAME =
  "disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100";

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
  onPrev: () => void;
  canEditField: (field: EditableInstructorApplicationField) => boolean;
  fieldChangeByField?: Partial<Record<EditableInstructorApplicationField, ChangeSummary>>;
};

export function StepServiceHistory({
  app,
  updateDraft,
  onNext,
  onPrev,
  canEditField,
  fieldChangeByField,
}: Props) {
  const t = useTranslations("applications");
  const functionsHistoryEditable = canEditField("functionsHistory");
  const coursesHistoryEditable = canEditField("coursesHistory");
  const campsHistoryEditable = canEditField("campsHistory");
  const successesEditable = canEditField("successes");
  const failuresEditable = canEditField("failures");

  function renderFieldChangeStatus(field: EditableInstructorApplicationField) {
    const changeSummary = fieldChangeByField?.[field];

    if (!changeSummary) {
      return null;
    }

    return (
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ChangeStatusBadge changeSummary={changeSummary} />
      </div>
    );
  }

  function renderFieldChangeSummary(field: EditableInstructorApplicationField) {
    return <InlineChangeSummary changeSummary={fieldChangeByField?.[field]} />;
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onNext(); }}
      className="scroll-mt-32 space-y-4 outline-none"
      data-fix-target="section:SERVICE_HISTORY"
      tabIndex={-1}
    >
      <Field label={t("fields.functionsHistory")} required={functionsHistoryEditable}>
        {renderFieldChangeStatus("functionsHistory")}
        <div
          data-fix-target="field:functionsHistory"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <textarea
            name="functionsHistory"
            rows={3}
            value={app.functionsHistory ?? ""}
            onChange={(e) => updateDraft({ functionsHistory: e.target.value })}
            disabled={!functionsHistoryEditable}
            required={functionsHistoryEditable}
            maxLength={10000}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("functionsHistory")}
      </Field>
      <Field label={t("fields.coursesHistory")} required={coursesHistoryEditable}>
        {renderFieldChangeStatus("coursesHistory")}
        <div
          data-fix-target="field:coursesHistory"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <textarea
            name="coursesHistory"
            rows={3}
            value={app.coursesHistory ?? ""}
            onChange={(e) => updateDraft({ coursesHistory: e.target.value })}
            disabled={!coursesHistoryEditable}
            required={coursesHistoryEditable}
            maxLength={10000}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("coursesHistory")}
      </Field>
      <Field label={t("fields.campsHistory")} required={campsHistoryEditable}>
        {renderFieldChangeStatus("campsHistory")}
        <div
          data-fix-target="field:campsHistory"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <textarea
            name="campsHistory"
            rows={3}
            value={app.campsHistory ?? ""}
            onChange={(e) => updateDraft({ campsHistory: e.target.value })}
            disabled={!campsHistoryEditable}
            required={campsHistoryEditable}
            maxLength={10000}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("campsHistory")}
      </Field>
      <Field label={t("fields.successes")} required={successesEditable}>
        {renderFieldChangeStatus("successes")}
        <div
          data-fix-target="field:successes"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <textarea
            name="successes"
            rows={3}
            value={app.successes ?? ""}
            onChange={(e) => updateDraft({ successes: e.target.value })}
            disabled={!successesEditable}
            required={successesEditable}
            maxLength={10000}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("successes")}
      </Field>
      <Field label={t("fields.failures")} required={failuresEditable}>
        {renderFieldChangeStatus("failures")}
        <div
          data-fix-target="field:failures"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <textarea
            name="failures"
            rows={3}
            value={app.failures ?? ""}
            onChange={(e) => updateDraft({ failures: e.target.value })}
            disabled={!failuresEditable}
            required={failuresEditable}
            maxLength={10000}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("failures")}
      </Field>
      <StepNav onPrev={onPrev} isForm />
    </form>
  );
}
