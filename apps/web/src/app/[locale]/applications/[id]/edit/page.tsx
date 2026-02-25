// @file: apps/web/src/app/[locale]/applications/[id]/edit/page.tsx
"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useApplicationDetail } from "@/hooks/instructor-application/useApplicationDetail";
import { useUpdateApplication } from "@/hooks/instructor-application/useUpdateApplication";
import { RequirementForm } from "@/components/instructor-application/RequirementForm";
import { SubmitApplicationButton } from "@/components/instructor-application/SubmitApplicationButton";
import { AttachmentUpload } from "@/components/instructor-application/AttachmentUpload";
import type { UpdateInstructorApplication } from "@hss/schemas";

const STEPS = ["basicInfo", "serviceHistory", "supervisor", "requirements", "summary"] as const;

type Props = { params: Promise<{ id: string }> };

export default function EditApplicationPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations("applications");
  const router = useRouter();
  const { data: app, isLoading } = useApplicationDetail(id);
  const updateMutation = useUpdateApplication(id);
  const [step, setStep] = useState(0);

  const saveAndGo = useCallback(
    async (data: UpdateInstructorApplication, nextStep: number) => {
      const filtered = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(filtered).length > 0) {
        await updateMutation.mutateAsync(filtered as UpdateInstructorApplication);
      }
      setStep(nextStep);
    },
    [updateMutation],
  );

  if (isLoading) return <div className="py-12 text-center">...</div>;
  if (!app) return <div className="py-12 text-center">Not found</div>;
  if (app.status !== "DRAFT" && app.status !== "TO_FIX") {
    router.push(`/applications/${id}`);
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        {t(`degree.${app.template.degreeCode}` as any)}
      </h1>

      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className={`flex-1 rounded-sm px-2 py-1 text-xs transition ${
              i === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            {t(`steps.${s}`)}
          </button>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <StepBasicInfo
          app={app}
          onNext={(data) => saveAndGo(data, 1)}
        />
      )}
      {step === 1 && (
        <StepServiceHistory
          app={app}
          onNext={(data) => saveAndGo(data, 2)}
          onPrev={(data) => saveAndGo(data, 0)}
        />
      )}
      {step === 2 && (
        <StepSupervisor
          app={app}
          onNext={(data) => saveAndGo(data, 3)}
          onPrev={(data) => saveAndGo(data, 1)}
        />
      )}
      {step === 3 && (
        <div>
          <RequirementForm applicationId={id} requirements={app.requirements} />
          <StepNav onPrev={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}
      {step === 4 && (
        <div>
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="mb-4 text-foreground/70">
              {t("messages.reviewBeforeSubmit")}
            </p>
            <SubmitApplicationButton applicationId={id} />
          </div>
          <StepNav onPrev={() => setStep(3)} />
        </div>
      )}
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  "firstName", "surname", "email", "phone", "birthDate",
  "hufiecCode", "druzynaCode", "scoutRank", "scoutRankAwardedAt", "instructorRank", "instructorRankAwardedAt",
  "inScoutingSince", "inZhrSince", "oathDate",
] as const;

const PROFILE_LABELS: Record<string, string> = {
  firstName: "Imię",
  surname: "Nazwisko",
  email: "Email",
  phone: "Telefon",
  birthDate: "Data urodzenia",
  hufiecCode: "Hufiec",
  druzynaCode: "Drużyna",
  scoutRank: "Stopień harcerski",
  scoutRankAwardedAt: "Data przyznania stopnia harcerskiego",
  instructorRank: "Stopień instruktorski",
  instructorRankAwardedAt: "Data przyznania stopnia instruktorskiego",
  inScoutingSince: "W harcerstwie od",
  inZhrSince: "W ZHR od",
  oathDate: "Data przyrzeczenia",
};

function StepBasicInfo({
  app,
  onNext,
}: {
  app: any;
  onNext: (d: UpdateInstructorApplication) => void;
}) {
  const t = useTranslations("applications");
  const profile = app.candidateProfile;
  const [hufcowyPresence, setHufcowyPresence] = useState<string>(app.hufcowyPresence ?? "");

  // attachments linked to hufcowyPresence opinion
  const hufcowyAttachments = app.hufcowyPresenceAttachmentUuid
    ? app.attachments.filter((a: any) => a.uuid === app.hufcowyPresenceAttachmentUuid)
    : [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onNext({
      teamFunction: (fd.get("teamFunction") as string) || undefined,
      hufiecFunction: (fd.get("hufiecFunction") as string) || undefined,
      plannedFinishAt: (fd.get("plannedFinishAt") as string) || undefined,
      openTrialForRank: (fd.get("openTrialForRank") as string) || undefined,
      openTrialDeadline: (fd.get("openTrialDeadline") as string) || undefined,
      hufcowyPresence: (fd.get("hufcowyPresence") as string) || undefined,
    } as UpdateInstructorApplication);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Read-only profile section */}
      {profile && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground/70">
            Dane kandydata (z profilu)
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => (
              <div key={field}>
                <span className="block text-xs text-foreground/50">
                  {PROFILE_LABELS[field]}
                </span>
                <span className="text-sm">
                  {field === "scoutRank" && profile[field]
                    ? t(`scoutRank.${profile[field]}` as any)
                    : field === "instructorRank" && profile[field]
                      ? t(`degree.${profile[field]}` as any)
                      : (profile[field] ?? "—")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable application fields */}
      <Field label={t("fields.teamFunction")}>
        <input name="teamFunction" defaultValue={app.teamFunction ?? ""} className="input" />
      </Field>
      <Field label={t("fields.hufiecFunction")}>
        <input name="hufiecFunction" defaultValue={app.hufiecFunction ?? ""} className="input" />
      </Field>
      <Field label={t("fields.plannedFinishAt")}>
        <input name="plannedFinishAt" type="date" defaultValue={app.plannedFinishAt ?? ""} className="input" />
      </Field>
      <Field label={t("fields.openTrialForRank")}>
        <select name="openTrialForRank" defaultValue={app.openTrialForRank ?? ""} className="input">
          <option value="">—</option>
          <option value="HARCERZ_ORLI">{t("scoutRank.HARCERZ_ORLI")}</option>
          <option value="HARCERZ_RZECZYPOSPOLITEJ">{t("scoutRank.HARCERZ_RZECZYPOSPOLITEJ")}</option>
        </select>
      </Field>
      <Field label={t("fields.openTrialDeadline")}>
        <input name="openTrialDeadline" type="date" defaultValue={app.openTrialDeadline ?? ""} className="input" />
      </Field>
      <Field label={t("fields.hufcowyPresence")}>
        <select
          name="hufcowyPresence"
          value={hufcowyPresence}
          onChange={(e) => setHufcowyPresence(e.target.value)}
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
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          {t("actions.next")}
        </button>
      </div>
    </form>
  );
}

function StepServiceHistory({
  app,
  onNext,
  onPrev,
}: {
  app: any;
  onNext: (d: UpdateInstructorApplication) => void;
  onPrev: (d: UpdateInstructorApplication) => void;
}) {
  const t = useTranslations("applications");

  function getData(form: HTMLFormElement): UpdateInstructorApplication {
    const fd = new FormData(form);
    return {
      functionsHistory: (fd.get("functionsHistory") as string) || undefined,
      coursesHistory: (fd.get("coursesHistory") as string) || undefined,
      campsHistory: (fd.get("campsHistory") as string) || undefined,
      successes: (fd.get("successes") as string) || undefined,
      failures: (fd.get("failures") as string) || undefined,
    } as UpdateInstructorApplication;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext(getData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <Field label={t("fields.functionsHistory")}>
        <textarea name="functionsHistory" rows={3} defaultValue={app.functionsHistory ?? ""} className="input" />
      </Field>
      <Field label={t("fields.coursesHistory")}>
        <textarea name="coursesHistory" rows={3} defaultValue={app.coursesHistory ?? ""} className="input" />
      </Field>
      <Field label={t("fields.campsHistory")}>
        <textarea name="campsHistory" rows={3} defaultValue={app.campsHistory ?? ""} className="input" />
      </Field>
      <Field label={t("fields.successes")}>
        <textarea name="successes" rows={3} defaultValue={app.successes ?? ""} className="input" />
      </Field>
      <Field label={t("fields.failures")}>
        <textarea name="failures" rows={3} defaultValue={app.failures ?? ""} className="input" />
      </Field>
      <StepNav
        onPrev={() => onPrev(getData(document.querySelector("form")!))}
        isForm
      />
    </form>
  );
}

const SUPERVISOR_FUNCTION_PRESETS = ["supervisorFunction.druzynowy", "supervisorFunction.opiekunDruzyny"] as const;

function StepSupervisor({
  app,
  onNext,
  onPrev,
}: {
  app: any;
  onNext: (d: UpdateInstructorApplication) => void;
  onPrev: (d: UpdateInstructorApplication) => void;
}) {
  const t = useTranslations("applications");

  const initialFunction = app.supervisorInstructorFunction ?? "";
  const isPreset = SUPERVISOR_FUNCTION_PRESETS.some((p) => t(p) === initialFunction);
  const [functionSelect, setFunctionSelect] = useState<string>(isPreset ? initialFunction : (initialFunction ? "__other" : ""));
  const [functionOther, setFunctionOther] = useState<string>(isPreset || !initialFunction ? "" : initialFunction);

  function getEffectiveFunction(): string {
    if (functionSelect === "__other") return functionOther;
    return functionSelect;
  }

  function getData(form: HTMLFormElement): UpdateInstructorApplication {
    const fd = new FormData(form);
    return {
      supervisorFirstName: (fd.get("supervisorFirstName") as string) || undefined,
      supervisorSurname: (fd.get("supervisorSurname") as string) || undefined,
      supervisorInstructorRank: (fd.get("supervisorInstructorRank") as string) || undefined,
      supervisorInstructorFunction: getEffectiveFunction() || undefined,
    } as UpdateInstructorApplication;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext(getData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <Field label={t("fields.supervisorFirstName")}>
        <input name="supervisorFirstName" defaultValue={app.supervisorFirstName ?? ""} className="input" />
      </Field>
      <Field label={t("fields.supervisorSurname")}>
        <input name="supervisorSurname" defaultValue={app.supervisorSurname ?? ""} className="input" />
      </Field>
      <Field label={t("fields.supervisorInstructorRank")}>
        <select name="supervisorInstructorRank" defaultValue={app.supervisorInstructorRank ?? ""} className="input">
          <option value="">—</option>
          <option value="PRZEWODNIK">{t("degree.PRZEWODNIK")}</option>
          <option value="PODHARCMISTRZ_OTWARTA_PROBA">{t("degree.PODHARCMISTRZ_OTWARTA_PROBA")}</option>
          <option value="PODHARCMISTRZ">{t("degree.PODHARCMISTRZ")}</option>
          <option value="HARCMISTRZ">{t("degree.HARCMISTRZ")}</option>
        </select>
      </Field>
      <Field label={t("fields.supervisorInstructorFunction")}>
        <select
          value={functionSelect}
          onChange={(e) => setFunctionSelect(e.target.value)}
          className="input mb-2"
        >
          <option value="">—</option>
          {SUPERVISOR_FUNCTION_PRESETS.map((p) => (
            <option key={p} value={t(p)}>{t(p)}</option>
          ))}
          <option value="__other">{t("supervisorFunction.other")}</option>
        </select>
        {functionSelect === "__other" && (
          <input
            value={functionOther}
            onChange={(e) => setFunctionOther(e.target.value)}
            placeholder={t("supervisorFunction.otherPlaceholder")}
            className="input mt-1"
          />
        )}
      </Field>
      <StepNav
        onPrev={() => onPrev(getData(document.querySelector("form")!))}
        isForm
      />
    </form>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground/80">{label}</span>
      <div className="[&_.input]:w-full [&_.input]:rounded-md [&_.input]:border [&_.input]:border-border [&_.input]:bg-background [&_.input]:px-3 [&_.input]:py-2 [&_.input]:text-sm">
        {children}
      </div>
    </label>
  );
}

function StepNav({
  onPrev,
  onNext,
  isForm,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  isForm?: boolean;
}) {
  const t = useTranslations("applications");

  return (
    <div className="flex justify-between pt-4">
      {onPrev ? (
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {t("actions.previous")}
        </button>
      ) : (
        <div />
      )}
      {isForm ? (
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          {t("actions.next")}
        </button>
      ) : onNext ? (
        <button
          type="button"
          onClick={onNext}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          {t("actions.next")}
        </button>
      ) : null}
    </div>
  );
}
