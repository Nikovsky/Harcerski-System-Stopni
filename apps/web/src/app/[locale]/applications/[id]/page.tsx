// @file: apps/web/src/app/[locale]/applications/[id]/page.tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useApplicationDetail } from "@/hooks/instructor-application/useApplicationDetail";
import { ApplicationStatusBadge } from "@/components/instructor-application/ApplicationStatusBadge";
import { RequirementForm } from "@/components/instructor-application/RequirementForm";
import { apiFetch } from "@/lib/api";
import { canPreviewInline } from "@/lib/attachment-utils";
import type { AttachmentResponse, InstructorApplicationDetail } from "@hss/schemas";

type Props = { params: Promise<{ id: string }> };

const TABS = ["basicInfo", "serviceHistory", "supervisor", "requirements", "attachments"] as const;
type Tab = (typeof TABS)[number];

export default function ApplicationDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations("applications");
  const { data: app, isLoading } = useApplicationDetail(id);
  const [tab, setTab] = useState<Tab>("basicInfo");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  if (isLoading) return <div className="py-12 text-center text-foreground/50">...</div>;
  if (!app) return <div className="py-12 text-center text-foreground/50">Not found</div>;

  const isEditable = app.status === "DRAFT" || app.status === "TO_FIX";
  const canDownloadPdf = app.status !== "DRAFT";

  async function handleDownloadPdf() {
    if (!app) return;
    setGeneratingPdf(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { InstructorApplicationPDF } = await import(
        "@/components/instructor-application/pdf/InstructorApplicationPDF"
      );
      const blob = await pdf(<InstructorApplicationPDF data={app} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `karta-proby-${app.template.degreeCode}-${app.candidateProfile.surname ?? "wniosek"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t(`degree.${app.template.degreeCode}` as any)}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <ApplicationStatusBadge status={app.status} />
            {app.lastSubmittedAt && (
              <span className="text-xs text-foreground/50">
                {t("lastSubmittedAt")}: {new Date(app.lastSubmittedAt).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {canDownloadPdf && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              {generatingPdf ? t("pdf.generatingPdf") : t("actions.downloadPdf")}
            </button>
          )}
          {isEditable && (
            <Link
              href={`/applications/${id}/edit`}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              {t("actions.edit")}
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-xs transition ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            {t(`steps.${key}` as any)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "basicInfo" && <TabBasicInfo app={app} />}
      {tab === "serviceHistory" && <TabServiceHistory app={app} />}
      {tab === "supervisor" && <TabSupervisor app={app} />}
      {tab === "requirements" && (
        <RequirementForm applicationId={id} requirements={app.requirements} readOnly />
      )}
      {tab === "attachments" && <TabAttachments app={app} applicationId={id} />}
    </div>
  );
}

// ── Tab: Informacje podstawowe ──────────────────────────────────────────────

function TabBasicInfo({ app }: { app: InstructorApplicationDetail }) {
  const t = useTranslations("applications");
  const profile = app.candidateProfile;

  const profileRows: { label: string; value: string | null | undefined }[] = [
    { label: "Imię i nazwisko", value: [profile.firstName, profile.surname].filter(Boolean).join(" ") || null },
    { label: "Email", value: profile.email },
    { label: "Telefon", value: profile.phone },
    { label: "Data urodzenia", value: formatDate(profile.birthDate) },
    { label: "Hufiec", value: profile.hufiecName ?? profile.hufiecCode },
    { label: "Drużyna", value: profile.druzynaName ?? profile.druzynaCode },
    { label: "Stopień harcerski", value: profile.scoutRank ? t(`scoutRank.${profile.scoutRank}` as any) : null },
    { label: "Data przyznania st. harc.", value: formatDate(profile.scoutRankAwardedAt) },
    { label: "Stopień instruktorski", value: profile.instructorRank ? t(`degree.${profile.instructorRank}` as any) : null },
    { label: "Data przyznania st. instr.", value: formatDate(profile.instructorRankAwardedAt) },
    { label: "W harcerstwie od", value: formatDate(profile.inScoutingSince) },
    { label: "W ZHR od", value: formatDate(profile.inZhrSince) },
    { label: "Data przyrzeczenia", value: formatDate(profile.oathDate) },
  ];

  const appRows: { label: string; value: string | null | undefined }[] = [
    { label: t("fields.plannedFinishAt"), value: formatDate(app.plannedFinishAt) },
    { label: t("fields.teamFunction"), value: app.teamFunction },
    { label: t("fields.hufiecFunction"), value: app.hufiecFunction },
    { label: t("fields.openTrialForRank"), value: app.openTrialForRank ? t(`scoutRank.${app.openTrialForRank}` as any) : null },
    { label: t("fields.openTrialDeadline"), value: formatDate(app.openTrialDeadline) },
    { label: t("fields.hufcowyPresence"), value: app.hufcowyPresence ? t(`presence.${app.hufcowyPresence}` as any) : null },
  ];

  return (
    <div className="space-y-6">
      <Section title="Dane kandydata (z profilu)">
        <FieldGrid rows={profileRows} />
      </Section>
      <Section title="Dane wniosku">
        <FieldGrid rows={appRows} />
        {app.hufcowyPresence === "ATTACHMENT_OPINION" && app.hufcowyPresenceAttachmentUuid && (
          <p className="mt-2 text-xs text-foreground/50">
            Opinia pisemna hufcowego — załącznik w zakładce Załączniki
          </p>
        )}
        {app.hufcowyPresence === "ATTACHMENT_OPINION" && !app.hufcowyPresenceAttachmentUuid && (
          <p className="mt-2 text-xs text-amber-600">
            Opinia pisemna hufcowego — brak załącznika
          </p>
        )}
      </Section>
    </div>
  );
}

// ── Tab: Historia służby ────────────────────────────────────────────────────

function TabServiceHistory({ app }: { app: InstructorApplicationDetail }) {
  const t = useTranslations("applications");

  const rows = [
    { label: t("fields.functionsHistory"), value: app.functionsHistory },
    { label: t("fields.coursesHistory"), value: app.coursesHistory },
    { label: t("fields.campsHistory"), value: app.campsHistory },
    { label: t("fields.successes"), value: app.successes },
    { label: t("fields.failures"), value: app.failures },
  ];

  return (
    <Section title={t("steps.serviceHistory")}>
      <div className="space-y-5">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <p className="mb-1 text-xs font-medium text-foreground/50">{label}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {value || <span className="text-foreground/30">—</span>}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Tab: Opiekun ────────────────────────────────────────────────────────────

function TabSupervisor({ app }: { app: InstructorApplicationDetail }) {
  const t = useTranslations("applications");

  const rows: { label: string; value: string | null | undefined }[] = [
    {
      label: "Imię i nazwisko opiekuna",
      value: [app.supervisorFirstName, app.supervisorSurname].filter(Boolean).join(" ") || null,
    },
    {
      label: t("fields.supervisorInstructorRank"),
      value: app.supervisorInstructorRank ? t(`degree.${app.supervisorInstructorRank}` as any) : null,
    },
    { label: t("fields.supervisorInstructorFunction"), value: app.supervisorInstructorFunction },
  ];

  return (
    <Section title={t("steps.supervisor")}>
      <FieldGrid rows={rows} />
    </Section>
  );
}

// ── Tab: Załączniki ─────────────────────────────────────────────────────────

function TabAttachments({
  app,
  applicationId,
}: {
  app: InstructorApplicationDetail;
  applicationId: string;
}) {
  const t = useTranslations("applications");

  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter((a) => a.uuid === app.hufcowyPresenceAttachmentUuid)
    : [];
  const generalAttachments = app.attachments.filter(
    (a) => a.uuid !== app.hufcowyPresenceAttachmentUuid,
  );

  return (
    <div className="space-y-6">
      {hufcowyAttachments.length > 0 && (
        <Section title="Opinia pisemna hufcowego">
          <AttachmentList applicationId={applicationId} attachments={hufcowyAttachments} />
        </Section>
      )}
      <Section title={t("steps.attachments")}>
        {generalAttachments.length > 0 ? (
          <AttachmentList applicationId={applicationId} attachments={generalAttachments} />
        ) : (
          <p className="text-sm text-foreground/40">Brak załączników</p>
        )}
      </Section>
    </div>
  );
}

function AttachmentList({
  applicationId,
  attachments,
}: {
  applicationId: string;
  attachments: AttachmentResponse[];
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAction(att: AttachmentResponse, inline: boolean) {
    setLoadingId(att.uuid);
    try {
      const qs = inline ? "?inline=true" : "";
      const { url } = await apiFetch<{ url: string }>(
        `instructor-applications/${applicationId}/attachments/${att.uuid}/download${qs}`,
      );
      if (inline) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = att.originalFilename;
        a.click();
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="space-y-2">
      {attachments.map((att) => {
        const previewable = canPreviewInline(att.contentType);
        return (
          <li
            key={att.uuid}
            className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{att.originalFilename}</p>
              <p className="text-xs text-foreground/40">
                {(att.sizeBytes / 1024).toFixed(0)} KB &middot;{" "}
                {new Date(att.uploadedAt).toLocaleDateString("pl-PL")}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 gap-2">
              {previewable && (
                <button
                  type="button"
                  onClick={() => handleAction(att, true)}
                  disabled={loadingId === att.uuid}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {loadingId === att.uuid ? "..." : "Podgląd"}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAction(att, false)}
                disabled={loadingId === att.uuid}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {loadingId === att.uuid ? "..." : "Pobierz"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground/70">{title}</h2>
      {children}
    </div>
  );
}

function FieldGrid({ rows }: { rows: { label: string; value: string | null | undefined }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-foreground/50">{label}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("pl-PL");
  } catch {
    return value;
  }
}
