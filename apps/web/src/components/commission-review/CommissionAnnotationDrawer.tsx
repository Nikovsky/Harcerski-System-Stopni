// @file: apps/web/src/components/commission-review/CommissionAnnotationDrawer.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api";
import {
  IA_BUTTON_PRIMARY_SM,
  IA_BUTTON_SECONDARY_SM,
} from "@/components/instructor-application/ui/button-classnames";
import type {
  CommissionReviewCandidateAnnotationCreateResponse,
  CommissionReviewCandidateAnnotation,
  CommissionReviewCandidateAnnotationUpdateResponse,
  CommissionReviewInternalNoteCreateResponse,
  CommissionReviewInternalNoteDeleteResponse,
  CommissionReviewInternalNote,
  CommissionReviewInternalNoteUpdateResponse,
  InstructorReviewAnchorType,
} from "@hss/schemas";

type AnnotationMode = "internal" | "candidate";

type Props = {
  open: boolean;
  onClose: () => void;
  commissionUuid: string;
  applicationUuid: string;
  anchor: {
    anchorType: InstructorReviewAnchorType;
    anchorKey: string;
    label: string;
  };
  canCreateInternal: boolean;
  canCreateCandidate: boolean;
  defaultMode?: AnnotationMode;
  draftAnnotation?: CommissionReviewCandidateAnnotation | null;
  internalNote?: CommissionReviewInternalNote | null;
};

export function CommissionAnnotationDrawer({
  open,
  onClose,
  commissionUuid,
  applicationUuid,
  anchor,
  canCreateInternal,
  canCreateCandidate,
  defaultMode = "candidate",
  draftAnnotation,
  internalNote,
}: Props) {
  const t = useTranslations("commission");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const availableModes = useMemo<AnnotationMode[]>(() => {
    const modes: AnnotationMode[] = [];

    if (canCreateCandidate) {
      modes.push("candidate");
    }
    if (canCreateInternal) {
      modes.push("internal");
    }

    return modes;
  }, [canCreateCandidate, canCreateInternal]);
  const initialMode = internalNote
    ? "internal"
    : draftAnnotation
      ? "candidate"
    : availableModes.includes(defaultMode)
      ? defaultMode
      : availableModes[0] ?? "candidate";
  const [mode, setMode] = useState<AnnotationMode>(initialMode);
  const [body, setBody] = useState(internalNote?.body ?? draftAnnotation?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(
      internalNote
        ? "internal"
        : draftAnnotation
          ? "candidate"
        : availableModes.includes(defaultMode)
          ? defaultMode
          : availableModes[0] ?? "candidate",
    );
    setBody(internalNote?.body ?? draftAnnotation?.body ?? "");
    setError(null);
  }, [availableModes, defaultMode, draftAnnotation, internalNote, open]);

  if (!open) {
    return null;
  }

  const isEditingDraft =
    draftAnnotation !== null &&
    draftAnnotation !== undefined &&
    draftAnnotation.status === "DRAFT";
  const isEditingInternalNote =
    internalNote !== null && internalNote !== undefined;
  const canMutateActiveMode = isEditingInternalNote
    ? canCreateInternal
    : isEditingDraft
      ? canCreateCandidate
      : mode === "internal"
        ? canCreateInternal
        : canCreateCandidate;

  async function handleSubmit() {
    if (!canMutateActiveMode) {
      return;
    }

    if (body.trim().length === 0) {
      setError(t("annotations.validation.bodyRequired"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditingInternalNote && internalNote) {
        await apiFetch<CommissionReviewInternalNoteUpdateResponse>(
          `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/internal-notes/${internalNote.uuid}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              body: body.trim(),
            }),
          },
        );
      } else if (isEditingDraft && draftAnnotation) {
        await apiFetch<CommissionReviewCandidateAnnotationUpdateResponse>(
          `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/candidate-annotations/${draftAnnotation.uuid}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              body: body.trim(),
            }),
          },
        );
      } else if (mode === "internal") {
        await apiFetch<CommissionReviewInternalNoteCreateResponse>(
          `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/internal-notes`,
          {
            method: "POST",
            body: JSON.stringify({
              anchorType: anchor.anchorType,
              anchorKey: anchor.anchorKey,
              body: body.trim(),
            }),
          },
        );
      } else {
        await apiFetch<CommissionReviewCandidateAnnotationCreateResponse>(
          `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/candidate-annotations`,
          {
            method: "POST",
            body: JSON.stringify({
              anchorType: anchor.anchorType,
              anchorKey: anchor.anchorKey,
              body: body.trim(),
            }),
          },
        );
      }

      startTransition(() => {
        router.refresh();
      });
      onClose();
    } catch (unknownError: unknown) {
      setError(
        unknownError instanceof ApiError
          ? unknownError.message
          : t("messages.annotationSaveError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelDraft() {
    if (
      !canCreateCandidate ||
      !draftAnnotation ||
      draftAnnotation.status !== "DRAFT"
    ) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch<CommissionReviewCandidateAnnotationUpdateResponse>(
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/candidate-annotations/${draftAnnotation.uuid}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "CANCELLED",
          }),
        },
      );
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } catch (unknownError: unknown) {
      setError(
        unknownError instanceof ApiError
          ? unknownError.message
          : t("messages.annotationSaveError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteInternalNote() {
    if (!canCreateInternal || !internalNote) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch<CommissionReviewInternalNoteDeleteResponse>(
        `commission-review/commissions/${commissionUuid}/instructor-applications/${applicationUuid}/internal-notes/${internalNote.uuid}`,
        {
          method: "DELETE",
        },
      );
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } catch (unknownError: unknown) {
      setError(
        unknownError instanceof ApiError
          ? unknownError.message
          : t("messages.annotationSaveError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t("annotations.closeDrawer")}
        className="absolute inset-0"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 w-full max-w-[680px] border-l border-border bg-background shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/45">
                  {t("annotations.drawerEyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {isEditingDraft
                    ? t("annotations.editDraftTitle")
                    : isEditingInternalNote
                      ? t("annotations.editInternalTitle")
                    : t("annotations.drawerTitle")}
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-foreground/65">
                  {t("annotations.anchorLabel", { anchor: anchor.label })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground/70 transition hover:border-primary/40 hover:text-foreground"
              >
                {t("annotations.closeDrawer")}
              </button>
            </div>

            {!draftAnnotation && !internalNote && availableModes.length > 1 && (
              <div className="mt-5 grid w-full grid-cols-2 rounded-full border border-border bg-muted/30 p-1">
                {availableModes.map((availableMode) => {
                  const active = availableMode === mode;

                  return (
                    <button
                      key={availableMode}
                      type="button"
                      onClick={() => setMode(availableMode)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/65 hover:text-foreground"
                      }`}
                    >
                      {availableMode === "candidate"
                        ? t("annotations.candidateLabel")
                        : t("annotations.internalLabel")}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-[560px] space-y-5">
              <div className="rounded-3xl border border-border/70 bg-muted/20 p-5">
                <p className="text-sm font-medium leading-6">
                  {mode === "candidate"
                    ? t("annotations.candidateDescription")
                    : t("annotations.internalDescription")}
                </p>
              </div>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/85">
                    {t("annotations.bodyLabel")}
                  </span>
                  <span className="text-xs text-foreground/45">{body.length}/5000</span>
                </div>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={11}
                  maxLength={5000}
                  placeholder={t("annotations.bodyPlaceholder")}
                  disabled={!canMutateActiveMode || isSubmitting || isPending}
                  className="min-h-[260px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6"
                />
              </label>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          </div>

          <div className="border-t border-border px-6 py-4">
            <div className="mx-auto flex max-w-[560px] flex-wrap justify-end gap-3">
              {canMutateActiveMode && isEditingInternalNote && (
                <button
                  type="button"
                  onClick={() => void handleDeleteInternalNote()}
                  disabled={isSubmitting || isPending}
                  className={`${IA_BUTTON_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {t("annotations.deleteInternal")}
                </button>
              )}
              {canMutateActiveMode && isEditingDraft && (
                <button
                  type="button"
                  onClick={() => void handleCancelDraft()}
                  disabled={isSubmitting || isPending}
                  className={`${IA_BUTTON_SECONDARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {t("annotations.cancelDraft")}
                </button>
              )}
              {canMutateActiveMode && (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting || isPending}
                  className={`${IA_BUTTON_PRIMARY_SM} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmitting || isPending
                    ? t("annotations.saving")
                    : isEditingInternalNote
                      ? t("annotations.saveInternalChanges")
                      : isEditingDraft
                        ? t("annotations.saveDraftChanges")
                        : t("annotations.save")}
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
