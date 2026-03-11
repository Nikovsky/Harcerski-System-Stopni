// @file: apps/web/src/components/instructor-application/steps/StepSupervisor.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, StepNav } from "@/components/instructor-application/steps/shared";
import { INSTRUCTOR_RANK_VALUES as SUPERVISOR_INSTRUCTOR_RANK_VALUES } from "@/components/instructor-application/instructor-application.constants";
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

const SUPERVISOR_FUNCTION_PRESETS = ["DRUZYNOWY", "OPIEKUN_DRUZYNY"] as const;
const LOCKED_CONTROL_CLASSNAME =
  "disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100";

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
  onPrev: () => void;
  canEditField: (field: EditableInstructorApplicationField) => boolean;
  fieldChangeByField?: Partial<Record<EditableInstructorApplicationField, ChangeSummary>>;
};

export function StepSupervisor({
  app,
  updateDraft,
  onNext,
  onPrev,
  canEditField,
  fieldChangeByField,
}: Props) {
  const t = useTranslations("applications");
  const supervisorFirstNameEditable = canEditField("supervisorFirstName");
  const supervisorSurnameEditable = canEditField("supervisorSurname");
  const supervisorInstructorRankEditable = canEditField("supervisorInstructorRank");
  const supervisorInstructorFunctionEditable = canEditField("supervisorInstructorFunction");

  const initialFunction = app.supervisorInstructorFunction ?? "";
  const isPreset = (SUPERVISOR_FUNCTION_PRESETS as readonly string[]).includes(initialFunction);
  const [functionSelect, setFunctionSelect] = useState<string>(isPreset ? initialFunction : (initialFunction ? "__other" : ""));
  const [functionOther, setFunctionOther] = useState<string>(isPreset || !initialFunction ? "" : initialFunction);

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
      data-fix-target="section:SUPERVISOR"
      tabIndex={-1}
    >
      <Field label={t("fields.supervisorFirstName")} required={supervisorFirstNameEditable}>
        {renderFieldChangeStatus("supervisorFirstName")}
        <div
          data-fix-target="field:supervisorFirstName"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="supervisorFirstName"
            value={app.supervisorFirstName ?? ""}
            onChange={(e) => updateDraft({ supervisorFirstName: e.target.value })}
            disabled={!supervisorFirstNameEditable}
            required={supervisorFirstNameEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("supervisorFirstName")}
      </Field>
      <Field label={t("fields.supervisorSurname")} required={supervisorSurnameEditable}>
        {renderFieldChangeStatus("supervisorSurname")}
        <div
          data-fix-target="field:supervisorSurname"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="supervisorSurname"
            value={app.supervisorSurname ?? ""}
            onChange={(e) => updateDraft({ supervisorSurname: e.target.value })}
            disabled={!supervisorSurnameEditable}
            required={supervisorSurnameEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("supervisorSurname")}
      </Field>
      <Field
        label={t("fields.supervisorInstructorRank")}
        required={supervisorInstructorRankEditable}
      >
        {renderFieldChangeStatus("supervisorInstructorRank")}
        <div
          data-fix-target="field:supervisorInstructorRank"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <select
            name="supervisorInstructorRank"
            value={app.supervisorInstructorRank ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              updateDraft({
                supervisorInstructorRank:
                  value.length > 0 && includes(SUPERVISOR_INSTRUCTOR_RANK_VALUES, value)
                    ? value
                    : undefined,
              });
            }}
            disabled={!supervisorInstructorRankEditable}
            required={supervisorInstructorRankEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          >
            <option value="">—</option>
            <option value="PRZEWODNIK">{t("degree.PRZEWODNIK")}</option>
            <option value="PODHARCMISTRZ_OTWARTA_PROBA">{t("degree.PODHARCMISTRZ_OTWARTA_PROBA")}</option>
            <option value="PODHARCMISTRZ">{t("degree.PODHARCMISTRZ")}</option>
            <option value="HARCMISTRZ">{t("degree.HARCMISTRZ")}</option>
          </select>
        </div>
        {renderFieldChangeSummary("supervisorInstructorRank")}
      </Field>
      <Field
        label={t("fields.supervisorInstructorFunction")}
        required={supervisorInstructorFunctionEditable}
      >
        {renderFieldChangeStatus("supervisorInstructorFunction")}
        <div
          data-fix-target="field:supervisorInstructorFunction"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <select
            value={functionSelect}
            onChange={(e) => {
              const selectedValue = e.target.value;
              setFunctionSelect(selectedValue);
              const nextFunction = selectedValue === "__other" ? functionOther : selectedValue;
              updateDraft({ supervisorInstructorFunction: nextFunction });
            }}
            disabled={!supervisorInstructorFunctionEditable}
            required={supervisorInstructorFunctionEditable && functionSelect !== "__other"}
            className={`input mb-2 ${LOCKED_CONTROL_CLASSNAME}`}
          >
            <option value="">—</option>
            {SUPERVISOR_FUNCTION_PRESETS.map((p) => (
              <option key={p} value={p}>{t(`supervisorFunction.${p === "DRUZYNOWY" ? "druzynowy" : "opiekunDruzyny"}`)}</option>
            ))}
            <option value="__other">{t("supervisorFunction.other")}</option>
          </select>
          {functionSelect === "__other" && (
            <input
              value={functionOther}
              onChange={(e) => {
                const nextValue = e.target.value;
                setFunctionOther(nextValue);
                updateDraft({ supervisorInstructorFunction: nextValue });
              }}
              disabled={!supervisorInstructorFunctionEditable}
              placeholder={t("supervisorFunction.otherPlaceholder")}
              className={`input mt-1 ${LOCKED_CONTROL_CLASSNAME}`}
            />
          )}
        </div>
        {renderFieldChangeSummary("supervisorInstructorFunction")}
      </Field>
      <StepNav onPrev={onPrev} isForm />
    </form>
  );
}
