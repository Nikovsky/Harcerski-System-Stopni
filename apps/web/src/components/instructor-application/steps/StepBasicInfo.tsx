// @file: apps/web/src/components/instructor-application/steps/StepBasicInfo.tsx
"use client";

import { useTranslations } from "next-intl";
import { degreeKey, scoutRankKey } from "@/lib/applications-i18n";
import { getFieldLabel, PROFILE_FIELDS } from "@/lib/instructor-application-fields";
import { AttachmentUpload } from "@/components/instructor-application/attachments/AttachmentUpload";
import { Field } from "@/components/instructor-application/steps/shared";
import { IA_BUTTON_PRIMARY_MD } from "@/components/instructor-application/ui/button-classnames";
import type { InstructorApplicationDetail, UpdateInstructorApplication } from "@hss/schemas";

const OPEN_TRIAL_FOR_RANK_VALUES = [
  "MLODZIK",
  "WYWIADOWCA",
  "CWIK",
  "HARCERZ_ORLI",
  "HARCERZ_RZECZYPOSPOLITEJ",
] as const;

const HUFCOWY_PRESENCE_VALUES = ["IN_PERSON", "REMOTE", "ATTACHMENT_OPINION"] as const;

function includes<const T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

type Props = {
  app: InstructorApplicationDetail;
  updateDraft: (patch: Partial<UpdateInstructorApplication>) => void;
  onNext: () => void;
};

export function StepBasicInfo({ app, updateDraft, onNext }: Props) {
  const t = useTranslations("applications");
  const profile = app.candidateProfile;
  const hufcowyPresence = app.hufcowyPresence ?? "";

  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter((a) => a.uuid === app.hufcowyPresenceAttachmentUuid)
    : [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
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
        <input
          name="teamFunction"
          value={app.teamFunction ?? ""}
          onChange={(e) => updateDraft({ teamFunction: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("fields.hufiecFunction")}>
        <input
          name="hufiecFunction"
          value={app.hufiecFunction ?? ""}
          onChange={(e) => updateDraft({ hufiecFunction: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("fields.plannedFinishAt")}>
        <input
          name="plannedFinishAt"
          type="date"
          value={app.plannedFinishAt ?? ""}
          onChange={(e) => updateDraft({ plannedFinishAt: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("fields.openTrialForRank")}>
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
          className="input"
        >
          <option value="">—</option>
          <option value="HARCERZ_ORLI">{t("scoutRank.HARCERZ_ORLI")}</option>
          <option value="HARCERZ_RZECZYPOSPOLITEJ">{t("scoutRank.HARCERZ_RZECZYPOSPOLITEJ")}</option>
        </select>
      </Field>
      <Field label={t("fields.openTrialDeadline")}>
        <input
          name="openTrialDeadline"
          type="date"
          value={app.openTrialDeadline ?? ""}
          onChange={(e) => updateDraft({ openTrialDeadline: e.target.value })}
          className="input"
        />
      </Field>
      <Field label={t("fields.hufcowyPresence")}>
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
          className="input"
        >
          <option value="">—</option>
          <option value="IN_PERSON">{t("presence.IN_PERSON")}</option>
          <option value="REMOTE">{t("presence.REMOTE")}</option>
          <option value="ATTACHMENT_OPINION">{t("presence.ATTACHMENT_OPINION")}</option>
        </select>
      </Field>
      {hufcowyPresence === "ATTACHMENT_OPINION" && (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm font-medium text-foreground/80">
            {t("fields.hufcowyPresenceAttachment")}
          </p>
          <AttachmentUpload
            applicationId={app.uuid}
            attachments={hufcowyAttachments}
            isHufcowyPresence
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
