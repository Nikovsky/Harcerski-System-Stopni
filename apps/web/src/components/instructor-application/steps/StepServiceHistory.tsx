// @file: apps/web/src/components/instructor-application/steps/StepServiceHistory.tsx
"use client";

import { useTranslations } from "next-intl";
import { Field, StepNav } from "@/components/instructor-application/steps/shared";
import type { InstructorApplicationDetail, UpdateInstructorApplication } from "@hss/schemas";

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
  onPrev: () => void;
};

export function StepServiceHistory({ app, updateDraft, onNext, onPrev }: Props) {
  const t = useTranslations("applications");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onNext(); }}
      className="space-y-4"
    >
      <Field label={t("fields.functionsHistory")} required>
        <textarea
          name="functionsHistory"
          rows={3}
          value={app.functionsHistory ?? ""}
          onChange={(e) => updateDraft({ functionsHistory: e.target.value })}
          required
          maxLength={10000}
          className="input"
        />
      </Field>
      <Field label={t("fields.coursesHistory")} required>
        <textarea
          name="coursesHistory"
          rows={3}
          value={app.coursesHistory ?? ""}
          onChange={(e) => updateDraft({ coursesHistory: e.target.value })}
          required
          maxLength={10000}
          className="input"
        />
      </Field>
      <Field label={t("fields.campsHistory")} required>
        <textarea
          name="campsHistory"
          rows={3}
          value={app.campsHistory ?? ""}
          onChange={(e) => updateDraft({ campsHistory: e.target.value })}
          required
          maxLength={10000}
          className="input"
        />
      </Field>
      <Field label={t("fields.successes")} required>
        <textarea
          name="successes"
          rows={3}
          value={app.successes ?? ""}
          onChange={(e) => updateDraft({ successes: e.target.value })}
          required
          maxLength={10000}
          className="input"
        />
      </Field>
      <Field label={t("fields.failures")} required>
        <textarea
          name="failures"
          rows={3}
          value={app.failures ?? ""}
          onChange={(e) => updateDraft({ failures: e.target.value })}
          required
          maxLength={10000}
          className="input"
        />
      </Field>
      <StepNav onPrev={onPrev} isForm />
    </form>
  );
}
