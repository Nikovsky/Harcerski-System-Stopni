// @file: apps/web/src/components/instructor-application/steps/StepBasicInfo.tsx
"use client";

import { useTranslations } from "next-intl";
import { degreeKey, scoutRankKey } from "@/lib/applications-i18n";
import { getFieldLabel, PROFILE_FIELDS } from "@/lib/instructor-application-fields";
import { AttachmentUpload } from "@/components/instructor-application/attachments/AttachmentUpload";
import {
  PRESENCE_VALUES as HUFCOWY_PRESENCE_VALUES,
  SCOUT_RANK_VALUES as OPEN_TRIAL_FOR_RANK_VALUES,
} from "@/components/instructor-application/instructor-application.constants";
import { Field } from "@/components/instructor-application/steps/shared";
import { IA_BUTTON_PRIMARY_MD } from "@/components/instructor-application/ui/button-classnames";
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

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

const LOCKED_CONTROL_CLASSNAME =
  "disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-muted/40 disabled:text-foreground/70 disabled:opacity-100";

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
  canEditField: (field: EditableInstructorApplicationField) => boolean;
  canEditHufcowyPresenceAttachment?: boolean;
  fieldChangeByField?: Partial<Record<EditableInstructorApplicationField, ChangeSummary>>;
  hufcowyPresenceAttachmentChangeSummary?: ChangeSummary;
  onHufcowyPresenceAttachmentsChange?: (
    attachments: InstructorApplicationDetail["attachments"],
  ) => void;
  onBeforeHufcowyPresenceUpload?: () => Promise<void>;
};

export function StepBasicInfo({
  app,
  updateDraft,
  onNext,
  canEditField,
  canEditHufcowyPresenceAttachment,
  fieldChangeByField,
  hufcowyPresenceAttachmentChangeSummary,
  onHufcowyPresenceAttachmentsChange,
  onBeforeHufcowyPresenceUpload,
}: Props) {
  const t = useTranslations("applications");
  const profile = app.candidateProfile;
  const hufcowyPresence = app.hufcowyPresence ?? "";
  const teamFunctionEditable = canEditField("teamFunction");
  const hufiecFunctionEditable = canEditField("hufiecFunction");
  const plannedFinishAtEditable = canEditField("plannedFinishAt");
  const openTrialForRankEditable = canEditField("openTrialForRank");
  const openTrialDeadlineEditable = canEditField("openTrialDeadline");
  const hufcowyPresenceEditable = canEditField("hufcowyPresence");
  const hufcowyPresenceAttachmentEditable =
    canEditHufcowyPresenceAttachment ?? hufcowyPresenceEditable;

  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter((a) => a.uuid === app.hufcowyPresenceAttachmentUuid)
    : [];

  function combineSummaries(
    ...summaries: Array<ChangeSummary | undefined>
  ): ChangeSummary | undefined {
    const definedSummaries = summaries.filter(
      (summary): summary is ChangeSummary => !!summary,
    );

    if (definedSummaries.length === 0) {
      return undefined;
    }

    if (definedSummaries.length === 1) {
      return definedSummaries[0];
    }

    return {
      isChanged: definedSummaries.every((summary) => summary.isChanged),
    };
  }

  function getFieldSummary(field: EditableInstructorApplicationField): ChangeSummary | undefined {
    if (field !== "hufcowyPresence") {
      return fieldChangeByField?.[field];
    }

    return combineSummaries(
      fieldChangeByField?.hufcowyPresence,
      hufcowyPresenceAttachmentChangeSummary,
    );
  }

  function renderFieldChangeStatus(field: EditableInstructorApplicationField) {
    const changeSummary = getFieldSummary(field);

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
    return <InlineChangeSummary changeSummary={getFieldSummary(field)} />;
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onNext(); }}
      className="scroll-mt-32 space-y-6 outline-none"
      data-fix-target="section:BASIC_INFO"
      tabIndex={-1}
    >
      {profile && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground/70">
            {t("sections.candidateProfileData")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => {
              const value = profile[field];
              const translatedScoutRankKey = field === "scoutRank" && typeof value === "string" ? scoutRankKey(value) : null;
              const translatedDegreeKey = field === "instructorRank" && typeof value === "string" ? degreeKey(value) : null;

              return (
                <div key={field}>
                  <span className="block text-xs text-foreground/50">
                    {getFieldLabel(field, t)}
                  </span>
                  <span className="text-sm">
                    {translatedScoutRankKey
                      ? t(translatedScoutRankKey)
                      : translatedDegreeKey
                        ? t(translatedDegreeKey)
                        : (value ?? "—")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Field label={t("fields.teamFunction")}>
        {renderFieldChangeStatus("teamFunction")}
        <div
          data-fix-target="field:teamFunction"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="teamFunction"
            value={app.teamFunction ?? ""}
            onChange={(e) => updateDraft({ teamFunction: e.target.value })}
            disabled={!teamFunctionEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("teamFunction")}
      </Field>
      <Field label={t("fields.hufiecFunction")}>
        {renderFieldChangeStatus("hufiecFunction")}
        <div
          data-fix-target="field:hufiecFunction"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="hufiecFunction"
            value={app.hufiecFunction ?? ""}
            onChange={(e) => updateDraft({ hufiecFunction: e.target.value })}
            disabled={!hufiecFunctionEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("hufiecFunction")}
      </Field>
      <Field label={t("fields.plannedFinishAt")}>
        {renderFieldChangeStatus("plannedFinishAt")}
        <div
          data-fix-target="field:plannedFinishAt"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="plannedFinishAt"
            type="date"
            value={app.plannedFinishAt ?? ""}
            onChange={(e) => updateDraft({ plannedFinishAt: e.target.value })}
            disabled={!plannedFinishAtEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("plannedFinishAt")}
      </Field>
      <Field label={t("fields.openTrialForRank")}>
        {renderFieldChangeStatus("openTrialForRank")}
        <div
          data-fix-target="field:openTrialForRank"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <select
            name="openTrialForRank"
            value={app.openTrialForRank ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              updateDraft({
                openTrialForRank:
                  value.length > 0 && includes(OPEN_TRIAL_FOR_RANK_VALUES, value)
                    ? value
                    : undefined,
              });
            }}
            disabled={!openTrialForRankEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          >
            <option value="">—</option>
            <option value="HARCERZ_ORLI">{t("scoutRank.HARCERZ_ORLI")}</option>
            <option value="HARCERZ_RZECZYPOSPOLITEJ">{t("scoutRank.HARCERZ_RZECZYPOSPOLITEJ")}</option>
          </select>
        </div>
        {renderFieldChangeSummary("openTrialForRank")}
      </Field>
      <Field label={t("fields.openTrialDeadline")}>
        {renderFieldChangeStatus("openTrialDeadline")}
        <div
          data-fix-target="field:openTrialDeadline"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <input
            name="openTrialDeadline"
            type="date"
            value={app.openTrialDeadline ?? ""}
            onChange={(e) => updateDraft({ openTrialDeadline: e.target.value })}
            disabled={!openTrialDeadlineEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          />
        </div>
        {renderFieldChangeSummary("openTrialDeadline")}
      </Field>
      <Field label={t("fields.hufcowyPresence")}>
        {renderFieldChangeStatus("hufcowyPresence")}
        <div
          data-fix-target="field:hufcowyPresence"
          tabIndex={-1}
          className="scroll-mt-32 rounded-md outline-none"
        >
          <select
            name="hufcowyPresence"
            value={hufcowyPresence}
            onChange={(e) => {
              const value = e.target.value;
              updateDraft({
                hufcowyPresence:
                  value.length > 0 && includes(HUFCOWY_PRESENCE_VALUES, value)
                    ? value
                    : undefined,
              });
            }}
            disabled={!hufcowyPresenceEditable}
            className={`input ${LOCKED_CONTROL_CLASSNAME}`}
          >
            <option value="">—</option>
            <option value="IN_PERSON">{t("presence.IN_PERSON")}</option>
            <option value="REMOTE">{t("presence.REMOTE")}</option>
            <option value="ATTACHMENT_OPINION">{t("presence.ATTACHMENT_OPINION")}</option>
          </select>
        </div>
        {renderFieldChangeSummary("hufcowyPresence")}
      </Field>
      {hufcowyPresence === "ATTACHMENT_OPINION" && (
        <div
          data-field="hufcowyPresenceAttachment"
          tabIndex={-1}
          className="rounded-lg border border-border p-4 outline-none"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground/80">
              {t("fields.hufcowyPresenceAttachment")}
            </p>
            <ChangeStatusBadge changeSummary={hufcowyPresenceAttachmentChangeSummary} />
          </div>
          <InlineChangeSummary changeSummary={hufcowyPresenceAttachmentChangeSummary} />
          <AttachmentUpload
            applicationId={app.uuid}
            attachments={hufcowyAttachments}
            readOnly={!hufcowyPresenceAttachmentEditable}
            isHufcowyPresence
            onAttachmentsChange={onHufcowyPresenceAttachmentsChange}
            onBeforeUpload={onBeforeHufcowyPresenceUpload}
          />
        </div>
      )}
      <div className="flex justify-end">
        <button type="submit" className={IA_BUTTON_PRIMARY_MD}>
          {t("actions.next")}
        </button>
      </div>
    </form>
  );
}
