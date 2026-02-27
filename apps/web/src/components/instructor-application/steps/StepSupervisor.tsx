// @file: apps/web/src/components/instructor-application/steps/StepSupervisor.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, StepNav } from "@/components/instructor-application/steps/shared";
import type { InstructorApplicationDetail, UpdateInstructorApplication } from "@hss/schemas";

const SUPERVISOR_FUNCTION_PRESETS = ["DRUZYNOWY", "OPIEKUN_DRUZYNY"] as const;
const SUPERVISOR_INSTRUCTOR_RANK_VALUES = [
  "PRZEWODNIK",
  "PODHARCMISTRZ_OTWARTA_PROBA",
  "PODHARCMISTRZ",
  "HARCMISTRZ",
] as const;

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function StepSupervisor({ app, updateDraft, onNext, onPrev }: Props) {
  const t = useTranslations("applications");

  const initialFunction = app.supervisorInstructorFunction ?? "";
  const isPreset = (SUPERVISOR_FUNCTION_PRESETS as readonly string[]).includes(initialFunction);
  const [functionSelect, setFunctionSelect] = useState<string>(isPreset ? initialFunction : (initialFunction ? "__other" : ""));
  const [functionOther, setFunctionOther] = useState<string>(isPreset || !initialFunction ? "" : initialFunction);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onNext(); }}
      className="space-y-4"
    >
      <Field label={t("fields.supervisorFirstName")} required>
        <input
          name="supervisorFirstName"
          value={app.supervisorFirstName ?? ""}
          onChange={(e) => updateDraft({ supervisorFirstName: e.target.value })}
          required
          className="input"
        />
      </Field>
      <Field label={t("fields.supervisorSurname")} required>
        <input
          name="supervisorSurname"
          value={app.supervisorSurname ?? ""}
          onChange={(e) => updateDraft({ supervisorSurname: e.target.value })}
          required
          className="input"
        />
      </Field>
      <Field label={t("fields.supervisorInstructorRank")} required>
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
          required
          className="input"
        >
          <option value="">—</option>
          <option value="PRZEWODNIK">{t("degree.PRZEWODNIK")}</option>
          <option value="PODHARCMISTRZ_OTWARTA_PROBA">{t("degree.PODHARCMISTRZ_OTWARTA_PROBA")}</option>
          <option value="PODHARCMISTRZ">{t("degree.PODHARCMISTRZ")}</option>
          <option value="HARCMISTRZ">{t("degree.HARCMISTRZ")}</option>
        </select>
      </Field>
      <Field label={t("fields.supervisorInstructorFunction")} required>
        <select
          value={functionSelect}
          onChange={(e) => {
            const selectedValue = e.target.value;
            setFunctionSelect(selectedValue);
            const nextFunction = selectedValue === "__other" ? functionOther : selectedValue;
            updateDraft({ supervisorInstructorFunction: nextFunction });
          }}
          required={functionSelect !== "__other"}
          className="input mb-2"
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
            placeholder={t("supervisorFunction.otherPlaceholder")}
            className="input mt-1"
          />
        )}
      </Field>
      <StepNav onPrev={onPrev} isForm />
    </form>
  );
}
