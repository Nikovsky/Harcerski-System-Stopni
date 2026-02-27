// @file: apps/web/src/components/instructor-application/detail-tabs/TabBasicInfo.tsx
"use client";

import { useTranslations } from "next-intl";
import { degreeKey, presenceKey, scoutRankKey } from "@/lib/applications-i18n";
import { FieldGrid, Section, formatDate } from "@/components/instructor-application/detail-tabs/shared";
import type { InstructorApplicationDetail } from "@hss/schemas";

type Props = { app: InstructorApplicationDetail };

export function TabBasicInfo({ app }: Props) {
  const t = useTranslations("applications");
  const profile = app.candidateProfile;

  const profileScoutRankKey = profile.scoutRank ? scoutRankKey(profile.scoutRank) : null;
  const profileInstructorRankKey = profile.instructorRank ? degreeKey(profile.instructorRank) : null;
  const openTrialForRankKey = app.openTrialForRank ? scoutRankKey(app.openTrialForRank) : null;
  const hufcowyPresenceKey = app.hufcowyPresence ? presenceKey(app.hufcowyPresence) : null;

  const profileRows: { label: string; value: string | null | undefined }[] = [
    { label: t("fields.profileFullName"), value: [profile.firstName, profile.surname].filter(Boolean).join(" ") || null },
    { label: t("fields.email"), value: profile.email },
    { label: t("fields.phone"), value: profile.phone },
    { label: t("fields.birthDate"), value: formatDate(profile.birthDate) },
    { label: t("fields.hufiecCode"), value: profile.hufiecName ?? profile.hufiecCode },
    { label: t("fields.druzynaCode"), value: profile.druzynaName ?? profile.druzynaCode },
    { label: t("fields.scoutRank"), value: profile.scoutRank ? (profileScoutRankKey ? t(profileScoutRankKey) : profile.scoutRank) : null },
    { label: t("fields.scoutRankAwardedAt"), value: formatDate(profile.scoutRankAwardedAt) },
    { label: t("fields.instructorRank"), value: profile.instructorRank ? (profileInstructorRankKey ? t(profileInstructorRankKey) : profile.instructorRank) : null },
    { label: t("fields.instructorRankAwardedAt"), value: formatDate(profile.instructorRankAwardedAt) },
    { label: t("fields.inScoutingSince"), value: formatDate(profile.inScoutingSince) },
    { label: t("fields.inZhrSince"), value: formatDate(profile.inZhrSince) },
    { label: t("fields.oathDate"), value: formatDate(profile.oathDate) },
  ];

  const appRows: { label: string; value: string | null | undefined }[] = [
    { label: t("fields.plannedFinishAt"), value: formatDate(app.plannedFinishAt) },
    { label: t("fields.teamFunction"), value: app.teamFunction },
    { label: t("fields.hufiecFunction"), value: app.hufiecFunction },
    { label: t("fields.openTrialForRank"), value: app.openTrialForRank ? (openTrialForRankKey ? t(openTrialForRankKey) : app.openTrialForRank) : null },
    { label: t("fields.openTrialDeadline"), value: formatDate(app.openTrialDeadline) },
    { label: t("fields.hufcowyPresence"), value: app.hufcowyPresence ? (hufcowyPresenceKey ? t(hufcowyPresenceKey) : app.hufcowyPresence) : null },
  ];

  return (
    <div className="space-y-6">
      <Section title={t("sections.candidateProfileData")}>
        <FieldGrid rows={profileRows} />
      </Section>
      <Section title={t("sections.applicationData")}>
        <FieldGrid rows={appRows} />
        {app.hufcowyPresence === "ATTACHMENT_OPINION" && app.hufcowyPresenceAttachmentUuid && (
          <p className="mt-2 text-xs text-foreground/50">
            {t("messages.hufcowyOpinionInAttachments")}
          </p>
        )}
        {app.hufcowyPresence === "ATTACHMENT_OPINION" && !app.hufcowyPresenceAttachmentUuid && (
          <p className="mt-2 text-xs text-amber-600">
            {t("messages.hufcowyOpinionMissing")}
          </p>
        )}
      </Section>
    </div>
  );
}
